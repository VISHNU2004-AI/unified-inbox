'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Bot, Mail, Lock, ArrowRight, Sparkles, Shield, UserCheck, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
      router.push('/inbox');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
    setLoading(true);
    try {
      await login({ email: demoEmail, password: demoPass });
      router.push('/inbox');
    } catch (err: any) {
      setError(err.message || 'Failed to login with demo credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      background: 'radial-gradient(circle at 50% 20%, rgba(99, 102, 241, 0.15), transparent 60%), var(--bg-primary)'
    }}>
      <div className="glass-panel" style={{ maxWidth: '440px', width: '100%', padding: '2.5rem' }}>
        {/* Logo and Title */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem auto',
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)'
          }}>
            <Bot size={26} color="#fff" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
            Welcome to Unified Inbox
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Sign in to access your multi-channel customer communications
          </p>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.75rem',
            borderRadius: '8px',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            fontSize: '0.825rem',
            marginBottom: '1.25rem'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div>
            <label className="input-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                required
                className="input-field"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '2.4rem' }}
              />
              <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <div>
            <label className="input-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                required
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '2.4rem' }}
              />
              <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
            <ArrowRight size={16} />
          </button>
        </form>

        {/* 1-Click Demo Accounts */}
        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.85rem', textAlign: 'center' }}>
            Instant 1-Click Demo Accounts
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <button
              type="button"
              onClick={() => handleQuickLogin('sarah@acmedental.com', 'demo123')}
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'flex-start', padding: '0.65rem 0.85rem', fontSize: '0.8rem' }}
            >
              <UserCheck size={16} color="#818cf8" style={{ flexShrink: 0 }} />
              <div style={{ textAlign: 'left', overflow: 'hidden' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Dr. Sarah Mitchell (Clinic Owner)</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>sarah@acmedental.com • Pre-seeded Acme Dental</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('admin@unifiedinbox.com', 'admin123')}
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'flex-start', padding: '0.65rem 0.85rem', fontSize: '0.8rem' }}
            >
              <Shield size={16} color="#f43f5e" style={{ flexShrink: 0 }} />
              <div style={{ textAlign: 'left', overflow: 'hidden' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Platform Administrator</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>admin@unifiedinbox.com • Superadmin Suite</div>
              </div>
            </button>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Don't have an account?{' '}
          <Link href="/signup" style={{ color: '#818cf8', fontWeight: 600 }}>
            Create Workspace
          </Link>
        </div>
      </div>
    </div>
  );
}
