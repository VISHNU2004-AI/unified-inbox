'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Bot, Loader2 } from 'lucide-react';

interface AppLayoutProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function AppLayout({ title, subtitle, actions, children }: AppLayoutProps) {
  const { user, isLoading, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If auth is done loading and no user, we don't automatically redirect hard so users can 1-click demo login
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        backgroundColor: 'var(--bg-primary)'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 20px rgba(99, 102, 241, 0.5)'
        }}>
          <Bot size={28} color="#fff" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
          <Loader2 size={16} className="animate-spin" />
          <span>Loading Unified Inbox Workspace...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        backgroundColor: 'var(--bg-primary)'
      }}>
        <div className="glass-panel" style={{ maxWidth: '420px', width: '100%', padding: '2rem', textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto'
          }}>
            <Bot size={26} color="#fff" />
          </div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem' }}>Authentication Required</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Please log in with your credentials or use 1-click Demo Access to explore the multi-channel workspace.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              onClick={() => login({ email: 'sarah@acmedental.com', password: 'demo123' })}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              1-Click Demo Login (Dr. Sarah Mitchell)
            </button>
            <button
              onClick={() => login({ email: 'admin@unifiedinbox.com', password: 'admin123' })}
              className="btn btn-secondary"
              style={{ width: '100%' }}
            >
              1-Click Admin Login (Platform Admin)
            </button>
            <button
              onClick={() => router.push('/login')}
              className="btn btn-ghost"
              style={{ width: '100%', fontSize: '0.8rem' }}
            >
              Go to Standard Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Header title={title} subtitle={subtitle} actions={actions} />
        <main className="app-content">
          {children}
        </main>
      </div>
    </div>
  );
}
