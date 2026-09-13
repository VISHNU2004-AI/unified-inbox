'use client';

import React from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Bot,
  Sparkles,
  Zap,
  ShieldCheck,
  Globe2,
  CheckCircle2,
  ArrowRight,
  Play,
  Share2,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

export default function LandingPage() {
  const channels = [
    { name: 'WhatsApp Business', color: '#25D366', bg: 'rgba(37, 211, 102, 0.1)', desc: 'Official Cloud API with automated 24/7 client booking' },
    { name: 'Instagram Direct', color: '#E1306C', bg: 'rgba(225, 48, 108, 0.1)', desc: 'Instant DM responses to product stories & pricing inquiries' },
    { name: 'Facebook Messenger', color: '#0084FF', bg: 'rgba(0, 132, 255, 0.1)', desc: 'Page inbox synchronization with intelligent handoff' },
    { name: 'Website Live Chat', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', desc: 'Lightweight embeddable real-time visitor widget' }
  ];

  const features = [
    {
      title: 'Multilingual AI (Hindi, English & Hinglish)',
      desc: 'Accurately understands queries like "Bhai teeth cleaning ka charge kitna hai?" or "Aapka clinic kab khulta hai?" and answers using your real business catalog without hallucinations.',
      icon: Globe2,
      color: '#06b6d4'
    },
    {
      title: 'Auto-Reply or Human Review Workflow',
      desc: 'Set AI on full autopilot for routine questions, or have AI draft smart responses for your human team to review, edit, and approve in one click.',
      icon: Sparkles,
      color: '#6366f1'
    },
    {
      title: 'Multi-Tenant Workspaces & RBAC',
      desc: 'Isolate multiple clinics, retail stores, or brand clients. Assign granular roles (Owner, Admin, Agent) with real-time presence.',
      icon: ShieldCheck,
      color: '#10b981'
    },
    {
      title: 'RAG Knowledge Grounding',
      desc: 'Upload business PDFs, catalog services, set business hours, and add custom FAQs. The AI strictly answers with grounded facts.',
      icon: Zap,
      color: '#f59e0b'
    }
  ];

  const pricingTiers = [
    {
      name: 'Starter',
      price: '$29',
      period: '/month',
      desc: 'Ideal for solo practitioners and boutique local clinics.',
      features: ['2 Connected Channels', '500 AI Auto-Replies / mo', '1 Team Seat', 'English & Hindi AI', 'Standard Support'],
      popular: false
    },
    {
      name: 'Growth',
      price: '$79',
      period: '/month',
      desc: 'For growing businesses wanting full multi-channel automation.',
      features: ['All 4 Channels (WhatsApp, IG, FB, Widget)', 'Unlimited AI Auto-Replies', '5 Team Seats', 'Hinglish & Multilingual RAG', 'Human Review Mode', 'Custom Document Chunker'],
      popular: true
    },
    {
      name: 'Enterprise',
      price: '$199',
      period: '/month',
      desc: 'For multi-location clinics and agencies managing client inboxes.',
      features: ['Unlimited Workspaces', 'Custom SLA & Priority Webhooks', 'Unlimited Team Seats', 'Dedicated AI Fine-tuning', 'Full Platform Admin Suite'],
      popular: false
    }
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Navigation Bar */}
      <nav style={{
        height: '70px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2.5rem',
        backgroundColor: 'rgba(10, 13, 20, 0.85)',
        backdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(99, 102, 241, 0.4)'
          }}>
            <Bot size={22} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              Unified Inbox
              <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem', borderRadius: '4px', backgroundColor: 'rgba(99, 102, 241, 0.25)', color: '#818cf8', fontWeight: 700 }}>SAAS</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <a href="#channels" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', transition: 'color 0.15s' }}>Channels</a>
          <a href="#features" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', transition: 'color 0.15s' }}>Multilingual AI</a>
          <a href="#pricing" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', transition: 'color 0.15s' }}>Pricing</a>
          <Link href="/simulator" style={{ fontSize: '0.9rem', color: '#818cf8', fontWeight: 600 }}>Simulator</Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <Link href="/login" className="btn btn-secondary btn-sm">
            Sign In
          </Link>
          <Link href="/inbox" className="btn btn-primary btn-sm">
            Launch Platform
            <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{
        padding: '5rem 2rem 4rem 2rem',
        maxWidth: '1200px',
        margin: '0 auto',
        textAlign: 'center',
        position: 'relative'
      }}>
        {/* Glow backdrop */}
        <div style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '350px',
          background: 'radial-gradient(ellipse, rgba(99, 102, 241, 0.18), transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.85rem',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'rgba(99, 102, 241, 0.12)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            color: '#818cf8',
            fontSize: '0.825rem',
            fontWeight: 600,
            marginBottom: '1.5rem'
          }}>
            <Sparkles size={14} />
            <span>AI-Powered Customer Engagement in Hindi, English & Hinglish</span>
          </div>

          <h1 style={{
            fontSize: '3.6rem',
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            marginBottom: '1.5rem',
            maxWidth: '900px',
            margin: '0 auto 1.5rem auto'
          }}>
            All Your Customer Messages. <br />
            <span style={{
              background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 50%, #38bdf8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              One Intelligent AI Inbox.
            </span>
          </h1>

          <p style={{
            fontSize: '1.2rem',
            color: 'var(--text-secondary)',
            maxWidth: '740px',
            margin: '0 auto 2.5rem auto',
            lineHeight: 1.6
          }}>
            Connect WhatsApp Business, Instagram Direct, Messenger, and Website Live Chat. Grounded AI automatically responds using your business catalog and business hours, with full human review control.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Link href="/inbox" className="btn btn-primary btn-lg" style={{ padding: '0.9rem 2rem', fontSize: '1.05rem' }}>
              <span>Enter Unified Inbox Demo</span>
              <ArrowRight size={18} />
            </Link>

            <Link href="/simulator" className="btn btn-secondary btn-lg" style={{ padding: '0.9rem 1.75rem', fontSize: '1.05rem', gap: '0.6rem' }}>
              <Play size={18} color="#818cf8" />
              <span>Test Interactive Simulator</span>
            </Link>

            <a href="/widget-demo.html" target="_blank" rel="noreferrer" className="btn btn-secondary btn-lg" style={{ padding: '0.9rem 1.75rem', fontSize: '1.05rem', gap: '0.6rem' }}>
              <Zap size={18} color="#a855f7" />
              <span>Live Chat Widget Demo</span>
              <ExternalLink size={14} />
            </a>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={16} color="#10b981" /> No Credit Card Required
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={16} color="#10b981" /> Pre-Seeded Sample Clinic Data
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={16} color="#10b981" /> Zero Setup Local Persistence
            </div>
          </div>
        </div>
      </section>

      {/* Connected Channels Showcase */}
      <section id="channels" style={{ padding: '4rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.75rem' }}>
            Supported Inbound Channels
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '600px', margin: '0 auto' }}>
            Unify incoming leads across every platform your customers use daily.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
          {channels.map((c) => (
            <div
              key={c.name}
              className="glass-panel"
              style={{
                padding: '1.75rem',
                borderTop: `3px solid ${c.color}`,
                transition: 'transform 0.2s ease',
              }}
            >
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: c.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem'
              }}>
                <Share2 size={22} color={c.color} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>{c.name}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5 }}>{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Multilingual AI & Features */}
      <section id="features" style={{ padding: '4rem 2rem', backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Intelligent Grounding
            </span>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 700, letterSpacing: '-0.02em', marginTop: '0.5rem', marginBottom: '0.75rem' }}>
              Engineered for Real-World Customer Dialogues
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '650px', margin: '0 auto' }}>
              Unlike generic AI bots that hallucinate, Unified Inbox strictly reads your uploaded PDFs, service prices, and business hours.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="glass-panel" style={{ padding: '2rem' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    backgroundColor: `${f.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.25rem'
                  }}>
                    <Icon size={24} color={f.color} />
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.75rem' }}>{f.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Interactive Multilingual Demonstration Banner */}
          <div className="glass-panel" style={{ marginTop: '3.5rem', padding: '2.5rem', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(139, 92, 246, 0.08))', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#818cf8', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  <Sparkles size={16} />
                  <span>Interactive Simulator Built-In</span>
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Experience Hinglish and Hindi AI in Action</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '600px' }}>
                  Send synthetic inquiries via WhatsApp, Instagram, or Messenger with 1-click presets and watch the AI formulate answers or draft suggestions in real time.
                </p>
              </div>

              <Link href="/simulator" className="btn btn-primary btn-lg">
                <Play size={16} />
                <span>Launch Channel Simulator</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" style={{ padding: '5rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.75rem' }}>
            Simple, Transparent Pricing
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '600px', margin: '0 auto' }}>
            Start with our complete demo, upgrade anytime for high-volume enterprise traffic.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          {pricingTiers.map((p) => (
            <div
              key={p.name}
              className="glass-panel"
              style={{
                padding: '2.25rem',
                position: 'relative',
                border: p.popular ? '2px solid #6366f1' : '1px solid var(--border-default)',
                transform: p.popular ? 'scale(1.03)' : 'none',
                backgroundColor: p.popular ? 'rgba(26, 35, 58, 0.9)' : 'var(--bg-card)'
              }}
            >
              {p.popular && (
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  right: '24px',
                  backgroundColor: '#6366f1',
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.65rem',
                  borderRadius: 'var(--radius-full)',
                  letterSpacing: '0.04em'
                }}>
                  MOST POPULAR
                </div>
              )}

              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem' }}>{p.name}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', minHeight: '40px' }}>{p.desc}</p>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', margin: '1.5rem 0' }}>
                <span style={{ fontSize: '2.5rem', fontWeight: 800 }}>{p.price}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{p.period}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '2rem' }}>
                {p.features.map((feat) => (
                  <div key={feat} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.875rem' }}>
                    <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0 }} />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              <Link
                href="/login"
                className={`btn ${p.popular ? 'btn-primary' : 'btn-secondary'}`}
                style={{ width: '100%', padding: '0.75rem' }}
              >
                Get Started
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '3rem 2rem',
        borderTop: '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-secondary)',
        color: 'var(--text-secondary)',
        fontSize: '0.85rem'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Bot size={20} color="#818cf8" />
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Unified Inbox SaaS</span>
            <span>• Multilingual Customer Engagement</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <Link href="/inbox">Inbox</Link>
            <Link href="/simulator">Simulator</Link>
            <Link href="/login">Demo Login</Link>
            <a href="/widget-demo.html" target="_blank" rel="noreferrer">Live Chat Widget</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
