import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticateToken, AuthRequest } from './auth';

export const workspaceRouter = Router();

// Middleware to verify user belongs to workspace
export const verifyWorkspaceAccess = async (req: AuthRequest, res: Response, next: () => void) => {
  const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string) || req.body?.workspaceId;

  if (!workspaceId) {
    return res.status(400).json({ error: 'x-workspace-id header or workspaceId parameter is required' });
  }

  try {
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: req.user!.id,
        },
      },
    });

    if (!membership && req.user!.role !== 'SUPERADMIN') {
      return res.status(403).json({ error: 'Access denied: You are not a member of this workspace' });
    }

    (req as any).workspaceId = workspaceId;
    (req as any).workspaceRole = membership?.role || 'AGENT';
    next();
  } catch (err) {
    res.status(500).json({ error: 'Error validating workspace permissions' });
  }
};

// List all workspaces user belongs to
workspaceRouter.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: req.user!.id },
      include: {
        workspace: {
          include: {
            _count: {
              select: {
                conversations: true,
                members: true,
                accounts: true,
              },
            },
          },
        },
      },
    });

    const workspaces = memberships.map((m: any) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      logoUrl: m.workspace.logoUrl,
      role: m.role,
      counts: m.workspace._count,
    }));

    res.json({ workspaces });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workspaces' });
  }
});

// Create new workspace
workspaceRouter.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Workspace name is required' });

    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substring(2, 6);

    const workspace = await prisma.workspace.create({
      data: {
        name,
        slug,
        ownerId: req.user!.id,
        members: {
          create: {
            userId: req.user!.id,
            role: 'OWNER',
          },
        },
        businessProfile: {
          create: {
            businessName: name,
            description: 'Customer inquiries workspace',
          },
        },
        aiConfig: {
          create: {
            autoReplyEnabled: true,
            humanReviewEnabled: false,
          },
        },
      },
    });

    res.status(201).json({ workspace, role: 'OWNER' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create workspace' });
  }
});

// Get workspace details
workspaceRouter.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const workspace = await prisma.workspace.findUnique({
      where: { id },
      include: {
        businessProfile: true,
        aiConfig: true,
        accounts: true,
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
    res.json({ workspace });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load workspace details' });
  }
});

// Invite team member
workspaceRouter.post('/:id/members', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { email, name, role = 'AGENT' } = req.body;

    if (!email) return res.status(400).json({ error: 'Email is required' });

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Create user with temp password
      const tempPasswordHash = '$2a$10$wO0K8aD.4wNf0Y7zZ8QnquXgQyX8M3WjZ5L5D5F5G5H5J5K5L5M5';
      user = await prisma.user.create({
        data: {
          email,
          name: name || email.split('@')[0],
          passwordHash: tempPasswordHash,
          role: 'AGENT',
        },
      });
    }

    const membership = await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: id,
          userId: user.id,
        },
      },
      update: { role },
      create: {
        workspaceId: id,
        userId: user.id,
        role,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    res.status(201).json({ message: 'Team member added successfully', member: membership });
  } catch (error) {
    res.status(500).json({ error: 'Failed to invite team member' });
  }
});

// Update member role
workspaceRouter.patch('/:id/members/:memberId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id, memberId } = req.params;
    const { role } = req.body;

    const updated = await prisma.workspaceMember.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    res.json({ member: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update member role' });
  }
});

// Remove member
workspaceRouter.delete('/:id/members/:memberId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { memberId } = req.params;
    await prisma.workspaceMember.delete({ where: { id: memberId } });
    res.json({ success: true, message: 'Member removed from workspace' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove member' });
  }
});
