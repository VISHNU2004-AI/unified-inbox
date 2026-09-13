'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { apiFetch } from '@/lib/api';
import {
  ShieldCheck,
  Users,
  Building,
  MessageSquare,
  Bot,
  Activity,
  UserX,
  UserCheck,
  Terminal,
  RefreshCw,
  AlertTriangle,
  Share2,
  Key,
  CheckCircle2,
  Lock,
  Globe,
  Phone
} from 'lucide-react';

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [metaConfig, setMetaConfig] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'USERS' | 'WEBHOOKS' | 'META_INTEGRATION'>('OVERVIEW');
  const [loading, setLoading] = useState(true);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes, webhooksRes, metaRes] = await Promise.all([
        apiFetch('/api/admin/stats').catch(() => null),
        apiFetch('/api/admin/users').catch(() => null),
        apiFetch('/api/admin/webhooks').catch(() => null),
        apiFetch('/api/admin/platform-meta-config').catch(() => null),
      ]);

      if (statsRes) setStats(statsRes.stats);
      if (usersRes && usersRes.users) setUsers(usersRes.users);
      if (webhooksRes && webhooksRes.webhooks) setWebhooks(webhooksRes.webhooks);
      if (metaRes) setMetaConfig(metaRes);
    } catch (err) {
      console.warn('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleToggleSuspend = async (userId: string) => {
    try {
      await apiFetch(`/api/admin/users/${userId}/suspend`, { method: 'PATCH' });
      loadAdminData();
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    }
  };

  return (
    <AppLayout
      title="Platform Superadmin Suite"
      subtitle="Global management across all multi-tenant workspaces, user accounts, and platform-level integrations"
      actions={
        <button onClick={loadAdminData} className="btn btn-secondary btn-sm" style={{ gap: '0.4rem' }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Data</span>
        </button>
      }
    >
      <div style={{ maxWidth: '1300px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Navigation Tabs */}
        <div className="tab-pill-list" style={{ maxWidth: '640px' }}>
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`tab-pill ${activeTab === 'OVERVIEW' ? 'active' : ''}`}
          >
            Platform Overview
          </button>
          <button
            onClick={() => setActiveTab('USERS')}
            className={`tab-pill ${activeTab === 'USERS' ? 'active' : ''}`}
          >
            Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('META_INTEGRATION')}
            className={`tab-pill ${activeTab === 'META_INTEGRATION' ? 'active' : ''}`}
          >
            Meta Integration
          </button>
          <button
            onClick={() => setActiveTab('WEBHOOKS')}
            className={`tab-pill ${activeTab === 'WEBHOOKS' ? 'active' : ''}`}
          >
            Webhook Logs ({webhooks.length})
          </button>
        </div>

        {/* Tab 1: Platform Overview */}
        {activeTab === 'OVERVIEW' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Total Platform Users</div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#6366f1' }}>{stats?.totalUsers || 3}</div>
              </div>
              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Active Workspaces</div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#10b981' }}>{stats?.totalWorkspaces || 1}</div>
              </div>
              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Total Conversations</div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#f59e0b' }}>{stats?.totalConversations || 4}</div>
              </div>
              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Messages Processed</div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#ec4899' }}>{stats?.totalMessages || 9}</div>
              </div>
            </div>

            {/* AI Real-time Logs Summary */}
            <div className="glass-panel" style={{ padding: '1.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Recent Grounded AI Ingestion Logs</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textAlign: 'left' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Time</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Incoming Message</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Intent</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Confidence</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!stats?.recentAiLogs || stats.recentAiLogs.length === 0) ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No AI message logs recorded yet.
                        </td>
                      </tr>
                    ) : (
                      stats.recentAiLogs.map((log: any) => (
                        <tr key={log.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                          <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                            {new Date(log.createdAt).toLocaleTimeString()}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {log.incomingText}
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span className="badge badge-neutral">{log.intent}</span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: '#10b981', fontWeight: 600 }}>
                            {Math.round(log.confidence * 100)}%
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span className={`badge ${log.decision === 'AUTO_SENT' ? 'badge-primary' : 'badge-neutral'}`}>
                              {log.decision}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Users Directory */}
        {activeTab === 'USERS' && (
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Global Users Directory</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>User</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Email</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Global Role</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{u.name}</td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{u.email}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span className="badge badge-primary">{u.role}</span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span className={`badge ${u.isSuspended ? 'badge-danger' : 'badge-success'}`}>
                          {u.isSuspended ? 'SUSPENDED' : 'ACTIVE'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {u.role !== 'SUPERADMIN' && (
                          <button
                            onClick={() => handleToggleSuspend(u.id)}
                            className="btn btn-secondary btn-sm"
                            style={{ gap: '0.3rem', color: u.isSuspended ? '#34d399' : '#f87171' }}
                          >
                            {u.isSuspended ? <UserCheck size={14} /> : <UserX size={14} />}
                            <span>{u.isSuspended ? 'Reactivate' : 'Suspend'}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Platform Meta Integration (Superadmin Configuration View) */}
        {activeTab === 'META_INTEGRATION' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            {/* Architecture Explanation Card */}
            <div
              className="glass-panel"
              style={{
                padding: '1.5rem',
                borderLeft: '4px solid #6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.06)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                <Lock size={18} color="#818cf8" />
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Platform-Level Architecture</h4>
              </div>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                Unified Inbox operates as a SaaS platform where Meta App credentials reside strictly on the server environment. Normal SaaS customers in individual workspaces click &quot;Connect&quot; to authorize their Facebook, Instagram, or WhatsApp accounts without ever seeing or configuring API credentials.
              </p>
            </div>

            {/* Config Status Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Meta App Configuration</div>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '12px',
                      backgroundColor: metaConfig?.isConfigured ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: metaConfig?.isConfigured ? '#34d399' : '#fbbf24',
                    }}
                  >
                    {metaConfig?.isConfigured ? 'CONFIGURED' : 'INITIALIZATION PENDING'}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.825rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Meta App ID:</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{metaConfig?.appIdMasked || 'Not set'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Meta App Secret:</span>
                    <span style={{ color: metaConfig?.appSecretConfigured ? '#34d399' : '#fbbf24', fontWeight: 600 }}>
                      {metaConfig?.appSecretConfigured ? 'Secured in .env' : 'Missing'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Graph API Version:</span>
                    <span style={{ fontFamily: 'monospace' }}>{metaConfig?.graphApiVersion || 'v21.0'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Webhook Verify Token:</span>
                    <span style={{ color: metaConfig?.webhookVerifyTokenConfigured ? '#34d399' : '#f87171', fontWeight: 600 }}>
                      {metaConfig?.webhookVerifyTokenConfigured ? 'Active & Configured' : 'Missing'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '1rem' }}>Platform Endpoints</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.825rem' }}>
                  <div>
                    <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>OAuth Callback URI:</div>
                    <code style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem', borderRadius: '6px', backgroundColor: 'rgba(0, 0, 0, 0.3)', display: 'block', wordBreak: 'break-all' }}>
                      {metaConfig?.redirectUri || 'http://localhost:5000/api/channels/meta/callback'}
                    </code>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Meta Inbound Webhook URL:</div>
                    <code style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem', borderRadius: '6px', backgroundColor: 'rgba(0, 0, 0, 0.3)', display: 'block', wordBreak: 'break-all', color: '#34d399' }}>
                      {metaConfig?.webhookUrl || 'http://localhost:5000/api/webhooks/meta'}
                    </code>
                  </div>
                </div>
              </div>
            </div>

            {/* Multi-Tenant Connection Metrics */}
            <div className="glass-panel" style={{ padding: '1.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Global Connected Inboxes ({metaConfig?.totalConnectedAccounts || 0})</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                {['WHATSAPP', 'INSTAGRAM', 'MESSENGER', 'LIVECHAT'].map((platform) => {
                  const count = metaConfig?.platformBreakdown?.find((p: any) => p.platform === platform)?.count || 0;
                  return (
                    <div
                      key={platform}
                      style={{
                        padding: '1.25rem',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.85rem',
                      }}
                    >
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          backgroundColor:
                            platform === 'WHATSAPP'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : platform === 'INSTAGRAM'
                              ? 'rgba(225, 48, 108, 0.15)'
                              : platform === 'MESSENGER'
                              ? 'rgba(0, 132, 255, 0.15)'
                              : 'rgba(139, 92, 246, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {platform === 'WHATSAPP' ? (
                          <Phone size={18} color="#10b981" />
                        ) : platform === 'INSTAGRAM' ? (
                          <Share2 size={18} color="#e1306c" />
                        ) : platform === 'MESSENGER' ? (
                          <MessageSquare size={18} color="#0084ff" />
                        ) : (
                          <Globe size={18} color="#8b5cf6" />
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{count}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{platform}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Webhook Logs */}
        {activeTab === 'WEBHOOKS' && (
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Terminal size={18} color="#6366f1" />
              <span>Real-Time Meta & Ingestion Webhook Logs</span>
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Raw payload inspection across WhatsApp, Instagram, Messenger, and Website LiveChat ingestion events.
            </p>

            <div style={{
              padding: '1rem',
              borderRadius: '8px',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              maxHeight: '420px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              {webhooks.length === 0 ? (
                <div style={{ color: 'var(--text-muted)' }}>
                  No webhook events logged yet. Trigger simulated webhook in Simulator to view raw payloads here.
                </div>
              ) : (
                webhooks.map((w, idx) => (
                  <div key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#818cf8', marginBottom: '0.25rem' }}>
                      <span>[{new Date(w.createdAt).toLocaleTimeString()}] [{w.platform}] {w.eventType}</span>
                      <span style={{ color: '#10b981' }}>{w.status}</span>
                    </div>
                    <pre style={{ color: '#94a3b8', fontSize: '0.7rem', overflowX: 'auto' }}>
                      {typeof w.payload === 'string' ? w.payload : JSON.stringify(w.payload, null, 2)}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
