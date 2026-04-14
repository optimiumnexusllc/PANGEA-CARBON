'use client';
import { useLang } from '@/lib/lang-context';
import { fetchAuth } from '@/lib/fetch-auth';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL;
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('accessToken') : ''}` });
const fmt = (n: number) => n?.toLocaleString('en-US', { maximumFractionDigits: 0 }) ?? '0';

export default function Article6Page() {
  const { t } = useLang();
  const [data, setData] = useState<any>(null);
  const [buyers, setBuyers] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchAuth(`/article6/projects`).then(r => r.json()),
      fetchAuth(`/article6/buyer-analysis`).then(r => r.json()),
    ]).then(([d, b]) => { setData(d); setBuyers(b); }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#4A6278' }}>Loading...</div>;

  const s = data?.summary || {};

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <a href="/dashboard/standards" style={{ fontSize: 12, color: '#4A6278', textDecoration: 'none' }}>← Carbon Hub</a>
          <div style={{ fontSize: 10, color: '#38BDF8', fontFamily: 'JetBrains Mono, monospace', margin: '8px 0 4px' }}>ARTICLE 6 PARIS AGREEMENT · ITMO TRACKING</div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: '#E8EFF6', margin: 0 }}>Sovereign Carbon Markets</h1>
          <p style={{ fontSize: 13, color: '#4A6278', marginTop: 4 }}>International Transferred Mitigation Outcomes · Prix moyen $35-55/tCO₂e (vs $12 Verra)</p>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total ITMO value', value: `$${fmt(s.totalItmoValueUSD)}`, color: '#38BDF8' },
          { label: 'vs current Verra', value: `$${fmt(s.totalVerraValueUSD)}`, color: '#4A6278' },
          { label: 'Potential premium', value: `+$${fmt(s.totalPremiumUSD)}`, color: '#00FF94' },
          { label: 'Multiplier', value: `×${s.premiumMultiplier}`, color: '#FCD34D' },
        ].map(k => (
          <div key={k.label} style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: k.color, fontFamily: 'Syne, sans-serif' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Buyer countries */}
      {buyers && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 14 }}>ACTIVE BUYER COUNTRIES — ITMO PRICES 2026</div>
            {buyers.buyers.filter((b: any) => b.active).map((b: any) => (
              <div key={b.code} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(30,45,61,0.4)' }}>
                <div>
                  <span style={{ fontSize: 13, color: '#E8EFF6', fontWeight: 500 }}>{b.name}</span>
                  <span style={{ fontSize: 10, color: '#4A6278', marginLeft: 8, fontFamily: 'JetBrains Mono, monospace' }}>{b.code}</span>
                </div>
                <div style={{ display: 'flex', align: 'center', gap: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#38BDF8', fontFamily: 'JetBrains Mono, monospace' }}>${b.priceUSD}/tCO₂e</span>
                  <span style={{ fontSize: 10, background: 'rgba(0,255,148,0.1)', color: '#00FF94', borderRadius: 4, padding: '2px 6px' }}>Actif</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 14 }}>BEST BILATERAL OPPORTUNITIES</div>
            {buyers.topOpportunities?.map((op: any) => (
              <div key={op.pair} style={{ padding: '10px 0', borderBottom: '1px solid rgba(30,45,61,0.4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: '#E8EFF6', fontWeight: 500 }}>{op.pair}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#FCD34D', fontFamily: 'JetBrains Mono, monospace' }}>${op.price}/t</span>
                </div>
                {op.bilateral && <span style={{ fontSize: 10, background: 'rgba(56,189,248,0.1)', color: '#38BDF8', borderRadius: 4, padding: '2px 6px' }}>Bilateral agreement signed</span>}
              </div>
            ))}
            <div style={{ marginTop: 14, padding: '12px', background: 'rgba(56,189,248,0.05)', borderRadius: 8, border: '1px solid rgba(56,189,248,0.1)' }}>
              <div style={{ fontSize: 11, color: '#38BDF8', fontWeight: 600 }}>vs Voluntary carbon market Verra</div>
              <div style={{ fontSize: 12, color: '#4A6278', marginTop: 4 }}>Verra: $12/t · Article 6: $45/t · Multiplier: ×3.75</div>
            </div>
          </div>
        </div>
      )}

      {/* Projects */}
      <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 14 }}>YOUR PROJECTS — ARTICLE 6 ELIGIBILITY</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#121920' }}>
              {['Project', 'Country', 'Préparation Art.6', 'Valeur ITMO', 'Valeur Verra', 'Premium', 'Status'].map(col => (
                <th key={col} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', borderBottom: '1px solid #1E2D3D' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data?.projects || []).map((p: any) => (
              <tr key={p.id} style={{ borderBottom: '1px solid rgba(30,45,61,0.4)' }}>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#E8EFF6', fontWeight: 500 }}>{p.name}</td>
                <td style={{ padding: '10px 14px' }}><span style={{ fontSize: 10, padding: '2px 7px', background: 'rgba(74,98,120,0.3)', color: '#8FA3B8', borderRadius: 4, fontFamily: 'JetBrains Mono, monospace' }}>{p.countryCode}</span></td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 60, height: 6, borderRadius: 3, background: '#1E2D3D', overflow: 'hidden' }}>
                      <div style={{ width: `${p.article6?.readinessScore || 0}%`, height: '100%', background: p.article6?.eligible ? '#00FF94' : '#FCD34D' }}/>
                    </div>
                    <span style={{ fontSize: 11, color: p.article6?.eligible ? '#00FF94' : '#FCD34D', fontFamily: 'JetBrains Mono, monospace' }}>{p.article6?.readinessScore || 0}%</span>
                  </div>
                </td>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#38BDF8', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>${fmt(p.article6?.itmoValueUSD)}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>${fmt(p.article6?.verraValueUSD)}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#00FF94', fontFamily: 'JetBrains Mono, monospace' }}>+${fmt(p.article6?.premiumUSD)}</td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ fontSize: 10, padding: '3px 7px', borderRadius: 4, fontFamily: 'JetBrains Mono, monospace',
                    background: p.article6?.eligible ? 'rgba(0,255,148,0.1)' : 'rgba(252,211,77,0.1)',
                    color: p.article6?.eligible ? '#00FF94' : '#FCD34D',
                    border: `1px solid ${p.article6?.eligible ? 'rgba(0,255,148,0.2)' : 'rgba(252,211,77,0.2)'}` }}>
                    {p.article6?.eligible ? 'ELIGIBLE' : 'IN PROGRESS'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
