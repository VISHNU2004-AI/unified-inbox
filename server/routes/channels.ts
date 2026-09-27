import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authenticateToken, AuthRequest } from './auth';
import { verifyWorkspaceAccess } from './workspaces';
import { decryptToken, encryptToken } from '../lib/crypto';
import { syncMetaAccountConversations, diagnoseMetaAccount } from '../lib/meta-sync';

export const channelRouter = Router();

// Sanitize account objects to NEVER send tokens or sensitive credentials to the client
function sanitizeAccount(acc: any) {
  const { accessTokenEncrypted, ...safe } = acc;
  return safe;
}

function getMetaOAuthConfiguration() {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const missing: string[] = [];

  if (!appId || appId === 'dev_meta_app_id' || appId === 'your_meta_app_id') missing.push('META_APP_ID');
  if (!appSecret || appSecret === 'dev_meta_app_secret' || appSecret === 'your_meta_app_secret') {
    missing.push('META_APP_SECRET');
  }

  return { appId, appSecret, isConfigured: missing.length === 0, missing };
}

function connectedAccountsUrl(query: string) {
  const appUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  return `${appUrl}/connected-accounts?${query}`;
}

async function subscribeMetaResource(resourceId: string, accessToken: string, fields?: string) {
  const fieldsQuery = fields ? `?subscribed_fields=${fields}&access_token=${encodeURIComponent(accessToken)}` : `?access_token=${encodeURIComponent(accessToken)}`;
  const response = await fetch(`https://graph.facebook.com/v21.0/${resourceId}/subscribed_apps${fieldsQuery}`, {
    method: 'POST',
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.error) {
    throw new Error(result.error?.message || `Meta webhook subscription failed with status ${response.status}`);
  }

  return result;
}

// -----------------------------------------------------------------------------
// 1. List Connected Accounts for Active Workspace (Multi-Tenant Scoped)
// -----------------------------------------------------------------------------
channelRouter.get('/', authenticateToken, verifyWorkspaceAccess, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = (req as any).workspaceId;
    const accounts = await prisma.connectedAccount.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ accounts: accounts.map(sanitizeAccount) });
  } catch (error: any) {
    console.error('[Channels] Error fetching accounts:', error);
    res.status(500).json({ error: 'Failed to fetch connected accounts' });
  }
});

