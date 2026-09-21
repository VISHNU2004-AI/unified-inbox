import { prisma } from '../db.js';
import { decryptToken } from './crypto.js';
import { broadcastToWorkspace } from '../index.js';

export interface SyncResult {
  success: boolean;
  platform: string;
  accountId: string;
  importedConversations: number;
  importedMessages: number;
  error?: string;
}

/**
 * Synchronize recent conversations and messages from Meta Graph API for a connected account.
 * Supports Facebook Messenger and Instagram Direct. Verifies WhatsApp Business connectivity.
 */
export async function syncMetaAccountConversations(account: any): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    platform: account.platform,
    accountId: account.accountId,
    importedConversations: 0,
    importedMessages: 0,
  };

  if (!account.accessTokenEncrypted) {
    result.error = 'No access token available for this account';
    return result;
  }

  const token = decryptToken(account.accessTokenEncrypted);
  if (!token) {
    result.error = 'Failed to decrypt access token';
    return result;
  }

  const workspaceId = account.workspaceId;
  const platform = account.platform;

  try {
    if (platform === 'MESSENGER') {
      const pageId = account.externalAccountId || account.accountId;
      const url = `https://graph.facebook.com/v21.0/${pageId}/conversations?fields=id,updated_time,senders,messages.limit(30){id,message,created_time,from,to}&access_token=${encodeURIComponent(
        token
      )}`;

      const res = await fetch(url).then((r) => r.json());
      if (res.error) {
        throw new Error(res.error.message || 'Meta Messenger conversations API error');
      }

      const convList = res.data || [];
      for (const conv of convList) {
        const senders = conv.senders?.data || [];
        const customerSender = senders.find((s: any) => s.id !== pageId) || senders[0];
        if (!customerSender) continue;

        // Upsert Customer
        let customer = await prisma.customer.findFirst({
          where: { workspaceId, externalId: String(customerSender.id) },
        });

        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              workspaceId,
              externalId: String(customerSender.id),
              name: customerSender.name || `Customer ${String(customerSender.id).slice(-4)}`,
            },
          });
        }

        // Upsert Conversation
        const messagesList = (conv.messages?.data || []).reverse(); // oldest to newest
        const latestMsg = messagesList[messagesList.length - 1];

        let conversation = await prisma.conversation.findFirst({
          where: { workspaceId, customerId: customer.id, channel: 'MESSENGER' },
        });

        const lastMessageAt = latestMsg?.created_time ? new Date(latestMsg.created_time) : new Date(conv.updated_time || Date.now());
        const lastMessageContent = latestMsg?.message || '[Conversation active]';

        if (!conversation) {
          conversation = await prisma.conversation.create({
            data: {
              workspaceId,
              customerId: customer.id,
              channel: 'MESSENGER',
              status: 'OPEN',
              unreadCount: 0,
              lastMessageAt,
              lastMessageContent,
            },
          });
          result.importedConversations++;
        } else {
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              lastMessageAt,
              lastMessageContent,
            },
          });
        }

        // Upsert Messages
        for (const msg of messagesList) {
          const existing = await prisma.message.findFirst({
            where: { workspaceId, externalMessageId: msg.id },
          });

          if (!existing) {
            const isFromPage = msg.from?.id === pageId;
            await prisma.message.create({
              data: {
                workspaceId,
                conversationId: conversation.id,
                channel: 'MESSENGER',
                externalMessageId: msg.id,
                senderType: isFromPage ? 'AGENT' : 'CUSTOMER',
                senderName: msg.from?.name || (isFromPage ? account.accountName : customer.name),
                senderExternalId: msg.from?.id,
                content: msg.message || '[Attachment / Media]',
                direction: isFromPage ? 'OUTBOUND' : 'INBOUND',
                status: 'DELIVERED',
                isAiGenerated: false,
                createdAt: new Date(msg.created_time),
              },
            });
            result.importedMessages++;
          }
        }
      }
    } else if (platform === 'INSTAGRAM') {
      const igId = account.externalAccountId || account.accountId;
      const url = `https://graph.facebook.com/v21.0/${igId}/conversations?platform=instagram&fields=id,updated_time,senders,messages.limit(30){id,message,created_time,from,to}&access_token=${encodeURIComponent(
        token
      )}`;

      const res = await fetch(url).then((r) => r.json());
      if (res.error) {
        throw new Error(res.error.message || 'Meta Instagram conversations API error');
      }

      const convList = res.data || [];
      for (const conv of convList) {
        const senders = conv.senders?.data || [];
        const customerSender = senders.find((s: any) => s.id !== igId) || senders[0];
        if (!customerSender) continue;

        let customer = await prisma.customer.findFirst({
          where: { workspaceId, externalId: String(customerSender.id) },
        });

        const customerName = customerSender.username
          ? `@${customerSender.username}`
          : customerSender.name || `@user_${String(customerSender.id).slice(-4)}`;

        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              workspaceId,
              externalId: String(customerSender.id),
              name: customerName,
              handle: customerSender.username ? `@${customerSender.username}` : undefined,
            },
          });
        }

        const messagesList = (conv.messages?.data || []).reverse();
        const latestMsg = messagesList[messagesList.length - 1];

        let conversation = await prisma.conversation.findFirst({
          where: { workspaceId, customerId: customer.id, channel: 'INSTAGRAM' },
        });

        const lastMessageAt = latestMsg?.created_time ? new Date(latestMsg.created_time) : new Date(conv.updated_time || Date.now());
        const lastMessageContent = latestMsg?.message || '[Instagram inquiry]';

        if (!conversation) {
          conversation = await prisma.conversation.create({
            data: {
              workspaceId,
              customerId: customer.id,
              channel: 'INSTAGRAM',
              status: 'OPEN',
              unreadCount: 0,
              lastMessageAt,
              lastMessageContent,
            },
          });
          result.importedConversations++;
        } else {
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              lastMessageAt,
              lastMessageContent,
            },
          });
        }

        for (const msg of messagesList) {
          const existing = await prisma.message.findFirst({
            where: { workspaceId, externalMessageId: msg.id },
          });

          if (!existing) {
            const isFromPage = msg.from?.id === igId;
            await prisma.message.create({
              data: {
                workspaceId,
                conversationId: conversation.id,
                channel: 'INSTAGRAM',
                externalMessageId: msg.id,
                senderType: isFromPage ? 'AGENT' : 'CUSTOMER',
                senderName: msg.from?.username ? `@${msg.from.username}` : msg.from?.name || (isFromPage ? account.accountName : customer.name),
                senderExternalId: msg.from?.id,
                content: msg.message || '[Attachment / Media]',
                direction: isFromPage ? 'OUTBOUND' : 'INBOUND',
                status: 'DELIVERED',
                isAiGenerated: false,
                createdAt: new Date(msg.created_time),
              },
            });
            result.importedMessages++;
          }
        }
      }
    } else if (platform === 'WHATSAPP') {
      // WhatsApp Cloud API is webhook-driven; test connectivity to phone number endpoint
      const phoneId = account.accountId;
      const testUrl = `https://graph.facebook.com/v21.0/${phoneId}?fields=id,display_phone_number,verified_name,quality_rating&access_token=${encodeURIComponent(
        token
      )}`;
      const testRes = await fetch(testUrl).then((r) => r.json());
      if (testRes.error) {
        throw new Error(testRes.error.message || 'WhatsApp Cloud API connectivity test failed');
      }

      // Update phone details if available
      await prisma.connectedAccount.update({
        where: { id: account.id },
        data: {
          accountUsername: testRes.display_phone_number || account.accountUsername,
          accountName: testRes.verified_name || account.accountName,
        },
      });
    }

    // Update lastSyncAt and status
    await prisma.connectedAccount.update({
      where: { id: account.id },
      data: {
        lastSyncAt: new Date(),
        status: 'CONNECTED',
        errorMessage: null,
      },
    });

    result.success = true;

    // Broadcast update so connected agents immediately see imported conversations
    broadcastToWorkspace(workspaceId, {
      type: 'CONVERSATION_UPDATED',
      workspaceId,
      platform,
      importedMessages: result.importedMessages,
      importedConversations: result.importedConversations,
    });
  } catch (err: any) {
    console.error(`[Meta Sync] Error syncing ${platform} (${account.accountId}):`, err.message);
    result.error = err.message;
    await prisma.connectedAccount.update({
      where: { id: account.id },
      data: {
        errorMessage: err.message,
      },
    });
  }

  return result;
}

/**
 * Diagnostics helper to verify access token and permissions for an account
 */
export async function diagnoseMetaAccount(account: any) {
  if (!account.accessTokenEncrypted) {
    return { valid: false, error: 'No access token stored' };
  }
  const token = decryptToken(account.accessTokenEncrypted);
  if (!token) {
    return { valid: false, error: 'Unable to decrypt token' };
  }

  try {
    const debugUrl = `https://graph.facebook.com/v21.0/debug_token?input_token=${encodeURIComponent(
      token
    )}&access_token=${encodeURIComponent(token)}`;
    const debugRes = await fetch(debugUrl).then((r) => r.json());

    const meUrl = `https://graph.facebook.com/v21.0/me?access_token=${encodeURIComponent(token)}`;
    const meRes = await fetch(meUrl).then((r) => r.json());

    return {
      valid: !debugRes.error && !meRes.error,
      accountDetails: meRes,
      tokenData: debugRes.data,
      webhookUrl: process.env.META_WEBHOOK_URL || 'https://unified-inbox-azure.vercel.app/api/webhooks/meta',
      verifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN || 'unified_inbox_meta_verify_token_secure',
    };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}
