import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../db.js';
import { MultilingualAIEngine } from '../ai/engine.js';
import { broadcastToWorkspace } from '../index.js';
import { decryptToken } from '../lib/crypto.js';

export const webhookRouter = Router();

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'unified_inbox_meta_verify_token_secure';
const APP_SECRET = process.env.META_APP_SECRET || '';

// -----------------------------------------------------------------------------
// Meta Webhook Verification (GET)
// -----------------------------------------------------------------------------
const handleVerify = (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[Webhook] Meta webhook verified successfully');
    return res.status(200).send(challenge);
  }

  console.warn('[Webhook] Verification failed: token mismatch');
  return res.status(403).send('Verification token mismatch');
};

webhookRouter.get('/meta', handleVerify);
webhookRouter.get('/whatsapp', handleVerify);
webhookRouter.get('/instagram', handleVerify);
webhookRouter.get('/messenger', handleVerify);

// -----------------------------------------------------------------------------
// Meta Webhook Signature Verification Middleware
// -----------------------------------------------------------------------------
const verifyMetaSignature = (req: Request, res: Response, next: NextFunction) => {
  // If app secret is not configured or in dev mock mode, proceed
  if (!APP_SECRET || APP_SECRET === 'dev_meta_app_secret' || APP_SECRET === 'your_meta_app_secret') {
    return next();
  }

  const signature = req.headers['x-hub-signature-256'] as string;
  if (!signature) {
    console.warn('[Webhook] Missing X-Hub-Signature-256 header');
    return res.status(401).send('Signature header missing');
  }

  const expectedSignature =
    'sha256=' +
    crypto
      .createHmac('sha256', APP_SECRET)
      .update(req.rawBody || JSON.stringify(req.body))
      .digest('hex');

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    console.warn('[Webhook] Invalid X-Hub-Signature-256 signature');
    return res.status(403).send('Invalid webhook signature');
  }

  next();
};

// -----------------------------------------------------------------------------
// Meta Inbound Events (POST)
// -----------------------------------------------------------------------------
const handleInboundEvent = async (req: Request, res: Response) => {
  // Always return 200 OK immediately to Meta to prevent retry storms
  res.status(200).send('EVENT_RECEIVED');

  try {
    const body = req.body;
    if (!body || !body.entry) return;

    const eventType = body.entry?.some((entry: any) =>
      (entry.messaging || []).some((item: any) => item.message && !item.message.is_echo) ||
      (entry.changes || []).some((change: any) => change.field === 'messages' && change.value?.messages)
    ) ? 'messages' : body.entry?.[0]?.changes?.[0]?.field || 'unknown';

    // Log raw webhook event
    await prisma.webhookEvent.create({
      data: {
        platform: body.object ? body.object.toUpperCase() : 'META',
        eventType,
        payload: JSON.stringify(body),
        status: 'PROCESSED',
        processedAt: new Date(),
      },
    });

    if (body.object === 'whatsapp_business_account') {
      await processWhatsAppPayload(body);
    } else if (body.object === 'instagram' || body.object === 'page') {
      await processMessengerOrInstagramPayload(body);
    }
  } catch (error: any) {
    console.error('[Webhook] Ingestion processing error:', error);
  }
};

webhookRouter.post('/meta', verifyMetaSignature, handleInboundEvent);
webhookRouter.post('/whatsapp', verifyMetaSignature, handleInboundEvent);
webhookRouter.post('/instagram', verifyMetaSignature, handleInboundEvent);
webhookRouter.post('/messenger', verifyMetaSignature, handleInboundEvent);

