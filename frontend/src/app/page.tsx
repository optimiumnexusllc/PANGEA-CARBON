'use client';
import { useLang } from '@/lib/lang-context';
import LangToggle from '@/components/LangToggle';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

/* ─────────────────────────────────────────────
   PANGEA CARBON — Landing Page
   Elite Palantir God+++ · Fully Responsive
   Mobile / Tablet / Desktop / Ultrawide
───────────────────────────────────────────── */

const STATS = [
  { value: 697, suffix: 'K+', label: 'tCO₂e certified', sub: 'Verra ACM0002' },
  { value: 7.7, suffix: 'M$', label: 'carbon revenue', sub: 'Portfolio actif' },
  { value: 18, suffix: '', label: 'African countries', sub: 'EF UNFCCC officiels' },
  { value: 6, suffix: '', label: 'live projects', sub: 'Solar · Wind · Hydro' },
];

const FEATURES = [
  { icon: '⚡', title: 'Native Equipment API', desc: 'SMA, Huawei, SolarEdge, Fronius. REST ou webhook. MRV calculé automatiquement à chaque lecture.', tag: 'API REST' },
  { icon: '🧮', title: 'Certifiable MRV ACM0002', desc: 'Méthodologie Verra v19.0. 18 African countries. Calcul en millisecondes. Rapport PDF audit-ready.', tag: 'Verra · Gold Standard' },
  { icon: '🛰️', title: 'dMRV Satellite + IoT', desc: 'Sentinel-2 + IoT sensors. Vérification continue. Plus d\'auditeur annuel requis. Score dMRV live.', tag: 'Continuous MRV' },
  { icon: '🏛️', title: 'Article 6 ITMO', desc: 'Sovereign carbon markets. Price $35-55/tCO₂e. State-to-state Paris Agreement transactions.', tag: '×3-5 prix Verra' },
  { icon: '🤖', title: 'AI Carbon Assistant', desc: 'Claude (Anthropic) with African carbon context. Analyzes portfolio, answers ACM0002 questions.', tag: 'Claude · Anthropic' },
  { icon: '⛓️', title: 'Blockchain Registry', desc: 'SHA-256 hash chain. Anti-double counting. Every credit publicly verifiable by unique hash.', tag: 'Trustless' },
];

const STANDARDS = [
  { name: 'Verra VCS', color: '#00FF94' },
  { name: 'Gold Standard', color: '#FCD34D' },
  { name: 'Article 6', color: '#38BDF8' },
  { name: 'CORSIA', color: '#F87171' },
  { name: 'ICVCM CCPs', color: '#A78BFA' },
];

const FLOW = [
  { n: '01', title: 'Create a project', desc: 'Enregistrez votre parc en 2 min. Facteur d\'émission défini automatiquement.' },
  { n: '02', title: 'Connect equipment', desc: 'REST API for SMA, Huawei, SolarEdge. Or import CSV. Real-time data.' },
  { n: '03', title: 'Automatic MRV', desc: 'Every reading triggers calculation. Credits, revenue, equivalents. All tracked.' },
  { n: '04', title: 'Download & sell', desc: 'Certifiable PDF in 1 click. Submit to VVB. Sell on our marketplace.' },
];

const TESTIMONIALS = [
  { name: 'Aminata Diallo', role: 'CFO · SolarAfrica Mali', text: 'Our MRV report went from 3 weeks to 1 click. Verra auditors are impressed.' },
  { name: 'Emmanuel Osei', role: 'CEO · GreenPower Ghana', text: 'L\'Equipment API avec nos onduleurs Huawei fonctionne parfaitement. MRV en temps réel.' },
  { name: 'Fatoumata Koné', role: 'Director · AEOLUS CI', text: 'The first truly African platform. Understands our field realities and our countries.' },
];

