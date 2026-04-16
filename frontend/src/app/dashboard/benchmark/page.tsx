'use client';
import { useLang } from '@/lib/lang-context';
import { useEffect, useState } from 'react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { api } from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_URL;
const h = () => ({ Authorization: "Bearer "+(typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '')+"" });
const fmt = (n, d = 0) => n?.toLocaleString('en-US', { maximumFractionDigits: d }) ?? '0';

function PercentileBar({ value, label, unit, benchmark, rating }: any) {
  const pct = Math.min(99, Math.max(0, value));
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: '#8FA3B8' }}>{label}</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: rating?.color, fontFamily: 'JetBrains Mono, monospace' }}>{rating?.label}</span>
          <span style={{ fontSize: 11, color: '#4A6278' }}>P{Math.round(pct)}</span>
        </div>
      </div>
      {/* Percentile bar */}
      <div style={{ position: 'relative', height: 10, background: '#121920', borderRadius: 5, overflow: 'hidden' }}>
        {/* P25, median, P75 markers */}
        <div style={{ position: 'absolute', left: '25%', top: 0, bottom: 0, width: 1, background: 'rgba(74,98,120,0.4)' }}/>
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(74,98,120,0.6)' }}/>
        <div style={{ position: 'absolute', left: '75%', top: 0, bottom: 0, width: 1, background: 'rgba(74,98,120,0.4)' }}/>
        {/* Value bar */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: (pct) + '%', background: 'linear-gradient(90deg, rgba(56,189,248,0.3), ' + (rating?.color) + ')', borderRadius: 5, transition: 'width 0.8s ease' }}/>
        {/* Value dot */}
        <div style={{ position: 'absolute', top: '50%', left: (pct) + '%', transform: 'translate(-50%, -50%)', width: 12, height: 12, borderRadius: '50%', background: rating?.color, border: '2px solid #0D1117' }}/>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: '#2A3F55' }}>
        <span>P25: {fmt(benchmark?.p25)</span>
        <span>Median: {fmt(benchmark?.median)</span>
        <span>P75: {fmt(benchmark?.p75)</span>
      </div>
    </div>
  );
}

export default function BenchmarkPage() {
  const { t, lang } = useLang();
  const L = (en, fr) => lang === 'fr' ? fr : en;
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState('');
  const [data, setData] = useState(null);
  const [ranking, setRanking] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getProjects().then(d => { setProjects(d.projects || []); if (d.projects?.[0]) setSelected(d.projects[0].id); });
    fetch((API) + '/benchmark/portfolio/ranking', { headers: h() }).then(r => r.json()).then(setRanking).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    fetch((API) + '/benchmark/' + (selected), { headers: h() })
      .then(r => r.json()).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [selected]);

  const radarData = data?.metrics?.map((m) => ({
    subject: m.label.split(' ')[0],
    value: m.percentile,
    fullMark: 100,
  })) || [];

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: '#FCD34D', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>BENCHMARK · IRENA 2024 · PANGEA CARBON DATA</div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: '#E8EFF6', margin: 0 }}>L('Africa Benchmark', 'Benchmark Africain')</h1>
          <p style={{ fontSize: 13, color: '#4A6278', marginTop: 4 }}>Your position vs African peers. IRENA 2024 + IEA Africa + PANGEA CARBON data.</p>
        </div>
        <select value={selected} onChange={e => setSelected(e.target.value)}
          style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 8, color: '#E8EFF6', padding: '10px 14px', fontSize: 13, minWidth: 240 }}>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Portfolio ranking */}
      {ranking?.ranking && (
        <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, marginBottom: 20, overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', background: '#121920', borderBottom: '1px solid #1E2D3D', fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>
            INTERNAL RANKING — YOUR PORTFOLIO
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              {['#', 'Project', 'Type', 'Country', 'Yield', 'Credits/MW', 'Percentile', 'Score'].map(col => (
                <th key={col} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', borderBottom: '1px solid #1E2D3D' }}>{col}</th>
              ))}
            </tr></thead>
            <tbody>
              {ranking.ranking.map((p, i) => (
                <tr key={p.id} onClick={() => setSelected(p.id)}
                  style={{ borderBottom: '1px solid rgba(30,45,61,0.4)', cursor: 'pointer', background: selected === p.id ? 'rgba(252,211,77,0.04)' : 'transparent' }}>
                  <td style={{ padding: '9px 14px', fontSize: 14, fontWeight: 800, color: i === 0 ? '#FCD34D' : '#4A6278', fontFamily: 'Syne, sans-serif' }}>#{i + 1}</td>
                  <td style={{ padding: '9px 14px', fontSize: 13, color: '#E8EFF6', fontWeight: 500 }}>{p.name}</td>
                  <td style={{ padding: '9px 14px', fontSize: 11, color: '#4A6278' }}>{p.type}</td>
                  <td style={{ padding: '9px 14px' }}><span style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(74,98,120,0.3)', color: '#8FA3B8', borderRadius: 4, fontFamily: 'JetBrains Mono, monospace' }}>{p.countryCode}</span></td>
                  <td style={{ padding: '9px 14px', fontSize: 12, color: '#8FA3B8', fontFamily: 'JetBrains Mono, monospace' }}>{fmt(p.specificYield) kWh/kWc</td>
                  <td style={{ padding: '9px 14px', fontSize: 12, color: '#38BDF8', fontFamily: 'JetBrains Mono, monospace' }}>{fmt(p.creditsPerMW)</td>
                  <td style={{ padding: '9px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 60, height: 6, borderRadius: 3, background: '#1E2D3D', overflow: 'hidden' }}>
                        <div style={{ width: `${p.percentile}%`, height: '100%', background: p.rating?.color }}/>
                      </div>
                      <span style={{ fontSize: 11, color: p.rating?.color, fontFamily: 'JetBrains Mono, monospace' }}>P{Math.round(p.percentile)}</span>
                    </div>
                  </td>
                  <td style={{ padding: '9px 14px' }}>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: `${p.rating?.color) + '15', color: p.rating?.color, border: `1px solid ${p.rating?.color) + '25', fontFamily: 'JetBrains Mono, monospace' }}>
                      {'★'.repeat(p.rating?.stars || 0)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {loading && <div style={{ textAlign: 'center', padding: 60, color: '#4A6278' }}>Analyse benchmark...</div>}

      {!loading && data && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Percentile bars */}
          <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>POSITION VS AFRICAN PEERS — {data.project?.type}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: data.overallRating?.color, fontFamily: 'Syne, sans-serif' }}>
                  {data.overallRating?.label} · P{Math.round(data.overallPercentile)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 32 }}>{'★'.repeat(data.overallRating?.stars || 0)}</div>
                <div style={{ fontSize: 10, color: '#4A6278' }}>Score globale</div>
              </div>
            </div>
            {data.metrics?.map((m) => (
              <PercentileBar key={m.id} label={m.label} value={m.percentile} unit={m.unit} benchmark={m.benchmark} rating={m.rating}/>
            ))}
          </div>

          {/* Radar chart + context */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 20, flex: 1 }}>
              <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 14 }}>L('PERFORMANCE PROFILE — RADAR', 'PROFIL DE PERFORMANCE — RADAR')</div>
              {radarData.length > 0 && (
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#1E2D3D"/>
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#4A6278', fontSize: 11 }}/>
                    <Tooltip formatter={(v) => `P${Math.round(v))}/>
                    <Radar name="Votre projet" dataKey="value" stroke="#FCD34D" fill="rgba(252,211,77,0.15)" strokeWidth={2}/>
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 10 }}>COUNTRY CONTEXT — {data.project?.countryCode}</div>
              {[
                ['Grid EF', `${data.countryContext?.avgEF} tCO₂/MWh`],
                ['Avg. revenue/MW', `$${fmt(data.countryContext?.avgRevenuePerMW))],
                ['Market maturity', data.countryContext?.marketMaturity],
              ].map(([k, v]) => (
                <div key={String(k)} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(30,45,61,0.4)', fontSize: 12 }}>
                  <span style={{ color: '#4A6278' }}>{k}</span>
                  <span style={{ color: '#E8EFF6', fontFamily: 'JetBrains Mono, monospace', fontWeight: 500 }}>{v}</span>
                </div>
              ))}
              {data.peers?.length > 0 && (
                <div style={{ marginTop: 12, fontSize: 11, color: '#2A3F55' }}>
                  {data.peers.length} projet{data.peers.length > 1 ? 's' : ''} pair{data.peers.length > 1 ? 's' : ''} dans la base PANGEA CARBON
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}