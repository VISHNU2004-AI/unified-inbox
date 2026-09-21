'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import { useWebSocket } from '@/lib/socket';
import {
  MessageSquare,
  Search,
  Send,
  Check,
  CheckCheck,
  Clock,
  Sparkles,
  AlertTriangle,
  User,
  Share2,
  Tag,
  FileText,
  CheckCircle2,
  X,
  Edit3,
  Bot,
  Filter,
  Phone,
  Mail,
  ChevronRight,
  RefreshCw
} from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  handle?: string;
  avatarUrl?: string;
  tags?: string;
}

interface Message {
  id: string;
  conversationId: string;
  channel: string;
  senderType: 'CUSTOMER' | 'AGENT' | 'AI_BOT';
  senderName: string;
  content: string;
  createdAt: string;
  status: string;
  isAiGenerated?: boolean;
  aiConfidence?: number;
  aiIntent?: string;
}

interface InternalNote {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  channel: 'WHATSAPP' | 'INSTAGRAM' | 'MESSENGER' | 'LIVECHAT';
  status: 'OPEN' | 'PENDING' | 'RESOLVED';
  unreadCount: number;
  lastMessageAt: string;
  lastMessageContent?: string;
  needsHumanReview: boolean;
  pendingDraftReply?: string;
  escalationReason?: string;
  customer: Customer;
  messages?: Message[];
  notes?: InternalNote[];
}

const formatInboxTime = (value?: string | null) => {
  if (!value) return '--:--';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--';

  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(date);
};