// -----------------------------------------------------------------------------
// WhatsApp Normalizer & Workspace Resolution
// -----------------------------------------------------------------------------
async function processWhatsAppPayload(body: any) {
  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value;
      if (!value || !value.messages) continue;

      const phoneNumberId = value.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      // Match workspace STRICTLY by the connected WhatsApp account ID (Phone Number ID)
      const account = await prisma.connectedAccount.findFirst({
        where: {
          platform: 'WHATSAPP',
          OR: [{ accountId: String(phoneNumberId) }, { externalAccountId: String(phoneNumberId) }],
          status: 'CONNECTED',
        },
      });
      if (!account) {
        console.warn(`[Webhook] Unrouted WhatsApp message: No connected account found for phone_number_id: ${phoneNumberId}`);
        continue;
      }

      const workspaceId = account.workspaceId;

      for (const msg of value.messages) {
        // Skip message if not text (or handle voice/image placeholder)
        const textContent =
          msg.text?.body ||
          (msg.type === 'button' ? msg.button?.text : null) ||
          (msg.type === 'interactive' ? msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title : null) ||
          `[${msg.type?.toUpperCase() || 'MEDIA'} received]`;

        const contact = value.contacts?.find((c: any) => c.wa_id === msg.from);
        const customerName = contact?.profile?.name || msg.from;

        await handleIncomingNormalizedMessage({
          workspaceId,
          channel: 'WHATSAPP',
          externalSenderId: msg.from,
          senderName: customerName,
          content: textContent,
          externalMessageId: msg.id,
          rawPayload: msg,
        });
      }
    }
  }
}

// -----------------------------------------------------------------------------
// Messenger & Instagram Normalizer & Workspace Resolution
// -----------------------------------------------------------------------------
async function processMessengerOrInstagramPayload(body: any) {
  const isInstagram = body.object === 'instagram';
  const channel = isInstagram ? 'INSTAGRAM' : 'MESSENGER';

  for (const entry of body.entry || []) {
    const recipientId = entry.id; // Page ID or Instagram Business Account ID
    if (!recipientId) continue;

    // Match workspace STRICTLY by the connected Page ID / Instagram Account ID
    const account = await prisma.connectedAccount.findFirst({
      where: {
        platform: channel,
        OR: [{ accountId: String(recipientId) }, { externalAccountId: String(recipientId) }],
        status: 'CONNECTED',
      },
    });

    if (!account) {
      console.warn(`[Webhook] Unrouted ${channel} message: No connected account found for ID: ${recipientId}`);
      continue;
    }

    const workspaceId = account.workspaceId;

    const messagingItems = isInstagram
      ? (entry.messaging || []).concat(
          (entry.changes || [])
            .filter((change: any) => change.field === 'messages' && change.value)
            .map((change: any) => ({
              sender: change.value.from,
              message: {
                mid: change.value.id,
                text: change.value.text,
                attachments: change.value.attachments,
              },
            }))
        )
      : entry.messaging || [];

    for (const messagingItem of messagingItems) {
      // Ignore delivery receipts or read statuses here
      if (!messagingItem.message || messagingItem.message.is_echo) continue;

      const senderId = messagingItem.sender?.id;
      if (!senderId) {
        console.warn(`[Webhook] Ignoring ${channel} event without a sender ID`);
        continue;
      }
      const textContent = messagingItem.message.text || '[Attachment received]';

      let customerName = isInstagram ? `@user_${senderId.slice(-4)}` : `Customer ${senderId.slice(-4)}`;

      // Attempt to query real user profile from Meta if page token is available
      if (account.accessTokenEncrypted) {
        try {
          const pageToken = decryptToken(account.accessTokenEncrypted);
          if (pageToken) {
            const profileUrl = `https://graph.facebook.com/v21.0/${senderId}?fields=name,first_name,last_name&access_token=${pageToken}`;
            const profRes = await fetch(profileUrl).then((r) => r.json());
            if (profRes && profRes.name) {
              customerName = profRes.name;
            }
          }
        } catch (nameErr) {
          // Fallback to anonymous handle
        }
      }

      await handleIncomingNormalizedMessage({
        workspaceId,
        channel,
        externalSenderId: senderId,
        senderName: customerName,
        content: textContent,
        externalMessageId: messagingItem.message.mid || `inbound-${Date.now()}-${senderId}`,
        rawPayload: messagingItem,
      });
    }
  }
}

