import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticateToken, AuthRequest } from './auth';
import { verifyWorkspaceAccess } from './workspaces';
import { broadcastToWorkspace } from '../index';

export const conversationRouter = Router();

// List conversations for workspace with filters and search
conversationRouter.get('/', authenticateToken, verifyWorkspaceAccess, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = (req as any).workspaceId;
    const { channel, status, search, reviewOnly } = req.query;

    const whereClause: any = {
      workspaceId,
    };

    if (channel && channel !== 'ALL') {
      whereClause.channel = String(channel).toUpperCase();
    }

    if (status && status !== 'ALL') {
      whereClause.status = String(status).toUpperCase();
    }

    if (reviewOnly === 'true') {
      whereClause.needsHumanReview = true;
    }

    if (search && String(search).trim() !== '') {
      const q = String(search).trim();
      whereClause.OR = [
        { customer: { name: { contains: q } } },
        { customer: { handle: { contains: q } } },
        { customer: { phone: { contains: q } } },
        { lastMessageContent: { contains: q } },
      ];
    }

    const conversations = await prisma.conversation.findMany({
      where: whereClause,
      orderBy: { lastMessageAt: 'desc' },
      include: {
        customer: true,
        _count: {
          select: { messages: true },
        },
      },
    });

    res.json({ conversations });
  } catch (error: any) {
    console.error('[Conversations] Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get single conversation details with complete message thread & notes
conversationRouter.get('/:id', authenticateToken, verifyWorkspaceAccess, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = (req as any).workspaceId;
    const { id } = req.params;

    const conversation = await prisma.conversation.findFirst({
      where: { id, workspaceId },
      include: {
        customer: true,
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        internalNotes: {
          orderBy: { createdAt: 'desc' },
          include: {
            author: {
              select: { id: true, name: true, avatarUrl: true },
            },
          },
        },
        assignments: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Auto mark as read
    if (conversation.unreadCount > 0) {
      await prisma.conversation.update({
        where: { id },
        data: { unreadCount: 0 },
      });
      broadcastToWorkspace(workspaceId, {
        type: 'CONVERSATION_UPDATED',
        conversationId: id,
        unreadCount: 0,
      });
    }

    res.json({ conversation });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch conversation details' });
  }
});

// Update conversation status (OPEN, PENDING, RESOLVED)
conversationRouter.patch('/:id/status', authenticateToken, verifyWorkspaceAccess, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = (req as any).workspaceId;
    const { id } = req.params;
    const { status } = req.body;

    if (!['OPEN', 'PENDING', 'RESOLVED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be OPEN, PENDING, or RESOLVED' });
    }

    const updated = await prisma.conversation.update({
      where: { id },
      data: { status },
      include: { customer: true },
    });

    broadcastToWorkspace(workspaceId, {
      type: 'CONVERSATION_STATUS_CHANGED',
      conversation: updated,
    });

    res.json({ conversation: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update conversation status' });
  }
});

// Assign conversation to team member
conversationRouter.post('/:id/assign', authenticateToken, verifyWorkspaceAccess, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = (req as any).workspaceId;
    const { id } = req.params;
    const { userId } = req.body;

    const assignment = await prisma.conversationAssignment.create({
      data: {
        conversationId: id,
        userId,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    await prisma.conversation.update({
      where: { id },
      data: { assignedUserId: userId },
    });

    broadcastToWorkspace(workspaceId, {
      type: 'CONVERSATION_ASSIGNED',
      conversationId: id,
      assignment,
    });

    res.json({ assignment });
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign conversation' });
  }
});

// Add internal note
conversationRouter.post('/:id/notes', authenticateToken, verifyWorkspaceAccess, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = (req as any).workspaceId;
    const { id } = req.params;
    const { content } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'Note content cannot be empty' });
    }

    const note = await prisma.internalNote.create({
      data: {
        workspaceId,
        conversationId: id,
        authorId: req.user!.id,
        content: content.trim(),
      },
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    broadcastToWorkspace(workspaceId, {
      type: 'INTERNAL_NOTE_ADDED',
      conversationId: id,
      note,
    });

    res.status(201).json({ note });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add internal note' });
  }
});
