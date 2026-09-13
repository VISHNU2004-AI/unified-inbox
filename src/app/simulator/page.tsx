'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/AppLayout';
import { apiFetch } from '@/lib/api';
import {
  Play,
  Send,
  Sparkles,
  ArrowRight,
  Bot,
  MessageSquare,
  CheckCircle2,
  Terminal,
  RefreshCw,
  Globe2,
  AlertCircle
} from 'lucide-react';

interface Preset {
  title: string;
  channel: string;
  senderName: string;
  messageContent: string;
  description: string;
}

export default function SimulatorPage() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [channel, setChannel] = useState('WHATSAPP');
  const [senderName, setSenderName] = useState('Pooja Verma');
  const [senderId, setSenderId] = useState('+919876543210');
  const [messageContent, setMessageContent] = useState('Bhai teeth cleaning ka charge kitna hai?');

  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);

  useEffect(() => {
    async function loadPresets() {
      try {
        const res = await apiFetch('/api/simulator/presets');
        if (res && res.presets) {
          setPresets(res.presets);
        }
      } catch (err) {
        console.warn('Failed to load simulator presets:', err);
      }
    }
    loadPresets();
  }, []);

  const handleApplyPreset = (p: Preset) => {
    setChannel(p.channel);
    setSenderName(p.senderName);
    setMessageContent(p.messageContent);
  };

  const handleSimulate = async () => {
    if (!messageContent.trim()) return;
    setLoading(true);
    setLastResult(null);

    const logEntry = {
      timestamp: new Date().toLocaleTimeString(),
      channel,
      senderName,
      messageContent,
      status: 'DISPATCHING'
    };

    try {
      const res = await apiFetch('/api/simulator/send', {
        method: 'POST',
        body: JSON.stringify({
          channel,
          senderName,
          senderExternalId: senderId,
          messageContent: messageContent.trim()
        })
      });

      setLastResult(res);
      setActivityLogs((prev) => [
        {
          ...logEntry,
          status: 'SUCCESS',
          response: res.message
        },
        ...prev
      ]);
    } catch (err: any) {
      setActivityLogs((prev) => [
        {
          ...logEntry,
          status: 'ERROR',
          error: err.message
        },
        ...prev
      ]);
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout
      title="Multi-Channel Message Simulator"
      subtitle="Send realistic simulated incoming customer messages to test AI language detection, RAG retrieval, and draft creation"
      actions={
        <Link href="/inbox" className="btn btn-primary btn-sm">
          <MessageSquare size={14} />
          <span>Open Unified Inbox</span>
          <ArrowRight size={14} />
        </Link>
      }
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Clearly Demarcated Development Simulator Banner */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '10px',
            backgroundColor: 'rgba(99, 102, 241, 0.12)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
          }}
        >
          <Terminal size={20} color="#818cf8" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <strong style={{ color: '#818cf8' }}>DEVELOPMENT SIMULATOR:</strong> Test inbound customer messaging, language detection (English, Hindi, Hinglish), and RAG grounded AI responses in a simulated sandbox. This simulator does not require or alter live external social media credentials.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '1.5rem' }}>
          {/* Left Column: Simulator Controls & Presets */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Preset Buttons */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
              <Sparkles size={18} color="#818cf8" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>One-Click Test Scenarios</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Click any scenario below to automatically load sample queries across Hindi, English, and Hinglish.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleApplyPreset(p)}
                  className="glass-panel"
                  style={{
                    padding: '0.85rem 1rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    transition: 'all 0.15s ease',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{p.title}</span>
                    <span className={`badge ${p.channel === 'WHATSAPP' ? 'badge-whatsapp' : p.channel === 'INSTAGRAM' ? 'badge-instagram' : 'badge-messenger'}`} style={{ fontSize: '0.625rem' }}>
                      {p.channel}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    "{p.messageContent}"
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Simulator Form */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Dispatch Simulated Customer Inbound</h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label className="input-label">Channel Platform</label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="input-field"
                >
                  <option value="WHATSAPP">WhatsApp Business API</option>
                  <option value="INSTAGRAM">Instagram Direct Messaging</option>
                  <option value="MESSENGER">Facebook Messenger</option>
                  <option value="LIVECHAT">Website Live Chat</option>
                </select>
              </div>

              <div>
                <label className="input-label">Simulated Customer Name</label>
                <input
                  type="text"
                  className="input-field"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="e.g. Pooja Verma"
                />
              </div>

              <div>
                <label className="input-label">Customer ID / Phone Number</label>
                <input
                  type="text"
                  className="input-field"
                  value={senderId}
                  onChange={(e) => setSenderId(e.target.value)}
                  placeholder="+919876543210 or @insta_user"
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label className="input-label">Customer Message Content</label>
              <textarea
                rows={3}
                className="input-field"
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Enter customer message in English, Hindi, or Hinglish..."
                style={{ resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Simulates official inbound webhook payload triggers the AI processing pipeline.
              </div>

              <button
                onClick={handleSimulate}
                disabled={loading || !messageContent.trim()}
                className="btn btn-primary"
                style={{ padding: '0.65rem 1.5rem', gap: '0.5rem' }}
              >
                <Send size={16} />
                <span>{loading ? 'Simulating...' : 'Send Simulated Message'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Event Stream & Response Inspector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Last Result Box */}
          {lastResult && (
            <div className="glass-panel" style={{ padding: '1.25rem', border: '1px solid rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                <CheckCircle2 size={16} />
                <span>Message Ingested Successfully!</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>
                {lastResult.message}
              </p>
              <Link href="/inbox" className="btn btn-success btn-sm" style={{ width: '100%' }}>
                <span>View Live Response in Inbox</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          )}

          {/* Activity Log Terminal */}
          <div className="glass-panel" style={{ flex: 1, padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Terminal size={16} color="#818cf8" />
                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Simulator Activity Stream</span>
              </div>
              <button
                onClick={() => setActivityLogs([])}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem' }}
              >
                Clear
              </button>
            </div>

            <div style={{
              flex: 1,
              backgroundColor: '#05070d',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              padding: '0.85rem',
              overflowY: 'auto',
              maxHeight: '420px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem'
            }}>
              {activityLogs.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No messages simulated yet. Click a scenario to test inbound webhooks.
                </div>
              ) : (
                activityLogs.map((log, i) => (
                  <div key={i} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#818cf8', marginBottom: '0.2rem' }}>
                      <span>[{log.timestamp}] [{log.channel}]</span>
                      <span style={{ color: log.status === 'SUCCESS' ? '#10b981' : '#f43f5e' }}>{log.status}</span>
                    </div>
                    <div style={{ color: '#e2e8f0', marginBottom: '0.2rem' }}>{log.senderName}: "{log.messageContent}"</div>
                    {log.response && <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>↪ {log.response}</div>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
  );
}
