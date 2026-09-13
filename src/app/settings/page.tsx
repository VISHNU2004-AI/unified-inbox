'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useAuth } from '@/lib/auth-context';
import { Settings, Copy, Check, ExternalLink, Zap, Palette, MessageSquare } from 'lucide-react';

export default function SettingsPage() {
  const { currentWorkspace } = useAuth();
  const [copied, setCopied] = useState(false);

  // Widget customizer
  const [widgetTitle, setWidgetTitle] = useState('Acme Dental Assistant');
  const [widgetGreeting, setWidgetGreeting] = useState('Hello! How can our clinic team assist you today?');
  const [widgetColor, setWidgetColor] = useState('#6366f1');

  const workspaceId = currentWorkspace?.id || 'ws-acme-default';

  const embedCode = `<!-- Unified Inbox Live Chat Widget -->
<script
  src="http://localhost:5000/widget.js"
  data-workspace-id="${workspaceId}"
  data-title="${widgetTitle}"
  data-color="${widgetColor}"
  async>
</script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AppLayout
      title="Live Chat Widget & Settings"
      subtitle="Customize and embed your website live chat widget with automated AI and agent handoff"
      actions={
        <a
          href="/widget-demo.html"
          target="_blank"
          rel="noreferrer"
          className="btn btn-primary btn-sm"
          style={{ gap: '0.4rem' }}
        >
          <Zap size={14} />
          <span>Open Widget Demo Site</span>
          <ExternalLink size={12} />
        </a>
      }
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Widget Embed Generator */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={20} color="#8b5cf6" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Embed Live Chat on Any Website</h3>
            </div>
            <button
              onClick={handleCopy}
              className="btn btn-primary btn-sm"
              style={{ gap: '0.4rem' }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Code Snippet'}</span>
            </button>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Paste this single script tag right before the closing <code style={{ color: '#818cf8' }}>&lt;/body&gt;</code> tag of your website. Visitors can chat in real time, triggering instant AI replies and live inbox agent synchronization.
          </p>

          <pre style={{
            padding: '1.25rem',
            borderRadius: '8px',
            backgroundColor: '#050811',
            border: '1px solid var(--border-subtle)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            color: '#a5b4fc',
            overflowX: 'auto',
            whiteSpace: 'pre-wrap'
          }}>
            {embedCode}
          </pre>
        </div>

        {/* Appearance Customizer */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem' }}>
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Palette size={18} color="#06b6d4" />
              <span>Widget Branding & Theme</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="input-label">Chat Window Header Title</label>
                <input
                  type="text"
                  className="input-field"
                  value={widgetTitle}
                  onChange={(e) => setWidgetTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="input-label">Initial Greeting Message</label>
                <textarea
                  rows={2}
                  className="input-field"
                  value={widgetGreeting}
                  onChange={(e) => setWidgetGreeting(e.target.value)}
                />
              </div>

              <div>
                <label className="input-label">Theme Color Accent</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.4rem' }}>
                  {['#6366f1', '#10b981', '#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b'].map((c) => (
                    <div
                      key={c}
                      onClick={() => setWidgetColor(c)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: c,
                        cursor: 'pointer',
                        border: widgetColor === c ? '3px solid #fff' : '2px solid transparent',
                        boxShadow: widgetColor === c ? `0 0 10px ${c}` : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Live Mock Preview */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1rem' }}>
              Visitor Preview
            </span>

            <div style={{
              flex: 1,
              borderRadius: '12px',
              border: '1px solid var(--border-default)',
              backgroundColor: '#0c101b',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-lg)'
            }}>
              {/* Header */}
              <div style={{
                padding: '0.85rem 1rem',
                backgroundColor: widgetColor,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <MessageSquare size={16} />
                <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{widgetTitle}</span>
              </div>

              {/* Chat Body */}
              <div style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{
                  alignSelf: 'flex-start',
                  maxWidth: '85%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px 10px 10px 2px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  fontSize: '0.8rem',
                  color: '#fff',
                  lineHeight: 1.4
                }}>
                  {widgetGreeting}
                </div>
              </div>

              {/* Input Fake */}
              <div style={{ padding: '0.65rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  disabled
                  placeholder="Type message..."
                  className="input-field"
                  style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
