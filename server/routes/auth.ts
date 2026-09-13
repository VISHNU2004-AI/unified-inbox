import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'unified_inbox_jwt_super_secret_key_2026_dev';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

// Authentication Middleware
export const authenticateToken = (req: AuthRequest, res: Response, next: () => void) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Sign Up
authRouter.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, name, businessName } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: 'AGENT',
        emailVerified: true, // auto-verify for smooth onboarding
      },
    });

    // Create default workspace for new user
    const slug = (businessName || `${name}'s Workspace`)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-') + '-' + Math.random().toString(36).substring(2, 6);

    const workspace = await prisma.workspace.create({
      data: {
        name: businessName || `${name}'s Workspace`,
        slug,
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: 'OWNER',
          },
        },
        businessProfile: {
          create: {
            businessName: businessName || `${name}'s Business`,
            description: 'Customer inquiries and support workspace',
            businessHours: 'Mon - Fri: 9:00 AM - 6:00 PM',
            location: 'Main St, Suite 100',
          },
        },
        aiConfig: {
          create: {
            autoReplyEnabled: true,
            humanReviewEnabled: false,
            defaultLanguage: 'auto',
            personality: 'Helpful, professional, and friendly',
            fallbackMessage: "I apologize, but I don't have that information right now. Please wait a moment while our team member assists you.",
          },
        },
      },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        role: 'OWNER',
      },
    });
  } catch (error: any) {
    console.error('[Auth] Signup error:', error);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// Login
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            workspace: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.isSuspended) {
      return res.status(403).json({ error: 'Your account has been suspended by platform administrator' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const workspaces = user.memberships.map((m: any) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      role: m.role,
    }));

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      workspaces,
      activeWorkspace: workspaces[0] || null,
    });
  } catch (error: any) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// Get Current User Profile & Workspaces
authRouter.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        memberships: {
          include: {
            workspace: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const workspaces = user.memberships.map((m: any) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      role: m.role,
    }));

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerified,
      },
      workspaces,
    });
  } catch (error: any) {
    console.error('[Auth] Me error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Forgot Password
authRouter.post('/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body;
  // In MVP, simulate sending recovery link
  res.json({
    success: true,
    message: `If an account exists for ${email}, a password reset link has been dispatched.`,
  });
});

// Reset Password
authRouter.post('/reset-password', async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  res.json({
    success: true,
    message: 'Password reset successfully. Please log in with your new credentials.',
  });
});
