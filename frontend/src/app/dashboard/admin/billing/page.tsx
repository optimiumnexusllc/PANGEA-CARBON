'use client';
import { useLang } from '@/lib/lang-context';
import { fetchAuth } from '@/lib/fetch-auth';
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const API = process.env.NEXT_PUBLIC_API_URL;
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('accessToken') : ''}` });
const fmt = (n) => n?.toLocaleString('en-US', { maximumFractionDigits: 0 }) ?? '0';

const TooltipC = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#121920', border: '1px solid #1E2D3D', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: '#4A6278', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 600 }}>
          {p.name === 'revenue' ? '$' : ''}{fmt(p.value)} {p.name === 'credits' ? 'tCO₂e' : p.name === 'revenue' ? 'USD' : ''}
        </div>
      ))}
    </div>
  );
};

export default function AdminBillingPage() {
  const { t, lang } = useLang();
  const L = (en, fr) => lang === 'fr' ? fr : en;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('revenue');

  useEffect(() => {
    fetchAuth(`/admin/revenue`)
      .then(r => r.json()).then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div style={{ width: 28, height: 28, border: '2px solid rgba(248,113,113,0.2)', borderTopColor: '#F87171', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const byYear = data?.byYear || [];
  const topProjects = data?.topProjects || [];

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, color: '#F87171', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>ADMIN · REVENUE INTELLIGENCE</div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: '#E8EFF6', margin: 0 }}>L('Revenue & Carbon Intelligence', 'Revenue & Intelligence Carbone')</h1>
        <p style={{ fontSize: 13, color: '#4A6278', marginTop: 4 }}>Cumulative carbon revenue from all portfolio projects</p>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total carbon credits', value: fmt(data?.totalCredits) + ' tCO₂e', color: '#00FF94', icon: '🌍' },
          { label: 'Total carbon revenue', value: '$' + fmt(data?.totalRevenue), color: '#FCD34D', icon: '💰' },
          { label: 'Projects avec MRV', value: topProjects.length, color: '#38BDF8', icon: '📊' },
        ].map(k => (
          <div key={k.label} style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 10, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 28 }}>{k.icon}</span>
            <div>
              <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4, textTransform: 'uppercase' }}>{k.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: k.color, fontFamily: 'Syne, sans-serif' }}>{String(k.value)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      {byYear.length > 0 && (
        <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>L('PERFORMANCE BY YEAR', 'PERFORMANCE PAR ANNÉE')</div>
            <div style={{ display: 'flex', gap: 4, background: '#121920', borderRadius: 6, padding: 3 }}>
              {[['revenue', 'Revenus $'], ['credits', 'Credits tCO₂e']].map(([v, label]) => (
                <button key={v} onClick={() => setActiveView(v as any)}
                  style={{ padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 11,
                    background: activeView === v ? '#1E2D3D' : 'transparent',
                    color: activeView === v ? '#E8EFF6' : '#4A6278' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byYear}>
              <XAxis dataKey="year" tick={{ fill: '#4A6278', fontSize: 11 }}/>
              <YAxis tick={{ fill: '#4A6278', fontSize: 10 }}
                tickFormatter={v => activeView === 'revenue' ? '$' + (v/1000).toFixed(0) + 'k' : fmt(v)}/>
              <Tooltip content={<TooltipC />}/>
              <Bar dataKey={activeView} name={activeView} fill={activeView === 'revenue' ? '#FCD34D' : '#00FF94'} fillOpacity={0.75} radius={[4, 4, 0, 0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top projects table */}
      <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', background: '#121920', borderBottom: '1px solid #1E2D3D' }}>
          <span style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>L('TOP PROJECTS · CARBON REVENUE', 'TOP PROJETS · REVENUS CARBONE')</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#0D1117' }}>
              {['Project', 'Country', 'Type', 'Année', 'Credits tCO₂e', 'Revenue USD', 'Grid EF'].map(col => (
                <th key={col} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', borderBottom: '1px solid #1E2D3D' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {topProjects.map((p, i) => (
              <tr key={p.id || i} style={{ borderBottom: '1px solid rgba(30,45,61,0.4)' }}>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#E8EFF6', fontWeight: 500 }}>{p.project?.name || '—'}</td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ fontSize: 10, padding: '3px 7px', borderRadius: 4, background: 'rgba(74,98,120,0.3)', color: '#8FA3B8', fontFamily: 'JetBrains Mono, monospace' }}>
                    {p.project?.countryCode}
                  </span>
                </td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: '#4A6278' }}>{p.project?.type}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>{p.year}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#00FF94', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                  {fmt(p.netCarbonCredits)}
                </td>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#FCD34D', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                  ${fmt(p.revenueUSD)}
                </td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>
                  {p.baselineEF} tCO₂/MWh
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* SaaS MRR simulator */}
        <div style={{ padding: 20, borderTop: '1px solid #1E2D3D', background: 'rgba(0,255,148,0.02)' }}>
          <div style={{ fontSize: 10, color: '#00CC77', fontFamily: 'JetBrains Mono, monospace', marginBottom: 12 }}>SAAS MRR SIMULATION — BASED ON CURRENT PORTFOLIO</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { model: 'Pro subscription', calc: `${topProjects.length} projets × $799`, value: '$' + fmt(topProjects.length * 799) + '/mois', color: '#38BDF8' },
              { model: 'Revenue Share 3%', calc: `$${fmt(data?.totalRevenue)} × 3%`, value: '$' + fmt((data?.totalRevenue || 0) * 0.03), color: '#00FF94' },
              { model: 'PDF Reports', calc: `${topProjects.length} reports × $800`, value: '$' + fmt(topProjects.length * 800), color: '#FCD34D' },
              { model: 'ARR Projecté', calc: 'Subscription × 12 months', value: '$' + fmt(topProjects.length * 799 * 12), color: '#A78BFA' },
            ].map(item => (
              <div key={item.model} style={{ background: '#121920', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, color: '#4A6278', marginBottom: 4 }}>{item.model}</div>
                <div style={{ fontSize: 10, color: '#2A3F55', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>{item.calc}</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: item.color, fontFamily: 'Syne, sans-serif' }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
