'use client';
import { useLang } from '@/lib/lang-context';
import { fetchAuth } from '@/lib/fetch-auth';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL;
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('accessToken') : ''}` });

export default function ApiKeysPage() {
  const { t, lang } = useLang();
  const L = (en, fr) => lang === 'fr' ? fr : en;
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKey, setNewKey] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetchAuth(`/admin/apikeys`)
      .then(r => r.json()).then(d => setKeys(Array.isArray(d) ? d : [])).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!newKeyName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/admin/apikeys`, {
        method: 'POST', headers: h(),
        body: JSON.stringify({ name: newKeyName, userId: JSON.parse(localStorage.getItem('user') || '{}').id })
      });
      const data = await res.json();
      setNewKey(data.rawKey);
      setCreating(false);
      setNewKeyName('');
      load();
    } finally { setSaving(false); }
  };

  const revoke = async (id) => {
    if (!confirm('Révoquer cette clé ? Les intégrations utilisant cette clé cesseront de fonctionner.')) return;
    await fetchAuth(`/admin/apikeys/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>EQUIPMENT API · INTEGRATIONS</div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: '#E8EFF6', margin: 0 }}>L('API Keys', 'Clés API')</h1>
        <p style={{ fontSize: 13, color: '#4A6278', marginTop: 4 }}>Connect your inverters and third-party systems via the PANGEA CARBON Equipment API</p>
      </div>

      {/* New key alert */}
      {newKey && (
        <div style={{ background: 'rgba(0,255,148,0.08)', border: '1px solid rgba(0,255,148,0.3)', borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#00FF94', marginBottom: 8 }}>✓ Clé créée — Copiez-la maintenant, elle ne sera plus affichée</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <code style={{ flex: 1, fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#E8EFF6', background: '#0D1117', padding: '10px 14px', borderRadius: 7, border: '1px solid #1E2D3D', wordBreak: 'break-all' }}>
              {newKey}
            </code>
            <button onClick={() => { navigator.clipboard.writeText(newKey); }}
              style={{ background: '#00FF94', color: '#080B0F', border: 'none', borderRadius: 7, padding: '10px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>
              📋 Copy
            </button>
          </div>
          <button onClick={() => setNewKey(null)} style={{ marginTop: 10, background: 'transparent', border: 'none', color: '#4A6278', fontSize: 12, cursor: 'pointer' }}>
            J'ai copié la clé ✕
          </button>
        </div>
      )}

      {/* Quick start */}
      <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 10, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 14 }}>L('QUICK START', 'DÉMARRAGE RAPIDE')</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            { title: 'Send a reading', code: `curl -X POST https://pangea-carbon.com/api/equipment/reading \\
  -H "X-API-Key: pgc_votre_cle" \\
  -H "Content-Type: application/json" \\
  -d '{"project_id":"ID","energy_mwh":125.5}'` },
            { title: 'Bulk CSV import', code: `curl -X POST .../api/equipment/readings/bulk \\
  -H "X-API-Key: pgc_votre_cle" \\
  -d '{"project_id":"ID","readings":[...]}'` },
          ].map(ex => (
            <div key={ex.title}>
              <div style={{ fontSize: 11, color: '#38BDF8', marginBottom: 8 }}>{ex.title}</div>
              <pre style={{ background: '#121920', border: '1px solid #1E2D3D', borderRadius: 6, padding: '10px 12px', margin: 0, fontSize: 11, color: '#8FA3B8', fontFamily: 'JetBrains Mono, monospace', overflowX: 'auto', lineHeight: 1.6 }}>
                {ex.code}
              </pre>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 14 }}>
          {[
            ['SMA Solar', '/api/equipment/webhook/sma'],
            ['Huawei FusionSolar', '/api/equipment/webhook/huawei'],
            ['SolarEdge', '/api/equipment/webhook/solaredge'],
            ['Fronius', '/api/equipment/webhook/fronius'],
          ].map(([name, endpoint]) => (
            <div key={name} style={{ background: '#121920', border: '1px solid #1E2D3D', borderRadius: 7, padding: '8px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#E8EFF6', fontWeight: 500, marginBottom: 3 }}>{name}</div>
              <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>{endpoint}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Keys list */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#E8EFF6' }}>My API Keys ({keys.length})</div>
        <button onClick={() => setCreating(true)} style={{ background: '#00FF94', color: '#080B0F', border: 'none', borderRadius: 7, padding: '7px 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
          + Nouvelle clé
        </button>
      </div>

      {loading ? <div style={{ color: '#4A6278', padding: 20 }}>L('Loading...', 'Chargement...')</div> :
        keys.length === 0 ? (
          <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 10, padding: 40, textAlign: 'center', color: '#4A6278' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🔑</div>
            <div style={{ fontSize: 14, marginBottom: 4 }}>Aucune clé API</div>
            <div style={{ fontSize: 12 }}>Créez votre première clé pour connecter vos équipements</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {keys.map((key) => (
              <div key={key.id} style={{ background: '#0D1117', border: `1px solid ${key.isActive ? '#1E2D3D' : 'rgba(248,113,113,0.2)'}`, borderRadius: 9, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: key.isActive ? '#00FF94' : '#F87171', animation: key.isActive ? 'pulse 2s infinite' : 'none' }}/>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#E8EFF6' }}>{key.name}</div>
                  <div style={{ fontSize: 11, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
                    {key.keyPrefix}••••••••••••••••
                    {key.lastUsedAt && ` · Dernier usage: ${new Date(key.lastUsedAt).toLocaleDateString('en-US')}`}
                    {key.expiresAt && ` · Expire: ${new Date(key.expiresAt).toLocaleDateString('en-US')}`}
                  </div>
                </div>
                <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, fontFamily: 'JetBrains Mono, monospace',
                  background: key.isActive ? 'rgba(0,255,148,0.1)' : 'rgba(248,113,113,0.1)',
                  color: key.isActive ? '#00FF94' : '#F87171' }}>
                  {key.isActive ? 'ACTIVE' : 'RÉVOQUÉE'}
                </span>
                {key.isActive && (
                  <button onClick={() => revoke(key.id)} style={{ background: 'transparent', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 5, color: '#F87171', padding: '4px 10px', cursor: 'pointer', fontSize: 11 }}>
                    Révoquer
                  </button>
                )}
              </div>
            ))}
          </div>
        )
      }
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

      {/* Create modal */}
      {creating && (
        <div style={{ position: 'fixed', inset: 0, background:'rgba(8,11,15,0.88)', backdropFilter:'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#0D1117', border: '1px solid rgba(0,255,148,0.15)', borderRadius: 14, padding: 28, width: 400 }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, color: '#E8EFF6', marginTop: 0, marginBottom: 16 }}>Create une clé API</h2>
            <label style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>Nom (usage)</label>
            <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} onKeyDown={e => e.key === 'Enter' && create()}
              placeholder="ex: SMA Inverter Abidjan, Huawei Lagos..."
              style={{ width: '100%', background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '10px 14px', fontSize: 13, boxSizing: 'border-box', outline: 'none', marginBottom: 20 }}
              autoFocus/>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setCreating(false)} style={{ flex: 1, background: 'transparent', border: '1px solid #1E2D3D', borderRadius: 7, color: '#4A6278', padding: '9px', cursor: 'pointer' }}>L('Cancel', 'Annuler')</button>
              <button onClick={create} disabled={saving || !newKeyName.trim()} style={{ flex: 1, background: '#00FF94', color: '#080B0F', border: 'none', borderRadius: 7, padding: '9px', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? '...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
