'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { apiFetch } from '@/lib/api';
import { Building2, Save, CheckCircle2, Clock, MapPin, Phone, Mail, Globe } from 'lucide-react';

export default function BusinessProfilePage() {
  const [businessName, setBusinessName] = useState('Acme Dental & Wellness Clinic');
  const [industry, setIndustry] = useState('Dental Healthcare & Aesthetic Wellness');
  const [location, setLocation] = useState('Suite 400, Medical Plaza, Metro City');
  const [contactPhone, setContactPhone] = useState('+91 98765 43210');
  const [contactEmail, setContactEmail] = useState('contact@acmedental.com');
  const [website, setWebsite] = useState('https://acmedental.com');
  const [businessHours, setBusinessHours] = useState('Monday - Saturday: 9:00 AM - 8:00 PM (IST). Sunday: Closed.');
  const [supportInstructions, setSupportInstructions] = useState('For acute dental emergencies after hours, contact Dr. Sarah emergency pager at +91 98765 00000.');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await apiFetch('/api/knowledge/profile');
        if (res && res.profile) {
          const p = res.profile;
          if (p.businessName) setBusinessName(p.businessName);
          if (p.industry) setIndustry(p.industry);
          if (p.location) setLocation(p.location);
          if (p.contactPhone) setContactPhone(p.contactPhone);
          if (p.contactEmail) setContactEmail(p.contactEmail);
          if (p.website) setWebsite(p.website);
          if (p.businessHours) setBusinessHours(p.businessHours);
          if (p.supportInstructions) setSupportInstructions(p.supportInstructions);
        }
      } catch (err) {
        console.warn('Failed to load profile:', err);
      }
    }
    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/knowledge/profile', {
        method: 'POST',
        body: JSON.stringify({
          businessName,
          industry,
          location,
          contactPhone,
          contactEmail,
          website,
          businessHours,
          supportInstructions,
        })
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      alert(`Failed to update profile: ${err.message}`);
    }
  };

  return (
    <AppLayout
      title="Business & Clinic Profile"
      subtitle="The ground-truth business details used by the AI engine to answer customer inquiries"
      actions={
        <button onClick={handleSave} className="btn btn-primary btn-sm" style={{ gap: '0.4rem' }}>
          <Save size={14} />
          <span>Save Profile</span>
        </button>
      }
    >
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {saved && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.85rem 1rem',
            borderRadius: '8px',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#10b981',
            fontSize: '0.85rem',
            marginBottom: '1.5rem'
          }}>
            <CheckCircle2 size={16} />
            <span>Business profile details saved successfully!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div>
              <label className="input-label">Business / Clinic Name</label>
              <input
                type="text"
                required
                className="input-field"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>

            <div>
              <label className="input-label">Industry Sector</label>
              <input
                type="text"
                required
                className="input-field"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div>
              <label className="input-label">Contact Phone / WhatsApp</label>
              <input
                type="text"
                className="input-field"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>

            <div>
              <label className="input-label">Contact Email</label>
              <input
                type="email"
                className="input-field"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="input-label">Clinic Location / Physical Address</label>
            <input
              type="text"
              className="input-field"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div>
            <label className="input-label">Official Business Hours</label>
            <textarea
              rows={2}
              className="input-field"
              value={businessHours}
              onChange={(e) => setBusinessHours(e.target.value)}
            />
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
              The AI automatically references this text when answering queries like "kab open hota hai" or "what are your weekend timings".
            </span>
          </div>

          <div>
            <label className="input-label">Emergency & Escalation Guidelines</label>
            <textarea
              rows={3}
              className="input-field"
              value={supportInstructions}
              onChange={(e) => setSupportInstructions(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '0.65rem 1.5rem' }}>
            Save Changes
          </button>
        </form>
      </div>
    </AppLayout>
  );
}
