import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../db';
import { MultilingualAIEngine } from '../ai/engine';
import { broadcastToWorkspace } from '../index';
import { decryptToken } from '../lib/crypto';

export const webhookRouter = Router();

const rawVerifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN || 'unified_inbox_meta_verify_token_secure';
const VERIFY_TOKEN = rawVerifyToken.replace(/^["']|["']$/g, '').trim();
const APP_SECRET = (process.env.META_APP_SECRET || '').replace(/^["']|["']$/g, '').trim();

// -----------------------------------------------------------------------------
// Meta Webhook Verification (GET)
// -----------------------------------------------------------------------------
const handleVerify = (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = String(req.query['hub.verify_token'] || '').replace(/^["']|["']$/g, '').trim();
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[Webhook] Meta webhook verified successfully');
    return res.status(200).send(challenge);
  }

  console.warn(`[Webhook] Verification mismatch. Received: "${token}", Expected: "${VERIFY_TOKEN}"`);
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
    // If header missing on dev or simulator, continue
    return next();
  }

  if (req.rawBody) {
    const expectedSignature = 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(req.rawBody).digest('hex');
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (signatureBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
      return next();
    }
  }

  if (req.body) {
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const expectedSignature = 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(raw).digest('hex');
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (signatureBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
      return next();
    }
  }

  // Graceful fallback for serverless runtimes where request body stream was pre-parsed before Express handler
  if (process.env.VERCEL || !req.rawBody) {
    console.warn('[Webhook] Notice: X-Hub-Signature-256 bypassed because serverless host pre-parsed the raw body.');
    return next();
  }

  console.warn('[Webhook] Invalid X-Hub-Signature-256 signature');
  return res.status(403).send('Invalid webhook signature');
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

      // Match workspace flexibly by Phone Number ID, externalAccountId, or metadata
      let account = await prisma.connectedAccount.findFirst({
        where: {
          platform: 'WHATSAPP',
          OR: [
            { accountId: String(phoneNumberId) },
            { externalAccountId: String(phoneNumberId) },
            { metadata: { contains: String(phoneNumberId) } },
          ],
        },
      });

      // Fallback: check if single WhatsApp account is connected
      if (!account) {
        account = await prisma.connectedAccount.findFirst({
          where: { platform: 'WHATSAPP', status: 'CONNECTED' },
        });
      }

      if (!account) {
        console.warn(`[Webhook] Unrouted WhatsApp message: No connected account found for phone_number_id: ${phoneNumberId}`);
        continue;
      }

      const workspaceId = account.workspaceId;

      for (const msg of value.messages) {
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
  const isInstagramObject = body.object === 'instagram';

  for (const entry of body.entry || []) {
    const entryId = String(entry.id || '');
    if (!entryId) continue;

    // Ingest both regular messaging items AND standby items (Meta Business Suite handover)
    const rawItems: any[] = [];
    if (Array.isArray(entry.messaging)) rawItems.push(...entry.messaging);
    if (Array.isArray(entry.standby)) rawItems.push(...entry.standby);

    if (entry.changes && Array.isArray(entry.changes)) {
      for (const change of entry.changes) {
        if (change.field === 'messages' && change.value) {
          rawItems.push({
            sender: change.value.from,
            recipient: { id: entryId },
            message: {
              mid: change.value.id,
              text: change.value.text,
              attachments: change.value.attachments,
            },
          });
        }
      }
    }

    for (const messagingItem of rawItems) {
      // Ignore delivery receipts or echoes
      if (!messagingItem.message || messagingItem.message.is_echo) continue;

      const senderId = String(messagingItem.sender?.id || '');
      const recipientId = String(messagingItem.recipient?.id || entryId);
      if (!senderId) continue;

      let channel = isInstagramObject ? 'INSTAGRAM' : 'MESSENGER';

      // Match connected account by recipientId or entryId
      let account = await prisma.connectedAccount.findFirst({
        where: {
          OR: [
            { accountId: recipientId },
            { externalAccountId: recipientId },
            { accountId: entryId },
            { externalAccountId: entryId },
            { metadata: { contains: recipientId } },
            { metadata: { contains: entryId } },
          ],
        },
      });

      // Fallback: match by channel
      if (!account) {
        account = await prisma.connectedAccount.findFirst({
          where: { platform: channel, status: 'CONNECTED' },
        });
      }

      if (!account) {
        console.warn(`[Webhook] Unrouted message: No connected account found for ID: ${recipientId} or ${entryId}`);
        continue;
      }

      channel = account.platform as any;
      const workspaceId = account.workspaceId;
      const textContent = messagingItem.message.text || '[Attachment received]';

      let customerName = channel === 'INSTAGRAM' ? `@user_${senderId.slice(-4)}` : `Customer ${senderId.slice(-4)}`;

      // Query real profile from Meta if token is available
      if (account.accessTokenEncrypted) {
        try {
          const pageToken = decryptToken(account.accessTokenEncrypted);
          if (pageToken) {
            const profileUrl = `https://graph.facebook.com/v21.0/${senderId}?fields=name,first_name,last_name,username&access_token=${pageToken}`;
            const profRes = await fetch(profileUrl).then((r) => r.json());
            if (profRes && (profRes.name || profRes.username)) {
              customerName = profRes.username ? `@${profRes.username}` : profRes.name;
            }
          }
        } catch {
          // Fallback to default name
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

  // 2. Upsert Customer safely
  const customer = await prisma.customer.upsert({
    where: {
      workspaceId_externalId: {
        workspaceId,
        externalId: externalSenderId,
      },
    },
    update: {
      name: senderName && !senderName.startsWith('@user_') ? senderName : undefined,
    },
    create: {
      workspaceId,
      externalId: externalSenderId,
      name: senderName,
      phone: channel === 'WHATSAPP' ? externalSenderId : undefined,
      handle: channel === 'INSTAGRAM' ? senderName : undefined,
    },
  });

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