// -----------------------------------------------------------------------------
// Core Ingestion Pipeline (Normalized -> Idempotency -> Customer -> AI -> Socket)
// -----------------------------------------------------------------------------
export async function handleIncomingNormalizedMessage(params: {
  workspaceId: string;
  channel: string;
  externalSenderId: string;
  senderName: string;
  content: string;
  externalMessageId?: string;
  rawPayload?: any;
}) {
  const { workspaceId, channel, externalSenderId, senderName, content, externalMessageId } = params;

  // 1. Idempotency Check: Prevent duplicate messages on webhook retries
  if (externalMessageId) {
    const existing = await prisma.message.findFirst({
      where: { externalMessageId, workspaceId },
    });
    if (existing) {
      console.log(`[Webhook] Duplicate message suppressed: ${externalMessageId}`);
      return;
    }
  }

  // 2. Upsert Customer in the correct Workspace
  let customer = await prisma.customer.findFirst({
    where: { workspaceId, externalId: externalSenderId },
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        workspaceId,
        externalId: externalSenderId,
        name: senderName,
        phone: channel === 'WHATSAPP' ? externalSenderId : undefined,
        handle: channel === 'INSTAGRAM' ? senderName : undefined,
      },
    });
  } else if (senderName && customer.name !== senderName && !senderName.startsWith('@user_')) {
    customer = await prisma.customer.update({
      where: { id: customer.id },
      data: { name: senderName },
    });
  }

  // 3. Upsert Conversation for this Customer
  let conversation = await prisma.conversation.findFirst({
    where: {
      workspaceId,
      customerId: customer.id,
      channel,
    },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        workspaceId,
        customerId: customer.id,
        channel,
        status: 'OPEN',
        unreadCount: 1,
        lastMessageAt: new Date(),
        lastMessageContent: content,
      },
    });
  } else {
    conversation = await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        lastMessageContent: content,
        unreadCount: { increment: 1 },
        status: conversation.status === 'RESOLVED' ? 'OPEN' : conversation.status,
      },
    });
  }

  // 4. Store Inbound Message
  const inboundMessage = await prisma.message.create({
    data: {
      workspaceId,
      conversationId: conversation.id,
      channel,
      externalMessageId: externalMessageId || `inbound-${Date.now()}`,
      senderType: 'CUSTOMER',
      senderName: customer.name,
      senderExternalId: externalSenderId,
      content,
      direction: 'INBOUND',
      status: 'DELIVERED',
      isAiGenerated: false,
      rawPayload: params.rawPayload ? JSON.stringify(params.rawPayload) : undefined,
    },
  });

  // 5. Broadcast to Connected Agents via WebSocket
  broadcastToWorkspace(workspaceId, {
    type: 'NEW_MESSAGE',
    workspaceId,
    conversationId: conversation.id,
    message: inboundMessage,
    customer,
  });

  // 6. Multilingual Grounded AI Engine Processing
  try {
    const aiConfig = await prisma.aIConfiguration.findUnique({
      where: { workspaceId },
    });

    const businessProfile = await prisma.businessProfile.findUnique({
      where: { workspaceId },
    });

    const products = await prisma.product.findMany({ where: { workspaceId } });
    const services = await prisma.service.findMany({ where: { workspaceId } });
    const chunks = await prisma.businessKnowledgeChunk.findMany({ where: { workspaceId }, take: 10 });

    const businessContext = {
      businessName: businessProfile?.businessName || 'Business Support',
      industry: businessProfile?.industry,
      description: businessProfile?.description,
      location: businessProfile?.location,
      contactEmail: businessProfile?.contactEmail,
      contactPhone: businessProfile?.contactPhone,
      businessHours: businessProfile?.businessHours,
      website: businessProfile?.website,
      supportInstructions: businessProfile?.supportInstructions,
      products,
      services,
      chunks,
    };

    const aiResult = await MultilingualAIEngine.processInboundMessage(content, businessContext, {
      personality: aiConfig?.personality,
      fallbackMessage: aiConfig?.fallbackMessage,
    });

    // Record AI Audit Log
    const aiLog = await prisma.aIMessageLog.create({
      data: {
        workspaceId,
        conversationId: conversation.id,
        incomingText: content,
        suggestedReply: aiResult.replyText,
        intent: aiResult.intent,
        sentiment: aiResult.sentiment,
        confidence: aiResult.confidence,
        decision: aiConfig?.humanReviewEnabled ? 'HELD_FOR_REVIEW' : 'AUTO_SENT',
        latencyMs: 140,
      },
    });

    if (aiConfig?.humanReviewEnabled) {
      // Hold for Human Review: update conversation with pending draft
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          needsHumanReview: true,
          pendingDraftReply: aiResult.replyText,
          escalationReason: aiResult.isEscalation ? aiResult.escalationReason : null,
        },
      });

      broadcastToWorkspace(workspaceId, {
        type: 'AI_DRAFT_READY',
        workspaceId,
        conversationId: conversation.id,
        draftContent: aiResult.replyText,
        aiLog,
      });
    } else {
      // Auto-Reply Mode: Dispatch reply to customer
      const autoMessage = await prisma.message.create({
        data: {
          workspaceId,
          conversationId: conversation.id,
          channel,
          senderType: 'AI_BOT',
          senderName: 'AI Assistant',
          content: aiResult.replyText,
          direction: 'OUTBOUND',
          status: 'SENT',
          isAiGenerated: true,
          aiConfidence: aiResult.confidence,
          aiIntent: aiResult.intent,
        },
      });

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: new Date(),
          lastMessageContent: aiResult.replyText,
          needsHumanReview: false,
        },
      });

      broadcastToWorkspace(workspaceId, {
        type: 'NEW_MESSAGE',
        workspaceId,
        conversationId: conversation.id,
        message: autoMessage,
      });

      // Dispatch to actual platform API if connected
      const connectedAcc = await prisma.connectedAccount.findFirst({
        where: { workspaceId, platform: channel, status: 'CONNECTED' },
      });

      if (connectedAcc && connectedAcc.accessTokenEncrypted) {
        dispatchOutboundToPlatform({
          account: connectedAcc,
          recipientId: externalSenderId,
          text: aiResult.replyText,
        }).catch((err) => console.warn('[AutoReply Dispatch Notice]:', err.message));
      }
    }
  } catch (aiErr) {
    console.error('[Webhook] AI Processing error:', aiErr);
  }
}

