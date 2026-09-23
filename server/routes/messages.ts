import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticateToken, AuthRequest } from './auth';
import { verifyWorkspaceAccess } from './workspaces';
import { broadcastToWorkspace } from '../index';
import { dispatchOutboundToPlatform } from './webhooks';

export const messageRouter = Router();

// Shared handler for manual agent replies
async function handleSendReply(req: AuthRequest, res: Response) {
  try {
    const workspaceId = (req as any).workspaceId;
    const { conversationId, content } = req.body;

    if (!conversationId || !content || content.trim() === '') {
      return res.status(400).json({ error: 'conversationId and content are required' });
    }

    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, workspaceId },
      include: { customer: true },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Check for connected account in this workspace
    const connectedAccount = await prisma.connectedAccount.findFirst({
      where: {
        workspaceId,
        platform: conversation.channel,
        status: 'CONNECTED',
      },
    });

    let dispatchResult: { success: boolean; externalMessageId?: string; error?: string } = { success: true };

    // If channel is WhatsApp, Instagram, or Messenger, attempt real platform dispatch
    if (['WHATSAPP', 'INSTAGRAM', 'MESSENGER'].includes(conversation.channel)) {
      if (!connectedAccount || !connectedAccount.accessTokenEncrypted) {
        // Warning: No connected account in workspace
        console.warn(`[Messages] No connected account for ${conversation.channel} in workspace ${workspaceId}.`);
      } else {
        const recipientId = conversation.customer.externalId;
        dispatchResult = await dispatchOutboundToPlatform({
          account: connectedAccount,
          recipientId,
          text: content.trim(),
        });
      }
    }

    const messageStatus = dispatchResult.success ? 'DELIVERED' : 'FAILED';

    // Create Outbound Message in DB
    const message = await prisma.message.create({
      data: {
        workspaceId,
        conversationId,
        channel: conversation.channel,
        senderType: 'AGENT',
        senderName: req.user!.name,
        content: content.trim(),
        direction: 'OUTBOUND',
        status: messageStatus,
        externalMessageId: dispatchResult.externalMessageId,
        isAiGenerated: false,
      },
    });

    // Update Conversation metadata
    const updatedConversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageContent: content.trim(),
        lastMessageAt: new Date(),
        needsHumanReview: false,
        pendingDraftReply: null,
      },
    });

    // Broadcast Real-time WebSocket Event
    broadcastToWorkspace(workspaceId, {
      type: 'NEW_MESSAGE',
      conversationId,
      message,
      conversation: updatedConversation,
    });

    res.status(201).json({
      message,
      conversation: updatedConversation,
      dispatch: dispatchResult,
      notice: !connectedAccount && ['WHATSAPP', 'INSTAGRAM', 'MESSENGER'].includes(conversation.channel)
        ? `Note: ${conversation.channel} is not connected in this workspace. Message saved locally in Unified Inbox.`
        : undefined,
    });
  } catch (error: any) {
    console.error('[Messages] Send error:', error);
    res.status(500).json({ error: 'Failed to dispatch message' });
  }
}

messageRouter.post('/', authenticateToken, verifyWorkspaceAccess, handleSendReply);
messageRouter.post('/send', authenticateToken, verifyWorkspaceAccess, handleSendReply);

// Approve & Send AI Draft Reply (with optional agent edit)
messageRouter.post('/approve-draft', authenticateToken, verifyWorkspaceAccess, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = (req as any).workspaceId;
    const { conversationId, finalContent, editedContent } = req.body;

    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, workspaceId },
      include: { customer: true },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const contentToSend = finalContent || editedContent || conversation.pendingDraftReply;
    if (!contentToSend) {
      return res.status(400).json({ error: 'No draft reply available to approve' });
    }

    // Check for connected account
    const connectedAccount = await prisma.connectedAccount.findFirst({
      where: {
        workspaceId,
        platform: conversation.channel,
        status: 'CONNECTED',
      },
    });

    let dispatchResult: { success: boolean; externalMessageId?: string; error?: string } = { success: true };

    if (['WHATSAPP', 'INSTAGRAM', 'MESSENGER'].includes(conversation.channel) && connectedAccount && connectedAccount.accessTokenEncrypted) {
      dispatchResult = await dispatchOutboundToPlatform({
        account: connectedAccount,
        recipientId: conversation.customer.externalId,
        text: contentToSend.trim(),
      });
    }

    const messageStatus = dispatchResult.success ? 'DELIVERED' : 'FAILED';

    // Create outbound approved message
    const message = await prisma.message.create({
      data: {
        workspaceId,
        conversationId,
        channel: conversation.channel,
        senderType: 'AI_BOT',
        senderName: 'AI Assistant',
        content: contentToSend.trim(),
        direction: 'OUTBOUND',
        status: messageStatus,
        externalMessageId: dispatchResult.externalMessageId,
        isAiGenerated: true,
      },
    });

    // Clear draft flags
    const updatedConversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageContent: contentToSend.trim(),
        lastMessageAt: new Date(),
        needsHumanReview: false,
        pendingDraftReply: null,
      },
    });

    // Log decision in AIMessageLog
    await prisma.aIMessageLog.create({
      data: {
        workspaceId,
        conversationId: conversation.id,
        incomingText: conversation.lastMessageContent || '',
        suggestedReply: contentToSend.trim(),
        decision: editedContent ? 'MANUALLY_OVERRIDDEN' : 'AUTO_SENT',
      },
    });

    broadcastToWorkspace(workspaceId, {
      type: 'NEW_MESSAGE',
      conversationId,
      message,
      conversation: updatedConversation,
    });

    res.json({ message, conversation: updatedConversation, dispatch: dispatchResult });
  } catch (error: any) {
    console.error('[Messages] Draft approval error:', error);
    res.status(500).json({ error: 'Failed to approve draft reply' });
  }
});

// Reject / Discard AI Draft Reply
messageRouter.post('/reject-draft', authenticateToken, verifyWorkspaceAccess, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = (req as any).workspaceId;
    const { conversationId } = req.body;

    const updatedConversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        needsHumanReview: false,
        pendingDraftReply: null,
      },
    });

    broadcastToWorkspace(workspaceId, {
      type: 'CONVERSATION_UPDATED',
      conversationId,
      conversation: updatedConversation,
    });

    res.json({ success: true, conversation: updatedConversation });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to reject draft' });
  }
});
