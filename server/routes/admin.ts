import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { authenticateToken, AuthRequest } from './auth.js';

export const adminRouter = Router();

// Middleware to verify user is Admin / Superadmin
const requireAdmin = (req: AuthRequest, res: Response, next: () => void) => {
  // In development MVP, allow access for ease of testing
  next();
};

// Admin KPI Metrics
adminRouter.get('/stats', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const [
      totalUsers,
      totalWorkspaces,
      totalConversations,
      totalMessages,
      totalAiLogs,
      connectedAccountsCount,
      recentAiLogs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.workspace.count(),
      prisma.conversation.count(),
      prisma.message.count(),
      prisma.aIMessageLog.count(),
      prisma.connectedAccount.count({ where: { status: 'CONNECTED' } }),
      prisma.aIMessageLog.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    res.json({
      stats: {
        totalUsers,
        totalWorkspaces,
        totalConversations,
        totalMessages,
        totalAiLogs,
        connectedAccountsCount,
      },
      recentAiLogs,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch admin statistics' });
  }
});

// Users Management
adminRouter.get('/users', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        _count: { select: { memberships: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Toggle User Suspension
adminRouter.patch('/users/:id/suspend', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isSuspended } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: { isSuspended },
    });

    res.json({ user, message: `User status changed to ${isSuspended ? 'SUSPENDED' : 'ACTIVE'}` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user suspension' });
  }
});

// Workspaces Directory
adminRouter.get('/workspaces', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const workspaces = await prisma.workspace.findMany({
      include: {
        _count: { select: { members: true, conversations: true, accounts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ workspaces });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workspaces' });
  }
});

// Global Webhook Logs
adminRouter.get('/webhook-logs', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const logs = await prisma.webhookEvent.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch webhook logs' });
  }
});

// AI Usage & Performance Logs
adminRouter.get('/ai-logs', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const logs = await prisma.aIMessageLog.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        conversation: {
          select: { channel: true, customer: { select: { name: true } } },
        },
      },
    });
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch AI logs' });
  }
});

// System Audit Logs
adminRouter.get('/system-logs', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const logs = await prisma.auditLog.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
      },
    });
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Platform-Level Meta Integration Configuration (Superadmin Only)
adminRouter.get('/platform-meta-config', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const appId = process.env.META_APP_ID || '';
    const appSecret = process.env.META_APP_SECRET || '';
    const isConfigured = !!(appId && appSecret && appId !== 'dev_meta_app_id' && appId !== 'your_meta_app_id');

    const host = req.get('host') || 'localhost:5000';
    const protocol = req.protocol;
    const redirectUri = process.env.META_OAUTH_REDIRECT_URI || `${protocol}://${host}/api/channels/meta/callback`;
    const webhookUrl = process.env.META_WEBHOOK_URL || `${protocol}://${host}/api/webhooks/meta`;

    const [totalConnected, platformBreakdown] = await Promise.all([
      prisma.connectedAccount.count({ where: { status: 'CONNECTED' } }),
      prisma.connectedAccount.groupBy({
        by: ['platform'],
        _count: { id: true },
      }),
    ]);

    res.json({
      isConfigured,
      appIdMasked: appId ? (appId.length > 6 ? `${appId.slice(0, 3)}***${appId.slice(-3)}` : 'Configured') : 'Not Configured',
      appSecretConfigured: !!(appSecret && appSecret !== 'dev_meta_app_secret'),
      redirectUri,
      webhookUrl,
      webhookVerifyTokenConfigured: !!process.env.META_WEBHOOK_VERIFY_TOKEN,
      graphApiVersion: process.env.META_GRAPH_API_VERSION || 'v21.0',
      totalConnectedAccounts: totalConnected,
      platformBreakdown: platformBreakdown.map((p) => ({ platform: p.platform, count: p._count.id })),
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch platform Meta configuration' });
  }
});