function AnimatedCounter({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const duration = 1800;
        const steps = 60;
        const increment = target / steps;
        let current = 0;
        const timer = setInterval(() => {
          current += increment;
          if (current >= target) { setCount(target); clearInterval(timer); }
          else setCount(parseFloat(current.toFixed(1)));
        }, duration / steps);
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return (
    <div ref={ref} style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 48px)', color: '#00FF94', lineHeight: 1 }}>
      {target < 10 ? count.toFixed(1) : Math.floor(count)}{suffix}
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [annual, setAnnual] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { lang, setLang } = useLang();
  const L = (en, fr) => lang === 'fr' ? fr : en;
  const [showContact, setShowContact] = useState(false);
  const [cName, setCName] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cCompany, setCCompany] = useState('');
  const [cMsg, setCMsg] = useState('');
  const [cSending, setCsending] = useState(false);
  const [cSent, setCsent] = useState(false);
  const [cErr, setCerr] = useState('');



  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) { router.push('/dashboard'); return; }
    setChecked(true);
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!checked) return (
    <div style={{ background: '#060A0D', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 28, height: 28, border: '2px solid rgba(0,255,148,0.2)', borderTopColor: '#00FF94', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/>
    </div>
  );

  const prices = { starter: annual ? 249 : 299, pro: annual ? 649 : 799 };

  const doSend = async () => {
    if (!cName || !cEmail) { setCerr('Name and email required'); return; }
    setCsending(true); setCerr('');
    try {
      const r = await fetch((process.env.NEXT_PUBLIC_API_URL || '') + '/email-composer/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cName, email: cEmail, company: cCompany, message: cMsg }),
      });
      if (r.ok) setCsent(true);
      else setCerr('Send error');
    } catch(_e) { setCerr('Erreur reseau'); }
    finally { setCsending(false); }
  };

  return (
    <div className="pangea-landing">
      {/* ── NAVBAR ─────────────────────────────── */}
      <nav className={`pgc-nav ${scrolled ? 'pgc-nav--scrolled' : ''}`}>
        <div className="pgc-nav__inner">
          <a href="/" className="pgc-logo">
            <div className="pgc-logo__hex">⬡</div>
            <div className="pgc-logo__text">
              <span className="pgc-logo__name">PANGEA CARBON</span>
              <span className="pgc-logo__live">● LIVE</span>
            </div>
          </a>

          <div className="pgc-nav__links">
            <a href="#features" className="pgc-nav__link">Features</a>
            <a href="#how" className="pgc-nav__link">How it works</a>
            <a href="#pricing" className="pgc-nav__link">Pricing</a>
            <a href="#contact" className="pgc-nav__link">Contact</a>
          </div>

          <div className="pgc-nav__actions">
            <a href="/auth/login" className="pgc-btn pgc-btn--ghost">Login</a>
            <span style={{display:'flex',alignItems:'center',gap:2,background:'rgba(30,45,61,.6)',borderRadius:6,padding:'3px 4px',border:'1px solid #1E2D3D',marginRight:6}}>
              {['fr','en'].map(l=><button key={l} onClick={() => setLang(l)} style={{padding:'3px 8px',borderRadius:4,border:'none',cursor:'pointer',fontSize:11,fontWeight:lang===l?700:400,background:lang===l?'#00FF94':'transparent',color:lang===l?'#080B0F':'#4A6278'}}>{l.toUpperCase()}</button>)}
            </span>
            <a href="/signup" className="pgc-btn pgc-btn--primary">Free trial →</a>
          </div>

          <button className="pgc-hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            <span className={`pgc-hamburger__bar ${menuOpen ? 'open' : ''}`}/>
            <span className={`pgc-hamburger__bar ${menuOpen ? 'open' : ''}`}/>
            <span className={`pgc-hamburger__bar ${menuOpen ? 'open' : ''}`}/>
          </button>
        </div>

        {/* Mobile menu */}
        <div className={`pgc-mobile-menu ${menuOpen ? 'pgc-mobile-menu--open' : ''}`}>
          {['#features', '#how', '#pricing', '#contact'].map((href, i) => (
            <a key={href} href={href} className="pgc-mobile-menu__link" onClick={() => setMenuOpen(false)}>
              {[L('Features','Fonctionnalités'), L('How it works','Comment ça marche'), L('Pricing','Tarifs'), 'Contact'][i]}
            </a>
          ))}
          <div className="pgc-mobile-menu__actions">
            <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 8 }}>
              <LangToggle />
            </div>
            <a href="/auth/login" className="pgc-btn pgc-btn--ghost pgc-btn--full">{L('Login','Connexion')}</a>
            <a href="/signup" className="pgc-btn pgc-btn--primary pgc-btn--full">{L('Free trial 14d →','Essai gratuit 14j →')}</a>
          </div>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────── */}
      <section className="pgc-hero">
        <div className="pgc-hero__glow"/>
        <div className="pgc-hero__grid-pattern"/>
        <div className="pgc-container pgc-hero__content">
          <div className="pgc-hero__badge">
            <span className="pgc-badge-dot"/>
            <span>Carbon Credit Intelligence · Africa · Verra ACM0002</span>
          </div>
          <h1 className="pgc-hero__title">
            The MRV platform making<br className="pgc-br-desktop"/>
            <span className="pgc-text-green"> Africa the leader</span><br className="pgc-br-desktop"/>
            of global carbon
          </h1>
          <p className="pgc-hero__desc">
            Connect your equipment. Calculate carbon credits automatically per Verra ACM0002. Generate certifiable reports. Sell on our marketplace.
          </p>
          <div className="pgc-hero__cta">
            <a href="/signup" className="pgc-btn pgc-btn--primary pgc-btn--lg">
              Get started for free →
            </a>
            <a href="/auth/login" className="pgc-btn pgc-btn--outline pgc-btn--lg">
              Watch demo
            </a>
          </div>
          <p className="pgc-hero__note">14-day free trial · No credit card · Setup in 10 min</p>

          {/* Standards */}
          <div className="pgc-standards">
            {STANDARDS.map(s => (
              <div key={s.name} className="pgc-standard-badge" style={{ '--badge-color': s.color } as any}>
                <div className="pgc-standard-badge__dot"/>
                <span>{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ──────────────────────────────── */}
      <section className="pgc-stats">
        <div className="pgc-container">
          <div className="pgc-stats__grid">
            {STATS.map(s => (
              <div key={s.label} className="pgc-stat">
                <AnimatedCounter target={s.value} suffix={s.suffix}/>
                <div className="pgc-stat__label">{s.label}</div>
                <div className="pgc-stat__sub">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────── */}
      <section id="features" className="pgc-section">
        <div className="pgc-container">
          <div className="pgc-section__header">
            <div className="pgc-eyebrow">FEATURES</div>
            <h2 className="pgc-section__title">Everything an African EPC/IPP needs</h2>
            <p className="pgc-section__sub">One platform. Zero Excel. Zero external MRV consultant.</p>
          </div>
          <div className="pgc-features-grid">
            {FEATURES.map(f => (
              <div key={f.title} className="pgc-feature-card">
                <div className="pgc-feature-card__top">
                  <span className="pgc-feature-card__icon">{f.icon}</span>
                  <span className="pgc-feature-card__tag">{f.tag}</span>
                </div>
                <h3 className="pgc-feature-card__title">{f.title}</h3>
                <p className="pgc-feature-card__desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────── */}
      <section id="how" className="pgc-section pgc-section--dark">
        <div className="pgc-container">
          <div className="pgc-section__header">
            <div className="pgc-eyebrow">HOW IT WORKS</div>
            <h2 className="pgc-section__title">From equipment to credits in 4 steps</h2>
          </div>
          <div className="pgc-flow-grid">
            {FLOW.map((step, i) => (
              <div key={step.n} className="pgc-flow-step">
                <div className={`pgc-flow-step__num ${i === 0 ? 'pgc-flow-step__num--active' : ''}`}>
                  {step.n}
                </div>
                {i < FLOW.length - 1 && <div className="pgc-flow-step__line"/>}
                <h3 className="pgc-flow-step__title">{step.title}</h3>
                <p className="pgc-flow-step__desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── API SHOWCASE ───────────────────────── */}
      <section className="pgc-section">
        <div className="pgc-container">
          <div className="pgc-api-showcase">
            <div className="pgc-api-showcase__text">
              <div className="pgc-eyebrow" style={{ color: '#A78BFA' }}>EQUIPMENT API</div>
              <h2 className="pgc-section__title" style={{ textAlign: 'left', maxWidth: 'none' }}>Connect your inverters in 5 minutes</h2>
              <p style={{ fontSize: 'clamp(13px, 2vw, 15px)', color: '#8FA3B8', lineHeight: 1.7, marginBottom: 24 }}>
                One REST endpoint. One webhook. Your data arrives automatically, MRV calculated continuously.
              </p>
              <div className="pgc-api-integrations">
                {[['☀️','SMA Solar'],['🌀','Huawei FusionSolar'],['⚡','SolarEdge'],['🔆','Fronius'],['📊','CSV / Excel'],['🔗','Webhook custom']].map(([icon, name]) => (
                  <div key={String(name)} className="pgc-api-integration">
                    <span>{icon}</span>
                    <span>{name}</span>
                    <div className="pgc-api-integration__dot"/>
                  </div>
                ))}
              </div>
              <a href="/signup" className="pgc-btn pgc-btn--primary" style={{ marginTop: 24, display: 'inline-flex' }}>
                Get an API key →
              </a>
            </div>
            <div className="pgc-terminal">
              <div className="pgc-terminal__header">
                <div className="pgc-terminal__dots">
                  <div style={{ background: '#F87171' }}/>
                  <div style={{ background: '#FCD34D' }}/>
                  <div style={{ background: '#00FF94' }}/>
                </div>
                <span className="pgc-terminal__title">Equipment API · SMA Inverter</span>
              </div>
              <pre className="pgc-terminal__code">{`curl -X POST \\
  https://pangea-carbon.com/api/equipment/reading \\
  -H "X-API-Key: pgc_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "project_id": "proj_ci_solar_001",
    "device_id":  "SMA_ABJ_NORD_01",
    "energy_mwh": 1250.5,
    "peak_power_mw": 48.2,
    "availability_pct": 98.5
  }'`}</pre>
              <div className="pgc-terminal__result">
                <span style={{ color: '#00FF94' }}>✓ 201 Created</span>
                <span style={{ color: '#4A6278' }}> · MRV recalculé · 14.3 tCO₂e · $171</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ────────────────────────────── */}
      <section id="pricing" className="pgc-section pgc-section--dark">
        <div className="pgc-container">
          <div className="pgc-section__header">
            <div className="pgc-eyebrow">PRICING</div>
            <h2 className="pgc-section__title">Start free, scale without limits</h2>
            <div className="pgc-toggle">
              <button onClick={() => setAnnual(false)} className={`pgc-toggle__btn ${!annual ? 'active' : ''}`}>Mensuel</button>
              <button onClick={() => setAnnual(true)} className={`pgc-toggle__btn ${annual ? 'active' : ''}`}>
                Annuel <span className="pgc-toggle__save">−17%</span>
              </button>
            </div>
          </div>

          <div className="pgc-pricing-grid">
            {[
              { name: 'Starter', price: prices.starter, color: '#38BDF8', features: ['5 projects', '50 MW max', 'MRV ACM0002', 'Dashboard', 'Import CSV', '2 users', 'Email support'] },
              { name: 'Pro', price: prices.pro, color: '#00FF94', highlight: true, features: ['Unlimited projects', 'MW illimités', 'Certifiable PDFs', 'Equipment API', 'AI Assistant', '6 modules Elite', '10 users', 'Priority support'] },
              { name: 'Enterprise', price: null, color: '#A78BFA', features: ['Everything in Pro', 'White-label', 'SSO SAML', 'SLA 99.9%', 'Dedicated CSM', 'Custom integrations', 'Unlimited users'] },
            ].map(plan => (
              <div key={plan.name} className={`pgc-pricing-card ${plan.highlight ? 'pgc-pricing-card--highlight' : ''}`} style={{ '--plan-color': plan.color } as any}>
                {plan.highlight && <div className="pgc-pricing-card__badge">RECOMMENDED</div>}
                <div className="pgc-pricing-card__name" style={{ color: plan.color }}>{plan.name.toUpperCase()}</div>
                <div className="pgc-pricing-card__price">
                  {plan.price ? (
                    <><span className="pgc-pricing-card__amount" style={{ color: plan.color }}>${plan.price}</span><span className="pgc-pricing-card__period">/mois</span></>
                  ) : (
                    <span className="pgc-pricing-card__amount" style={{ color: plan.color }}>Custom pricing</span>
                  )}
                </div>
                {annual && plan.price && <div className="pgc-pricing-card__annual">Facturé annuellement</div>}
                <div className="pgc-pricing-card__features">
                  {plan.features.map(f => (
                    <div key={f} className="pgc-pricing-feature">
                      <div className="pgc-pricing-feature__dot" style={{ background: plan.color }}/>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
                {plan.name === 'Enterprise' ? (
                  <button onClick={() => setShowContact(true)} className="pgc-btn pgc-btn--full pgc-btn--outline" style={{ cursor: 'pointer' }}>
                    Contact us
                  </button>
                ) : (
                  <a href="/signup" className={`pgc-btn pgc-btn--full ${plan.highlight ? 'pgc-btn--primary' : 'pgc-btn--outline'}`}>
                    Get started
                  </a>
                )}
              </div>
            ))}
          </div>

          <div className="pgc-revenue-share">
            <div>
              <span className="pgc-revenue-share__title">Revenue Share</span>
              <span className="pgc-revenue-share__price"> — $0/mois</span>
              <span className="pgc-revenue-share__desc"> · Payez uniquement 3% sur vos carbon revenue générés</span>
            </div>
            <a href="/signup" className="pgc-btn pgc-btn--ghost pgc-btn--sm">Learn more →</a>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ───────────────────────── */}
      <section className="pgc-section">
        <div className="pgc-container">
          <div className="pgc-section__header">
            <div className="pgc-eyebrow">TESTIMONIALS</div>
            <h2 className="pgc-section__title">They trust PANGEA CARBON</h2>
          </div>
          <div className="pgc-testi-grid">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="pgc-testi-card">
                <div className="pgc-testi-card__quote">"</div>
                <p className="pgc-testi-card__text">{t.text}</p>
                <div className="pgc-testi-card__author">
                  <div className="pgc-testi-card__avatar">{t.name[0]}</div>
                  <div>
                    <div className="pgc-testi-card__name">{t.name}</div>
                    <div className="pgc-testi-card__role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────── */}
      <section id="contact" className="pgc-cta">
        <div className="pgc-cta__glow"/>
        <div className="pgc-container pgc-cta__content">
          <div className="pgc-eyebrow" style={{ justifyContent: 'center' }}>WITH AFRICA FOR AFRICA 🌍</div>
          <h2 className="pgc-cta__title">Ready to monetize your African carbon?</h2>
          <p className="pgc-cta__desc">14-day free trial · No credit card · First project in 10 minutes</p>
          <div className="pgc-hero__cta">
            <a href="/signup" className="pgc-btn pgc-btn--primary pgc-btn--xl">Create my free account →</a>
            <button onClick={() => setShowContact(true)} className="pgc-btn pgc-btn--ghost pgc-btn--xl" style={{ cursor: "pointer" }}>Contact us</button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────── */}
      <footer className="pgc-footer">
        <div className="pgc-container">
          <div className="pgc-footer__top">
            <div className="pgc-footer__brand">
              <div className="pgc-logo">
                <div className="pgc-logo__hex">⬡</div>
                <span className="pgc-logo__name">PANGEA CARBON</span>
              </div>
              <p className="pgc-footer__tagline">Carbon Credit Intelligence · Africa<br/>Verra ACM0002 · Gold Standard · Article 6</p>
            </div>
            <div className="pgc-footer__links-group">
              <div className="pgc-footer__col">
                <div className="pgc-footer__col-title">Platform</div>
                {[['Features','#features'],['Pricing','#pricing'],['API Docs','/dashboard/api-keys'],['Carbon Hub','/dashboard/standards']].map(([l,h]) => (
                  <a key={l} href={h} className="pgc-footer__link">{l}</a>
                ))}
              </div>
              <div className="pgc-footer__col">
                <div className="pgc-footer__col-title">Account</div>
                {[['Login','/auth/login'],['Register','/signup'],['Dashboard','/dashboard'],['Admin','/dashboard/admin']].map(([l,h]) => (
                  <a key={l} href={h} className="pgc-footer__link">{l}</a>
                ))}
              </div>
              <div className="pgc-footer__col">
                <div className="pgc-footer__col-title">Contact</div>
                <a href="mailto:contact@pangea-carbon.com" className="pgc-footer__link">contact@pangea-carbon.com</a>
                <a href="https://pangea-carbon.com" className="pgc-footer__link">pangea-carbon.com</a>
              </div>
            </div>
          </div>
          <div className="pgc-footer__bottom">
            <span>© 2026 PANGEA CARBON Africa</span>
            <span>With Africa For Africa 🌍</span>
          </div>
        </div>
      </footer>

      {/* ── GLOBAL STYLES ──────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes glow-pulse { 0%,100%{opacity:.4} 50%{opacity:.7} }

        .pangea-landing {
          background: #060A0D;
          color: #E8EFF6;
          font-family: 'DM Sans', -apple-system, sans-serif;
          min-height: 100vh;
          overflow-x: hidden;
        }

        /* ── CONTAINER ── */
        .pgc-container {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 clamp(16px, 5vw, 48px);
        }

        /* ── NAV ── */
        .pgc-nav {
          position: sticky; top: 0; z-index: 200;
          border-bottom: 1px solid transparent;
          transition: all 0.3s;
        }
        .pgc-nav--scrolled {
          background: rgba(6,10,13,0.97);
          backdrop-filter: blur(20px);
          border-bottom-color: #1E2D3D;
        }
        .pgc-nav__inner {
          max-width: 1200px; margin: 0 auto;
          padding: 0 clamp(16px, 5vw, 48px);
          height: 62px;
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px;
        }
        .pgc-logo { display:flex; align-items:center; gap:8px; text-decoration:none; }
        .pgc-logo__hex {
          width: 30px; height: 30px; border-radius: 7px;
          background: rgba(0,255,148,0.12); border: 1px solid rgba(0,255,148,0.3);
          display: flex; align-items: center; justify-content: center;
          font-size: 15px; flex-shrink: 0;
        }
        .pgc-logo__text { display: flex; flex-direction: column; }
        .pgc-logo__name { font-family:'Syne',sans-serif; font-weight:700; font-size:15px; color:#E8EFF6; line-height:1; }
        .pgc-logo__live {
          font-size: 9px; color: #00FF94; font-family: 'JetBrains Mono', monospace;
          animation: pulse 2s infinite;
        }
        .pgc-nav__links { display:flex; gap:24px; }
        .pgc-nav__link { color:#4A6278; font-size:13px; text-decoration:none; transition:color 0.2s; }
        .pgc-nav__link:hover { color:#E8EFF6; }
        .pgc-nav__actions { display:flex; gap:8px; align-items:center; }
        .pgc-hamburger { display:none; flex-direction:column; gap:5px; background:none; border:none; cursor:pointer; padding:4px; }
        .pgc-hamburger__bar { width:22px; height:2px; background:#8FA3B8; border-radius:2px; transition:all 0.3s; display:block; }
        .pgc-hamburger__bar.open:nth-child(1) { transform: translateY(7px) rotate(45deg); }
        .pgc-hamburger__bar.open:nth-child(2) { opacity:0; }
        .pgc-hamburger__bar.open:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
        .pgc-mobile-menu {
          display:none; flex-direction:column; padding:16px clamp(16px,5vw,48px) 20px;
          border-top:1px solid #1E2D3D; background:rgba(6,10,13,0.98);
          max-height: 0; overflow: hidden; transition: max-height 0.35s ease;
        }
        .pgc-mobile-menu--open { max-height: 500px; }
        .pgc-mobile-menu__link { color:#8FA3B8; font-size:15px; text-decoration:none; padding:12px 0; border-bottom:1px solid rgba(30,45,61,0.4); }
        .pgc-mobile-menu__actions { display:flex; flex-direction:column; gap:10px; margin-top:16px; }

        /* ── BUTTONS ── */
        .pgc-btn {
          display:inline-flex; align-items:center; justify-content:center;
          gap:6px; font-size:13px; font-weight:600; text-decoration:none;
          border-radius:8px; padding:9px 18px; cursor:pointer; border:none;
          transition:all 0.2s; white-space:nowrap; font-family:'DM Sans',sans-serif;
        }
        .pgc-btn--primary { background:#00FF94; color:#060A0D; }
        .pgc-btn--primary:hover { background:#00E085; transform:translateY(-1px); }
        .pgc-btn--ghost { background:transparent; color:#8FA3B8; border:1px solid #1E2D3D; }
        .pgc-btn--ghost:hover { border-color:#2A3F55; color:#E8EFF6; }
        .pgc-btn--outline { background:transparent; color:#8FA3B8; border:1px solid #1E2D3D; }
        .pgc-btn--outline:hover { border-color:#4A6278; color:#E8EFF6; }
        .pgc-btn--lg { padding:13px 26px; font-size:15px; border-radius:9px; }
        .pgc-btn--xl { padding:15px 32px; font-size:16px; border-radius:10px; }
        .pgc-btn--sm { padding:6px 14px; font-size:12px; }
        .pgc-btn--full { width:100%; }

        /* ── HERO ── */
        .pgc-hero {
          position:relative; overflow:hidden;
          padding: clamp(72px,10vw,120px) 0 clamp(60px,8vw,100px);
        }
        .pgc-hero__glow {
          position:absolute; top:20%; left:50%; transform:translate(-50%,-50%);
          width:min(700px,90vw); height:400px;
          background:radial-gradient(ellipse, rgba(0,255,148,0.07) 0%, transparent 70%);
          pointer-events:none; animation:glow-pulse 4s ease-in-out infinite;
        }
        .pgc-hero__grid-pattern {
          position:absolute; inset:0; opacity:0.025;
          background-image: linear-gradient(#00FF94 1px, transparent 1px), linear-gradient(90deg, #00FF94 1px, transparent 1px);
          background-size: 50px 50px;
          pointer-events:none;
        }
        .pgc-hero__content {
          position:relative; text-align:center;
          animation: fadeUp 0.7s ease both;
        }
        .pgc-hero__badge {
          display:inline-flex; align-items:center; gap:8px;
          background:rgba(0,255,148,0.07); border:1px solid rgba(0,255,148,0.2);
          border-radius:20px; padding:5px 16px; margin-bottom:clamp(20px,4vw,32px);
          font-size:clamp(10px,2vw,12px); color:#00FF94; font-family:'JetBrains Mono',monospace;
        }
        .pgc-badge-dot { width:6px; height:6px; border-radius:50%; background:#00FF94; animation:pulse 2s infinite; flex-shrink:0; }
        .pgc-hero__title {
          font-family:'Syne',sans-serif; font-weight:800;
          font-size:clamp(32px,6vw,72px); line-height:1.07;
          margin-bottom:clamp(16px,3vw,24px); color:#E8EFF6;
        }
        .pgc-text-green { color:#00FF94; }
        .pgc-br-desktop { display:block; }
        .pgc-hero__desc {
          font-size:clamp(14px,2vw,18px); color:#8FA3B8; line-height:1.7;
          max-width:600px; margin:0 auto clamp(24px,4vw,40px);
        }
        .pgc-hero__cta { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; margin-bottom:12px; }
        .pgc-hero__note { font-size:12px; color:#2A3F55; }
        .pgc-standards {
          display:flex; justify-content:center; gap:clamp(6px,2vw,10px);
          margin-top:clamp(28px,5vw,40px); flex-wrap:wrap;
        }
        .pgc-standard-badge {
          display:flex; align-items:center; gap:6px;
          background:color-mix(in srgb, var(--badge-color) 8%, transparent);
          border:1px solid color-mix(in srgb, var(--badge-color) 20%, transparent);
          border-radius:8px; padding:5px 12px;
          font-size:clamp(10px,1.5vw,12px); color:var(--badge-color); font-weight:600;
        }
        .pgc-standard-badge__dot { width:5px; height:5px; border-radius:50%; background:var(--badge-color); }

        /* ── STATS ── */
        .pgc-stats {
          border-top:1px solid #1E2D3D; border-bottom:1px solid #1E2D3D;
          padding:clamp(24px,4vw,36px) 0; background:#0A0F14;
        }
        .pgc-stats__grid { display:grid; grid-template-columns:repeat(4,1fr); gap:clamp(12px,3vw,20px); }
        .pgc-stat { text-align:center; padding:8px; }
        .pgc-stat__label { font-size:clamp(12px,1.8vw,14px); color:#E8EFF6; font-weight:500; margin-top:6px; }
        .pgc-stat__sub { font-size:clamp(9px,1.3vw,11px); color:#4A6278; margin-top:2px; font-family:'JetBrains Mono',monospace; }

        /* ── SECTIONS ── */
        .pgc-section { padding:clamp(60px,8vw,96px) 0; }
        .pgc-section--dark { background:#0A0F14; border-top:1px solid #1E2D3D; border-bottom:1px solid #1E2D3D; }
        .pgc-section__header { text-align:center; margin-bottom:clamp(36px,5vw,56px); }
        .pgc-eyebrow {
          font-size:clamp(9px,1.3vw,11px); color:#4A6278; font-family:'JetBrains Mono',monospace;
          letter-spacing:.12em; text-transform:uppercase; margin-bottom:12px;
          display:flex; align-items:center; gap:8px;
        }
        .pgc-section__header .pgc-eyebrow { justify-content:center; }
        .pgc-section__title {
          font-family:'Syne',sans-serif; font-weight:800;
          font-size:clamp(24px,4vw,42px); line-height:1.15; max-width:640px;
          margin:0 auto 12px; color:#E8EFF6;
        }
        .pgc-section__sub { font-size:clamp(13px,2vw,16px); color:#4A6278; }

        /* ── FEATURES ── */
        .pgc-features-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:clamp(12px,2vw,18px); }
        .pgc-feature-card {
          background:#0D1117; border:1px solid #1E2D3D; border-radius:14px;
          padding:clamp(18px,3vw,26px); transition:all 0.2s;
        }
        .pgc-feature-card:hover { border-color:rgba(0,255,148,0.25); transform:translateY(-3px); box-shadow:0 12px 40px rgba(0,255,148,0.05); }
        .pgc-feature-card__top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px; }
        .pgc-feature-card__icon { font-size:clamp(22px,3vw,30px); }
        .pgc-feature-card__tag {
          font-size:9px; background:rgba(56,189,248,0.1); color:#38BDF8;
          border:1px solid rgba(56,189,248,0.2); border-radius:5px;
          padding:2px 7px; font-family:'JetBrains Mono',monospace; white-space:nowrap;
        }
        .pgc-feature-card__title { font-size:clamp(13px,2vw,15px); font-weight:600; color:#E8EFF6; margin-bottom:8px; }
        .pgc-feature-card__desc { font-size:clamp(12px,1.6vw,13px); color:#4A6278; line-height:1.65; }

        /* ── FLOW ── */
        .pgc-flow-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:clamp(16px,3vw,24px); position:relative; }
        .pgc-flow-step { text-align:center; position:relative; }
        .pgc-flow-step__num {
          width:44px; height:44px; border-radius:50%; border:1px solid rgba(0,255,148,0.3);
          background:#121920; color:#00FF94; font-family:'JetBrains Mono',monospace;
          font-size:12px; font-weight:700; display:flex; align-items:center; justify-content:center;
          margin:0 auto 16px;
        }
        .pgc-flow-step__num--active { background:#00FF94; color:#060A0D; }
        .pgc-flow-step__line {
          display:none;
        }
        .pgc-flow-step__title { font-size:clamp(13px,1.8vw,15px); font-weight:600; color:#E8EFF6; margin-bottom:8px; }
        .pgc-flow-step__desc { font-size:clamp(11px,1.5vw,13px); color:#4A6278; line-height:1.6; }

        /* ── API SHOWCASE ── */
        .pgc-api-showcase { display:grid; grid-template-columns:1fr 1fr; gap:clamp(28px,5vw,56px); align-items:center; }
        .pgc-api-integrations { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:20px; }
        .pgc-api-integration {
          display:flex; align-items:center; gap:8px; padding:8px 12px;
          background:#0D1117; border:1px solid #1E2D3D; border-radius:7px; font-size:12px; color:#8FA3B8;
        }
        .pgc-api-integration__dot { width:6px; height:6px; border-radius:50%; background:#00FF94; margin-left:auto; flex-shrink:0; }
        .pgc-terminal { background:#0D1117; border:1px solid #1E2D3D; border-radius:14px; overflow:hidden; }
        .pgc-terminal__header {
          display:flex; align-items:center; gap:8px; padding:10px 16px;
          background:#121920; border-bottom:1px solid #1E2D3D;
        }
        .pgc-terminal__dots { display:flex; gap:5px; }
        .pgc-terminal__dots div { width:10px; height:10px; border-radius:50%; }
        .pgc-terminal__title { font-size:11px; color:#4A6278; font-family:'JetBrains Mono',monospace; }
        .pgc-terminal__code {
          padding:clamp(14px,3vw,20px); font-family:'JetBrains Mono',monospace;
          font-size:clamp(10px,1.5vw,12px); color:#8FA3B8; line-height:1.8;
          white-space:pre-wrap; word-break:break-all;
        }
        .pgc-terminal__result {
          padding:10px 16px; background:rgba(0,255,148,0.04);
          border-top:1px solid rgba(0,255,148,0.1); font-size:11px;
          font-family:'JetBrains Mono',monospace;
        }

        /* ── PRICING ── */
        .pgc-toggle {
          display:inline-flex; background:#0D1117; border:1px solid #1E2D3D;
          border-radius:22px; padding:3px; gap:2px; margin-top:16px;
        }
        .pgc-toggle__btn {
          padding:7px 18px; border-radius:18px; border:none; cursor:pointer; font-size:13px;
          background:transparent; color:#4A6278; transition:all 0.2s; font-family:'DM Sans',sans-serif;
        }
        .pgc-toggle__btn.active { background:#1E2D3D; color:#E8EFF6; }
        .pgc-toggle__save { font-size:10px; color:#00FF94; margin-left:4px; }
        .pgc-pricing-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:clamp(12px,2vw,18px); margin-bottom:16px; }
        .pgc-pricing-card {
          background:#0D1117; border:1px solid #1E2D3D; border-radius:16px;
          padding:clamp(20px,3vw,28px); position:relative; display:flex; flex-direction:column; gap:16px;
        }
        .pgc-pricing-card--highlight {
          background:rgba(0,255,148,0.03); border-color:rgba(0,255,148,0.3);
          box-shadow:0 0 60px rgba(0,255,148,0.05);
        }
        .pgc-pricing-card__badge {
          position:absolute; top:-12px; left:50%; transform:translateX(-50%);
          background:#00FF94; color:#060A0D; border-radius:12px;
          padding:3px 14px; font-size:10px; font-weight:700; white-space:nowrap;
        }
        .pgc-pricing-card__name { font-size:11px; font-family:'JetBrains Mono',monospace; }
        .pgc-pricing-card__price { display:flex; align-items:baseline; gap:4px; }
        .pgc-pricing-card__amount { font-family:'Syne',sans-serif; font-weight:800; font-size:clamp(26px,4vw,36px); }
        .pgc-pricing-card__period { font-size:12px; color:#4A6278; }
        .pgc-pricing-card__annual { font-size:11px; color:#00FF94; }
        .pgc-pricing-card__features { display:flex; flex-direction:column; gap:8px; flex:1; border-top:1px solid #1E2D3D; padding-top:16px; }
        .pgc-pricing-feature { display:flex; align-items:center; gap:8px; font-size:clamp(11px,1.5vw,13px); color:#8FA3B8; }
        .pgc-pricing-feature__dot { width:5px; height:5px; border-radius:50%; flex-shrink:0; }
        .pgc-revenue-share {
          display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;
          background:rgba(0,255,148,0.04); border:1px solid rgba(0,255,148,0.12);
          border-radius:10px; padding:clamp(12px,2vw,16px) clamp(16px,3vw,24px);
        }
        .pgc-revenue-share__title { font-size:clamp(13px,2vw,15px); color:#E8EFF6; font-weight:600; }
        .pgc-revenue-share__price { font-size:clamp(13px,2vw,15px); color:#00FF94; }
        .pgc-revenue-share__desc { font-size:clamp(12px,1.8vw,14px); color:#4A6278; }

        /* ── TESTIMONIALS ── */
        .pgc-testi-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:clamp(12px,2vw,18px); }
        .pgc-testi-card { background:#0D1117; border:1px solid #1E2D3D; border-radius:14px; padding:clamp(18px,3vw,24px); }
        .pgc-testi-card__quote { font-size:36px; color:#00FF94; line-height:1; margin-bottom:10px; font-family:'Syne',sans-serif; }
        .pgc-testi-card__text { font-size:clamp(12px,1.8vw,14px); color:#8FA3B8; line-height:1.7; margin-bottom:16px; }
        .pgc-testi-card__author { display:flex; align-items:center; gap:10px; }
        .pgc-testi-card__avatar {
          width:34px; height:34px; border-radius:50%; background:rgba(0,255,148,0.15);
          color:#00FF94; font-weight:700; font-size:13px; display:flex; align-items:center; justify-content:center; flex-shrink:0;
        }
        .pgc-testi-card__name { font-size:13px; font-weight:600; color:#E8EFF6; }
        .pgc-testi-card__role { font-size:11px; color:#4A6278; }

        /* ── CTA ── */
        .pgc-cta { position:relative; overflow:hidden; padding:clamp(72px,10vw,120px) 0; text-align:center; }
        .pgc-cta__glow {
          position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
          width:600px; height:400px;
          background:radial-gradient(ellipse, rgba(0,255,148,0.07) 0%, transparent 70%);
          pointer-events:none;
        }
        .pgc-cta__content { position:relative; }
        .pgc-cta__title {
          font-family:'Syne',sans-serif; font-weight:800;
          font-size:clamp(26px,5vw,52px); line-height:1.1; margin:12px 0 16px; color:#E8EFF6;
        }
        .pgc-cta__desc { font-size:clamp(13px,2vw,16px); color:#4A6278; margin-bottom:32px; }

        /* ── FOOTER ── */
        .pgc-footer { border-top:1px solid #1E2D3D; padding:clamp(40px,6vw,60px) 0 clamp(20px,4vw,32px); background:#0A0F14; }
        .pgc-footer__top { display:grid; grid-template-columns:1fr 2fr; gap:clamp(28px,5vw,60px); margin-bottom:clamp(28px,4vw,40px); }
        .pgc-footer__tagline { font-size:12px; color:#4A6278; line-height:1.7; margin-top:12px; }
        .pgc-footer__links-group { display:grid; grid-template-columns:repeat(3,1fr); gap:24px; }
        .pgc-footer__col-title { font-size:11px; color:#E8EFF6; font-weight:600; margin-bottom:12px; font-family:'JetBrains Mono',monospace; text-transform:uppercase; letter-spacing:.06em; }
        .pgc-footer__link { display:block; font-size:13px; color:#4A6278; text-decoration:none; margin-bottom:8px; transition:color 0.2s; }
        .pgc-footer__link:hover { color:#8FA3B8; }
        .pgc-footer__bottom { display:flex; justify-content:space-between; align-items:center; border-top:1px solid #1E2D3D; padding-top:clamp(16px,3vw,20px); font-size:11px; color:#2A3F55; flex-wrap:wrap; gap:8px; }

        /* ═══════════════════════════════════════
           RESPONSIVE BREAKPOINTS
        ═══════════════════════════════════════ */

        /* TABLET — 768px to 1023px */
        @media (max-width: 1023px) {
          .pgc-nav__links { display:none; }
          .pgc-hamburger { display:flex; }
          .pgc-mobile-menu { display:flex; }
          .pgc-nav__actions { display:none; }
          .pgc-features-grid { grid-template-columns:repeat(2,1fr); }
          .pgc-flow-grid { grid-template-columns:repeat(2,1fr); gap:clamp(16px,3vw,24px); }
          .pgc-api-showcase { grid-template-columns:1fr; }
          .pgc-testi-grid { grid-template-columns:repeat(2,1fr); }
          .pgc-footer__top { grid-template-columns:1fr; }
          .pgc-footer__links-group { grid-template-columns:repeat(3,1fr); }
          .pgc-pricing-grid { grid-template-columns:1fr; max-width:420px; margin:0 auto 16px; }
          .pgc-br-desktop { display:none; }
        }

        /* MOBILE — below 767px */
        @media (max-width: 767px) {
          .pgc-stats__grid { grid-template-columns:repeat(2,1fr); gap:16px; }
          .pgc-features-grid { grid-template-columns:1fr; }
          .pgc-flow-grid { grid-template-columns:1fr; }
          .pgc-flow-step { text-align:left; display:flex; flex-direction:column; align-items:flex-start; }
          .pgc-flow-step__num { margin:0 0 12px; }
          .pgc-testi-grid { grid-template-columns:1fr; }
          .pgc-footer__links-group { grid-template-columns:repeat(2,1fr); }
          .pgc-standards { gap:6px; }
          .pgc-standard-badge { font-size:10px; padding:4px 10px; }
          .pgc-hero__cta { flex-direction:column; align-items:stretch; }
          .pgc-hero__cta .pgc-btn { justify-content:center; }
          .pgc-api-integrations { grid-template-columns:1fr; }
          .pgc-revenue-share { flex-direction:column; align-items:flex-start; }
          .pgc-footer__bottom { flex-direction:column; align-items:flex-start; }
        }

        /* SMALL MOBILE — below 400px */
        @media (max-width: 400px) {
          .pgc-stats__grid { grid-template-columns:1fr 1fr; }
          .pgc-footer__links-group { grid-template-columns:1fr 1fr; }
          .pgc-hero__badge { font-size:9px; padding:4px 12px; }
        }

        /* LARGE SCREENS — 1440px+ */
        @media (min-width: 1440px) {
          .pgc-container { max-width: 1320px; }
          .pgc-features-grid { grid-template-columns:repeat(3,1fr); }
        }

        /* ULTRAWIDE — 2000px+ */
        @media (min-width: 2000px) {
          .pgc-container { max-width: 1600px; }
        }
      `}</style>
      {showContact && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setShowContact(false); }}>
          <div style={{ background: '#0D1117', border: '1px solid rgba(252,211,77,0.25)', borderRadius: 16, padding: 32, maxWidth: 500, width: '100%', position: 'relative' }}>
            <button onClick={() => setShowContact(false)} style={{ position: 'absolute', top: 14, right: 18, background: 'none', border: 'none', color: '#4A6278', cursor: 'pointer', fontSize: 24 }}>x</button>
            {!cSent ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 7, background: 'rgba(0,255,148,0.12)', border: '1px solid rgba(0,255,148,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" stroke="#00FF94" strokeWidth="1.5"/></svg>
                  </div>
                  <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, color: '#E8EFF6' }}>PANGEA CARBON</span>
                </div>
                <div style={{ fontSize: 9, color: '#FCD34D', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.12em', marginBottom: 6 }}>PLAN ENTERPRISE</div>
                <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: '#E8EFF6', margin: '0 0 6px' }}>Let's talk about your project</h2>
                <p style={{ fontSize: 13, color: '#8FA3B8', marginBottom: 18, lineHeight: 1.6 }}>An expert will call you back within 24h.</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>NAME *</div>
                    <input value={cName} onChange={e => setCName(e.target.value)} placeholder="Votre nom"
                      style={{ width: '100%', background: '#121920', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '9px 12px', fontSize: 13, outline: 'none' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>EMAIL *</div>
                    <input type="email" value={cEmail} onChange={e => setCEmail(e.target.value)} placeholder="vous@company.com"
                      style={{ width: '100%', background: '#121920', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '9px 12px', fontSize: 13, outline: 'none' }} />
                  </div>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>COMPANY</div>
                  <input value={cCompany} onChange={e => setCCompany(e.target.value)} placeholder="SIEPA, CIE, Fonds vert..."
                    style={{ width: '100%', background: '#121920', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '9px 12px', fontSize: 13, outline: 'none' }} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>YOUR NEEDS</div>
                  <textarea value={cMsg} onChange={e => setCMsg(e.target.value)} placeholder="Projets, pays, volume carbone..." rows={3}
                    style={{ width: '100%', background: '#121920', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '9px 12px', fontSize: 13, outline: 'none', resize: 'none' }} />
                </div>
                {cErr && <div style={{ color: '#F87171', fontSize: 12, marginBottom: 10 }}>{cErr}</div>}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setShowContact(false)} style={{ flex: 1, background: 'transparent', border: '1px solid #1E2D3D', borderRadius: 8, color: '#4A6278', padding: 11, cursor: 'pointer' }}>L('Cancel', 'Annuler')</button>
                  <button onClick={doSend} disabled={cSending} style={{ flex: 2, background: cSending ? '#1E2D3D' : '#FCD34D', color: '#080B0F', border: 'none', borderRadius: 8, padding: 11, fontWeight: 800, fontSize: 14, cursor: cSending ? 'wait' : 'pointer' }}>
                    {cSending ? 'Sending...' : 'Send my request'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 44, marginBottom: 12 }}>✓</div>
                <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, color: '#00FF94', marginBottom: 8 }}>Request sent!</h2>
                <p style={{ fontSize: 13, color: '#8FA3B8', marginBottom: 20 }}>Guaranteed response within 24h.</p>
                <button onClick={() => { setShowContact(false); setCsent(false); setCName(''); setCEmail(''); setCCompany(''); setCMsg(''); }}
                  style={{ background: '#00FF94', color: '#080B0F', border: 'none', borderRadius: 8, padding: '9px 24px', fontWeight: 700, cursor: 'pointer' }}>
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
