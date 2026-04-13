'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const STATS = [
  { value: '697K+', label: 'tCO₂e certifiés', sub: 'Verra ACM0002' },
  { value: '$7.7M', label: 'revenus carbone', sub: 'Portfolio actif' },
  { value: '18', label: 'pays africains', sub: 'Facteurs EF officiels' },
  { value: '6', label: 'projets live', sub: 'Solar · Wind · Hydro' },
];

const FEATURES = [
  { icon: '⚡', title: 'Equipment API native', desc: 'SMA, Huawei, SolarEdge, Fronius. Données temps réel via REST ou webhook. MRV calculé automatiquement à chaque lecture.', badge: 'API REST' },
  { icon: '🧮', title: 'MRV ACM0002 certifiable', desc: 'Méthodologie Verra v19.0. 18 pays africains avec facteurs d\'émission UNFCCC. Calcul en millisecondes.', badge: 'Verra · Gold Standard' },
  { icon: '📄', title: 'Rapports PDF audit-ready', desc: '3 pages certifiables par les VVB accrédités. Waterfall de calcul complet. Signatures et déclaration de conformité.', badge: 'PDF téléchargeable' },
  { icon: '🤖', title: 'AI Carbon Assistant', desc: 'Claude (Anthropic) intégré avec contexte carbone africain. Analyse votre portfolio, répond aux questions ACM0002, identifie les optimisations.', badge: 'Claude · Anthropic' },
  { icon: '🗺️', title: 'Carte intelligence Afrique', desc: 'CartoDB dark. KPIs temps réel par pin. Filtres par type, pays, statut. Vue portfolio géospatiale complète.', badge: 'Leaflet · Dark mode' },
  { icon: '🔐', title: 'Multi-tenant enterprise', desc: 'Chaque EPC/IPP a son espace isolé. Feature flags, API keys, admin console, audit trail complet. SOC2-ready.', badge: 'Enterprise-grade' },
];

const FLOW = [
  { n: '01', title: 'Créez un projet', desc: 'Enregistrez votre parc solaire ou éolien en 2 minutes. Le facteur d\'émission grille est automatiquement défini selon votre pays.' },
  { n: '02', title: 'Connectez vos équipements', desc: 'API REST pour SMA, Huawei, SolarEdge. Ou importez vos données CSV. Données de production en temps réel.' },
  { n: '03', title: 'MRV auto ACM0002', desc: 'Chaque lecture déclenche le calcul. Crédits carbone nets, revenus estimés, équivalents environnementaux. Tout est tracé.' },
  { n: '04', title: 'Téléchargez & vendez', desc: 'Rapport PDF certifiable en un clic. Soumettez à un auditeur VVB. Vendez vos crédits sur notre marketplace.' },
];

const STANDARDS = [
  { name: 'Verra VCS', method: 'ACM0002 v19.0', color: '#00FF94' },
  { name: 'Gold Standard', method: 'GS4GG', color: '#FCD34D' },
  { name: 'Article 6', method: 'Paris Agreement', color: '#38BDF8' },
  { name: 'ICVCM CCPs', method: 'Core Carbon Principles', color: '#A78BFA' },
];

