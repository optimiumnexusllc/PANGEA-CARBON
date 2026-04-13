'use client';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL;
const h = () => ({ Authorization: `Bearer ${localStorage.getItem('accessToken')}` });
const fmt = (n: number) => n?.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) ?? '0';

const MODULES = [
  { id: 'article6', href: '/dashboard/article6', icon: '🏛️', title: 'Article 6 ITMO', subtitle: 'Marchés carbone souverains', color: '#38BDF8', desc: '×3-5 prix vs Verra classique. Transactions état-à-état sous l\'Accord de Paris.', badge: '$35-55/tCO₂e' },
  { id: 'sdg', href: '/dashboard/sdg', icon: '🌱', title: 'Gold Standard SDG', subtitle: '17 co-bénéfices mesurés', color: '#FCD34D', desc: '+$8-18/tCO₂e premium. Score SDG automatique. Certification Gold Standard 1-5★.', badge: '+$8-18/tCO₂e' },
  { id: 'dmrv', href: '/dashboard/dmrv', icon: '🛰️', title: 'dMRV Satellite + IoT', subtitle: 'Vérification continue', color: '#A78BFA', desc: 'Sentinel-2 + IoT sensors. Plus besoin d\'auditeur annuel. Score dMRV en temps réel.', badge: 'Continuous MRV' },
  { id: 'corsia', href: '/dashboard/corsia', icon: '✈️', title: 'CORSIA Aviation', subtitle: 'Marché aviation ICAO', color: '#F87171', desc: '$18-26/tCO₂e prix garanti. Demande structurelle aviation internationale 2024-2035.', badge: '$400M+ marché Afrique' },
  { id: 'registry', href: '/dashboard/registry', icon: '⛓️', title: 'Blockchain Registry', subtitle: 'Hash chain immuable', color: '#00FF94', desc: 'SHA-256 chain. Chaque crédit a un hash unique vérifiable publiquement. Anti-fraude.', badge: 'Trustless verification' },
  { id: 'baseline', href: '/dashboard/baseline', icon: '🤖', title: 'AI Baseline Setter', subtitle: 'Claude + Satellite', color: '#EF9F27', desc: 'Baseline défensible par IA en 30 secondes. Zéro visite terrain. Données UNFCCC live.', badge: 'Zéro terrain requis' },
];

export default function StandardsPage() {
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    fetch(`${API}/article6/projects`, { headers: h() })
      .then(r => r.json()).then(d => setSummary(d.summary)).catch(() => {});
  }, []);

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>PANGEA CARBON · INTELLIGENCE MULTI-STANDARD</div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800, color: '#E8EFF6', margin: '0 0 6px' }}>Carbon Intelligence Hub</h1>
        <p style={{ fontSize: 14, color: '#4A6278', margin: 0 }}>6 modules enterprise pour maximiser la valeur de vos crédits carbone africains</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Verra ACM0002', value: '$12', sub: 'Base market', color: '#4A6278', bg: '#0D1117' },
          { label: 'Gold Standard SDG', value: '$24', sub: '+$12 premium', color: '#FCD34D', bg: 'rgba(252,211,77,0.05)' },
          { label: 'CORSIA Aviation', value: '$22', sub: '+$10 premium', color: '#F87171', bg: 'rgba(248,113,113,0.05)' },
          { label: 'Article 6 ITMO', value: '$45', sub: '×3.75 multiplier', color: '#38BDF8', bg: 'rgba(56,189,248,0.05)' },
        ].map(item => (
          <div key={item.label} style={{ background: item.bg, border: `1px solid ${item.color}20`, borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>{item.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: item.color, fontFamily: 'Syne, sans-serif' }}>{item.value}<span style={{ fontSize: 12, fontWeight: 400, color: '#4A6278' }}>/tCO₂e</span></div>
            <div style={{ fontSize: 11, color: item.color, marginTop: 2 }}>{item.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {MODULES.map(mod => (
          <a key={mod.id} href={mod.href} style={{ textDecoration: 'none' }}>
            <div style={{ background: '#0D1117', border: `1px solid ${mod.color}20`, borderRadius: 14, padding: 22, cursor: 'pointer', transition: 'all 0.2s', minHeight: 200 }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = `${mod.color}50`; el.style.transform = 'translateY(-3px)'; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = `${mod.color}20`; el.style.transform = 'none'; }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ fontSize: 32 }}>{mod.icon}</div>
                <span style={{ fontSize: 10, background: `${mod.color}15`, color: mod.color, border: `1px solid ${mod.color}25`, borderRadius: 5, padding: '3px 8px', fontFamily: 'JetBrains Mono, monospace' }}>{mod.badge}</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#E8EFF6', marginBottom: 3 }}>{mod.title}</div>
              <div style={{ fontSize: 11, color: mod.color, fontFamily: 'JetBrains Mono, monospace', marginBottom: 10 }}>{mod.subtitle}</div>
              <p style={{ fontSize: 13, color: '#4A6278', lineHeight: 1.6, margin: 0 }}>{mod.desc}</p>
            </div>
          </a>
        ))}
      </div>

      {summary && (
        <div style={{ marginTop: 20, background: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: 10, padding: '14px 20px', display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ fontSize: 11, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>POTENTIEL ARTICLE 6 DE VOTRE PORTFOLIO</div>
          {[['Projets éligibles', `${summary.eligibleProjects}/${summary.totalProjects}`],['Valeur ITMO', `$${fmt(summary.totalItmoValueUSD)}`],['Premium potentiel', `+$${fmt(summary.totalPremiumUSD)}`],['Multiplicateur', `×${summary.premiumMultiplier}`]].map(([k, v]) => (
            <div key={String(k)}>
              <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>{k}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#38BDF8', fontFamily: 'Syne, sans-serif' }}>{v}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
