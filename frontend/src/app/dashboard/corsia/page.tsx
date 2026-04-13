'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_URL;
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken')}` });
const fmt = (n: number) => n?.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) ?? '0';

export default function CORSIAPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [result, setResult] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    api.getProjects().then(d => { setProjects(d.projects || []); if (d.projects?.[0]) setSelected(d.projects[0].id); });
    fetch(`${API}/corsia/portfolio`, { headers: h() }).then(r => r.json()).then(setPortfolio).catch(() => {});
  }, []);

  const check = async () => {
    if (!selected) return;
    setChecking(true);
    const d = await fetch(`${API}/corsia/check/${selected}`, { headers: h() }).then(r => r.json());
    setResult(d);
    setChecking(false);
  };

  const s = portfolio?.summary;

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <a href="/dashboard/standards" style={{ fontSize: 12, color: '#4A6278', textDecoration: 'none' }}>← Carbon Hub</a>
        <div style={{ fontSize: 10, color: '#F87171', fontFamily: 'JetBrains Mono, monospace', margin: '8px 0 4px' }}>CORSIA · ICAO · AVIATION CARBON MARKET</div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: '#E8EFF6', margin: 0 }}>CORSIA Eligibility Checker</h1>
        <p style={{ fontSize: 13, color: '#4A6278', marginTop: 4 }}>Marché aviation garanti 2024-2035 · $18-26/tCO₂e · Demande structurelle de $400M+ pour l'Afrique</p>
      </div>

      {s && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Projets éligibles', value: `${s.eligible}/${s.total}`, color: '#F87171' },
            { label: 'Crédits éligibles', value: `${fmt(s.eligibleCredits)} tCO₂e`, color: '#E8EFF6' },
            { label: 'Premium/tonne', value: `+$${(s.avgPremiumUSD || 0).toFixed(0)}`, color: '#00FF94' },
            { label: 'Revenus premium', value: `$${fmt(s.totalPremiumRevenue)}`, color: '#FCD34D' },
          ].map(k => (
            <div key={k.label} style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>{k.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: k.color, fontFamily: 'Syne, sans-serif' }}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 10, color: '#F87171', fontFamily: 'JetBrains Mono, monospace', marginBottom: 14 }}>VÉRIFIER UN PROJET</div>
          <select value={selected} onChange={e => setSelected(e.target.value)}
            style={{ width: '100%', background: '#121920', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '9px', fontSize: 13, marginBottom: 16 }}>
            {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name} · {p.countryCode}</option>)}
          </select>
          <div style={{ background: '#121920', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#4A6278', marginBottom: 10 }}>CRITÈRES CORSIA (6 requis)</div>
            {['Additionnalité ≥ 2016', 'Permanence prouvée', 'Quantification certifiable MRV', 'Pas de double comptage', 'Co-bénéfices SDG', 'Transparence données'].map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 7 }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', border: '1px solid #F87171', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, color: '#F87171' }}>{i + 1}</div>
                <span style={{ fontSize: 12, color: '#4A6278' }}>{c}</span>
              </div>
            ))}
          </div>
          <button onClick={check} disabled={checking || !selected}
            style={{ width: '100%', background: checking ? '#1E2D3D' : '#F87171', color: checking ? '#4A6278' : '#080B0F', border: 'none', borderRadius: 8, padding: '11px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            {checking ? 'Vérification...' : '✈️ Vérifier l\'éligibilité CORSIA'}
          </button>
        </div>

        <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 10, color: '#F87171', fontFamily: 'JetBrains Mono, monospace', marginBottom: 14 }}>RÉSULTAT CORSIA</div>
          {result ? (
            <div>
              <div style={{ textAlign: 'center', padding: '16px 0', marginBottom: 16 }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>{result.analysis?.eligible ? '✅' : '❌'}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: result.analysis?.eligible ? '#00FF94' : '#F87171', fontFamily: 'Syne, sans-serif' }}>
                  {result.analysis?.eligible ? 'PROJET ÉLIGIBLE CORSIA' : 'NON ÉLIGIBLE ACTUELLEMENT'}
                </div>
                <div style={{ fontSize: 13, color: '#4A6278', marginTop: 4 }}>Score: {result.analysis?.totalScore}/100 · Phase {result.analysis?.corsiaPhase}</div>
              </div>

              {result.analysis?.eligible && (
                <div style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8, padding: 14, marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: '#F87171', marginBottom: 6 }}>REVENUS CORSIA ESTIMÉS</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#F87171', fontFamily: 'Syne, sans-serif' }}>${fmt(result.estimatedPremiumRevenue)}</div>
                  <div style={{ fontSize: 11, color: '#4A6278', marginTop: 2 }}>+${result.analysis?.estimatedPremium}/tCO₂e vs Verra standard</div>
                </div>
              )}

              {result.analysis?.failures?.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: '#F87171', marginBottom: 8 }}>POINTS À CORRIGER</div>
                  {result.analysis.failures.map((f: string, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 12 }}>
                      <span style={{ color: '#F87171', flexShrink: 0 }}>✗</span>
                      <span style={{ color: '#8FA3B8' }}>{f}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 12, padding: 12, background: '#121920', borderRadius: 8, fontSize: 12, color: '#4A6278' }}>
                💡 CORSIA phase 2024-2026 : demande cumulée ~1.5 Gt CO₂e · Prix plancher $18/t · Afrique : potentiel $400M+/an
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#4A6278' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✈️</div>
              <div>Sélectionnez un projet et lancez la vérification pour voir son éligibilité CORSIA et le revenu additionnel potentiel.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
