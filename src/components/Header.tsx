'use client';

import React from 'react';
import Link from 'next/link';
import { useWebSocket } from '@/lib/socket';
import { useAuth } from '@/lib/auth-context';
import { Play, ExternalLink, Zap } from 'lucide-react';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const { status } = useWebSocket();
  const { currentWorkspace } = useAuth();

  const isConnected = status === 'CONNECTED';

  return (
    <header style={{
      height: '64px',
      borderBottom: '1px solid var(--border-subtle)',
      backgroundColor: 'rgba(15, 20, 32, 0.8)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1.5rem',
      flexShrink: 0,
      zIndex: 10
    }}>
      {/* Title / Breadcrumb */}
      <div>
        {title && (
          <h1 style={{ fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {title}
            {currentWorkspace && (
              <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                • {currentWorkspace.name}
              </span>
            )}
          </h1>
        )}
        {subtitle && (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{subtitle}</p>
        )}
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        {/* Custom Actions */}
        {actions}

        {/* Real-time Status Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.35rem 0.65rem',
          borderRadius: 'var(--radius-full)',
          backgroundColor: isConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          fontSize: '0.75rem',
          fontWeight: 600,
          color: isConnected ? 'var(--color-success)' : 'var(--color-danger)'
        }}>
          <span
            className="pulse-dot"
            style={{
              backgroundColor: isConnected ? 'var(--color-success)' : 'var(--color-danger)',
              boxShadow: `0 0 8px ${isConnected ? 'var(--color-success)' : 'var(--color-danger)'}`
            }}
          />
          <span>{isConnected ? 'Real-Time Active' : 'Connecting...'}</span>
        </div>

        {/* Simulator Link */}
        <Link
          href="/simulator"
          className="btn btn-secondary btn-sm"
          style={{ gap: '0.4rem' }}
        >
          <Play size={14} color="#818cf8" />
          <span>Simulator</span>
        </Link>

        {/* Live Chat Demo External Link */}
        <a
          href="/widget-demo.html"
          target="_blank"
          rel="noreferrer"
          className="btn btn-secondary btn-sm"
          style={{ gap: '0.4rem' }}
          title="Open Website Live Chat Widget Demo"
        >
          <Zap size={14} color="#a855f7" />
          <span>Live Chat Widget</span>
          <ExternalLink size={12} />
        </a>
      </div>
    </header>
  );
}
