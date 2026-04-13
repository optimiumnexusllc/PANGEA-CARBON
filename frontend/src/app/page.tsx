'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const STATS = [
  { value: '697K', label: 'tCO₂e certifiés' },
  { value: '$7.7M', label: 'revenus carbone' },
  { value: '18', label: 'pays africains' },
  { value: '6', label: 'projets actifs' },
];

const FEATURES = [
  { icon: '⚡', title: 'Equipment API native', desc: 'Connectez SMA, Huawei, SolarEdge, Fronius en 5 minutes. Données temps réel, zéro saisie manuelle.' },
  { icon: '🧮', title: 'MRV ACM0002 automatique', desc: 'Calcul certifiable Verra/Gold Standard en temps réel. 18 pays africains avec facteurs d\'émission officiels.' },
  { icon: '📄', title: 'Rapports PDF certifiables', desc: 'Rapport MRV 3 pages prêt pour audit VVB. Téléchargeable en un clic, reconnu par Verra et Gold Standard.' },
  { icon: '🤖', title: 'AI Carbon Assistant', desc: 'Claude AI intégré pour analyser vos données, optimiser vos projets et répondre à vos questions MRV 24h/24.' },
  { icon: '🗺️', title: 'Carte Afrique temps réel', desc: 'Visualisez votre portfolio sur une carte interactive. KPIs par projet, par pays, par technologie.' },
  { icon: '🏪', title: 'Carbon Marketplace', desc: 'Vendez vos crédits directement aux acheteurs corporate. Commission 2% seulement.' },
];

const PLANS = [
  { name: 'Starter', price: '$299', period: '/mois', color: '#38BDF8', features: ['5 projets', '50 MW max', 'MRV ACM0002', 'Dashboard', '2 users', 'Email support'] },
  { name: 'Pro', price: '$799', period: '/mois', color: '#00FF94', highlight: true, features: ['Projets illimités', 'MW illimités', 'PDF certifiables', 'Equipment API', 'AI Assistant', '10 users', 'Priority support'] },
  { name: 'Enterprise', price: 'Custom', period: '', color: '#A78BFA', features: ['Tout Pro', 'White-label', 'SSO SAML', 'SLA 99.9%', 'CSM dédié', 'Intégrations custom'] },
];

