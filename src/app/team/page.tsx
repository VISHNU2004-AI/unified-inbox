'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import { Users, Plus, Mail, Shield, UserCheck, Trash2, CheckCircle2 } from 'lucide-react';

export default function TeamPage() {
  const { currentWorkspace } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('AGENT');
  const [loading, setLoading] = useState(false);

  const loadMembers = async () => {
    if (!currentWorkspace) return;
    try {
      const res = await apiFetch(`/api/workspaces/${currentWorkspace.id}`);
      if (res && res.workspace && res.workspace.members) {
        setMembers(res.workspace.members);
      }
    } catch (err) {
      console.warn('Failed to load team:', err);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [currentWorkspace]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !currentWorkspace) return;
    setLoading(true);

    try {
      await apiFetch(`/api/workspaces/${currentWorkspace.id}/members`, {
        method: 'POST',
        body: JSON.stringify({ email, name, role })
      });

      setShowInviteModal(false);
      setEmail('');
      setName('');
      loadMembers();
    } catch (err: any) {
      alert(`Invite failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout
      title="Workspace Team & RBAC"
      subtitle="Manage clinical staff, agents, and administrators with granular role-based access control"
      actions={
        <button
          onClick={() => setShowInviteModal(true)}
          className="btn btn-primary btn-sm"
          style={{ gap: '0.4rem' }}
        >
          <Plus size={14} />
          <span>Invite Team Member</span>
        </button>
      }
    >
      <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} color="#818cf8" />
              <span>Workspace Members ({members.length})</span>
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {members.map((m) => (
              <div
                key={m.id}
                style={{
                  padding: '1.15rem 1.5rem',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'background 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: m.role === 'OWNER' ? '#4f46e5' : m.role === 'ADMIN' ? '#0891b2' : '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    color: '#fff',
                    fontSize: '0.9rem'
                  }}>
                    {m.user?.name ? m.user.name[0].toUpperCase() : 'U'}
                  </div>

                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {m.user?.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {m.user?.email}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span className="badge" style={{
                    backgroundColor: m.role === 'OWNER' ? 'rgba(99, 102, 241, 0.2)' : m.role === 'ADMIN' ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    color: m.role === 'OWNER' ? '#818cf8' : m.role === 'ADMIN' ? '#06b6d4' : 'var(--text-secondary)'
                  }}>
                    {m.role}
                  </span>

                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {showInviteModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            zIndex: 100
          }}>
            <div className="glass-panel" style={{ maxWidth: '440px', width: '100%', padding: '2rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.35rem' }}>Invite Teammate</h3>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                Add clinic staff to answer patient inquiries and review AI drafts.
              </p>

              <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="input-label">Teammate Name</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="e.g. Rahul Sen"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="input-label">Email Address</label>
                  <input
                    type="email"
                    required
                    className="input-field"
                    placeholder="rahul@acmedental.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="input-label">Workspace Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="input-field"
                  >
                    <option value="AGENT">Agent (Reply to chats & review drafts)</option>
                    <option value="ADMIN">Admin (Manage settings & knowledge base)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary"
                  >
                    {loading ? 'Sending Invite...' : 'Send Invite'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
