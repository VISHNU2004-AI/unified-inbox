'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  MessageSquare,
  LayoutDashboard,
  Bot,
  Share2,
  Building2,
  BookOpen,
  ShoppingBag,
  Sparkles,
  Users,
  CreditCard,
  Settings,
  ShieldCheck,
  LogOut,
  ChevronDown,
  Activity,
  Layers,
  Check
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { user, workspaces, currentWorkspace, switchWorkspace, logout } = useAuth();
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);

  const navItems = [
    { label: 'Inbox', href: '/inbox', icon: MessageSquare, badge: 'Live' },
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Simulator', href: '/simulator', icon: Activity, highlight: true },
    { label: 'Channels', href: '/connected-accounts', icon: Share2 },
    { label: 'AI Configuration', href: '/ai-settings', icon: Sparkles },
    { label: 'Knowledge Base', href: '/business-knowledge', icon: BookOpen },
    { label: 'Products & Services', href: '/products', icon: ShoppingBag },
    { label: 'Business Profile', href: '/business-profile', icon: Building2 },
    { label: 'Team', href: '/team', icon: Users },
    { label: 'Subscription', href: '/subscription', icon: CreditCard },
    { label: 'Widget & Settings', href: '/settings', icon: Settings },
  ];

  const isAdmin = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN';

  return (
    <aside style={{
      width: '260px',
      height: '100vh',
      backgroundColor: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      position: 'relative',
      zIndex: 20
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '1.25rem 1.25rem 1rem 1.25rem',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem'
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 16px rgba(99, 102, 241, 0.4)'
        }}>
          <Bot size={20} color="#fff" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            Unified Inbox
            <span style={{
              fontSize: '0.65rem',
              padding: '0.1rem 0.4rem',
              borderRadius: '4px',
              backgroundColor: 'rgba(99, 102, 241, 0.2)',
              color: '#818cf8',
              fontWeight: 600
            }}>AI 2.0</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Multi-Channel Platform</div>
        </div>
      </div>

      {/* Workspace Switcher */}
      <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', position: 'relative' }}>
        <button
          onClick={() => setWsDropdownOpen(!wsDropdownOpen)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.55rem 0.75rem',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-default)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
            <Layers size={16} color="#818cf8" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentWorkspace?.name || 'Select Workspace'}
            </span>
          </div>
          <ChevronDown size={14} color="var(--text-muted)" />
        </button>

        {wsDropdownOpen && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '1.25rem',
            right: '1.25rem',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: '8px',
            boxShadow: 'var(--shadow-lg)',
            padding: '0.35rem',
            zIndex: 50,
            marginTop: '4px'
          }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', padding: '0.3rem 0.5rem', textTransform: 'uppercase' }}>
              Workspaces
            </div>
            {workspaces.map((ws) => (
              <div
                key={ws.id}
                onClick={() => {
                  switchWorkspace(ws.id);
                  setWsDropdownOpen(false);
                }}
                style={{
                  padding: '0.5rem 0.6rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: currentWorkspace?.id === ws.id ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  color: currentWorkspace?.id === ws.id ? '#818cf8' : 'var(--text-primary)',
                  fontSize: '0.825rem'
                }}
              >
                <span>{ws.name}</span>
                {currentWorkspace?.id === ws.id && <Check size={14} />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 0.85rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#fff' : item.highlight ? '#a5b4fc' : 'var(--text-secondary)',
                  backgroundColor: isActive
                    ? 'rgba(99, 102, 241, 0.2)'
                    : item.highlight
                    ? 'rgba(99, 102, 241, 0.08)'
                    : 'transparent',
                  border: isActive ? '1px solid rgba(99, 102, 241, 0.35)' : '1px solid transparent',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                  <Icon size={18} color={isActive ? '#818cf8' : item.highlight ? '#818cf8' : 'currentColor'} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span style={{
                    fontSize: '0.65rem',
                    padding: '0.15rem 0.45rem',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(37, 211, 102, 0.2)',
                    color: '#25D366',
                    fontWeight: 700
                  }}>
                    {item.badge}
                  </span>
                )}
                {item.highlight && (
                  <span style={{
                    fontSize: '0.65rem',
                    padding: '0.15rem 0.45rem',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(99, 102, 241, 0.25)',
                    color: '#818cf8',
                    fontWeight: 700
                  }}>
                    Test
                  </span>
                )}
              </Link>
            );
          })}

          {isAdmin && (
            <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', padding: '0 0.75rem 0.4rem', textTransform: 'uppercase' }}>
                Platform Admin
              </div>
              <Link
                href="/admin"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.7rem',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: pathname === '/admin' ? 600 : 500,
                  color: pathname === '/admin' ? '#f43f5e' : 'var(--text-secondary)',
                  backgroundColor: pathname === '/admin' ? 'rgba(244, 63, 94, 0.15)' : 'transparent',
                }}
              >
                <ShieldCheck size={18} color={pathname === '/admin' ? '#f43f5e' : 'currentColor'} />
                <span>Admin Suite</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* User Footer */}
      <div style={{
        padding: '0.85rem 1.25rem',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(0, 0, 0, 0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', overflow: 'hidden' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#4f46e5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '0.8rem',
            color: '#fff',
            flexShrink: 0
          }}>
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name || 'Guest User'}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.role || 'Agent'}
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          title="Sign Out"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '0.35rem',
            borderRadius: '6px'
          }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
