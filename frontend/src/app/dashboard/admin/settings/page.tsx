'use client';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL;
const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken')}` });

const CAT_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  stripe:       { label: 'Stripe Payments', icon: '💳', color: '#635BFF' },
  smtp:         { label: 'Email SMTP',       icon: '📧', color: '#38BDF8' },
  integrations: { label: 'Intégrations API', icon: '🔌', color: '#A78BFA' },
  general:      { label: 'Général',          icon: '⚙️', color: '#4A6278' },
};

function SecretInput({ setting, onSave }: { setting: any; onSave: (key: string, value: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [show, setShow] = useState(false);

  const handleSave = async () => {
    if (!value.trim()) return;
    setSaving(true);
    try {
      await onSave(setting.key, value);
      setEditing(false);
      setValue('');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  };

  return (
    <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(30,45,61,0.5)', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 13, color: '#E8EFF6', fontWeight: 500 }}>{setting.description}</span>
          {setting.encrypted && <span style={{ fontSize: 9, background: 'rgba(248,113,113,0.1)', color: '#F87171', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 4, padding: '1px 5px', fontFamily: 'JetBrains Mono, monospace' }}>CHIFFRÉ AES-256</span>}
          {saved && <span style={{ fontSize: 10, color: '#00FF94' }}>✓ Sauvegardé</span>}
        </div>
        <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>{setting.key}</div>

        {/* Current value display */}
        {!editing && (
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
            color: setting.hasValue ? '#8FA3B8' : '#2A3F55',
            background: '#0D1117', padding: '6px 10px', borderRadius: 5, display: 'inline-block' }}>
            {setting.hasValue ? setting.value : '— non configuré —'}
          </div>
        )}

        {/* Edit form */}
        {editing && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type={setting.encrypted && !show ? 'password' : 'text'}
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder={`Entrez ${setting.description}`}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                style={{ width: '100%', background: '#0D1117', border: '1px solid rgba(0,255,148,0.3)', borderRadius: 6, color: '#E8EFF6', padding: '8px 36px 8px 10px', fontSize: 13, fontFamily: 'JetBrains Mono, monospace', outline: 'none', boxSizing: 'border-box' }}
              />
              {setting.encrypted && (
                <button onClick={() => setShow(!show)}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#4A6278', fontSize: 14 }}>
                  {show ? '🙈' : '👁️'}
                </button>
              )}
            </div>
            <button onClick={handleSave} disabled={saving || !value.trim()}
              style={{ background: '#00FF94', color: '#080B0F', border: 'none', borderRadius: 6, padding: '8px 14px', fontWeight: 600, fontSize: 12, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? '...' : '✓ Sauver'}
            </button>
            <button onClick={() => { setEditing(false); setValue(''); }}
              style={{ background: 'transparent', color: '#4A6278', border: '1px solid #1E2D3D', borderRadius: 6, padding: '8px 10px', cursor: 'pointer', fontSize: 12 }}>
              ✕
            </button>
          </div>
        )}
      </div>

      {!editing && (
        <button onClick={() => setEditing(true)}
          style={{ background: 'transparent', border: '1px solid #1E2D3D', borderRadius: 6, color: '#4A6278', padding: '6px 12px', cursor: 'pointer', fontSize: 12, flexShrink: 0, whiteSpace: 'nowrap' }}>
          {setting.hasValue ? '✏️ Modifier' : '+ Configurer'}
        </button>
      )}
    </div>
  );
}

export default function AdminSettingsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('stripe');
  const [testResult, setTestResult] = useState<Record<string, any>>({});

  const load = () => {
    setLoading(true);
    fetch(`${API}/admin/settings`, { headers: headers() })
      .then(r => r.json()).then(setData).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const saveSetting = async (key: string, value: string) => {
    const res = await fetch(`${API}/admin/settings/${key}`, {
      method: 'PUT', headers: headers(), body: JSON.stringify({ value })
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
    load(); // Reload pour afficher la valeur masquée
  };

  const testStripe = async () => {
    try {
      const res = await fetch(`${API}/billing/status`, { headers: headers() });
      const d = await res.json();
      setTestResult({ stripe: d.message || `Status: ${d.status}`, ok: d.status !== 'error' });
    } catch (e: any) { setTestResult({ stripe: e.message, ok: false }); }
  };

  if (loading) return <div style={{ padding: 24, color: '#4A6278' }}>Chargement...</div>;

  const byCategory = data?.byCategory || {};
  const categories = Object.keys(CAT_LABELS);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, color: '#F87171', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>ADMIN · SÉCURITÉ</div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: '#E8EFF6', margin: 0 }}>Secrets & Configuration</h1>
        <p style={{ fontSize: 13, color: '#4A6278', marginTop: 4 }}>Tous les secrets sont chiffrés AES-256-GCM en base de données. Jamais exposés dans les logs.</p>
      </div>

      {/* Security badge */}
      <div style={{ background: 'rgba(0,255,148,0.04)', border: '1px solid rgba(0,255,148,0.15)', borderRadius: 10, padding: '12px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 20 }}>🔐</span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#00FF94' }}>Stockage sécurisé activé</div>
          <div style={{ fontSize: 11, color: '#4A6278' }}>Chiffrement AES-256-GCM · Clé dérivée de l'env · Jamais en clair dans les logs · Audit trail complet</div>
        </div>
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#0D1117', borderRadius: 8, padding: 4 }}>
        {categories.map(cat => {
          const catInfo = CAT_LABELS[cat];
          const count = (byCategory[cat] || []).filter((s: any) => s.hasValue).length;
          const total = (byCategory[cat] || []).length;
          return (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: activeCategory === cat ? '#121920' : 'transparent',
                outline: activeCategory === cat ? `1px solid ${catInfo.color}30` : 'none' }}>
              <div style={{ fontSize: 16, marginBottom: 3 }}>{catInfo.icon}</div>
              <div style={{ fontSize: 11, color: activeCategory === cat ? '#E8EFF6' : '#4A6278', fontWeight: 500 }}>{catInfo.label}</div>
              <div style={{ fontSize: 9, color: count === total ? '#00FF94' : '#FCD34D', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>{count}/{total} configurés</div>
            </button>
          );
        })}
      </div>

      {/* Settings for active category */}
      <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '12px 16px', background: '#121920', borderBottom: '1px solid #1E2D3D', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>{CAT_LABELS[activeCategory]?.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#E8EFF6' }}>{CAT_LABELS[activeCategory]?.label}</span>
          </div>
          {activeCategory === 'stripe' && (
            <div style={{ display: 'flex', align: 'center', gap: 8 }}>
              {testResult.stripe && <span style={{ fontSize: 11, color: testResult.ok ? '#00FF94' : '#F87171' }}>{testResult.stripe}</span>}
              <button onClick={testStripe} style={{ background: 'transparent', border: '1px solid #1E2D3D', borderRadius: 5, color: '#4A6278', padding: '4px 10px', cursor: 'pointer', fontSize: 11 }}>
                🔍 Tester Stripe
              </button>
            </div>
          )}
        </div>
        {(byCategory[activeCategory] || []).map((setting: any) => (
          <SecretInput key={setting.key} setting={setting} onSave={saveSetting} />
        ))}
      </div>

      {/* Quick guide */}
      {activeCategory === 'stripe' && (
        <div style={{ background: 'rgba(99,91,255,0.05)', border: '1px solid rgba(99,91,255,0.15)', borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 11, color: '#635BFF', fontFamily: 'JetBrains Mono, monospace', marginBottom: 10 }}>GUIDE STRIPE ATLAS LLC</div>
          {[
            ['1. Dashboard Stripe', '→ dashboard.stripe.com → Developers → API keys'],
            ['2. Secret Key', '→ Reveal live key → Copier sk_live_...'],
            ['3. Webhook Secret', '→ Webhooks → Add endpoint → https://pangea-carbon.com/api/billing/webhook → Events: checkout.session.completed, customer.subscription.deleted → Révéler le signing secret'],
            ['4. Publishable Key', '→ Copier pk_live_... (affiché sans restriction)'],
          ].map(([step, action]) => (
            <div key={step} style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: '#635BFF', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>{step}</span>
              <span style={{ fontSize: 11, color: '#8FA3B8' }}>{action}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
