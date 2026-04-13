'use client';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL;
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('accessToken') : ''}` });

const FEATURE_ICONS: Record<string, string> = {
  pdf_reports: '📄', africa_map: '🗺️', mrv_calculator: '🧮', api_access: '🔌',
  carbon_marketplace: '🏪', ai_assistant: '🤖', bulk_import: '📥', multi_standard: '📜',
  white_label: '🏷️', sso_saml: '🔑',
};

export default function AdminFeaturesPage() {
  const [features, setFeatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string>('');

  const load = () => {
    fetch(`${API}/admin/features`, { headers: h() })
      .then(r => r.json()).then(setFeatures).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const toggle = async (key: string, enabled: boolean) => {
    setSaving(key);
    await fetch(`${API}/admin/features/${key}`, { method: 'PATCH', headers: h(), body: JSON.stringify({ enabled }) });
    setSaving('');
    load();
  };

  const setRollout = async (key: string, pct: number) => {
    await fetch(`${API}/admin/features/${key}`, { method: 'PATCH', headers: h(), body: JSON.stringify({ rolloutPct: pct }) });
    load();
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, color: '#F87171', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>ADMIN · FEATURE FLAGS</div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: '#E8EFF6', margin: 0 }}>Gestion des Fonctionnalités</h1>
        <p style={{ fontSize: 13, color: '#4A6278', marginTop: 4 }}>Activez/désactivez les features en temps réel sans redémarrage</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {loading ? <div style={{ color: '#4A6278', padding: 20 }}>Chargement...</div> :
          features.map((f: any) => (
            <div key={f.key} style={{ background: '#0D1117', border: `1px solid ${f.enabled ? 'rgba(0,255,148,0.2)' : '#1E2D3D'}`, borderRadius: 10, padding: 16, transition: 'all 0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 24 }}>{FEATURE_ICONS[f.key] || '⚡'}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: f.enabled ? '#E8EFF6' : '#4A6278' }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: '#4A6278' }}>{f.description}</div>
                  </div>
                </div>

                {/* Toggle switch */}
                <button onClick={() => toggle(f.key, !f.enabled)} disabled={saving === f.key}
                  style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative',
                    background: f.enabled ? '#00FF94' : '#1E2D3D', transition: 'background 0.2s', flexShrink: 0 }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3,
                    left: f.enabled ? 23 : 3, transition: 'left 0.2s' }}/>
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>ROLLOUT</span>
                <input type="range" min={0} max={100} value={f.rolloutPct}
                  onChange={e => setRollout(f.key, parseInt(e.target.value))}
                  style={{ flex: 1, accentColor: '#00FF94', cursor: 'pointer' }}/>
                <span style={{ fontSize: 11, color: '#00FF94', fontFamily: 'JetBrains Mono, monospace', minWidth: 36 }}>{f.rolloutPct}%</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <span style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>{f.key}</span>
                <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, fontFamily: 'JetBrains Mono, monospace',
                  background: f.enabled ? 'rgba(0,255,148,0.1)' : 'rgba(74,98,120,0.2)',
                  color: f.enabled ? '#00FF94' : '#4A6278' }}>
                  {f.enabled ? 'ACTIVÉ' : 'DÉSACTIVÉ'}
                </span>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}
