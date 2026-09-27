import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { authenticateToken, AuthRequest } from './auth.js';
import { verifyWorkspaceAccess } from './workspaces.js';
import { MultilingualAIEngine } from '../ai/engine.js';

export const aiRouter = Router();

// Get AI Settings for workspace
aiRouter.get('/config', authenticateToken, verifyWorkspaceAccess, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = (req as any).workspaceId;
    let config = await prisma.aIConfiguration.findUnique({ where: { workspaceId } });
    if (!config) {
      config = await prisma.aIConfiguration.create({
        data: {
          workspaceId,
          autoReplyEnabled: true,
          humanReviewEnabled: false,
        },
      });
    }
    res.json({ config });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch AI configuration' });
  }
});

// Update AI Settings
aiRouter.put('/config', authenticateToken, verifyWorkspaceAccess, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = (req as any).workspaceId;
    const {
      autoReplyEnabled,
      humanReviewEnabled,
      personality,
      businessTone,
      defaultLanguage,
      greetingMessage,
      fallbackMessage,
      businessHoursBehavior,
      escalationRules,
      responseLength,
      channelSettings,
    } = req.body;

    const config = await prisma.aIConfiguration.upsert({
      where: { workspaceId },
      update: {
        autoReplyEnabled: autoReplyEnabled !== undefined ? autoReplyEnabled : true,
        humanReviewEnabled: humanReviewEnabled !== undefined ? humanReviewEnabled : false,
        personality,
        businessTone,
        defaultLanguage,
        greetingMessage,
        fallbackMessage,
        businessHoursBehavior,
        escalationRules: typeof escalationRules === 'string' ? escalationRules : JSON.stringify(escalationRules || []),
        responseLength,
        channelSettings: typeof channelSettings === 'string' ? channelSettings : JSON.stringify(channelSettings || {}),
      },
      create: {
        workspaceId,
        autoReplyEnabled: autoReplyEnabled !== undefined ? autoReplyEnabled : true,
        humanReviewEnabled: humanReviewEnabled !== undefined ? humanReviewEnabled : false,
        personality,
        businessTone,
        defaultLanguage: defaultLanguage || 'auto',
        greetingMessage,
        fallbackMessage,
        businessHoursBehavior,
        escalationRules: typeof escalationRules === 'string' ? escalationRules : JSON.stringify(escalationRules || []),
        responseLength: responseLength || 'CONCISE',
        channelSettings: typeof channelSettings === 'string' ? channelSettings : JSON.stringify(channelSettings || {}),
      },
    });

    res.json({ config, message: 'AI settings updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update AI configuration' });
  }
});

// AI Playground Test Endpoint (test customer prompt against current business knowledge)
aiRouter.post('/test', authenticateToken, verifyWorkspaceAccess, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = (req as any).workspaceId;
    const { messageText } = req.body;

    if (!messageText) return res.status(400).json({ error: 'messageText is required' });

    const [profile, aiConfig, products, services, chunks] = await Promise.all([
      prisma.businessProfile.findUnique({ where: { workspaceId } }),
      prisma.aIConfiguration.findUnique({ where: { workspaceId } }),
      prisma.product.findMany({ where: { workspaceId, availability: true } }),
      prisma.service.findMany({ where: { workspaceId, availability: true } }),
      prisma.businessKnowledgeChunk.findMany({ where: { workspaceId }, take: 8 }),
    ]);

    let parsedFaqs: any[] = [];
    try {
      if (profile?.faqs) parsedFaqs = JSON.parse(profile.faqs);
    } catch (e) {}

    const context = {
      businessName: profile?.businessName || 'Our Business',
      industry: profile?.industry || undefined,
      description: profile?.description || undefined,
      location: profile?.location || undefined,
      contactEmail: profile?.contactEmail || undefined,
      contactPhone: profile?.contactPhone || undefined,
      businessHours: profile?.businessHours || undefined,
      website: profile?.website || undefined,
      faqs: parsedFaqs,
      supportInstructions: profile?.supportInstructions || undefined,
      products,
      services,
      chunks,
    };

    const startTime = Date.now();
    const result = await MultilingualAIEngine.generateReply(
      messageText,
      context,
      aiConfig?.fallbackMessage
    );
    const latencyMs = Date.now() - startTime;

    res.json({
      result,
      latencyMs,
      contextItemsCount: {
        products: products.length,
        services: services.length,
        faqs: parsedFaqs.length,
        chunks: chunks.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'AI test failed: ' + error.message });
  }
});
