'use client';
import { useLang } from '@/lib/lang-context';
import { useEffect, useState } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { api } from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_URL;
const h = () => ({ Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('accessToken') : ''}` });
const fmt = (n: number, d = 0) => n?.toLocaleString('fr-FR', { maximumFractionDigits: d }) ?? '0';
const fmtUSD = (n: number) => '$' + fmt(n);

const TT = ({ active, payload, label }: any) => active && payload?.length ? (
  <div style={{ background: '#121920', border: '1px solid #1E2D3D', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
    <div style={{ color: '#4A6278', marginBottom: 4 }}>{label}</div>
    {payload.map((p: any, i: number) => <div key={i} style={{ color: p.color || '#E8EFF6', fontWeight: 600 }}>{fmt(p.value, 1)} {p.name === 'revenue' ? 'USD' : 'MWh'}</div>)}
  </div>
) : null;

export default function AnalyticsPage() {
  const { t } = useLang();
  const [projects, setProjects] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getProjects().then(d => { setProjects(d.projects || []); if (d.projects?.[0]) setSelected(d.projects[0].id); });
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    fetch(`${API}/analytics/${selected}`, { headers: h() })
      .then(r => r.json()).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [selected]);

  const w = data?.lossWaterfall;
  const kpi = data?.kpis;
  const cd = data?.creditDecomposition;

  // Waterfall data
  const waterfallData = w ? [
    { name: 'Potentiel max', value: w.theoreticalMax, fill: '#2A3F55' },
    { name: '− Irradiance', value: -w.irradianceLoss, fill: '#F87171' },
    { name: '− Température', value: -w.temperatureLoss, fill: '#F97316' },
    { name: '− Salissures', value: -w.soilingLoss, fill: '#FCD34D' },
    { name: '− Disponibilité', value: -w.availabilityLoss, fill: '#F87171' },
    { name: '− Câbles/Onduleurs', value: -w.cableAndInverterLoss, fill: '#6B7280' },
    { name: 'Production réelle', value: w.actual, fill: '#00FF94' },
  ] : [];

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: '#38BDF8', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>ANALYSE DÉTAILLÉE · DÉCOMPOSITION CAUSALE</div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: '#E8EFF6', margin: 0 }}>Analyse Performance</h1>
          <p style={{ fontSize: 13, color: '#4A6278', marginTop: 4 }}>Pourquoi, pas juste quoi. Chaque écart de performance expliqué.</p>
        </div>
        <select value={selected} onChange={e => setSelected(e.target.value)}
          style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 8, color: '#E8EFF6', padding: '10px 14px', fontSize: 13, minWidth: 240 }}>
          {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 60, color: '#4A6278' }}>Analyse en cours...</div>}
      {!loading && data && (
        <>
          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Rendement spécifique', value: `${fmt(kpi?.specificYield)} kWh/kWc`, color: '#38BDF8', sub: 'médiane africaine: 1380' },
              { label: 'Disponibilité moy.', value: `${fmt(kpi?.avgAvailability, 1)}%`, color: kpi?.avgAvailability >= 97 ? '#00FF94' : '#FCD34D', sub: 'cible: ≥97%' },
              { label: 'Volatilité production', value: `${fmt(kpi?.volatility, 1)}%`, color: kpi?.volatility < 20 ? '#00FF94' : '#F87171', sub: 'écart max/min' },
              { label: 'Croissance YoY', value: data.yoyGrowth ? `${data.yoyGrowth > 0 ? '+' : ''}${data.yoyGrowth}%` : '—', color: (data.yoyGrowth || 0) >= 0 ? '#00FF94' : '#F87171', sub: 'vs année précédente' },
            ].map(k => (
              <div key={k.label} style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>{k.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: k.color, fontFamily: 'Syne, sans-serif' }}>{k.value}</div>
                <div style={{ fontSize: 10, color: '#2A3F55', marginTop: 2 }}>{k.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {/* Loss waterfall */}
            <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>WATERFALL DES PERTES — IEC 61724</div>
              <div style={{ fontSize: 12, color: '#2A3F55', marginBottom: 14 }}>Décomposition des écarts de production</div>
              {w && (
                <>
                  {waterfallData.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div style={{ fontSize: 11, color: '#4A6278', width: 130, flexShrink: 0 }}>{item.name}</div>
                      <div style={{ flex: 1, height: 22, background: '#121920', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.abs(item.value) / w.theoreticalMax * 100}%`, background: item.fill, borderRadius: 4, transition: 'width 0.8s ease' }}/>
                      </div>
                      <div style={{ fontSize: 12, color: item.fill, fontFamily: 'JetBrains Mono, monospace', width: 80, textAlign: 'right', flexShrink: 0 }}>
                        {item.value < 0 ? '−' : ''}{fmt(Math.abs(item.value))} MWh
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: 12, padding: '8px 10px', background: 'rgba(0,255,148,0.06)', borderRadius: 7, border: '1px solid rgba(0,255,148,0.15)', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: '#8FA3B8' }}>Performance Ratio</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#00FF94', fontFamily: 'JetBrains Mono, monospace' }}>{w.performanceRatio}%</span>
                  </div>
                </>
              )}
            </div>

            {/* Variance mensuelle */}
            <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>VARIANCE MENSUELLE — PRODUCTION MWh</div>
              <div style={{ fontSize: 12, color: '#2A3F55', marginBottom: 14 }}>Évolution et causes des écarts</div>
              {data.variance?.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={data.variance.slice().reverse()} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <XAxis dataKey="month" tick={{ fill: '#4A6278', fontSize: 10 }}/>
                    <YAxis tick={{ fill: '#4A6278', fontSize: 10 }}/>
                    <Tooltip content={<TT/>}/>
                    <ReferenceLine y={kpi?.avgMWh} stroke="rgba(0,255,148,0.3)" strokeDasharray="4 4"/>
                    <Area dataKey="energyMWh" stroke="#38BDF8" fill="rgba(56,189,248,0.08)" strokeWidth={2} dot={false}/>
                  </AreaChart>
                </ResponsiveContainer>
              ) : <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4A6278', fontSize: 13 }}>Données insuffisantes</div>}
            </div>
          </div>

          {/* Décomposition crédits + insights causaux */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Décomposition ACM0002 */}
            {cd && (
              <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 20 }}>
                <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 14 }}>DÉCOMPOSITION CRÉDITS — VERRA ACM0002</div>
                {[
                  { label: 'Émissions brutes réduites', value: `${fmt(cd.grossEmissionsReduced)} tCO₂e`, color: '#38BDF8', op: null },
                  { label: '− Déduction leakage (3%)', value: `${fmt(cd.leakageDeduction)} tCO₂e`, color: '#F87171', op: '−' },
                  { label: '− Déduction incertitude (5%)', value: `${fmt(cd.uncertaintyDeduction)} tCO₂e`, color: '#F97316', op: '−' },
                  { label: '= Crédits carbone nets', value: `${fmt(cd.netCarbonCredits)} tCO₂e`, color: '#00FF94', op: '=' },
                  { label: '× Prix $12/tCO₂e', value: fmtUSD(cd.revenueUSD), color: '#FCD34D', op: '$' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 4 ? '1px solid rgba(30,45,61,0.4)' : 'none' }}>
                    <span style={{ fontSize: 12, color: '#8FA3B8' }}>{item.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: item.color, fontFamily: 'JetBrains Mono, monospace' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Insights causaux */}
            <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 14 }}>ANALYSE CAUSALE · FACTEURS D'ÉCART</div>
              {data.causalInsights?.length > 0 ? (
                data.causalInsights.map((ins: any, i: number) => (
                  <div key={i} style={{ padding: '12px', background: ins.type === 'warning' ? 'rgba(248,113,113,0.06)' : 'rgba(56,189,248,0.06)', border: `1px solid ${ins.type === 'warning' ? 'rgba(248,113,113,0.2)' : 'rgba(56,189,248,0.15)'}`, borderRadius: 8, marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#E8EFF6', marginBottom: 4 }}>{ins.factor}</div>
                        <div style={{ fontSize: 12, color: '#4A6278' }}>{ins.impact}</div>
                      </div>
                      {ins.creditLoss > 0 && (
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 10, color: '#4A6278' }}>perte estimée</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#F87171', fontFamily: 'Syne, sans-serif' }}>−{fmtUSD(ins.creditLoss * 12)}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: 24, textAlign: 'center', color: '#4A6278' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                  <div>Aucun écart significatif détecté. Projet dans les normes.</div>
                </div>
              )}
              <div style={{ marginTop: 12, padding: '10px', background: '#121920', borderRadius: 7, fontSize: 11, color: '#4A6278' }}>
                💡 Qualité des données: {data.dataQuality?.readingsCount} lectures · {data.dataQuality?.completeness}% complétude
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