// -----------------------------------------------------------------------------
// 2. Start Official Platform OAuth Authorization Flow
// -----------------------------------------------------------------------------
channelRouter.get('/oauth-start', authenticateToken, verifyWorkspaceAccess, (req: AuthRequest, res: Response) => {
  const platform = String(req.query.platform || 'MESSENGER').toUpperCase();
  const { appId, isConfigured, missing } = getMetaOAuthConfiguration();

  const host = req.get('host') || 'localhost:5000';
  const protocol = req.protocol;
  const redirectUri = process.env.META_OAUTH_REDIRECT_URI || `${protocol}://${host}/api/channels/meta/callback`;
  const workspaceId = (req as any).workspaceId;

  // Encode state with workspace, user, and requested platform
  const state = Buffer.from(
    JSON.stringify({
      workspaceId,
      userId: req.user!.id,
      platform,
      timestamp: Date.now(),
    })
  ).toString('base64');

  // Scopes tailored to the channel being authorized
  let scopes: string[] = [];
  if (platform === 'INSTAGRAM') {
    scopes = [
      'instagram_basic',
      'instagram_manage_messages',
      'pages_show_list',
      'pages_read_engagement',
      'business_management',
    ];
  } else if (platform === 'WHATSAPP') {
    scopes = [
      'whatsapp_business_management',
      'whatsapp_business_messaging',
      'business_management',
    ];
  } else {
    // Facebook Messenger
    scopes = [
      'pages_show_list',
      'pages_read_engagement',
      'pages_messaging',
      'pages_manage_metadata',
    ];
  }

  const oauthUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId || ''}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&state=${state}&scope=${scopes.join(',')}&response_type=code`;

  // If client wants JSON (from frontend API check)
  if (req.headers.accept?.includes('application/json')) {
    return res.json({
      isConfigured,
      oauthUrl: isConfigured ? oauthUrl : null,
      missingConfiguration: missing,
      message: isConfigured
        ? 'Redirecting to official Meta authorization...'
        : `Meta OAuth is not configured. Add ${missing.join(' and ')} to the server .env file, then restart the API server.`,
    });
  }

  // Direct browser navigation
  if (!isConfigured) {
    return res.redirect(connectedAccountsUrl('error=platform_not_configured'));
  }

  return res.redirect(oauthUrl);
});

// Backward-compatible alias for frontend
channelRouter.get('/meta/oauth-url', authenticateToken, verifyWorkspaceAccess, (req: AuthRequest, res: Response) => {
  const platform = String(req.query.platform || 'MESSENGER').toUpperCase();
  const { appId, isConfigured, missing } = getMetaOAuthConfiguration();

  const host = req.get('host') || 'localhost:5000';
  const protocol = req.protocol;
  const redirectUri = process.env.META_OAUTH_REDIRECT_URI || `${protocol}://${host}/api/channels/meta/callback`;
  const workspaceId = (req as any).workspaceId;

  const state = Buffer.from(
    JSON.stringify({
      workspaceId,
      userId: req.user!.id,
      platform,
      timestamp: Date.now(),
    })
  ).toString('base64');

  let scopes: string[] = [];
  if (platform === 'INSTAGRAM') {
    scopes = ['instagram_basic', 'instagram_manage_messages', 'pages_show_list', 'pages_read_engagement', 'business_management'];
  } else if (platform === 'WHATSAPP') {
    scopes = ['whatsapp_business_management', 'whatsapp_business_messaging', 'business_management'];
  } else {
    scopes = ['pages_show_list', 'pages_read_engagement', 'pages_messaging', 'pages_manage_metadata'];
  }

  const oauthUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId || ''}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&state=${state}&scope=${scopes.join(',')}&response_type=code`;

  res.json({
    isConfigured,
    oauthUrl: isConfigured ? oauthUrl : null,
    missingConfiguration: missing,
    message: isConfigured
      ? null
      : `Meta OAuth is not configured. Add ${missing.join(' and ')} to the server .env file, then restart the API server.`,
  });
});

// -----------------------------------------------------------------------------
// 3. Meta OAuth Callback (Token Exchange, Discovery & Automatic Webhook Setup)
// -----------------------------------------------------------------------------
channelRouter.get('/meta/callback', async (req: Request, res: Response) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    console.warn('[Meta OAuth] Authorization cancelled or denied:', error, error_description);
    return res.redirect(connectedAccountsUrl(`error=${encodeURIComponent(String(error_description || error))}`));
  }

  if (!code || !state) {
    return res.redirect(connectedAccountsUrl('error=missing_authorization_code'));
  }

  let stateData: { workspaceId: string; userId: string; platform?: string };
  try {
    stateData = JSON.parse(Buffer.from(String(state), 'base64').toString());
  } catch (err) {
    return res.redirect(connectedAccountsUrl('error=invalid_oauth_state'));
  }

  const { workspaceId, platform = 'MESSENGER' } = stateData;
  const { appId, appSecret, isConfigured } = getMetaOAuthConfiguration();
  const host = req.get('host') || 'localhost:5000';
  const protocol = req.protocol;
  const redirectUri = process.env.META_OAUTH_REDIRECT_URI || `${protocol}://${host}/api/channels/meta/callback`;

  if (!isConfigured) {
    return res.redirect(
      connectedAccountsUrl(`error=${encodeURIComponent(
        'Platform integration is not configured. Please contact the platform administrator.'
      )}`)
    );
  }

  try {
    // 1. Exchange authorization code for Short-Lived User Access Token
    const tokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&client_secret=${appSecret}&code=${code}`;

    const tokenRes = await fetch(tokenUrl).then((r) => r.json());
    if (tokenRes.error) {
      console.error('[Meta OAuth] Token exchange error:', tokenRes.error);
      return res.redirect(connectedAccountsUrl(`error=${encodeURIComponent(tokenRes.error.message || 'Token exchange failed')}`));
    }

    const shortLivedToken = tokenRes.access_token;

    // 2. Exchange for 60-day Long-Lived Token
    const longLivedUrl = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`;
    const longLivedRes = await fetch(longLivedUrl).then((r) => r.json());
    const userAccessToken = longLivedRes.access_token || shortLivedToken;

    let connectedCount = 0;
    let primaryConnectedName = '';

    // 3. Instagram / Facebook Pages Discovery
    if (platform === 'INSTAGRAM' || platform === 'MESSENGER') {
      const pagesUrl = `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name}&access_token=${userAccessToken}`;
      const pagesRes = await fetch(pagesUrl).then((r) => r.json());

      if (pagesRes.data && Array.isArray(pagesRes.data)) {
        for (const page of pagesRes.data) {
          if (platform === 'MESSENGER') {
            // Connect Facebook Page
            const savedMessengerAccount = await prisma.connectedAccount.upsert({
              where: {
                workspaceId_platform_accountId: {
                  workspaceId,
                  platform: 'MESSENGER',
                  accountId: page.id,
                },
              },
              update: {
                accountName: page.name,
                accountUsername: page.name,
                externalAccountId: page.id,
                accessTokenEncrypted: encryptToken(page.access_token),
                status: 'CONNECTED',
                lastSyncAt: new Date(),
                errorMessage: null,
                metadata: JSON.stringify({ pageId: page.id, pageName: page.name }),
              },
              create: {
                workspaceId,
                platform: 'MESSENGER',
                accountName: page.name,
                accountUsername: page.name,
                accountId: page.id,
                externalAccountId: page.id,
                accessTokenEncrypted: encryptToken(page.access_token),
                status: 'CONNECTED',
                lastSyncAt: new Date(),
                metadata: JSON.stringify({ pageId: page.id, pageName: page.name }),
              },
            });
            connectedCount++;
            primaryConnectedName = page.name;
            void syncMetaAccountConversations(savedMessengerAccount);

          }

          if (platform === 'INSTAGRAM' && page.instagram_business_account) {
            const ig = page.instagram_business_account;
            const savedIgAccount = await prisma.connectedAccount.upsert({
              where: {
                workspaceId_platform_accountId: {
                  workspaceId,
                  platform: 'INSTAGRAM',
                  accountId: ig.id,
                },
              },
              update: {
                accountName: ig.name || `@${ig.username}`,
                accountUsername: `@${ig.username}`,
                externalAccountId: ig.id,
                accessTokenEncrypted: encryptToken(page.access_token),
                status: 'CONNECTED',
                lastSyncAt: new Date(),
                errorMessage: null,
                metadata: JSON.stringify({ igId: ig.id, username: ig.username, linkedPageId: page.id }),
              },
              create: {
                workspaceId,
                platform: 'INSTAGRAM',
                accountName: ig.name || `@${ig.username}`,
                accountUsername: `@${ig.username}`,
                accountId: ig.id,
                externalAccountId: ig.id,
                accessTokenEncrypted: encryptToken(page.access_token),
                status: 'CONNECTED',
                lastSyncAt: new Date(),
                metadata: JSON.stringify({ igId: ig.id, username: ig.username, linkedPageId: page.id }),
              },
            });
            connectedCount++;
            primaryConnectedName = `@${ig.username}`;
            void syncMetaAccountConversations(savedIgAccount);

            try {
              await subscribeMetaResource(ig.id, page.access_token, 'messages,messaging_postbacks');
              console.log(`[Meta OAuth] Instagram webhook subscription enabled for ${ig.id}`);
            } catch (subErr: any) {
              console.warn('[Meta OAuth] Could not subscribe Instagram webhooks:', subErr.message);
            }
          } else if (platform === 'MESSENGER') {
            try {
              await subscribeMetaResource(page.id, page.access_token, 'messages,messaging_postbacks');
              console.log(`[Meta OAuth] Messenger webhook subscription enabled for ${page.id}`);
            } catch (subErr: any) {
              console.warn('[Meta OAuth] Could not subscribe Messenger webhooks:', subErr.message);
            }
          }
        }
      }
    }

    // 4. WhatsApp Business Accounts (WABAs) Discovery
    if (platform === 'WHATSAPP') {
      try {
        const wabaUrl = `https://graph.facebook.com/v21.0/me?fields=whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number,verified_name}}&access_token=${userAccessToken}`;
        const wabaRes = await fetch(wabaUrl).then((r) => r.json());
        if (wabaRes.whatsapp_business_accounts?.data) {
          for (const waba of wabaRes.whatsapp_business_accounts.data) {
            for (const phone of waba.phone_numbers?.data || []) {
              const savedWabaAccount = await prisma.connectedAccount.upsert({
                where: {
                  workspaceId_platform_accountId: {
                    workspaceId,
                    platform: 'WHATSAPP',
                    accountId: phone.id,
                  },
                },
                update: {
                  accountName: phone.verified_name || phone.display_phone_number || 'WhatsApp Business',
                  accountUsername: phone.display_phone_number,
                  externalAccountId: phone.id,
                  accessTokenEncrypted: encryptToken(userAccessToken),
                  status: 'CONNECTED',
                  lastSyncAt: new Date(),
                  errorMessage: null,
                  metadata: JSON.stringify({ wabaId: waba.id, phoneNumberId: phone.id }),
                },
                create: {
                  workspaceId,
                  platform: 'WHATSAPP',
                  accountName: phone.verified_name || phone.display_phone_number || 'WhatsApp Business',
                  accountUsername: phone.display_phone_number,
                  accountId: phone.id,
                  externalAccountId: phone.id,
                  accessTokenEncrypted: encryptToken(userAccessToken),
                  status: 'CONNECTED',
                  lastSyncAt: new Date(),
                  metadata: JSON.stringify({ wabaId: waba.id, phoneNumberId: phone.id }),
                },
              });
              connectedCount++;
              primaryConnectedName = phone.display_phone_number || phone.verified_name || 'WhatsApp Business';
              void syncMetaAccountConversations(savedWabaAccount);
            }

            try {
              await subscribeMetaResource(waba.id, userAccessToken);
              console.log(`[Meta OAuth] WhatsApp webhook subscription enabled for ${waba.id}`);
            } catch (subErr: any) {
              console.warn('[Meta OAuth] Could not subscribe WhatsApp webhooks:', subErr.message);
            }
          }
        }
      } catch (wabaErr) {
        console.warn('[Meta OAuth] WhatsApp discovery notice:', wabaErr);
      }
    }

    if (connectedCount === 0) {
      return res.redirect(
        connectedAccountsUrl('error=') +
          encodeURIComponent(
            platform === 'INSTAGRAM'
              ? 'Authorization succeeded, but no Instagram Professional Account linked to a Facebook Page was found in your Meta account.'
              : platform === 'WHATSAPP'
              ? 'Authorization succeeded, but no WhatsApp Business Phone Numbers were found in your Meta account.'
              : 'Authorization succeeded, but no Facebook Pages were found in your Meta account.'
          )
      );
    }

    res.redirect(
      connectedAccountsUrl(`status=connected&platform=${encodeURIComponent(platform)}&name=${encodeURIComponent(
        primaryConnectedName
      )}`)
    );
  } catch (err: any) {
    console.error('[Meta OAuth] Processing exception:', err);
    res.redirect(connectedAccountsUrl(`error=${encodeURIComponent(err.message || 'OAuth authorization failed')}`));
  }
});

