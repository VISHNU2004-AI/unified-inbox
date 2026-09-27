import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { handleIncomingNormalizedMessage } from './webhooks.js';

export const liveChatRouter = Router();

// Fetch widget branding configuration (public endpoint for embedded widget)
liveChatRouter.get('/config', async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.query;

    let targetWorkspaceId = String(workspaceId || '');
    if (!targetWorkspaceId) {
      const firstWs = await prisma.workspace.findFirst();
      targetWorkspaceId = firstWs ? firstWs.id : '';
    }

    const [profile, aiConfig] = await Promise.all([
      prisma.businessProfile.findUnique({ where: { workspaceId: targetWorkspaceId } }),
      prisma.aIConfiguration.findUnique({ where: { workspaceId: targetWorkspaceId } }),
    ]);

    res.json({
      success: true,
      config: {
        workspaceId: targetWorkspaceId,
        businessName: profile?.businessName || 'Business Support',
        greeting: aiConfig?.greetingMessage || 'Hello! How can we help you today?',
        primaryColor: '#6366f1',
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch widget config' });
  }
});

// Incoming message from website widget visitor
liveChatRouter.post('/message', async (req: Request, res: Response) => {
  try {
    const { workspaceId, visitorToken, content, visitorName = 'Website Visitor' } = req.body;

    if (!workspaceId || !visitorToken || !content) {
      return res.status(400).json({ error: 'workspaceId, visitorToken, and content are required' });
    }

    // Process through the unified pipeline
    await handleIncomingNormalizedMessage({
      workspaceId,
      channel: 'LIVECHAT',
      externalSenderId: visitorToken,
      senderName: visitorName,
      content,
      externalMessageId: `lc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    });

    // Check if an AI reply was generated immediately
    const customer = await prisma.customer.findFirst({
      where: { workspaceId, externalId: visitorToken },
    });

    let lastBotReply: any = null;
    if (customer) {
      const conv = await prisma.conversation.findFirst({
        where: { workspaceId, customerId: customer.id, channel: 'LIVECHAT' },
      });
      if (conv) {
        lastBotReply = await prisma.message.findFirst({
          where: { conversationId: conv.id, senderType: 'AI_BOT' },
          orderBy: { createdAt: 'desc' },
        });
      }
    }

    res.json({
      success: true,
      reply: lastBotReply,
    });
  } catch (error: any) {
    console.error('[LiveChat] Message handling error:', error);
    res.status(500).json({ error: 'Failed to process visitor message' });
  }
});

// Fetch conversation thread for returning visitor
liveChatRouter.get('/history', async (req: Request, res: Response) => {
  try {
    const { workspaceId, visitorToken } = req.query;
    if (!workspaceId || !visitorToken) {
      return res.status(400).json({ error: 'workspaceId and visitorToken required' });
    }

    const customer = await prisma.customer.findFirst({
      where: { workspaceId: String(workspaceId), externalId: String(visitorToken) },
    });

    if (!customer) return res.json({ messages: [] });

    const conversation = await prisma.conversation.findFirst({
      where: { workspaceId: String(workspaceId), customerId: customer.id, channel: 'LIVECHAT' },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    res.json({ messages: conversation?.messages || [] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});
