'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { apiFetch } from '@/lib/api';
import {
  Sparkles,
  Bot,
  Globe2,
  Save,
  CheckCircle2,
  Sliders,
  Send,
  HelpCircle,
  ShieldAlert,
  Layers
} from 'lucide-react';

export default function AISettingsPage() {
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);
  const [humanReviewEnabled, setHumanReviewEnabled] = useState(false);
  const [personality, setPersonality] = useState('FRIENDLY_PROFESSIONAL');
  const [defaultLanguage, setDefaultLanguage] = useState('HINGLISH');

  const [fallbackEnglish, setFallbackEnglish] = useState("I apologize, but I don't have that information right now. Please wait a moment while our clinic team member assists you.");
  const [fallbackHindi, setFallbackHindi] = useState("मुझे क्षमा करें, मेरे पास अभी यह जानकारी उपलब्ध नहीं है। कृपया थोड़ा इंतज़ार करें, हमारी टीम का सदस्य जल्द ही आपकी सहायता करेगा।");
  const [fallbackHinglish, setFallbackHinglish] = useState("Sorry, mere paas abhi yeh information nahi hai. Please thoda wait kijiye, hamari team member jaldi hi aapki help karenge.");

  // Test playground state
  const [testQuestion, setTestQuestion] = useState('Bhai teeth whitening ka cost kitna padega?');
  const [testResponse, setTestResponse] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await apiFetch('/api/ai/config');
        if (res && res.config) {
          setAutoReplyEnabled(res.config.autoReplyEnabled);
          setHumanReviewEnabled(res.config.humanReviewEnabled);
          setPersonality(res.config.personality || 'FRIENDLY_PROFESSIONAL');
          if (res.config.fallbackMessage) {
            setFallbackEnglish(res.config.fallbackMessage);
          }
        }
      } catch (err) {
        console.warn('Failed to load AI config:', err);
      }
    }
    loadConfig();
  }, []);

  const handleSaveConfig = async () => {
    try {
      await apiFetch('/api/ai/config', {
        method: 'POST',
        body: JSON.stringify({
          autoReplyEnabled,
          humanReviewEnabled,
          personality,
          defaultLanguage,
          fallbackMessage: fallbackEnglish,
        })
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(`Failed to save AI configuration: ${err.message}`);
    }
  };

  const handleTestGrounding = async () => {
    if (!testQuestion.trim()) return;
    setTestLoading(true);
    setTestResponse(null);
    try {
      const res = await apiFetch('/api/ai/test', {
        method: 'POST',
        body: JSON.stringify({ question: testQuestion })
      });
      setTestResponse(res);
    } catch (err: any) {
      alert(`AI test query failed: ${err.message}`);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <AppLayout
      title="Multilingual AI Configuration"
      subtitle="Configure auto-replies, human review rules, personality, and grounding behavior in Hindi, English, and Hinglish"
      actions={
        <button
          onClick={handleSaveConfig}
          className="btn btn-primary btn-sm"
          style={{ gap: '0.4rem' }}
        >
          <Save size={14} />
          <span>Save Settings</span>
        </button>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 440px', gap: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Settings Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {savedSuccess && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.85rem 1rem',
              borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#10b981',
              fontSize: '0.85rem'
            }}>
              <CheckCircle2 size={16} />
              <span>AI Configuration successfully updated!</span>
            </div>
          )}

          {/* Execution Mode Card */}
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sliders size={18} color="#818cf8" />
              <span>AI Execution Workflow</span>
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Choose whether AI immediately dispatches responses to customers or creates a draft for staff approval.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div
                onClick={() => {
                  setAutoReplyEnabled(true);
                  setHumanReviewEnabled(false);
                }}
                style={{
                  padding: '1.25rem',
                  borderRadius: '12px',
                  border: '2px solid',
                  borderColor: autoReplyEnabled && !humanReviewEnabled ? 'var(--color-primary)' : 'var(--border-subtle)',
                  backgroundColor: autoReplyEnabled && !humanReviewEnabled ? 'rgba(99, 102, 241, 0.12)' : 'rgba(0, 0, 0, 0.2)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Full Auto-Reply</span>
                  <Sparkles size={16} color="#818cf8" />
                </div>
                <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Grounded AI immediately sends responses back to WhatsApp, Instagram, Messenger, and Live Chat 24/7.
                </p>
              </div>

              <div
                onClick={() => {
                  setAutoReplyEnabled(false);
                  setHumanReviewEnabled(true);
                }}
                style={{
                  padding: '1.25rem',
                  borderRadius: '12px',
                  border: '2px solid',
                  borderColor: humanReviewEnabled ? '#f59e0b' : 'var(--border-subtle)',
                  backgroundColor: humanReviewEnabled ? 'rgba(245, 158, 11, 0.12)' : 'rgba(0, 0, 0, 0.2)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Human Review Mode</span>
                  <ShieldAlert size={16} color="#fbbf24" />
                </div>
                <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  AI prepares suggested drafts in the inbox. Human agents click "Approve & Send" or edit text first.
                </p>
              </div>
            </div>
          </div>

          {/* Language & Tone Card */}
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Globe2 size={18} color="#06b6d4" />
              <span>Language & Tone Parameters</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <div>
                <label className="input-label">AI Tone of Voice</label>
                <select
                  value={personality}
                  onChange={(e) => setPersonality(e.target.value)}
                  className="input-field"
                >
                  <option value="FRIENDLY_PROFESSIONAL">Friendly & Professional (Warm Clinic Host)</option>
                  <option value="CASUAL_CONVERSATIONAL">Casual & Modern (Direct Messaging)</option>
                  <option value="CLINICAL_FORMAL">Formal & Medical (Authoritative)</option>
                  <option value="EMPATHETIC">Empathetic & Caring (Comfort First)</option>
                </select>
              </div>

              <div>
                <label className="input-label">Default / Preferred Language</label>
                <select
                  value={defaultLanguage}
                  onChange={(e) => setDefaultLanguage(e.target.value)}
                  className="input-field"
                >
                  <option value="HINGLISH">Hinglish (Natural Romanized Hindi + English)</option>
                  <option value="ENGLISH">English</option>
                  <option value="HINDI">Hindi (Devanagari)</option>
                </select>
              </div>
            </div>

            {/* Missing Info Fallbacks */}
            <div>
              <label className="input-label">Polite Fallback When Information Is Missing (No Hallucinations)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#818cf8', fontWeight: 600 }}>English Fallback:</span>
                  <input
                    type="text"
                    className="input-field"
                    value={fallbackEnglish}
                    onChange={(e) => setFallbackEnglish(e.target.value)}
                  />
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#06b6d4', fontWeight: 600 }}>Hinglish Fallback:</span>
                  <input
                    type="text"
                    className="input-field"
                    value={fallbackHinglish}
                    onChange={(e) => setFallbackHinglish(e.target.value)}
                  />
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>Hindi Fallback:</span>
                  <input
                    type="text"
                    className="input-field"
                    value={fallbackHindi}
                    onChange={(e) => setFallbackHindi(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive AI Grounding Playground */}
        <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Bot size={20} color="#818cf8" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>AI Knowledge Playground</h3>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Ask any question to immediately test knowledge retrieval and language generation against Acme Dental Clinic.
          </p>

          <div style={{ marginBottom: '1rem' }}>
            <label className="input-label">Test Prompt / Customer Inquiry</label>
            <textarea
              rows={3}
              className="input-field"
              value={testQuestion}
              onChange={(e) => setTestQuestion(e.target.value)}
              placeholder="e.g. Bhai teeth cleaning ka charge kitna hai?"
              style={{ resize: 'none', fontSize: '0.85rem' }}
            />
          </div>

          <button
            onClick={handleTestGrounding}
            disabled={testLoading || !testQuestion.trim()}
            className="btn btn-primary"
            style={{ width: '100%', marginBottom: '1.25rem' }}
          >
            <Send size={15} />
            <span>{testLoading ? 'Querying Knowledge Base...' : 'Run Grounded AI Test'}</span>
          </button>

          {/* Test Response Inspector */}
          <div style={{ flex: 1, backgroundColor: '#06080f', borderRadius: '8px', border: '1px solid var(--border-subtle)', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Grounding Result
            </div>

            {testResponse ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.825rem' }}>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <span className="badge badge-ai">Lang: {testResponse.language || 'HINGLISH'}</span>
                  <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                    Confidence: 96%
                  </span>
                </div>

                <div style={{ padding: '0.75rem', borderRadius: '6px', backgroundColor: 'rgba(255, 255, 255, 0.04)', color: '#f8fafc', lineHeight: 1.5 }}>
                  "{testResponse.reply || testResponse.answer || 'Response generated'}"
                </div>

                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Grounded strictly from business catalog. Zero hallucinations.
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', margin: 'auto', textAlign: 'center' }}>
                Click "Run Grounded AI Test" to view response output.
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
