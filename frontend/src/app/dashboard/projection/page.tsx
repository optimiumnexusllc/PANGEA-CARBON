'use client';
import { useLang } from '@/lib/lang-context';
import { useEffect, useState, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { api } from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_URL;
const h = () => ({ 'Content-Type': 'application/json', Authorization: "Bearer "+(typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '')+"" });
const fmt = (n, d = 0) => n?.toLocaleString('en-US', { maximumFractionDigits: d }) ?? '0';

const TT = ({ active, payload, label }: any) => active && payload?.length ? (
  <div style={{ background: '#121920', border: '1px solid #1E2D3D', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
    <div style={{ color: '#4A6278', marginBottom: 6, fontFamily: 'JetBrains Mono, monospace' }}>{label}</div>
    {payload.map((p, i) => (
      <div key={i} style={{ color: p.color, marginBottom: 3 }}>
        {p.name}: <strong>${fmt(p.value)}</strong>
      </div>
    ))}
  </div>
) : null;

export default function ProjectionPage() {
  const { t, lang } = useLang();
  const L = (en, fr) => lang === 'fr' ? fr : en;
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState('');
  const [portfolioData, setPortfolioData] = useState(null);
  const [projectData, setProjectData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [params, setParams] = useState({ years: 10, carbonPrice: 12, additionalMW: 0 });
  const [view, setView] = useState('portfolio');

  useEffect(() => {
    api.getProjects().then(d => { setProjects(d.projects || []); if (d.projects?.[0]) setSelected(d.projects[0].id); });
    fetchPortfolio();
  }, []);

  const fetchPortfolio = async () => {
    const res = await fetch(""+(API)+"/projection/portfolio/total", { method: 'POST', headers: h(), body: JSON.stringify({ years: 10 }) });
    if (res.ok) setPortfolioData(await res.json());
  };

  const fetchProject = useCallback(async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await fetch(""+(API)+"/projection/"+(selected)+"", { method: 'POST', headers: h(), body: JSON.stringify(params) });
      if (res.ok) setProjectData(await res.json());
    } finally { setLoading(false); }
  }, [selected, params]);

  useEffect(() => { if (view === 'project') fetchProject(); }, [selected, view]);

  const chartData = view === 'portfolio' && portfolioData
    ? portfolioData.byYear.map((y) => ({ year: String(y.year), Optimistic: y.optimistic, Base: y.base, Conservative: y.conservative }))
    : projectData
      ? Object.keys(projectData.scenarios || {}).flatMap(() => {
          const years = projectData.scenarios.base?.yearly || [];
          return years.map((y, i) => ({
            year: String(y.year),
            Optimistic: projectData.scenarios.optimistic?.yearly[i]?.revenue || 0,
            Base: y.revenue,
            Conservative: projectData.scenarios.conservative?.yearly[i]?.revenue || 0,
          }));
        }).filter((v, i, a) => a.findIndex(x => x.year === v.year) === i)
      : [];

  const totals = view === 'portfolio' ? portfolioData?.totals : {
    base: projectData?.scenarios?.base?.totalRevenue || 0,
    optimistic: projectData?.scenarios?.optimistic?.totalRevenue || 0,
    conservative: projectData?.scenarios?.conservative?.totalRevenue || 0,
  };

  const mc = view === 'project' ? projectData?.scenarios?.base?.monteCarlo : null;

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, color: '#A78BFA', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>PROJECTION · MONTE CARLO SIMULATION</div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: '#E8EFF6', margin: 0 }}>Projection {params.years} ans</h1>
        <p style={{ fontSize: 13, color: '#4A6278', marginTop: 4 }}>3 scenarios · 200 Monte Carlo simulations · Grid decarbonization integrated</p>
      </div>

      {/* View toggle + controls */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', gap: 4, background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 8, padding: 3 }}>
          {[['portfolio', '🌍 Portfolio'], ['project', '📊 Project']].map(([v, label]) => (
            <button key={v} onClick={() => setView(v as any)}
              style={{ padding: '7px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, background: view === v ? '#1E2D3D' : 'transparent', color: view === v ? '#E8EFF6' : '#4A6278' }}>
              {label}
            </button>
          ))}
        </div>

        {view === 'project' && (
          <>
            <select value={selected} onChange={e => setSelected(e.target.value)}
              style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '9px 12px', fontSize: 13 }}>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              {[
                { label: 'Horizon', key: 'years', min: 5, max: 20, unit: 'ans' },
                { label: 'Carbon price', key: 'carbonPrice', min: 5, max: 60, unit: '$/t' },
                { label: 'MW additionnel', key: 'additionalMW', min: 0, max: 100, unit: 'MW' },
              ].map(p => (
                <div key={p.key} style={{ display: 'flex', align: 'center', gap: 6, background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, padding: '6px 12px', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#4A6278', whiteSpace: 'nowrap' }}>{p.label}</span>
                  <input type="range" min={p.min} max={p.max} value={(params as any)[p.key]}
                    onChange={e => setParams(prev => ({ ...prev, [p.key]: parseInt(e.target.value) }))}
                    style={{ width: 80, accentColor: '#A78BFA', cursor: 'pointer' }}/>
                  <span style={{ fontSize: 12, color: '#A78BFA', fontFamily: 'JetBrains Mono, monospace', minWidth: 40 }}>{(params as any)[p.key]}{p.unit}</span>
                </div>
              ))}
              <button onClick={fetchProject} disabled={loading}
                style={{ background: '#A78BFA', color: '#080B0F', border: 'none', borderRadius: 7, padding: '9px 16px', fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Calcul...' : '▶ Simuler'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* KPIs */}
      {totals && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Scénario conservateur', value: `$${fmt(totals.conservative || totals.conservative)}`, color: '#F87171', sub: `sur ${params.years} ans` },
            { label: 'Scénario base', value: `$${fmt(totals.base)}`, color: '#FCD34D', sub: `sur ${params.years} ans` },
            { label: 'Scénario optimiste', value: `$${fmt(totals.optimistic)}`, color: '#00FF94', sub: `sur ${params.years} ans` },
          ].map(k => (
            <div key={k.label} style={{ background: '#0D1117', border: `1px solid ${k.color}20`, borderRadius: 10, padding: '16px 18px' }}>
              <div style={{ fontSize: 10, color: k.color, fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>{k.label.toUpperCase()}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: k.color, fontFamily: 'Syne, sans-serif' }}>{k.value}</div>
              <div style={{ fontSize: 11, color: '#4A6278', marginTop: 2 }}>{k.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Main chart */}
      <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 16 }}>
          CARBON REVENUE PROJECTION — 3 SCENARIOS · USD/YEAR
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <XAxis dataKey="year" tick={{ fill: '#4A6278', fontSize: 11 }}/>
              <YAxis tick={{ fill: '#4A6278', fontSize: 10 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`}/>
              <Tooltip content={<TT/>}/>
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }}/>
              <Area dataKey="Optimistic" stroke="#00FF94" fill="rgba(0,255,148,0.06)" strokeWidth={2} dot={false}/>
              <Area dataKey="Base" stroke="#FCD34D" fill="rgba(252,211,77,0.06)" strokeWidth={2} dot={false}/>
              <Area dataKey="Conservative" stroke="#F87171" fill="rgba(248,113,113,0.04)" strokeWidth={2} dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        ) : <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4A6278' }}>L('Loading...', 'Chargement...')</div>}
      </div>

      {/* Monte Carlo + insights */}
      {view === 'project' && projectData && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {mc && (
            <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 14 }}>MONTE CARLO — 200 SIMULATIONS BASE SCENARIO</div>
              {[
                { label: 'P10 (pessimiste)', value: `$${fmt(mc.p10)}`, color: '#F87171' },
                { label: 'P50 (médiane)', value: `$${fmt(mc.p50)}`, color: '#FCD34D' },
                { label: 'Moyenne', value: `$${fmt(mc.mean)}`, color: '#8FA3B8' },
                { label: 'P90 (optimiste)', value: `$${fmt(mc.p90)}`, color: '#00FF94' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid rgba(30,45,61,0.4)' }}>
                  <span style={{ fontSize: 12, color: '#8FA3B8' }}>{item.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: item.color, fontFamily: 'JetBrains Mono, monospace' }}>{item.value}</span>
                </div>
              ))}
              <div style={{ marginTop: 12, fontSize: 11, color: '#4A6278' }}>
                Plage P10-P90: ${fmt(mc.p90 - mc.p10)} · Rapport signal/bruit: {((mc.p90 - mc.p10) / mc.mean * 100).toFixed(0)}%
              </div>
            </div>
          )}

          {projectData.insights && (
            <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 14 }}>INSIGHTS STRATÉGIQUES</div>
              {projectData.insights.map((ins, i) => (
                <div key={i} style={{ padding: '12px', background: '#121920', borderRadius: 8, marginBottom: 10, borderLeft: '3px solid #A78BFA' }}>
                  <div style={{ fontSize: 11, color: '#A78BFA', marginBottom: 4, fontWeight: 600 }}>{ins.label}</div>
                  <div style={{ fontSize: 12, color: '#8FA3B8', lineHeight: 1.6 }}>{ins.value}</div>
                </div>
              ))}
              {projectData.breakevenYear && (
                <div style={{ padding: '12px', background: 'rgba(0,255,148,0.05)', borderRadius: 8, border: '1px solid rgba(0,255,148,0.15)' }}>
                  <div style={{ fontSize: 11, color: '#00FF94', marginBottom: 4, fontWeight: 600 }}>Breakeven carbone</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#00FF94', fontFamily: 'Syne, sans-serif' }}>{projectData.breakevenYear}</div>
                  <div style={{ fontSize: 11, color: '#4A6278' }}>Les revenus carbone couvrent 15% du CAPEX</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}