export default function LandingPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Rediriger si déjà connecté
    const token = localStorage.getItem('accessToken');
    if (token) { router.push('/dashboard'); return; }
    setChecked(true);
  }, []);

  if (!checked) return (
    <div style={{ background:'#080B0F', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:28, height:28, border:'2px solid rgba(0,255,148,0.2)', borderTopColor:'#00FF94', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ background: '#080B0F', color: '#E8EFF6', fontFamily: 'Inter, sans-serif', minHeight: '100vh' }}>
      {/* Navbar */}
      <nav style={{ padding: '0 40px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1E2D3D', background: 'rgba(8,11,15,0.95)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(0,255,148,0.15)', border: '1px solid rgba(0,255,148,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>⬡</div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 17, color: '#E8EFF6' }}>PANGEA CARBON</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <span style={{ fontSize: 12, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>Verra ACM0002 · Gold Standard · Article 6</span>
          <a href="/auth/login" style={{ fontSize: 13, color: '#8FA3B8', textDecoration: 'none' }}>Connexion</a>
          <a href="/signup" style={{ background: '#00FF94', color: '#080B0F', borderRadius: 7, padding: '8px 18px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            Démarrer gratuit →
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: '90px 40px 70px', maxWidth: 1080, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(0,255,148,0.07)', border: '1px solid rgba(0,255,148,0.2)', borderRadius: 20, padding: '5px 14px', marginBottom: 28 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00FF94', animation: 'pulse 2s infinite' }}/>
          <span style={{ fontSize: 12, color: '#00FF94', fontFamily: 'JetBrains Mono, monospace' }}>LIVE · Africa Carbon Credit Intelligence Platform</span>
        </div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 54, fontWeight: 800, lineHeight: 1.1, marginBottom: 18, color: '#E8EFF6', margin: '0 0 18px' }}>
          La plateforme MRV qui fait<br/>
          <span style={{ color: '#00FF94' }}>l'Afrique leader du carbone</span>
        </h1>
        <p style={{ fontSize: 17, color: '#8FA3B8', maxWidth: 580, margin: '0 auto 36px', lineHeight: 1.7 }}>
          Connectez vos équipements solaires et éoliens. Calculez vos crédits carbone automatiquement selon Verra ACM0002. Générez des rapports certifiables. Vendez sur notre marketplace.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
          <a href="/signup" style={{ background: '#00FF94', color: '#080B0F', borderRadius: 8, padding: '14px 28px', fontSize: 15, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            Commencer — 14 jours gratuits →
          </a>
          <a href="/auth/login" style={{ background: 'transparent', color: '#8FA3B8', border: '1px solid #1E2D3D', borderRadius: 8, padding: '14px 28px', fontSize: 15, textDecoration: 'none' }}>
            Voir la démo
          </a>
        </div>
        <p style={{ fontSize: 12, color: '#2A3F55' }}>Pas de carte bancaire · 14 jours gratuits · Annulation à tout moment</p>
      </section>

      {/* Stats */}
      <section style={{ borderTop: '1px solid #1E2D3D', borderBottom: '1px solid #1E2D3D', padding: '36px 40px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          {STATS.map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 34, fontWeight: 800, color: '#00FF94', fontFamily: 'Syne, sans-serif' }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#4A6278', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '70px 40px', maxWidth: 1080, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <div style={{ fontSize: 11, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 10, letterSpacing: '0.1em' }}>FONCTIONNALITÉS</div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 34, fontWeight: 700, margin: 0 }}>Tout ce dont un EPC/IPP africain a besoin</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 22, cursor: 'default', transition: 'all 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,255,148,0.25)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#1E2D3D'; (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}>
              <div style={{ fontSize: 26, marginBottom: 10 }}>{f.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#E8EFF6', marginBottom: 6 }}>{f.title}</div>
              <p style={{ fontSize: 13, color: '#4A6278', lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Equipment API */}
      <section style={{ padding: '50px 40px', background: '#0D1117', borderTop: '1px solid #1E2D3D', borderBottom: '1px solid #1E2D3D' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: '#38BDF8', fontFamily: 'JetBrains Mono, monospace', marginBottom: 10 }}>EQUIPMENT API</div>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 700, marginBottom: 14, margin: '0 0 14px' }}>Connectez vos équipements en 5 minutes</h2>
            <p style={{ fontSize: 13, color: '#4A6278', lineHeight: 1.7, marginBottom: 18 }}>Endpoints REST natifs pour SMA, Huawei, SolarEdge, Fronius. Import CSV. Webhooks temps réel. Le MRV se calcule automatiquement à chaque lecture.</p>
            {['SMA Solar · Inverter API', 'Huawei FusionSolar · MQTT', 'SolarEdge Monitoring', 'Fronius Solar.web', 'CSV/Excel import', 'Webhook custom'].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, fontSize: 13 }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(0,255,148,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00FF94' }}/>
                </div>
                <span style={{ color: '#8FA3B8' }}>{item}</span>
              </div>
            ))}
          </div>
          <div style={{ background: '#121920', borderRadius: 12, padding: 18, border: '1px solid #1E2D3D', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
            <div style={{ color: '#4A6278', marginBottom: 10, fontSize: 10 }}>POST /api/equipment/reading</div>
            <pre style={{ margin: 0, color: '#8FA3B8', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{`curl -X POST \\
  https://pangea-carbon.com/api/equipment/reading \\
  -H "X-API-Key: pgc_your_key" \\
  -d '{
    "project_id": "proj_xxx",
    "energy_mwh": 1250.5,
    "peak_power_mw": 48.2
  }'`}</pre>
            <div style={{ marginTop: 10, padding: '7px 10px', background: 'rgba(0,255,148,0.05)', borderRadius: 6, border: '1px solid rgba(0,255,148,0.1)', fontSize: 11 }}>
              <span style={{ color: '#00FF94' }}>✓ 200 OK</span>
              <span style={{ color: '#4A6278' }}> · MRV recalculé · Crédits mis à jour</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section style={{ padding: '70px 40px', maxWidth: 960, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <div style={{ fontSize: 11, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 10, letterSpacing: '0.1em' }}>TARIFS</div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 34, fontWeight: 700, margin: 0 }}>Commencez gratuitement, scalez sans limites</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18, marginBottom: 24 }}>
          {PLANS.map(plan => (
            <div key={plan.name} style={{ background: plan.highlight ? 'rgba(0,255,148,0.03)' : '#0D1117',
              border: `1px solid ${plan.highlight ? 'rgba(0,255,148,0.3)' : '#1E2D3D'}`, borderRadius: 14, padding: 22, position: 'relative' }}>
              {plan.highlight && (
                <div style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', background: '#00FF94', color: '#080B0F', borderRadius: 10, padding: '3px 12px', fontSize: 10, fontWeight: 700 }}>RECOMMANDÉ</div>
              )}
              <div style={{ fontSize: 11, color: plan.color, fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>{plan.name.toUpperCase()}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 18 }}>
                <span style={{ fontSize: 30, fontWeight: 800, color: plan.color, fontFamily: 'Syne, sans-serif' }}>{plan.price}</span>
                <span style={{ fontSize: 12, color: '#4A6278' }}>{plan.period}</span>
              </div>
              {plan.features.map(f => (
                <div key={f} style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 7 }}>
                  <div style={{ width: 13, height: 13, borderRadius: '50%', background: `${plan.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: plan.color }}/>
                  </div>
                  <span style={{ fontSize: 12, color: '#8FA3B8' }}>{f}</span>
                </div>
              ))}
              <a href="/signup" style={{ display: 'block', textAlign: 'center', marginTop: 18, padding: '9px',
                borderRadius: 7, background: plan.highlight ? '#00FF94' : 'transparent',
                color: plan.highlight ? '#080B0F' : '#4A6278',
                border: plan.highlight ? 'none' : '1px solid #1E2D3D',
                fontWeight: plan.highlight ? 700 : 400, textDecoration: 'none', fontSize: 13 }}>
                {plan.name === 'Enterprise' ? 'Nous contacter →' : 'Démarrer →'}
              </a>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(0,255,148,0.04)', border: '1px solid rgba(0,255,148,0.12)', borderRadius: 10 }}>
          <span style={{ fontSize: 13, color: '#8FA3B8' }}>Ou choisissez le </span>
          <span style={{ fontSize: 13, color: '#00FF94', fontWeight: 600 }}>Revenue Share</span>
          <span style={{ fontSize: 13, color: '#8FA3B8' }}> — $0/mois · 3% sur vos revenus carbone uniquement</span>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '70px 40px', textAlign: 'center', borderTop: '1px solid #1E2D3D' }}>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 38, fontWeight: 800, marginBottom: 14, margin: '0 0 14px' }}>
          Prêt à monétiser votre carbone africain ?
        </h2>
        <p style={{ fontSize: 15, color: '#4A6278', marginBottom: 28 }}>14 jours gratuits · Pas de carte bancaire · Premier projet en 10 minutes</p>
        <a href="/signup" style={{ background: '#00FF94', color: '#080B0F', borderRadius: 8, padding: '15px 34px', fontSize: 16, fontWeight: 700, textDecoration: 'none' }}>
          Créer mon compte gratuit →
        </a>
      </section>

      {/* Footer */}
      <footer style={{ padding: '28px 40px', borderTop: '1px solid #1E2D3D', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: '#E8EFF6' }}>PANGEA CARBON</span>
          <span style={{ fontSize: 11, color: '#4A6278' }}>· Carbon Credit Intelligence · Africa</span>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          <a href="/auth/login" style={{ fontSize: 12, color: '#4A6278', textDecoration: 'none' }}>Connexion</a>
          <a href="/signup" style={{ fontSize: 12, color: '#4A6278', textDecoration: 'none' }}>Inscription</a>
          <span style={{ fontSize: 12, color: '#2A3F55' }}>contact@pangea-carbon.com</span>
        </div>
        <div style={{ fontSize: 11, color: '#2A3F55' }}>© 2026 PANGEA CARBON Africa · Verra ACM0002 · With Africa For Africa</div>
      </footer>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}
