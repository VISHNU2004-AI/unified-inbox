'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { apiFetch } from '@/lib/api';
import { BookOpen, Upload, Plus, FileText, CheckCircle2, Tag, Search, Sparkles } from 'lucide-react';

export default function BusinessKnowledgePage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadDocs() {
      try {
        const res = await apiFetch('/api/knowledge/documents');
        if (res && res.documents) {
          setDocuments(res.documents);
        }
      } catch (err) {
        console.warn('Failed to load documents:', err);
      }
    }
    loadDocs();
  }, []);

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim() || !docContent.trim()) return;
    setLoading(true);

    try {
      await apiFetch('/api/knowledge/documents', {
        method: 'POST',
        body: JSON.stringify({
          title: docTitle.trim(),
          rawContent: docContent.trim(),
          sourceType: 'FILE'
        })
      });

      setShowUploadModal(false);
      setDocTitle('');
      setDocContent('');
      const res = await apiFetch('/api/knowledge/documents');
      if (res && res.documents) setDocuments(res.documents);
    } catch (err: any) {
      alert(`Failed to upload document: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const sampleKnowledge = [
    {
      title: 'Tooth Extraction & Scaling Aftercare Guide',
      source: 'PDF Manual',
      chunksCount: 6,
      preview: 'Avoid hot beverages, spicy foods, and rinsing vigorously for the first 24 hours. Bite gently on gauze for 45 minutes.',
      keywords: ['extraction', 'scaling', 'cleaning', 'bleeding', 'aftercare', 'pain']
    },
    {
      title: 'Pediatric Dental Examination Protocol',
      source: 'Internal Protocol',
      chunksCount: 4,
      preview: 'Initial consultation includes non-invasive fluoridation check, gentle cleaning with low-speed brush, and parent hygiene briefing.',
      keywords: ['children', 'pediatric', 'kids', 'fluoride', 'brushing']
    },
    {
      title: 'Insurance & Cashless Empanelment Policy',
      source: 'Billing Policy',
      chunksCount: 3,
      preview: 'We accept cashless claims with Star Health, HDFC Ergo, and ICICI Lombard for surgical procedures. OPD requires reimbursement claim submission.',
      keywords: ['insurance', 'cashless', 'star health', 'claim', 'billing']
    }
  ];

  return (
    <AppLayout
      title="Business Knowledge & RAG Chunking"
      subtitle="Upload dental protocols, FAQ documents, and policies for semantic vector retrieval by the AI engine"
      actions={
        <button
          onClick={() => setShowUploadModal(true)}
          className="btn btn-primary btn-sm"
          style={{ gap: '0.4rem' }}
        >
          <Plus size={14} />
          <span>Upload Document</span>
        </button>
      }
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Knowledge Chunker Status Banner */}
        <div className="glass-panel" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.08))', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Sparkles size={20} color="#818cf8" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>Automatic RAG Ingestion Pipeline Active</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  All uploaded documents are normalized, segmented into 400-token semantic chunks, and indexed with keyword embeddings.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}>100% Grounded</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>0 Hallucination Tolerance</div>
              </div>
            </div>
          </div>
        </div>

        {/* Documents Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {sampleKnowledge.map((item, idx) => (
            <div key={idx} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={18} color="#818cf8" />
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{item.title}</span>
                  </div>
                  <span className="badge" style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
                    {item.chunksCount} chunks
                  </span>
                </div>

                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem', fontStyle: 'italic' }}>
                  "{item.preview}"
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1rem' }}>
                  {item.keywords.map((kw) => (
                    <span key={kw} style={{ fontSize: '0.675rem', padding: '0.15rem 0.45rem', borderRadius: '4px', backgroundColor: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)' }}>
                      #{kw}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>Source: {item.source}</span>
                <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <CheckCircle2 size={12} /> Indexed
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Upload Modal */}
        {showUploadModal && (
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
            <div className="glass-panel" style={{ maxWidth: '540px', width: '100%', padding: '2rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Upload Knowledge Document</h3>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                Paste your business policy, product guidelines, or clinic instructions to be parsed into RAG vectors.
              </p>

              <form onSubmit={handleCreateDocument} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="input-label">Document Title</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="e.g. Invisalign Treatment & Financing FAQ"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="input-label">Document Content / Text</label>
                  <textarea
                    rows={6}
                    required
                    className="input-field"
                    placeholder="Paste the document text here..."
                    value={docContent}
                    onChange={(e) => setDocContent(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary"
                  >
                    {loading ? 'Chunking & Indexing...' : 'Index Knowledge'}
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
