import { Router, Request, Response } from 'express';
import { handleIncomingNormalizedMessage } from './webhooks';
import { prisma } from '../db';

export const simulatorRouter = Router();

// Test incoming synthetic message on any channel (WhatsApp, Instagram, Messenger, LiveChat)
simulatorRouter.post('/send', async (req: Request, res: Response) => {
  try {
    const {
      workspaceId,
      channel = 'WHATSAPP',
      senderName = 'Test Customer',
      senderPhone = '+919876543210',
      messageContent,
    } = req.body;

    if (!messageContent || messageContent.trim() === '') {
      return res.status(400).json({ error: 'messageContent is required' });
    }

    // Resolve active workspace
    let targetWorkspaceId = workspaceId;
    if (!targetWorkspaceId) {
      const firstWs = await prisma.workspace.findFirst();
      if (!firstWs) return res.status(400).json({ error: 'No workspace available' });
      targetWorkspaceId = firstWs.id;
    }

    const externalSenderId =
      channel === 'WHATSAPP'
        ? senderPhone
        : channel === 'INSTAGRAM'
        ? `@${senderName.toLowerCase().replace(/\s+/g, '_')}`
        : `ext_${Date.now().toString(36)}`;

    // Process through the standard incoming normalized message pipeline
    await handleIncomingNormalizedMessage({
      workspaceId: targetWorkspaceId,
      channel: channel.toUpperCase(),
      externalSenderId,
      senderName,
      content: messageContent.trim(),
      externalMessageId: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      rawPayload: { simulated: true, channel, senderName, timestamp: new Date().toISOString() },
    });

    res.json({
      success: true,
      message: `Simulated message dispatched to ${channel}. Check Unified Inbox for incoming message and AI reply/draft!`,
      details: {
        workspaceId: targetWorkspaceId,
        channel,
        senderName,
        externalSenderId,
        content: messageContent,
      },
    });
  } catch (error: any) {
    console.error('[Simulator] Dispatch error:', error);
    res.status(500).json({ error: 'Failed to simulate message delivery' });
  }
});

// Quick presets for immediate testing
simulatorRouter.get('/presets', (req: Request, res: Response) => {
  res.json({
    presets: [
      {
        title: 'Business Hours Query (English)',
        channel: 'WHATSAPP',
        senderName: 'Sarah Jenkins',
        messageContent: 'Hi! What are your business hours today? Can I visit this evening?',
      },
      {
        title: 'Pricing Query (Hinglish)',
        channel: 'INSTAGRAM',
        senderName: 'Rahul Sharma',
        messageContent: 'Bhai mujhe pricing batao services ka, kitna charge karte ho?',
      },
      {
        title: 'Location Query (Hindi)',
        channel: 'WHATSAPP',
        senderName: 'अमित कुमार',
        messageContent: 'नमस्ते, आपका ऑफिस कहाँ पर स्थित है? क्या मुझे पता मिल सकता है?',
      },
      {
        title: 'Urgent Complaint / Escalation (English)',
        channel: 'MESSENGER',
        senderName: 'David Miller',
        messageContent: 'URGENT: My appointment was cancelled without notice! I want to speak to a senior manager immediately!',
      },
      {
        title: 'Unknown / Fallback Test (English)',
        channel: 'LIVECHAT',
        senderName: 'Elena Rostova',
        messageContent: 'Do you offer rocket ship maintenance on the moon?',
      },
    ],
  });
});
