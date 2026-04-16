'use client';
import { useLang } from '@/lib/lang-context';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_URL;
const h = () => ({ Authorization: "Bearer "+(typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '')+"" });
const fmt = (n) => n?.toLocaleString('en-US', { maximumFractionDigits: 0 }) ?? '0';

const EFFORT_STYLE = {
  LOW:    { color: '#00FF94', bg: 'rgba(0,255,148,0.1)',    label: 'Facile' },
  MEDIUM: { color: '#FCD34D', bg: 'rgba(252,211,77,0.1)',   label: 'Moyen' },
  HIGH:   { color: '#F87171', bg: 'rgba(248,113,113,0.1)',  label: 'Complexe' },
};

const CAT_COLOR = { Standard: '#38BDF8', Marché: '#A78BFA', Performance: '#00FF94', Méthodologie: '#FCD34D', Données: '#8FA3B8', Vérification: '#F97316' };

export default function OptimizationPage() {
  const { t, lang } = useLang();
  const L = (en, fr) => lang === 'fr' ? fr : en;
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState('');
  const [data, setData] = useState(null);
  const [gap, setGap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL');

  useEffect(() => {
    api.getProjects().then(d => { setProjects(d.projects || []); if (d.projects?.[0]) setSelected(d.projects[0].id); });
    fetch(""+(API)+"/optimization/portfolio/gap", { headers: h() }).then(r => r.json()).then(setGap).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    fetch(""+(API)+"/optimization/"+(selected)+"", { headers: h() })
      .then(r => r.json()).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [selected]);

  const recs: any[] = data?.recommendations || [];
  const filtered = activeFilter === 'ALL' ? recs : recs.filter(r => r.effort === activeFilter);
  const s = data?.summary;

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: '#00FF94', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>MRV OPTIMIZATION · AI RECOMMENDATIONS</div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: '#E8EFF6', margin: 0 }}>L('MRV Optimization', 'Optimisation MRV')</h1>
          <p style={{ fontSize: 13, color: '#4A6278', marginTop: 4 }}>Every recommendation has a calculated financial impact. ROI priority.</p>
        </div>
        <select value={selected} onChange={e => setSelected(e.target.value)}
          style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 8, color: '#E8EFF6', padding: '10px 14px', fontSize: 13, minWidth: 240 }}>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Portfolio gap */}
      {gap && (
        <div style={{ background: 'rgba(0,255,148,0.04)', border: '1px solid rgba(0,255,148,0.15)', borderRadius: 10, padding: '14px 20px', marginBottom: 20, display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ fontSize: 11, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', alignSelf: 'center' }}>PORTFOLIO GAP — CURRENT VS ARTICLE 6 OPTIMAL REVENUE</div>
          {[
            ['Current revenue', `$${fmt(gap.totalCurrentRevenue)}`, '#4A6278'],
            ['Article 6 Potential', `$${fmt(gap.totalOptimalRevenue)}`, '#38BDF8'],
            ['Gap to close', `+$${fmt(gap.totalOptimalRevenue - gap.totalCurrentRevenue)}`, '#00FF94'],
          ].map(([k, v, c]) => (
            <div key={String(k)}>
              <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>{k}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: c as string, fontFamily: 'Syne, sans-serif' }}>{v}</div>
            </div>
          ))}
        </div>
      )}

      {s && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total potential gain', value: `$${fmt(s.totalPotentialGain)}`, color: '#00FF94' },
            { label: 'Uplift vs current', value: `+${s.upliftPct}%`, color: '#FCD34D' },
            { label: 'Quick wins', value: `${s.quickWinsCount} actions`, color: '#38BDF8' },
            { label: 'Quick win gain', value: `$${fmt(s.quickWinsGain)}`, color: '#00FF94' },
          ].map(k => (
            <div key={k.label} style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>{k.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: k.color, fontFamily: 'Syne, sans-serif' }}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['ALL', 'LOW', 'MEDIUM', 'HIGH'].map(f => {
          const style = f === 'ALL' ? { color: '#E8EFF6', bg: '#1E2D3D' } : { color: EFFORT_STYLE[f]?.color, bg: EFFORT_STYLE[f]?.bg };
          return (
            <button key={f} onClick={() => setActiveFilter(f)}
              style={{ padding: '6px 14px', borderRadius: 16, border: activeFilter === f ? `1px solid ${style.color}` : '1px solid #1E2D3D', background: activeFilter === f ? style.bg : '#0D1117', color: activeFilter === f ? style.color : '#4A6278', cursor: 'pointer', fontSize: 12 }}>
              {f === 'ALL' ? 'Toutes' : EFFORT_STYLE[f].label} {f !== 'ALL' && `(${recs.filter(r => r.effort === f).length})`}
            </button>
          );
        })}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 60, color: '#4A6278' }}>Analyse des optimisations...</div>}

      {!loading && filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((rec, i) => {
            const eff = EFFORT_STYLE[rec.effort];
            const catColor = CAT_COLOR[rec.category] || '#8FA3B8';
            return (
              <div key={rec.id} style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 20, display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, background: `${catColor}15`, color: catColor, border: `1px solid ${catColor}25`, borderRadius: 5, padding: '2px 8px', fontFamily: 'JetBrains Mono, monospace' }}>{rec.category}</span>
                    <span style={{ fontSize: 10, background: eff.bg, color: eff.color, border: `1px solid ${eff.color}25`, borderRadius: 5, padding: '2px 7px', fontFamily: 'JetBrains Mono, monospace' }}>{eff.label}</span>
                    <span style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>⏱ {rec.timeToImpact}</span>
                    {i === 0 && <span style={{ fontSize: 9, background: 'rgba(252,211,77,0.15)', color: '#FCD34D', borderRadius: 4, padding: '2px 6px' }}>PRIORITÉ #1</span>}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#E8EFF6', marginBottom: 6 }}>{rec.title}</div>
                  <p style={{ fontSize: 13, color: '#8FA3B8', lineHeight: 1.6, margin: 0 }}>{rec.description}</p>
                  {rec.creditsGain > 0 && (
                    <div style={{ marginTop: 8, fontSize: 12, color: '#00FF94' }}>
                      + {fmt(rec.creditsGain)} tCO₂e additionnels
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right', minWidth: 120 }}>
                  <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>L('ANNUAL GAIN', 'GAIN ANNUEL')</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#00FF94', fontFamily: 'Syne, sans-serif', lineHeight: 1 }}>
                    {rec.revenueGainUSD >= 1000 ? `$${fmt(rec.revenueGainUSD)}` : `$${fmt(rec.revenueGainUSD)}`}
                  </div>
                  <div style={{ fontSize: 10, color: '#4A6278', marginTop: 2 }}>USD/an</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 48, textAlign: 'center', color: '#4A6278' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 15, color: '#E8EFF6', marginBottom: 6 }}>Aucune recommandation dans cette catégorie</div>
          <div>Sélectionnez un projet avec des données MRV pour l'analyse</div>
        </div>
      )}
    </div>
  );
}