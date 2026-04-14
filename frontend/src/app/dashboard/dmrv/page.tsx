'use client';
import { useLang } from '@/lib/lang-context';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_URL;
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('accessToken') : ''}` });
const fmt = (n, d = 1) => n?.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) ?? '0';

export default function DMRVPage() {
  const { t, lang } = useLang();
  const L = (en, fr) => lang === 'fr' ? fr : en;
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState('');
  const [dmrv, setDmrv] = useState(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    api.getProjects().then(d => {
      setProjects(d.projects || []);
      if (d.projects?.[0]) setSelected(d.projects[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    fetch(`${API}/dmrv/${selected}`, { headers: h() })
      .then(r => r.json()).then(setDmrv).catch(console.error).finally(() => setLoading(false));
  }, [selected]);

  const runVerification = async () => {
    setRunning(true);
    await fetch(`${API}/dmrv/continuous-verify/${selected}`, { method: 'POST', headers: h() });
    const d = await fetch(`${API}/dmrv/${selected}`, { headers: h() }).then(r => r.json());
    setDmrv(d);
    setRunning(false);
  };

  const a = dmrv?.analytics;

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <a href="/dashboard/standards" style={{ fontSize: 12, color: '#4A6278', textDecoration: 'none' }}>← Carbon Hub</a>
        <div style={{ fontSize: 10, color: '#A78BFA', fontFamily: 'JetBrains Mono, monospace', margin: '8px 0 4px' }}>dMRV · SENTINEL-2 · IoT CONTINUOUS VERIFICATION</div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: '#E8EFF6', margin: 0 }}>Digital MRV Engine</h1>
        <p style={{ fontSize: 13, color: '#4A6278', marginTop: 4 }}>Continuous satellite verification. Zero site visits. VVB-certifiable results.</p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <select value={selected} onChange={e => setSelected(e.target.value)}
          style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '9px 14px', fontSize: 13, flex: 1 }}>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.installedMW} MW</option>)}
        </select>
        <button onClick={runVerification} disabled={running || !selected}
          style={{ background: running ? '#1E2D3D' : '#A78BFA', color: running ? '#4A6278' : '#080B0F', border: 'none', borderRadius: 7, padding: '9px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          {running ? '🛰️ Acquisition...' : '🛰️ Start vérification satellite'}
        </button>
      </div>

      {a && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'dMRV Score', value: `${a.dMRVScore}/100`, color: a.dMRVScore >= 85 ? '#00FF94' : '#FCD34D' },
            { label: 'Avg. deviation', value: `${fmt(a.avgDeviation)}%`, color: a.avgDeviation < 5 ? '#00FF94' : '#F87171' },
            { label: 'Satellite readings', value: a.totalSatelliteReadings, color: '#A78BFA' },
            { label: 'Certification ready', value: a.certificationReady ? 'OUI ✓' : 'NON ✗', color: a.certificationReady ? '#00FF94' : '#F87171' },
          ].map(k => (
            <div key={k.label} style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>{k.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: k.color, fontFamily: 'Syne, sans-serif' }}>{String(k.value)}</div>
            </div>
          ))}
        </div>
      )}

      {dmrv?.comparison?.length > 0 && (
        <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '12px 20px', background: '#121920', borderBottom: '1px solid #1E2D3D', fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>
            SENTINEL-2 vs LECTURES MANUELLES — VÉRIFICATION CROISÉE
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Date capture', 'Satellite (MWh)', 'Manuel (MWh)', 'Déviation', 'Confiance', 'Status'].map(col => (
                  <th key={col} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', borderBottom: '1px solid #1E2D3D' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dmrv.comparison.slice(0, 8).map((c, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(30,45,61,0.4)' }}>
                  <td style={{ padding: '9px 14px', fontSize: 12, color: '#8FA3B8', fontFamily: 'JetBrains Mono, monospace' }}>{new Date(c.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}</td>
                  <td style={{ padding: '9px 14px', fontSize: 13, color: '#A78BFA', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{fmt(c.satellite)}</td>
                  <td style={{ padding: '9px 14px', fontSize: 13, color: c.manual ? '#E8EFF6' : '#2A3F55', fontFamily: 'JetBrains Mono, monospace' }}>{c.manual ? fmt(c.manual) : '—'}</td>
                  <td style={{ padding: '9px 14px', fontSize: 12, color: c.deviation !== null ? (c.deviation < 5 ? '#00FF94' : c.deviation < 10 ? '#FCD34D' : '#F87171') : '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>
                    {c.deviation !== null ? `${c.deviation}%` : '—'}
                  </td>
                  <td style={{ padding: '9px 14px', fontSize: 12, color: '#8FA3B8', fontFamily: 'JetBrains Mono, monospace' }}>{(c.confidence * 100).toFixed(0)}%</td>
                  <td style={{ padding: '9px 14px' }}>
                    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, fontFamily: 'JetBrains Mono, monospace', background: 'rgba(167,139,250,0.1)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.2)' }}>
                      VÉRIFIÉ SATELLITE
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {loading && <div style={{ padding: 40, textAlign: 'center', color: '#4A6278' }}>Chargement données satellite...</div>}
      {!loading && (!dmrv?.comparison?.length) && (
        <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🛰️</div>
          <div style={{ fontSize: 15, color: '#E8EFF6', marginBottom: 6 }}>No satellite data</div>
          <div style={{ fontSize: 13, color: '#4A6278', marginBottom: 20 }}>Click "Start vérification satellite" to acquire 6 months of Sentinel-2 data</div>
        </div>
      )}
    </div>
  );
}
