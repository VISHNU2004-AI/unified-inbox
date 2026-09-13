'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { CreditCard, CheckCircle2, Zap, ArrowRight, ShieldCheck, ExternalLink } from 'lucide-react';

export default function SubscriptionPage() {
  const [currentPlan, setCurrentPlan] = useState('GROWTH');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const plans = [
    {
      id: 'STARTER',
      name: 'Starter Plan',
      price: '$29',
      period: '/mo',
      desc: 'Essential multi-channel connectivity for solo practices.',
      features: [
        '2 Connected Channels',
        '500 AI Grounded Replies / mo',
        '1 Agent Seat',
        'Standard Email Support',
      ],
    },
    {
      id: 'GROWTH',
      name: 'Growth Plan',
      price: '$79',
      period: '/mo',
      popular: true,
      desc: 'Full power of WhatsApp, Instagram, Messenger & Live Chat.',
      features: [
        'All 4 Connected Channels',
        'Unlimited AI Multilingual Auto-Replies',
        '5 Agent Seats',
        'Human Review & Draft Approval Workflow',
        'Custom RAG Document Chunker',
        'Interactive Live Chat Widget',
      ],
    },
    {
      id: 'ENTERPRISE',
      name: 'Enterprise Agency',
      price: '$199',
      period: '/mo',
      desc: 'Multi-location clinics and agencies managing client messaging.',
      features: [
        'Unlimited Workspaces',
        'Unlimited Seats & Custom Roles',
        'Custom Meta App ID Dedicated Webhook',
        'Dedicated SLA & Phone Support',
        'Custom AI Personality Fine-Tuning',
      ],
    },
  ];

  const handleSelectPlan = (planId: string) => {
    setLoadingPlan(planId);
    setTimeout(() => {
      setCurrentPlan(planId);
      setLoadingPlan(null);
      alert(`Plan successfully switched to ${planId}!`);
    }, 800);
  };

  return (
    <AppLayout
      title="Subscription & Billing"
      subtitle="Manage your SaaS tier, payment method, and channel quotas"
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Current Status Card */}
        <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', borderLeft: '4px solid #10b981' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                <CheckCircle2 size={12} /> Active Subscription
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Billed via Stripe</span>
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Growth Tier • $79 / month</h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>Next renewal date: October 9, 2026</p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => alert('Stripe Customer Billing Portal simulated session opened.')}
              className="btn btn-secondary"
            >
              <span>Manage Billing & Invoices</span>
              <ExternalLink size={14} />
            </button>
          </div>
        </div>

        {/* Plan Tiers Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {plans.map((p) => {
            const isCurrent = currentPlan === p.id;
            return (
              <div
                key={p.id}
                className="glass-panel"
                style={{
                  padding: '2rem',
                  position: 'relative',
                  border: isCurrent ? '2px solid #10b981' : p.popular ? '2px solid #6366f1' : '1px solid var(--border-default)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                {isCurrent && (
                  <div style={{
                    position: 'absolute',
                    top: '-12px',
                    right: '20px',
                    backgroundColor: '#10b981',
                    color: '#fff',
                    fontSize: '0.725rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.65rem',
                    borderRadius: 'var(--radius-full)'
                  }}>
                    CURRENT PLAN
                  </div>
                )}

                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.35rem' }}>{p.name}</h3>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', minHeight: '36px' }}>{p.desc}</p>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', margin: '1.25rem 0' }}>
                    <span style={{ fontSize: '2.4rem', fontWeight: 800 }}>{p.price}</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{p.period}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                    {p.features.map((f) => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem' }}>
                        <CheckCircle2 size={15} color="#10b981" style={{ flexShrink: 0 }} />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleSelectPlan(p.id)}
                  disabled={isCurrent || loadingPlan === p.id}
                  className={`btn ${isCurrent ? 'btn-secondary' : p.popular ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ width: '100%', padding: '0.75rem' }}
                >
                  {isCurrent ? 'Current Plan' : loadingPlan === p.id ? 'Updating...' : `Switch to ${p.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