export default function LandingPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [billingAnnual, setBillingAnnual] = useState(false);

  useEffect(() => {
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

  const prices = { starter: billingAnnual ? 249 : 299, pro: billingAnnual ? 649 : 799 };

  return (
    <div style={{ background: '#080B0F', color: '#E8EFF6', fontFamily: 'Inter, -apple-system, sans-serif', overflowX: 'hidden' }}>
      {/* Sticky nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 200, borderBottom: '1px solid #1E2D3D', background: 'rgba(8,11,15,0.97)', backdropFilter: 'blur(16px)', padding: '0 48px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(0,255,148,0.15)', border: '1px solid rgba(0,255,148,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⬡</div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16 }}>PANGEA CARBON</span>
          <span style={{ fontSize: 10, color: '#00FF94', fontFamily: 'JetBrains Mono, monospace', background: 'rgba(0,255,148,0.08)', border: '1px solid rgba(0,255,148,0.2)', borderRadius: 10, padding: '2px 7px', marginLeft: 4 }}>LIVE</span>
        </div>
        <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
          {['#features', '#how', '#pricing'].map((href, i) => (
            <a key={href} href={href} style={{ fontSize: 13, color: '#4A6278', textDecoration: 'none' }}>
              {['Fonctionnalités', 'Comment ça marche', 'Tarifs'][i]}
            </a>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <a href="/auth/login" style={{ fontSize: 13, color: '#8FA3B8', textDecoration: 'none', padding: '7px 14px', border: '1px solid #1E2D3D', borderRadius: 7 }}>Connexion</a>
          <a href="/signup" style={{ background: '#00FF94', color: '#080B0F', borderRadius: 7, padding: '8px 18px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Essai gratuit 14j →</a>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: '100px 48px 80px', maxWidth: 1140, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
        {/* Glow bg */}
        <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: 700, height: 400, background: 'radial-gradient(ellipse, rgba(0,255,148,0.06) 0%, transparent 70%)', pointerEvents: 'none' }}/>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(0,255,148,0.07)', border: '1px solid rgba(0,255,148,0.2)', borderRadius: 20, padding: '5px 16px', marginBottom: 32, position: 'relative' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00FF94', animation: 'pulse 2s infinite' }}/>
          <span style={{ fontSize: 12, color: '#00FF94', fontFamily: 'JetBrains Mono, monospace' }}>Carbon Credit Intelligence · Africa · Verra ACM0002</span>
        </div>

        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 62, fontWeight: 800, lineHeight: 1.08, marginBottom: 20, color: '#E8EFF6', position: 'relative' }}>
          La plateforme MRV<br/>qui fait l'Afrique<br/>
          <span style={{ color: '#00FF94' }}>leader du carbone mondial</span>
        </h1>

        <p style={{ fontSize: 18, color: '#8FA3B8', maxWidth: 600, margin: '0 auto 40px', lineHeight: 1.7 }}>
          Connectez vos équipements. Calculez vos crédits carbone automatiquement selon Verra ACM0002. Générez des rapports certifiables. Vendez sur notre marketplace.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
          <a href="/signup" style={{ background: '#00FF94', color: '#080B0F', borderRadius: 9, padding: '15px 30px', fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
            Commencer gratuitement →
          </a>
          <a href="/auth/login" style={{ background: 'transparent', color: '#8FA3B8', border: '1px solid #1E2D3D', borderRadius: 9, padding: '15px 28px', fontSize: 15, textDecoration: 'none' }}>
            Voir la démo
          </a>
        </div>
        <p style={{ fontSize: 12, color: '#2A3F55' }}>14 jours gratuits · Pas de carte bancaire · Premier projet en 10 minutes</p>

        {/* Standards badges */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 36, flexWrap: 'wrap' }}>
          {STANDARDS.map(s => (
            <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 6, background: `${s.color}08`, border: `1px solid ${s.color}20`, borderRadius: 8, padding: '6px 12px' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }}/>
              <span style={{ fontSize: 11, color: s.color, fontWeight: 600 }}>{s.name}</span>
              <span style={{ fontSize: 10, color: '#4A6278' }}>· {s.method}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Stats band */}
      <div style={{ borderTop: '1px solid #1E2D3D', borderBottom: '1px solid #1E2D3D', padding: '30px 48px', background: '#0D1117' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          {STATS.map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#00FF94', fontFamily: 'Syne, sans-serif', lineHeight: 1.1 }}>{s.value}</div>
              <div style={{ fontSize: 13, color: '#E8EFF6', fontWeight: 500, marginTop: 4 }}>{s.label}</div>
              <div style={{ fontSize: 10, color: '#4A6278', marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <section id="features" style={{ padding: '80px 48px', maxWidth: 1140, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 12, letterSpacing: '0.12em' }}>FONCTIONNALITÉS</div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 36, fontWeight: 700, margin: 0 }}>Tout ce dont un EPC/IPP africain a besoin</h2>
          <p style={{ fontSize: 15, color: '#4A6278', marginTop: 10 }}>Une plateforme, zéro Excel, zéro consultant MRV externe.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {FEATURES.map((f, i) => (
            <div key={f.title} style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 14, padding: 24, cursor: 'default', transition: 'all 0.2s', animationDelay: `${i * 0.05}s` }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = 'rgba(0,255,148,0.3)'; el.style.transform = 'translateY(-3px)'; el.style.boxShadow = '0 12px 40px rgba(0,255,148,0.06)'; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = '#1E2D3D'; el.style.transform = 'none'; el.style.boxShadow = 'none'; }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ fontSize: 28 }}>{f.icon}</div>
                <span style={{ fontSize: 9, background: 'rgba(56,189,248,0.1)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 5, padding: '2px 7px', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>{f.badge}</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#E8EFF6', marginBottom: 8 }}>{f.title}</div>
              <p style={{ fontSize: 13, color: '#4A6278', lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" style={{ padding: '70px 48px', background: '#0D1117', borderTop: '1px solid #1E2D3D', borderBottom: '1px solid #1E2D3D' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 50 }}>
            <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 12, letterSpacing: '0.12em' }}>COMMENT ÇA MARCHE</div>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 34, fontWeight: 700, margin: 0 }}>De l'équipement aux crédits carbone en 4 étapes</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, position: 'relative' }}>
            {/* Connecting line */}
            <div style={{ position: 'absolute', top: 22, left: '12.5%', right: '12.5%', height: 1, background: 'linear-gradient(90deg, #1E2D3D, rgba(0,255,148,0.3), rgba(0,255,148,0.3), #1E2D3D)', zIndex: 0 }}/>
            {FLOW.map((step, i) => (
              <div key={step.n} style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                  background: i === 0 ? '#00FF94' : '#121920',
                  color: i === 0 ? '#080B0F' : '#00FF94',
                  border: '1px solid rgba(0,255,148,0.3)' }}>
                  {step.n}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#E8EFF6', marginBottom: 8 }}>{step.title}</div>
                <p style={{ fontSize: 12, color: '#4A6278', lineHeight: 1.6, margin: 0 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Equipment API showcase */}
      <section style={{ padding: '70px 48px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, color: '#A78BFA', fontFamily: 'JetBrains Mono, monospace', marginBottom: 12 }}>EQUIPMENT API</div>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 32, fontWeight: 700, marginBottom: 16, margin: '0 0 16px' }}>Connectez vos onduleurs en 5 minutes</h2>
            <p style={{ fontSize: 14, color: '#4A6278', lineHeight: 1.7, marginBottom: 22 }}>Une API REST simple. Un webhook. Vos données arrivent automatiquement, le MRV se calcule en continu. Pas besoin de développeur.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24 }}>
              {[['☀️','SMA Solar'],['🌀','Huawei FusionSolar'],['⚡','SolarEdge'],['🔆','Fronius'],['📊','CSV/Excel'],['🔗','Webhook custom']].map(([icon, name]) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#0D1117', borderRadius: 7, border: '1px solid #1E2D3D', fontSize: 12 }}>
                  <span>{icon}</span>
                  <span style={{ color: '#8FA3B8' }}>{name}</span>
                  <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: '#00FF94' }}/>
                </div>
              ))}
            </div>
            <a href="/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#00FF94', color: '#080B0F', borderRadius: 8, padding: '11px 20px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
              Obtenir une clé API →
            </a>
          </div>
          <div style={{ background: '#0D1117', borderRadius: 14, border: '1px solid #1E2D3D', overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', background: '#121920', borderBottom: '1px solid #1E2D3D', display: 'flex', gap: 6 }}>
              {['#F87171','#FCD34D','#00FF94'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }}/>)}
              <span style={{ fontSize: 11, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginLeft: 8 }}>Equipment API · SMA Inverter</span>
            </div>
            <pre style={{ margin: 0, padding: '20px', color: '#8FA3B8', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{`curl -X POST \\
  https://pangea-carbon.com/api/equipment/reading \\
  -H "X-API-Key: pgc_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "project_id": "proj_ci_solar_001",
    "device_id": "SMA_ABJ_NORD_01",
    "timestamp": "2026-04-13T14:30:00Z",
    "energy_mwh": 1250.5,
    "peak_power_mw": 48.2,
    "availability_pct": 98.5
  }'`}</pre>
            <div style={{ padding: '10px 20px', background: 'rgba(0,255,148,0.05)', borderTop: '1px solid rgba(0,255,148,0.1)' }}>
              <span style={{ fontSize: 11, color: '#00FF94', fontFamily: 'JetBrains Mono, monospace' }}>✓ 201 Created</span>
              <span style={{ fontSize: 11, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}> · MRV recalculé · 14.3 tCO₂e nets · $171 revenus</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding: '70px 48px', background: '#0D1117', borderTop: '1px solid #1E2D3D' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 12, letterSpacing: '0.12em' }}>TARIFS</div>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 34, fontWeight: 700, margin: '0 0 16px' }}>Commencez gratuitement, scalez sans limites</h2>
            {/* Annual/Monthly toggle */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#121920', border: '1px solid #1E2D3D', borderRadius: 20, padding: '4px 6px' }}>
              <button onClick={() => setBillingAnnual(false)}
                style={{ padding: '6px 14px', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 12, background: !billingAnnual ? '#1E2D3D' : 'transparent', color: !billingAnnual ? '#E8EFF6' : '#4A6278' }}>
                Mensuel
              </button>
              <button onClick={() => setBillingAnnual(true)}
                style={{ padding: '6px 14px', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 12, background: billingAnnual ? '#1E2D3D' : 'transparent', color: billingAnnual ? '#E8EFF6' : '#4A6278' }}>
                Annuel <span style={{ color: '#00FF94', fontSize: 10 }}>−17%</span>
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
            {[
              { name: 'Starter', price: prices.starter, color: '#38BDF8', features: ['5 projets', '50 MW max', 'MRV ACM0002', 'Dashboard', 'Import CSV', '2 users', 'Email support'] },
              { name: 'Pro', price: prices.pro, color: '#00FF94', highlight: true, features: ['Projets illimités', 'MW illimités', 'PDF certifiables', 'Equipment API', 'AI Assistant', 'Carte Afrique', '10 users', 'Priority support'] },
              { name: 'Enterprise', price: null, color: '#A78BFA', features: ['Tout Pro inclus', 'White-label', 'SSO SAML', 'SLA 99.9%', 'CSM dédié', 'Custom integrations', 'Utilisateurs illimités'] },
            ].map(plan => (
              <div key={plan.name} style={{ background: (plan as any).highlight ? 'rgba(0,255,148,0.03)' : '#121920',
                border: `1px solid ${(plan as any).highlight ? 'rgba(0,255,148,0.35)' : '#1E2D3D'}`, borderRadius: 14, padding: 24, position: 'relative' }}>
                {(plan as any).highlight && (
                  <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#00FF94', color: '#080B0F', borderRadius: 12, padding: '3px 14px', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    RECOMMANDÉ
                  </div>
                )}
                <div style={{ fontSize: 11, color: plan.color, fontFamily: 'JetBrains Mono, monospace', marginBottom: 8 }}>{plan.name.toUpperCase()}</div>
                <div style={{ marginBottom: 20 }}>
                  {plan.price ? (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ fontSize: 34, fontWeight: 800, color: plan.color, fontFamily: 'Syne, sans-serif' }}>${plan.price}</span>
                      <span style={{ fontSize: 12, color: '#4A6278' }}>/mois</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: 28, fontWeight: 800, color: plan.color, fontFamily: 'Syne, sans-serif' }}>Sur devis</div>
                  )}
                  {billingAnnual && plan.price && <div style={{ fontSize: 11, color: '#00FF94', marginTop: 2 }}>Facturé annuellement</div>}
                </div>
                <div style={{ borderTop: '1px solid #1E2D3D', paddingTop: 16, marginBottom: 20 }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', background: `${plan.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: plan.color }}/>
                      </div>
                      <span style={{ fontSize: 12, color: '#8FA3B8' }}>{f}</span>
                    </div>
                  ))}
                </div>
                <a href={plan.name === 'Enterprise' ? 'mailto:contact@pangea-carbon.com?subject=Plan Enterprise' : '/signup'}
                  style={{ display: 'block', textAlign: 'center', padding: '10px', borderRadius: 8,
                    background: (plan as any).highlight ? '#00FF94' : 'transparent',
                    color: (plan as any).highlight ? '#080B0F' : '#4A6278',
                    border: (plan as any).highlight ? 'none' : '1px solid #1E2D3D',
                    fontWeight: (plan as any).highlight ? 700 : 400, textDecoration: 'none', fontSize: 13 }}>
                  {plan.name === 'Enterprise' ? 'Nous contacter →' : 'Démarrer maintenant →'}
                </a>
              </div>
            ))}
          </div>

          <div style={{ background: 'rgba(0,255,148,0.04)', border: '1px solid rgba(0,255,148,0.12)', borderRadius: 10, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <span style={{ fontSize: 14, color: '#E8EFF6', fontWeight: 600 }}>Revenue Share — $0/mois</span>
              <span style={{ fontSize: 13, color: '#4A6278', marginLeft: 10 }}>Payez uniquement 3% sur vos revenus carbone générés</span>
            </div>
            <a href="/signup" style={{ background: 'transparent', border: '1px solid rgba(0,255,148,0.3)', color: '#00FF94', borderRadius: 7, padding: '8px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              En savoir plus →
            </a>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section style={{ padding: '80px 48px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 400, background: 'radial-gradient(ellipse, rgba(0,255,148,0.05) 0%, transparent 70%)', pointerEvents: 'none' }}/>
        <div style={{ position: 'relative' }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 44, fontWeight: 800, marginBottom: 14, margin: '0 0 14px', lineHeight: 1.1 }}>
            L'Afrique mérite une plateforme<br/>carbone à son niveau.
          </h2>
          <p style={{ fontSize: 16, color: '#4A6278', marginBottom: 32 }}>14 jours gratuits · Pas de carte bancaire · Setup en 10 minutes</p>
          <a href="/signup" style={{ background: '#00FF94', color: '#080B0F', borderRadius: 9, padding: '16px 36px', fontSize: 16, fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
            Créer mon compte gratuit →
          </a>
          <div style={{ marginTop: 16, fontSize: 12, color: '#2A3F55' }}>
            contact@pangea-carbon.com · With Africa For Africa 🌍
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '24px 48px', borderTop: '1px solid #1E2D3D', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, background: '#0D1117' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14 }}>PANGEA CARBON</span>
          <span style={{ fontSize: 11, color: '#4A6278' }}>· Carbon Credit Intelligence · Africa</span>
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <a href="/auth/login" style={{ fontSize: 12, color: '#4A6278', textDecoration: 'none' }}>Connexion</a>
          <a href="/signup" style={{ fontSize: 12, color: '#4A6278', textDecoration: 'none' }}>Inscription</a>
          <a href="/dashboard/admin" style={{ fontSize: 12, color: '#4A6278', textDecoration: 'none' }}>Admin</a>
          <span style={{ fontSize: 12, color: '#2A3F55' }}>contact@pangea-carbon.com</span>
        </div>
        <div style={{ fontSize: 11, color: '#2A3F55' }}>© 2026 PANGEA CARBON Africa · Verra ACM0002 · Gold Standard · Article 6</div>
      </footer>

      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        a:hover { opacity: 0.85; }
      `}</style>
    </div>
  );
}