// -----------------------------------------------------------------------------
// 4. Install / Enable Website Live Chat Widget
// -----------------------------------------------------------------------------
channelRouter.post('/install-livechat', authenticateToken, verifyWorkspaceAccess, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = (req as any).workspaceId;
    const widgetId = `lcw-${workspaceId}`;

    const account = await prisma.connectedAccount.upsert({
      where: {
        workspaceId_platform_accountId: {
          workspaceId,
          platform: 'LIVECHAT',
          accountId: widgetId,
        },
      },
      update: {
        status: 'CONNECTED',
        lastSyncAt: new Date(),
        errorMessage: null,
      },
      create: {
        workspaceId,
        platform: 'LIVECHAT',
        accountName: 'Website Live Chat Widget',
        accountUsername: 'Website Visitors',
        accountId: widgetId,
        externalAccountId: widgetId,
        status: 'CONNECTED',
        lastSyncAt: new Date(),
        metadata: JSON.stringify({ widgetId }),
      },
    });

    res.json({
      success: true,
      message: 'Website Live Chat widget activated for workspace',
      account: sanitizeAccount(account),
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to configure website chat' });
  }
});

// Re-subscribe already connected Meta accounts after webhook settings change
channelRouter.post('/resubscribe-webhooks', authenticateToken, verifyWorkspaceAccess, async (req: AuthRequest, res: Response) => {
  const workspaceId = (req as any).workspaceId;
  const accounts = await prisma.connectedAccount.findMany({
    where: { workspaceId, status: 'CONNECTED', platform: { in: ['WHATSAPP', 'INSTAGRAM', 'MESSENGER'] } },
  });
  const results = [];

  for (const account of accounts) {
    if (!account.accessTokenEncrypted) {
      results.push({ platform: account.platform, success: false, error: 'Access token is missing' });
      continue;
    }

    try {
      const accessToken = decryptToken(account.accessTokenEncrypted);
      if (!accessToken) {
        results.push({ platform: account.platform, accountId: account.accountId, success: false, error: 'Access token cannot be decrypted' });
        continue;
      }
      const metadata = account.metadata ? JSON.parse(account.metadata) : {};
      const resourceId = account.platform === 'WHATSAPP' ? metadata.wabaId || account.accountId : account.accountId;
      await subscribeMetaResource(resourceId, accessToken, account.platform === 'WHATSAPP' ? undefined : 'messages,messaging_postbacks');
      results.push({ platform: account.platform, accountId: account.accountId, success: true });
    } catch (error: any) {
      console.warn(`[Channels] Webhook resubscription failed for ${account.platform} ${account.accountId}:`, error.message);
      results.push({ platform: account.platform, accountId: account.accountId, success: false, error: error.message });
    }
  }

  res.json({ success: results.every((result) => result.success), results });
});