// -----------------------------------------------------------------------------
// Outbound Dispatch Helper (Graph API)
// -----------------------------------------------------------------------------
export async function dispatchOutboundToPlatform(params: {
  account: any;
  recipientId: string;
  text: string;
}): Promise<{ success: boolean; externalMessageId?: string; error?: string }> {
  const { account, recipientId, text } = params;
  const token = decryptToken(account.accessTokenEncrypted);

  if (!token) {
    return { success: false, error: 'Account access token cannot be decrypted' };
  }

  try {
    if (account.platform === 'WHATSAPP') {
      const url = `https://graph.facebook.com/v21.0/${account.accountId}/messages`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipientId,
          type: 'text',
          text: { preview_url: false, body: text },
        }),
      }).then((r) => r.json());

      if (res.error) {
        return { success: false, error: res.error.message };
      }
      return { success: true, externalMessageId: res.messages?.[0]?.id };
    } else if (account.platform === 'MESSENGER' || account.platform === 'INSTAGRAM') {
      const url = `https://graph.facebook.com/v21.0/me/messages?access_token=${token}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text },
        }),
      }).then((r) => r.json());

      if (res.error) {
        return { success: false, error: res.error.message };
      }
      return { success: true, externalMessageId: res.message_id };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Platform dispatch failed' };
  }
}
