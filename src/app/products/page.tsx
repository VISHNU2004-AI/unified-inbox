'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { apiFetch } from '@/lib/api';
import { ShoppingBag, Plus, Trash2, Tag, CheckCircle2, Sparkles, Stethoscope } from 'lucide-react';

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'SERVICES'>('SERVICES');
  const [products, setProducts] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('DENTAL_CARE');
  const [duration, setDuration] = useState('45 mins');
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    try {
      const [prodRes, servRes] = await Promise.all([
        apiFetch('/api/knowledge/products'),
        apiFetch('/api/knowledge/services')
      ]);
      if (prodRes && prodRes.products) setProducts(prodRes.products);
      if (servRes && servRes.services) setServices(servRes.services);
    } catch (err) {
      console.warn('Failed to load catalog:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) return;
    setLoading(true);

    try {
      if (activeTab === 'PRODUCTS') {
        await apiFetch('/api/knowledge/products', {
          method: 'POST',
          body: JSON.stringify({ name, price: parseFloat(price), description, category })
        });
      } else {
        await apiFetch('/api/knowledge/services', {
          method: 'POST',
          body: JSON.stringify({ name, price: parseFloat(price), description, category, duration })
        });
      }

      setShowModal(false);
      setName('');
      setPrice('');
      setDescription('');
      loadData();
    } catch (err: any) {
      alert(`Failed to save item: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, type: 'PRODUCT' | 'SERVICE') => {
    if (!confirm('Are you sure you want to remove this offering?')) return;
    try {
      if (type === 'PRODUCT') {
        await apiFetch(`/api/knowledge/products/${id}`, { method: 'DELETE' });
      } else {
        await apiFetch(`/api/knowledge/services/${id}`, { method: 'DELETE' });
      }
      loadData();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  return (
    <AppLayout
      title="Products & Clinical Services"
      subtitle="The offerings catalog queried by the AI engine when answering pricing and availability questions in Hindi, English, or Hinglish"
      actions={
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary btn-sm"
          style={{ gap: '0.4rem' }}
        >
          <Plus size={14} />
          <span>Add {activeTab === 'PRODUCTS' ? 'Product' : 'Service'}</span>
        </button>
      }
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Grounding Info Bar */}
        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Sparkles size={18} color="#818cf8" />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Pricing quotes sent by the AI in WhatsApp or Instagram DMs strictly match the prices configured in this table.
            </span>
          </div>

          <div className="tab-pill-list" style={{ width: '260px' }}>
            <button
              onClick={() => setActiveTab('SERVICES')}
              className={`tab-pill ${activeTab === 'SERVICES' ? 'active' : ''}`}
            >
              Services ({services.length})
            </button>
            <button
              onClick={() => setActiveTab('PRODUCTS')}
              className={`tab-pill ${activeTab === 'PRODUCTS' ? 'active' : ''}`}
            >
              Products ({products.length})
            </button>
          </div>
        </div>

        {/* Catalog Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {(activeTab === 'SERVICES' ? services : products).map((item) => (
            <div
              key={item.id}
              className="glass-panel"
              style={{
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.15s ease'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{item.name}</h3>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>
                    ${item.price}
                  </span>
                </div>

                {item.duration && (
                  <div style={{ fontSize: '0.75rem', color: '#818cf8', fontWeight: 600, marginBottom: '0.5rem' }}>
                    Duration: {item.duration}
                  </div>
                )}

                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
                  {item.description || 'No detailed description provided.'}
                </p>

                {item.category && (
                  <span className="badge" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    {item.category}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                  Active in AI Grounding
                </span>
                <button
                  onClick={() => handleDelete(item.id, activeTab === 'SERVICES' ? 'SERVICE' : 'PRODUCT')}
                  className="btn btn-ghost btn-sm"
                  style={{ color: '#f87171', padding: '0.2rem 0.5rem' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add Offering Modal */}
        {showModal && (
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
            <div className="glass-panel" style={{ maxWidth: '500px', width: '100%', padding: '2rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                Add New {activeTab === 'SERVICES' ? 'Clinical Service' : 'Product'}
              </h3>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                Once added, the AI engine will immediately start recommending and quoting this item to customer inquiries.
              </p>

              <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="input-label">Offering Name</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="e.g. Dental Laser Bleaching"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="input-label">Price ($)</label>
                    <input
                      type="number"
                      required
                      step="any"
                      className="input-field"
                      placeholder="e.g. 2500"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="input-label">Category</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Cosmetic Dentistry"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    />
                  </div>
                </div>

                {activeTab === 'SERVICES' && (
                  <div>
                    <label className="input-label">Typical Duration</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. 60 mins"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                    />
                  </div>
                )}

                <div>
                  <label className="input-label">Description / Features</label>
                  <textarea
                    rows={3}
                    className="input-field"
                    placeholder="Detailed explanation of what is included in this offering..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary"
                  >
                    {loading ? 'Adding...' : 'Save Offering'}
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