// -----------------------------------------------------------------------------
// 5. Disconnect Account (Multi-Tenant Scoped to Current Workspace)
// -----------------------------------------------------------------------------
channelRouter.delete('/:id', authenticateToken, verifyWorkspaceAccess, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = (req as any).workspaceId;
    const { id } = req.params;

    const account = await prisma.connectedAccount.findFirst({
      where: { id, workspaceId },
    });

    if (!account) {
      return res.status(404).json({ error: 'Connected account not found in this workspace' });
    }

    await prisma.connectedAccount.delete({
      where: { id },
    });

    res.json({ success: true, message: `${account.platform} account disconnected and removed` });
  } catch (error: any) {
    console.error('[Channels] Disconnect error:', error);
    res.status(500).json({ error: 'Failed to disconnect account' });
  }
});

// -----------------------------------------------------------------------------
// 6. Manual & Auto Sync Endpoints (Meta Graph API Sync)
// -----------------------------------------------------------------------------

// Sync all connected accounts for the current workspace
channelRouter.post('/sync-all', authenticateToken, verifyWorkspaceAccess, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = (req as any).workspaceId;
    const accounts = await prisma.connectedAccount.findMany({
      where: { workspaceId, status: 'CONNECTED', platform: { in: ['WHATSAPP', 'INSTAGRAM', 'MESSENGER'] } },
    });

    const results = [];
    for (const acc of accounts) {
      const syncResult = await syncMetaAccountConversations(acc);
      results.push(syncResult);
    }

    res.json({
      success: true,
      results,
      message: `Synchronized ${results.length} connected channels`,
    });
  } catch (error: any) {
    console.error('[Channels] Sync all error:', error);
    res.status(500).json({ error: 'Failed to sync connected accounts' });
  }
});

