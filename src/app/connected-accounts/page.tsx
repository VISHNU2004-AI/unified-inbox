'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import {
  Share2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Phone,
  ShieldCheck,
  Copy,
  Check,
  Trash2,
  Settings,
  MessageSquare,
  Globe,
  X,
  Info
} from 'lucide-react';

interface ConnectedAccount {
  id: string;
  workspaceId: string;
  platform: 'WHATSAPP' | 'INSTAGRAM' | 'MESSENGER' | 'LIVECHAT';
  accountName: string;
  accountId: string;
  externalAccountId?: string | null;
  accountUsername?: string | null;
  status: 'NOT_CONNECTED' | 'CONNECTING' | 'CONNECTED' | 'REAUTHORIZATION_REQUIRED' | 'CONNECTION_FAILED' | 'DISCONNECTED';
  errorMessage?: string | null;
  lastSyncAt?: string | null;
  metadata?: string | null;
  createdAt: string;
}

function ConnectedAccountsContent() {
  const { currentWorkspace } = useAuth();
  const searchParams = useSearchParams();

  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedScript, setCopiedScript] = useState(false);
  const [scriptOrigin, setScriptOrigin] = useState('http://localhost:3000');

  // Modals state
  const [selectedManageAccount, setSelectedManageAccount] = useState<ConnectedAccount | null>(null);
  const [showWidgetModal, setShowWidgetModal] = useState(false);
  const [activatingWidget, setActivatingWidget] = useState(false);
  const [unconfiguredNotice, setUnconfiguredNotice] = useState<string | null>(null);

  // URL query params for OAuth callbacks
  const oauthError = searchParams?.get('error');
  const oauthStatus = searchParams?.get('status');
  const oauthPlatform = searchParams?.get('platform');
  const oauthName = searchParams?.get('name');

  const loadAccounts = useCallback(async () => {
    if (!currentWorkspace) return;
    try {
      setLoading(true);
      const res = await apiFetch('/api/channels');
      if (res && res.accounts) {
        setAccounts(res.accounts);
        apiFetch('/api/channels/resubscribe-webhooks', { method: 'POST' }).catch((err) => {
          console.warn('Webhook resubscription notice:', err);
        });
      }
    } catch (err) {
      console.warn('Failed to load accounts:', err);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setScriptOrigin(window.location.origin);
    }
  }, []);

  // Connect click handler - initiates official provider OAuth
  const handleConnectProvider = async (platform: 'WHATSAPP' | 'INSTAGRAM' | 'MESSENGER') => {
    try {
      // Check with backend if platform OAuth is configured
      const res = await apiFetch(`/api/channels/oauth-start?platform=${platform}`);
      if (res && res.isConfigured && res.oauthUrl) {
        // Redirect directly to official Meta authorization flow
        window.location.href = res.oauthUrl;
      } else {
        setUnconfiguredNotice(
          res?.message ||
            'Meta OAuth is not configured. Add META_APP_ID and META_APP_SECRET to the server .env file, then restart the API server.'
        );
      }
    } catch (err: any) {
      setUnconfiguredNotice(
        err?.message === 'Authentication token required' || err?.message === 'Invalid or expired token'
          ? 'Your session has expired. Please sign in again before connecting a social media account.'
          : err?.message || 'Unable to start the social media connection. Please try again.'
      );
    }
  };

  const handleDisconnect = async (account: ConnectedAccount) => {
    const platformLabel =
      account.platform === 'WHATSAPP'
        ? 'WhatsApp Business'
        : account.platform === 'INSTAGRAM'
        ? 'Instagram'
        : account.platform === 'MESSENGER'
        ? 'Facebook Messenger'
        : 'Website Chat';

    if (
      !confirm(
        `Are you sure you want to disconnect ${platformLabel} (${account.accountName})? Customer messages from this channel will no longer be routed to this workspace.`
      )
    ) {
      return;
    }

    try {
      await apiFetch(`/api/channels/${account.id}`, { method: 'DELETE' });
      await loadAccounts();
      setSelectedManageAccount(null);
    } catch (err: any) {
      alert(`Failed to disconnect account: ${err.message}`);
    }
  };

  const handleActivateLiveChat = async () => {
    try {
      setActivatingWidget(true);
      await apiFetch('/api/channels/install-livechat', { method: 'POST' });
      await loadAccounts();
    } catch (err: any) {
      alert(`Failed to activate live chat: ${err.message}`);
    } finally {
      setActivatingWidget(false);
    }
  };

  const copyWidgetScript = () => {
    const scriptTag = `<script src="${scriptOrigin}/widget.js" data-workspace-id="${currentWorkspace?.id}"></script>`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(scriptTag);
    }
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  // Find account by platform
  const getAccountByPlatform = (platform: 'WHATSAPP' | 'INSTAGRAM' | 'MESSENGER' | 'LIVECHAT') => {
    return accounts.find((a) => a.platform === platform && a.status === 'CONNECTED');
  };

  const whatsappAcc = getAccountByPlatform('WHATSAPP');
  const instagramAcc = getAccountByPlatform('INSTAGRAM');
  const messengerAcc = getAccountByPlatform('MESSENGER');
  const livechatAcc = getAccountByPlatform('LIVECHAT');

  const connectedTotal = [whatsappAcc, instagramAcc, messengerAcc, livechatAcc].filter(Boolean).length;

  return (
    <AppLayout
      title="Connected Accounts"
      subtitle="Connect your business messaging accounts to send and receive messages in Unified Inbox"
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={loadAccounts} className="btn btn-secondary btn-sm" style={{ gap: '0.4rem' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Sync Status</span>
          </button>
        </div>
      }
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Workspace Connection Banner */}
        <div
          className="glass-panel"
          style={{
            padding: '1.25rem 1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(139, 92, 246, 0.05))',
            borderColor: 'rgba(99, 102, 241, 0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 15px rgba(99, 102, 241, 0.35)',
              }}
            >
              <Share2 size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>Active Workspace:</span>
                <span style={{ color: '#818cf8' }}>{currentWorkspace?.name || 'My Business'}</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {connectedTotal} of 4 channels active &middot; All authorized conversations are unified in real-time
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                fontSize: '0.75rem',
                padding: '0.3rem 0.75rem',
                borderRadius: '20px',
                backgroundColor: connectedTotal > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                color: connectedTotal > 0 ? '#34d399' : 'var(--text-muted)',
                fontWeight: 600,
                border: `1px solid ${connectedTotal > 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(148, 163, 184, 0.2)'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: connectedTotal > 0 ? '#10b981' : '#94a3b8',
                }}
              />
              {connectedTotal > 0 ? `${connectedTotal} Active Inboxes` : 'No Channels Connected'}
            </span>
          </div>
        </div>

        {/* Alerts from OAuth Callback */}
        {oauthStatus === 'connected' && (
          <div
            style={{
              padding: '1rem 1.25rem',
              borderRadius: '10px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34d399',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CheckCircle2 size={20} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Account Connected Successfully</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                  {oauthPlatform} account {oauthName ? `"${oauthName}"` : ''} is now active and receiving customer messages.
                </div>
              </div>
            </div>
            <Link href="/inbox" className="btn btn-secondary btn-sm" style={{ borderColor: 'rgba(16, 185, 129, 0.4)' }}>
              Open Inbox
            </Link>
          </div>
        )}

        {oauthError && (
          <div
            style={{
              padding: '1rem 1.25rem',
              borderRadius: '10px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Connection Notice</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>{decodeURIComponent(oauthError)}</div>
            </div>
          </div>
        )}

        {unconfiguredNotice && (
          <div
            style={{
              padding: '1rem 1.25rem',
              borderRadius: '10px',
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: '#fbbf24',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Info size={20} style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Platform Service Notice</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>{unconfiguredNotice}</div>
              </div>
            </div>
            <button
              onClick={() => setUnconfiguredNotice(null)}
              style={{ background: 'none', border: 'none', color: '#fbbf24', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4 OFFICIAL CHANNELS GRID (ZERO DEVELOPER CREDENTIALS)                     */}
        {/* ========================================================================= */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {/* 1. WHATSAPP BUSINESS */}
          <div
            className="glass-panel"
            style={{
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
              borderTop: '3px solid #10b981',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                    }}
                  >
                    <Phone size={22} color="#10b981" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>WhatsApp Business</h3>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Official Meta WhatsApp API</div>
                  </div>
                </div>

                {whatsappAcc ? (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      color: '#34d399',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    <CheckCircle2 size={12} />
                    CONNECTED
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(148, 163, 184, 0.1)',
                      color: 'var(--text-muted)',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                    }}
                  >
                    Not Connected
                  </span>
                )}
              </div>

              {whatsappAcc ? (
                <div style={{ padding: '1rem', borderRadius: '10px', backgroundColor: 'rgba(0, 0, 0, 0.2)', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '0.2rem' }}>
                    {whatsappAcc.accountName}
                  </div>
                  {whatsappAcc.accountUsername && (
                    <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600, marginBottom: '0.5rem' }}>
                      {whatsappAcc.accountUsername}
                    </div>
                  )}
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Connected to: <span style={{ color: 'var(--text-primary)' }}>{currentWorkspace?.name}</span>
                  </div>
                  {whatsappAcc.lastSyncAt && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Last synchronized: {new Date(whatsappAcc.lastSyncAt).toLocaleString()}
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.75rem' }}>
                  Connect your WhatsApp Business account and receive customer messages in Unified Inbox.
                </p>
              )}
            </div>

            <div>
              {whatsappAcc ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => setSelectedManageAccount(whatsappAcc)}
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                  >
                    <Settings size={13} />
                    <span>Manage</span>
                  </button>
                  <button
                    onClick={() => handleDisconnect(whatsappAcc)}
                    className="btn btn-secondary btn-sm"
                    style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                    title="Disconnect WhatsApp"
                  >
                    <Trash2 size={13} />
                    <span>Disconnect</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleConnectProvider('WHATSAPP')}
                  className="btn btn-primary"
                  style={{ width: '100%', backgroundColor: '#10b981', borderColor: '#10b981' }}
                >
                  <span>Connect WhatsApp Business</span>
                  <ExternalLink size={14} />
                </button>
              )}
            </div>
          </div>

          {/* 2. INSTAGRAM */}
          <div
            className="glass-panel"
            style={{
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
              borderTop: '3px solid #e1306c',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: 'linear-gradient(45deg, rgba(240, 148, 51, 0.2), rgba(220, 39, 67, 0.2), rgba(188, 24, 136, 0.2))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid rgba(225, 48, 108, 0.3)',
                    }}
                  >
                    <Share2 size={22} color="#e1306c" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Instagram</h3>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Direct Messages & Inquiries</div>
                  </div>
                </div>

                {instagramAcc ? (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      color: '#34d399',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    <CheckCircle2 size={12} />
                    CONNECTED
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(148, 163, 184, 0.1)',
                      color: 'var(--text-muted)',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                    }}
                  >
                    Not Connected
                  </span>
                )}
              </div>

              {instagramAcc ? (
                <div style={{ padding: '1rem', borderRadius: '10px', backgroundColor: 'rgba(0, 0, 0, 0.2)', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '0.2rem' }}>
                    {instagramAcc.accountUsername || instagramAcc.accountName}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#f472b6', fontWeight: 600, marginBottom: '0.5rem' }}>
                    {instagramAcc.accountName}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Connected to: <span style={{ color: 'var(--text-primary)' }}>{currentWorkspace?.name}</span>
                  </div>
                  {instagramAcc.lastSyncAt && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Last synchronized: {new Date(instagramAcc.lastSyncAt).toLocaleString()}
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.75rem' }}>
                  Connect your Instagram business/professional account and manage messages from Unified Inbox.
                </p>
              )}
            </div>

            <div>
              {instagramAcc ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => setSelectedManageAccount(instagramAcc)}
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                  >
                    <Settings size={13} />
                    <span>Manage</span>
                  </button>
                  <button
                    onClick={() => handleDisconnect(instagramAcc)}
                    className="btn btn-secondary btn-sm"
                    style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                    title="Disconnect Instagram"
                  >
                    <Trash2 size={13} />
                    <span>Disconnect</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleConnectProvider('INSTAGRAM')}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
                    borderColor: '#dc2743',
                  }}
                >
                  <span>Connect Instagram</span>
                  <ExternalLink size={14} />
                </button>
              )}
            </div>
          </div>

          {/* 3. FACEBOOK MESSENGER */}
          <div
            className="glass-panel"
            style={{
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
              borderTop: '3px solid #0084ff',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(0, 132, 255, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid rgba(0, 132, 255, 0.3)',
                    }}
                  >
                    <MessageSquare size={22} color="#0084ff" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Facebook Messenger</h3>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Official Facebook Pages</div>
                  </div>
                </div>

                {messengerAcc ? (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      color: '#34d399',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    <CheckCircle2 size={12} />
                    CONNECTED
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(148, 163, 184, 0.1)',
                      color: 'var(--text-muted)',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                    }}
                  >
                    Not Connected
                  </span>
                )}
              </div>

              {messengerAcc ? (
                <div style={{ padding: '1rem', borderRadius: '10px', backgroundColor: 'rgba(0, 0, 0, 0.2)', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '0.2rem' }}>
                    {messengerAcc.accountName}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#60a5fa', fontWeight: 600, marginBottom: '0.5rem' }}>
                    Facebook Business Page
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Connected to: <span style={{ color: 'var(--text-primary)' }}>{currentWorkspace?.name}</span>
                  </div>
                  {messengerAcc.lastSyncAt && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Last synchronized: {new Date(messengerAcc.lastSyncAt).toLocaleString()}
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.75rem' }}>
                  Connect your Facebook Page and manage Messenger conversations from Unified Inbox.
                </p>
              )}
            </div>

            <div>
              {messengerAcc ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => setSelectedManageAccount(messengerAcc)}
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                  >
                    <Settings size={13} />
                    <span>Manage</span>
                  </button>
                  <button
                    onClick={() => handleDisconnect(messengerAcc)}
                    className="btn btn-secondary btn-sm"
                    style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                    title="Disconnect Messenger"
                  >
                    <Trash2 size={13} />
                    <span>Disconnect</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleConnectProvider('MESSENGER')}
                  className="btn btn-primary"
                  style={{ width: '100%', backgroundColor: '#0084ff', borderColor: '#0084ff' }}
                >
                  <span>Connect Facebook</span>
                  <ExternalLink size={14} />
                </button>
              )}
            </div>
          </div>

          {/* 4. WEBSITE CHAT */}
          <div
            className="glass-panel"
            style={{
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
              borderTop: '3px solid #8b5cf6',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(139, 92, 246, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                    }}
                  >
                    <Globe size={22} color="#8b5cf6" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Website Chat</h3>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Embeddable Live Widget</div>
                  </div>
                </div>

                {livechatAcc ? (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      color: '#34d399',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    <CheckCircle2 size={12} />
                    CONNECTED
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(148, 163, 184, 0.1)',
                      color: 'var(--text-muted)',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                    }}
                  >
                    Not Installed
                  </span>
                )}
              </div>

              {livechatAcc ? (
                <div style={{ padding: '1rem', borderRadius: '10px', backgroundColor: 'rgba(0, 0, 0, 0.2)', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '0.2rem' }}>
                    {livechatAcc.accountName}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#a78bfa', fontWeight: 600, marginBottom: '0.5rem' }}>
                    Zero-Config Web Widget
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Connected to: <span style={{ color: 'var(--text-primary)' }}>{currentWorkspace?.name}</span>
                  </div>
                  {livechatAcc.lastSyncAt && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Last synchronized: {new Date(livechatAcc.lastSyncAt).toLocaleString()}
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.75rem' }}>
                  Install the Unified Inbox chat widget on your website.
                </p>
              )}
            </div>

            <div>
              {livechatAcc ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => setShowWidgetModal(true)}
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                  >
                    <Globe size={13} />
                    <span>View Widget Code</span>
                  </button>
                  <button
                    onClick={() => handleDisconnect(livechatAcc)}
                    className="btn btn-secondary btn-sm"
                    style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                    title="Disconnect Widget"
                  >
                    <Trash2 size={13} />
                    <span>Disconnect</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowWidgetModal(true)}
                  className="btn btn-primary"
                  style={{ width: '100%', backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }}
                >
                  <span>Install Widget</span>
                  <Globe size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Security & Multi-Tenant Guarantee Footnote */}
        <div
          style={{
            padding: '1.25rem',
            borderRadius: '12px',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <ShieldCheck size={24} color="#10b981" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--text-primary)' }}>Unified Inbox SaaS Architecture:</strong> All platform connections are authenticated via official provider flows, encrypted at rest using AES-256-GCM, and strictly partitioned to your workspace. Customers never enter or manage API credentials.
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MANAGE ACCOUNT MODAL (ZERO SECRETS / PURE METADATA)                      */}
        {/* ========================================================================= */}
        {selectedManageAccount && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem',
              zIndex: 100,
            }}
          >
            <div className="glass-panel" style={{ maxWidth: '520px', width: '100%', padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                    Manage {selectedManageAccount.platform === 'WHATSAPP' ? 'WhatsApp' : selectedManageAccount.platform === 'INSTAGRAM' ? 'Instagram' : selectedManageAccount.platform === 'MESSENGER' ? 'Facebook' : 'Website Chat'}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    Connected to workspace: <strong style={{ color: '#818cf8' }}>{currentWorkspace?.name}</strong>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedManageAccount(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.75rem' }}>
                <div style={{ padding: '0.85rem 1rem', borderRadius: '8px', backgroundColor: 'rgba(0, 0, 0, 0.25)', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>Account Name:</span>
                  <span style={{ fontSize: '0.825rem', fontWeight: 600 }}>{selectedManageAccount.accountName}</span>
                </div>
                {selectedManageAccount.accountUsername && (
                  <div style={{ padding: '0.85rem 1rem', borderRadius: '8px', backgroundColor: 'rgba(0, 0, 0, 0.25)', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>Handle / Phone:</span>
                    <span style={{ fontSize: '0.825rem', fontWeight: 600 }}>{selectedManageAccount.accountUsername}</span>
                  </div>
                )}
                <div style={{ padding: '0.85rem 1rem', borderRadius: '8px', backgroundColor: 'rgba(0, 0, 0, 0.25)', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>Connection Status:</span>
                  <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#34d399' }}>CONNECTED</span>
                </div>
                <div style={{ padding: '0.85rem 1rem', borderRadius: '8px', backgroundColor: 'rgba(0, 0, 0, 0.25)', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>Webhook Ingestion:</span>
                  <span style={{ fontSize: '0.825rem', fontWeight: 600, color: '#818cf8' }}>Active (Auto-Configured)</span>
                </div>
                <div style={{ padding: '0.85rem 1rem', borderRadius: '8px', backgroundColor: 'rgba(0, 0, 0, 0.25)', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>Last Synchronized:</span>
                  <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                    {selectedManageAccount.lastSyncAt ? new Date(selectedManageAccount.lastSyncAt).toLocaleString() : 'Just now'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                <button
                  onClick={() => handleDisconnect(selectedManageAccount)}
                  className="btn btn-secondary"
                  style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                >
                  <Trash2 size={14} />
                  <span>Disconnect Account</span>
                </button>
                <button
                  onClick={() => setSelectedManageAccount(null)}
                  className="btn btn-primary"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* WEBSITE CHAT EMBED SCRIPT MODAL                                           */}
        {/* ========================================================================= */}
        {showWidgetModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem',
              zIndex: 100,
            }}
          >
            <div className="glass-panel" style={{ maxWidth: '620px', width: '100%', padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Globe size={20} color="#8b5cf6" />
                    <span>Website Live Chat Widget</span>
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    Install the Unified Inbox floating chat widget on any website (WordPress, Shopify, custom HTML)
                  </div>
                </div>
                <button
                  onClick={() => setShowWidgetModal(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Step 1: Copy Code */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Embed Script Tag:</span>
                  <span style={{ fontSize: '0.75rem', color: '#818cf8' }}>One-line installation</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <pre
                    style={{
                      padding: '1rem',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.8rem',
                      fontFamily: 'monospace',
                      color: '#38bdf8',
                      overflowX: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                    }}
                  >
                    {`<script src="${scriptOrigin}/widget.js" data-workspace-id="${currentWorkspace?.id}"></script>`}
                  </pre>
                  <button
                    onClick={copyWidgetScript}
                    className="btn btn-secondary btn-sm"
                    style={{ position: 'absolute', right: '0.5rem', top: '0.5rem', gap: '0.3rem' }}
                  >
                    {copiedScript ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
                    <span>{copiedScript ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div style={{ padding: '0.85rem 1rem', borderRadius: '8px', backgroundColor: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                Paste this script right before the closing <code style={{ color: '#fff' }}>&lt;/body&gt;</code> tag on your website. The widget immediately connects to your Unified Inbox and AI assistant.
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <a
                  href="/widget-demo.html"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ gap: '0.4rem' }}
                >
                  <ExternalLink size={13} />
                  <span>Preview Demo Widget</span>
                </a>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {!livechatAcc && (
                    <button
                      onClick={handleActivateLiveChat}
                      disabled={activatingWidget}
                      className="btn btn-primary"
                      style={{ backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }}
                    >
                      {activatingWidget ? 'Activating...' : 'Activate Live Chat'}
                    </button>
                  )}
                  <button
                    onClick={() => setShowWidgetModal(false)}
                    className="btn btn-secondary"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default function ConnectedAccountsPage() {
  return (
    <React.Suspense
      fallback={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-muted)' }}>
          Loading accounts...
        </div>
      }
    >
      <ConnectedAccountsContent />
    </React.Suspense>
  );
}