export default function InboxPage() {
  const { currentWorkspace, user } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);

  const [channelFilter, setChannelFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [replyText, setReplyText] = useState<string>('');
  const [composerMode, setComposerMode] = useState<'REPLY' | 'NOTE'>('REPLY');
  const [isDraftEditing, setIsDraftEditing] = useState<boolean>(false);
  const [editableDraft, setEditableDraft] = useState<string>('');
  const [showCustomerSidebar, setShowCustomerSidebar] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations list
  const fetchConversations = useCallback(async () => {
    if (!currentWorkspace) return;
    try {
      const query = new URLSearchParams();
      if (channelFilter !== 'ALL') query.set('channel', channelFilter);
      if (statusFilter !== 'ALL') query.set('status', statusFilter);
      if (searchQuery) query.set('search', searchQuery);

      const res = await apiFetch(`/api/conversations?${query.toString()}`);
      if (res && res.conversations) {
        setConversations(res.conversations);
        if (!selectedConvId && res.conversations.length > 0) {
          setSelectedConvId(res.conversations[0].id);
        }
      }
    } catch (err) {
      console.warn('[Inbox] Failed to fetch conversations:', err);
    }
  }, [currentWorkspace, channelFilter, statusFilter, searchQuery, selectedConvId]);

  // Fetch full details of selected conversation
  const fetchActiveConversation = useCallback(async (convId: string) => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/conversations/${convId}`);
      if (res && res.conversation) {
        setActiveConversation(res.conversation);
        setEditableDraft(res.conversation.pendingDraftReply || '');
      }
    } catch (err) {
      console.warn('[Inbox] Failed to fetch active conversation:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (selectedConvId) {
      fetchActiveConversation(selectedConvId);
    }
  }, [selectedConvId, fetchActiveConversation]);

  // Scroll to bottom on messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages]);

  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Real-time WebSocket Event Listener & Status
  const { status: wsStatus } = useWebSocket((event) => {
    if (!event) return;

    if (event.type === 'NEW_MESSAGE' || event.type === 'AI_DRAFT_READY' || event.type === 'CONVERSATION_UPDATED') {
      fetchConversations();
      if (selectedConvId && (event.conversationId === selectedConvId || event.conversation?.id === selectedConvId)) {
        fetchActiveConversation(selectedConvId);
      }
    }
  });

  // Polling fallback: Ensure conversations update even on serverless deployments where WebSockets cannot persist
  useEffect(() => {
    if (!currentWorkspace) return;

    const interval = setInterval(() => {
      fetchConversations();
      if (selectedConvId) {
        fetchActiveConversation(selectedConvId);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [currentWorkspace, selectedConvId, fetchConversations, fetchActiveConversation]);

  // Sync Messages from all connected social media accounts via Meta Graph API
  const handleSyncChannels = async () => {
    setIsSyncing(true);
    try {
      await apiFetch('/api/channels/sync-all', { method: 'POST' });
      await fetchConversations();
      if (selectedConvId) {
        await fetchActiveConversation(selectedConvId);
      }
    } catch (err) {
      console.warn('[Inbox] Sync channels error:', err);
      await fetchConversations();
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle Send Manual Reply or Internal Note
  const handleSend = async () => {
    if (!replyText.trim() || !activeConversation) return;

    const content = replyText.trim();
    setReplyText('');

    try {
      if (composerMode === 'REPLY') {
        await apiFetch('/api/messages/send', {
          method: 'POST',
          body: JSON.stringify({
            conversationId: activeConversation.id,
            content,
            senderType: 'AGENT',
            senderName: user?.name || 'Agent',
          }),
        });
      } else {
        await apiFetch(`/api/conversations/${activeConversation.id}/notes`, {
          method: 'POST',
          body: JSON.stringify({ content }),
        });
      }

      fetchActiveConversation(activeConversation.id);
      fetchConversations();
    } catch (err: any) {
      alert(`Failed to send message: ${err.message}`);
    }
  };

  // Handle Approve or Edit AI Draft
  const handleApproveDraft = async (overrideContent?: string) => {
    if (!activeConversation) return;
    try {
      await apiFetch('/api/messages/approve-draft', {
        method: 'POST',
        body: JSON.stringify({
          conversationId: activeConversation.id,
          finalContent: overrideContent || editableDraft,
        }),
      });
      setIsDraftEditing(false);
      fetchActiveConversation(activeConversation.id);
      fetchConversations();
    } catch (err: any) {
      alert(`Failed to approve draft: ${err.message}`);
    }
  };

  // Handle Discard AI Draft
  const handleDiscardDraft = async () => {
    if (!activeConversation) return;
    try {
      await apiFetch(`/api/conversations/${activeConversation.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ needsHumanReview: false, pendingDraftReply: null }),
      });
      fetchActiveConversation(activeConversation.id);
      fetchConversations();
    } catch (err: any) {
      alert(`Failed to discard draft: ${err.message}`);
    }
  };

  // Quick Canned Responses
  const insertCanned = (text: string) => {
    setReplyText((prev) => (prev ? `${prev} ${text}` : text));
  };

  const getChannelBadge = (ch: string) => {
    switch (ch) {
      case 'WHATSAPP':
        return <span className="badge badge-whatsapp">WhatsApp</span>;
      case 'INSTAGRAM':
        return <span className="badge badge-instagram">Instagram</span>;
      case 'MESSENGER':
        return <span className="badge badge-messenger">Messenger</span>;
      case 'LIVECHAT':
        return <span className="badge badge-livechat">Live Chat</span>;
      default:
        return <span className="badge">{ch}</span>;
    }
  };

  return (
    <AppLayout
      title="Unified Multi-Channel Inbox"
      subtitle="Real-time synchronized inquiries across WhatsApp, Instagram, Messenger & Live Chat"
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.75rem',
              color: wsStatus === 'CONNECTED' ? '#34d399' : '#818cf8',
              backgroundColor: wsStatus === 'CONNECTED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)',
              border: `1px solid ${wsStatus === 'CONNECTED' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`,
              padding: '0.25rem 0.65rem',
              borderRadius: '15px',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: wsStatus === 'CONNECTED' ? '#10b981' : '#818cf8',
                boxShadow: wsStatus === 'CONNECTED' ? '0 0 6px #10b981' : '0 0 6px #818cf8',
              }}
            />
            <span>{wsStatus === 'CONNECTED' ? 'Live WebSocket' : 'Live Polling'}</span>
          </div>

          <button
            onClick={handleSyncChannels}
            disabled={isSyncing}
            className="btn btn-secondary btn-sm"
            style={{ gap: '0.4rem' }}
            title="Fetch latest messages from Meta Graph API for all channels"
          >
            <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Messages'}</span>
          </button>
        </div>
      }
    >
      <div style={{
        display: 'flex',
        height: 'calc(100vh - 112px)',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-default)',
        overflow: 'hidden'
      }}>
        {/* ========================================================================= */}
        {/* COLUMN 1 & 2: Filters & Conversation List */}
        {/* ========================================================================= */}
        <div style={{
          width: '380px',
          borderRight: '1px solid var(--border-default)',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-card)',
          flexShrink: 0
        }}>
          {/* Search and Channel Pills */}
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Search patient, phone, or text..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '2.2rem', fontSize: '0.825rem' }}
              />
              <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>

            {/* Channel Tabs */}
            <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
              {['ALL', 'WHATSAPP', 'INSTAGRAM', 'MESSENGER', 'LIVECHAT'].map((ch) => (
                <button
                  key={ch}
                  onClick={() => setChannelFilter(ch)}
                  style={{
                    padding: '0.25rem 0.55rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.725rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    border: '1px solid',
                    borderColor: channelFilter === ch ? 'var(--color-primary)' : 'var(--border-subtle)',
                    backgroundColor: channelFilter === ch ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                    color: channelFilter === ch ? '#fff' : 'var(--text-secondary)'
                  }}
                >
                  {ch === 'ALL' ? 'All Channels' : ch}
                </button>
              ))}
            </div>

            {/* Status Tabs */}
            <div className="tab-pill-list">
              {['ALL', 'OPEN', 'PENDING', 'RESOLVED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`tab-pill ${statusFilter === st ? 'active' : ''}`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {conversations.length === 0 ? (
              <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <MessageSquare size={32} style={{ margin: '0 auto 0.75rem auto', opacity: 0.4 }} />
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>No conversations found</div>
                <div style={{ fontSize: '0.775rem', marginTop: '0.25rem' }}>Send a simulated message via the simulator or clear filters.</div>
              </div>
            ) : (
              conversations.map((conv) => {
                const isSelected = selectedConvId === conv.id;
                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConvId(conv.id)}
                    style={{
                      padding: '1rem',
                      borderBottom: '1px solid var(--border-subtle)',
                      backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                      borderLeft: isSelected ? '3px solid var(--color-primary)' : '3px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: '#334155',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          color: '#fff',
                          flexShrink: 0
                        }}>
                          {conv.customer.name ? conv.customer.name[0].toUpperCase() : 'C'}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {conv.customer.name}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {conv.customer.phone || conv.customer.handle || 'Anonymous'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {formatInboxTime(conv.lastMessageAt)}
                        </span>
                        {getChannelBadge(conv.channel)}
                      </div>
                    </div>

                    <div style={{
                      fontSize: '0.8rem',
                      color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginTop: '0.25rem'
                    }}>
                      {conv.lastMessageContent || 'No messages yet'}
                    </div>

                    {/* Needs Review or Unread Tag */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem' }}>
                      {conv.needsHumanReview && (
                        <span className="badge badge-review" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                          <AlertTriangle size={10} /> AI Draft Review
                        </span>
                      )}
                      {conv.unreadCount > 0 && (
                        <span style={{
                          fontSize: '0.65rem',
                          padding: '0.1rem 0.45rem',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: 'var(--color-primary)',
                          color: '#fff',
                          fontWeight: 700
                        }}>
                          {conv.unreadCount} new
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUMN 3: Active Conversation Thread */}
        {/* ========================================================================= */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)', minWidth: 0 }}>
          {activeConversation ? (
            <>
              {/* Thread Header */}
              <div style={{
                height: '60px',
                padding: '0 1.25rem',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'rgba(15, 20, 32, 0.7)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: '#4338ca',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    color: '#fff'
                  }}>
                    {activeConversation.customer.name[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {activeConversation.customer.name}
                      {getChannelBadge(activeConversation.channel)}
                    </div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                      {activeConversation.customer.phone || activeConversation.customer.handle || 'Connected Channel Customer'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button
                    onClick={() => setShowCustomerSidebar(!showCustomerSidebar)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem' }}
                  >
                    <User size={13} />
                    <span>Customer Details</span>
                  </button>
                </div>
              </div>

              {/* Messages Stream */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {activeConversation.messages && activeConversation.messages.map((msg) => {
                  const isCustomer = msg.senderType === 'CUSTOMER';
                  const isAi = msg.senderType === 'AI_BOT';

                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isCustomer ? 'flex-start' : 'flex-end',
                        maxWidth: '78%',
                        alignSelf: isCustomer ? 'flex-start' : 'flex-end'
                      }}
                    >
                      {/* Sender Tag */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.7rem',
                        color: 'var(--text-muted)',
                        marginBottom: '0.25rem'
                      }}>
                        {isAi ? (
                          <span className="badge badge-ai" style={{ fontSize: '0.65rem' }}>
                            <Bot size={11} /> AI Auto-Reply ({msg.aiConfidence ? `${Math.round(msg.aiConfidence * 100)}%` : 'Grounded'})
                          </span>
                        ) : (
                          <span>{msg.senderName}</span>
                        )}
                        <span>•</span>
                        <span>{formatInboxTime(msg.createdAt)}</span>
                      </div>

                      {/* Bubble */}
                      <div style={{
                        padding: '0.85rem 1.15rem',
                        borderRadius: isCustomer ? '14px 14px 14px 2px' : '14px 14px 2px 14px',
                        backgroundColor: isCustomer
                          ? 'rgba(30, 41, 59, 0.75)'
                          : isAi
                          ? 'rgba(99, 102, 241, 0.2)'
                          : 'var(--color-primary)',
                        border: isCustomer
                          ? '1px solid var(--border-default)'
                          : isAi
                          ? '1px solid rgba(99, 102, 241, 0.4)'
                          : 'none',
                        color: '#fff',
                        fontSize: '0.875rem',
                        lineHeight: 1.5,
                        boxShadow: isAi ? '0 0 15px rgba(99, 102, 241, 0.25)' : 'none',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {msg.content}
                      </div>

                      {/* Status indicator for outbound */}
                      {!isCustomer && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.675rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          <CheckCheck size={12} color="#10b981" />
                          <span>Sent via {activeConversation.channel}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* ================================================================= */}
              {/* AI DRAFT REVIEW PANEL (WHEN HELD FOR HUMAN APPROVAL) */}
              {/* ================================================================= */}
              {(activeConversation.needsHumanReview || activeConversation.pendingDraftReply) && (
                <div style={{
                  margin: '0 1.25rem 0.75rem 1.25rem',
                  padding: '1rem 1.25rem',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(99, 102, 241, 0.12))',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  boxShadow: 'var(--shadow-md)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fbbf24', fontWeight: 700, fontSize: '0.825rem' }}>
                      <Sparkles size={16} />
                      <span>AI Suggested Draft Reply (Awaiting Your Approval)</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        onClick={() => setIsDraftEditing(!isDraftEditing)}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.725rem', padding: '0.2rem 0.5rem' }}
                      >
                        <Edit3 size={12} />
                        <span>{isDraftEditing ? 'Done Editing' : 'Edit Text'}</span>
                      </button>
                      <button
                        onClick={handleDiscardDraft}
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '0.725rem', padding: '0.2rem 0.5rem', color: '#f87171' }}
                      >
                        <X size={12} />
                        <span>Discard</span>
                      </button>
                    </div>
                  </div>

                  {isDraftEditing ? (
                    <textarea
                      value={editableDraft}
                      onChange={(e) => setEditableDraft(e.target.value)}
                      rows={3}
                      className="input-field"
                      style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}
                    />
                  ) : (
                    <div style={{
                      padding: '0.75rem 1rem',
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)',
                      marginBottom: '0.75rem',
                      border: '1px solid var(--border-subtle)',
                      lineHeight: 1.5
                    }}>
                      {editableDraft || activeConversation.pendingDraftReply}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                      Grounded strictly in business profile & FAQ knowledge base.
                    </div>

                    <button
                      onClick={() => handleApproveDraft(isDraftEditing ? editableDraft : undefined)}
                      className="btn btn-success btn-sm"
                      style={{ gap: '0.4rem', fontWeight: 600 }}
                    >
                      <CheckCircle2 size={14} />
                      <span>Approve & Send to Customer</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Composer */}
              <div style={{
                padding: '0.85rem 1.25rem',
                borderTop: '1px solid var(--border-subtle)',
                backgroundColor: 'rgba(15, 20, 32, 0.85)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem'
              }}>
                {/* Composer Mode Tabs & Canned Suggestions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button
                      onClick={() => setComposerMode('REPLY')}
                      style={{
                        padding: '0.25rem 0.65rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: composerMode === 'REPLY' ? 'var(--color-primary)' : 'var(--border-subtle)',
                        backgroundColor: composerMode === 'REPLY' ? 'var(--color-primary)' : 'transparent',
                        color: '#fff'
                      }}
                    >
                      Reply to Customer
                    </button>
                    <button
                      onClick={() => setComposerMode('NOTE')}
                      style={{
                        padding: '0.25rem 0.65rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: composerMode === 'NOTE' ? '#f59e0b' : 'var(--border-subtle)',
                        backgroundColor: composerMode === 'NOTE' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                        color: composerMode === 'NOTE' ? '#fbbf24' : 'var(--text-muted)'
                      }}
                    >
                      Internal Note (Private)
                    </button>
                  </div>

                  {composerMode === 'REPLY' && (
                    <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto' }}>
                      <button onClick={() => insertCanned('Hello! Thank you for contacting Acme Dental Clinic.')} className="btn btn-secondary btn-sm" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}>
                        + Greeting
                      </button>
                      <button onClick={() => insertCanned('We are open Monday to Saturday, 9:00 AM - 8:00 PM.')} className="btn btn-secondary btn-sm" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}>
                        + Timings
                      </button>
                      <button onClick={() => insertCanned('Teeth cleaning & polishing is $1500. Root canal treatment starts at $4500.')} className="btn btn-secondary btn-sm" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}>
                        + Pricing
                      </button>
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-end' }}>
                  <textarea
                    rows={2}
                    className="input-field"
                    placeholder={composerMode === 'REPLY' ? `Type message to ${activeConversation.customer.name} (Press Enter to send)...` : 'Write an internal note for team members (visible only to staff)...'}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    style={{
                      resize: 'none',
                      backgroundColor: composerMode === 'NOTE' ? 'rgba(245, 158, 11, 0.05)' : 'var(--bg-input)',
                      borderColor: composerMode === 'NOTE' ? 'rgba(245, 158, 11, 0.3)' : 'var(--border-default)'
                    }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!replyText.trim()}
                    className={`btn ${composerMode === 'NOTE' ? 'btn-secondary' : 'btn-primary'}`}
                    style={{ padding: '0.75rem 1.25rem', height: '52px' }}
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <div style={{ textAlign: 'center' }}>
                <MessageSquare size={44} style={{ margin: '0 auto 1rem auto', opacity: 0.3 }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Select a Conversation</h3>
                <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Choose an inquiry from the left column to view message thread</p>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* COLLAPSIBLE CUSTOMER DETAILS & NOTES SIDEBAR */}
        {/* ========================================================================= */}
        {showCustomerSidebar && activeConversation && (
          <div style={{
            width: '280px',
            borderLeft: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-card)',
            padding: '1.25rem',
            overflowY: 'auto',
            flexShrink: 0
          }}>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                backgroundColor: '#6366f1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '1.25rem',
                color: '#fff',
                margin: '0 auto 0.75rem auto'
              }}>
                {activeConversation.customer.name[0]}
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{activeConversation.customer.name}</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Customer since Sept 2026</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Contact Info */}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Contact Information
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.825rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                    <Phone size={14} color="var(--text-muted)" />
                    <span>{activeConversation.customer.phone || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                    <Mail size={14} color="var(--text-muted)" />
                    <span>{activeConversation.customer.email || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                    <Share2 size={14} color="var(--text-muted)" />
                    <span>Channel: {activeConversation.channel}</span>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Tags
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  <span className="badge" style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
                    <Tag size={10} /> Active Patient
                  </span>
                  <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                    WhatsApp Lead
                  </span>
                </div>
              </div>

              {/* Internal Notes History */}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Internal Notes
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {activeConversation.notes && activeConversation.notes.length > 0 ? (
                    activeConversation.notes.map((n) => (
                      <div key={n.id} style={{
                        padding: '0.65rem',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(245, 158, 11, 0.08)',
                        border: '1px solid rgba(245, 158, 11, 0.2)',
                        fontSize: '0.775rem'
                      }}>
                        <div style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{n.content}</div>
                        <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
                          {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      No internal notes recorded yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