// Sync a specific connected account
channelRouter.post('/:id/sync', authenticateToken, verifyWorkspaceAccess, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = (req as any).workspaceId;
    const { id } = req.params;

    const account = await prisma.connectedAccount.findFirst({
      where: { id, workspaceId },
    });

    if (!account) {
      return res.status(404).json({ error: 'Connected account not found' });
    }

    const syncResult = await syncMetaAccountConversations(account);
    const updated = await prisma.connectedAccount.findUnique({ where: { id } });

    res.json({
      success: syncResult.success,
      result: syncResult,
      account: updated ? sanitizeAccount(updated) : null,
    });
  } catch (error: any) {
    console.error('[Channels] Sync account error:', error);
    res.status(500).json({ error: 'Failed to sync account messages' });
  }
});

// Diagnose connectivity and credentials for an account
channelRouter.get('/:id/diagnostic', authenticateToken, verifyWorkspaceAccess, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = (req as any).workspaceId;
    const { id } = req.params;

    const account = await prisma.connectedAccount.findFirst({
      where: { id, workspaceId },
    });

    if (!account) {
      return res.status(404).json({ error: 'Connected account not found' });
    }

    const diagnostic = await diagnoseMetaAccount(account);
    res.json({
      success: true,
      platform: account.platform,
      accountName: account.accountName,
      status: account.status,
      diagnostic,
    });
  } catch (error: any) {
    console.error('[Channels] Diagnostic error:', error);
    res.status(500).json({ error: 'Failed to run channel diagnostic' });
  }
});

