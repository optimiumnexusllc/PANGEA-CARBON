'use client';
import { useEffect, useState } from 'react';

const PLANS = [
  {
    name: 'Free', price: '$0', period: '/month', color: '#4A6278',
    subtitle: 'Explore the platform', badge: null, planKey: 'FREE', disabled: true,
    features: ['1 MRV project', 'Up to 10 MW', 'Basic ACM0002 calculation', 'Read-only dashboard', '1 user', 'Community support'],
    cta: 'Current plan',
  },
  {
    name: 'Starter', price: '$299', period: '/month', color: '#38BDF8',
    subtitle: 'For early-stage projects', badge: null, planKey: 'STARTER', disabled: false,
    features: ['5 MRV projects', 'Up to 50 MW', 'Automatic ACM0002', 'Basic PDF reports', 'Real-time dashboard', '2 users', 'Email support 48h'],
    cta: 'Get started',
  },
  {
    name: 'Pro', price: '$799', period: '/month', color: '#00FF94',
    subtitle: 'For active IPPs', badge: 'Recommended', highlight: true, planKey: 'PRO', disabled: false,
    features: ['Unlimited projects', 'Unlimited MW', 'Certified PDF reports', '10-year Monte Carlo projection', 'Article 6 ITMO', 'Gold Standard SDG', 'AI Assistant + AI Baseline', 'IoT Equipment API', '10 users', 'Priority support 24h'],
    cta: 'Get Pro',
  },
  {
    name: 'Enterprise', price: 'Custom pricing', period: '', color: '#FCD34D',
    subtitle: 'For portfolios & institutions', badge: 'Custom', planKey: 'ENTERPRISE', disabled: false, isEnterprise: true,
    features: ['Everything in Pro', 'Full white-label', 'SSO SAML / LDAP', '99.9% SLA guaranteed', 'Dedicated Customer Success Manager', 'Custom integrations', 'Unlimited users', 'Multi-organizations', 'Advanced audit trail', 'Training & dedicated onboarding'],
    cta: 'Contact us',
  },
];

const STANDARDS = ['Verra VCS', 'Gold Standard', 'Article 6 ITMO', 'CORSIA Aviation', 'ACMI Africa', 'ACM0002 v22.0'];

export default function SettingsPage() {
  const [user, setUser] = useState(null);
  const [showContact, setShowContact] = useState(false);
  const [cName, setCName] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cCompany, setCCompany] = useState('');
  const [cMsg, setCMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');
  const [annual, setAnnual] = useState(false);

  useEffect(() => {
    try {
      const u = localStorage.getItem('user');
      if (u) setUser(JSON.parse(u));
    } catch(_e) {}
  }, []);

  async function sendContact() {
    if (!cName || !cEmail) { setErr('Name and email are required.'); return; }
    setSending(true); setErr('');
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || '';
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
      const res = await fetch(base + '/email-composer/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ name: cName, email: cEmail, company: cCompany, message: cMsg }),
      });
      if (res.ok) setSent(true);
      else setErr('Send failed. Try contact@pangea-carbon.com directly.');
    } catch(_e) { setErr('Connection error.'); }
    finally { setSending(false); }
  }

  async function handlePlan(plan) {
    if (plan.isEnterprise) { setShowContact(true); return; }
    if (plan.disabled) return;
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || '';
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
      const res = await fetch(base + '/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ plan: plan.planKey.toLowerCase() }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        alert('Stripe error: ' + data.error);
      } else {
        alert('No checkout URL returned. Check Stripe configuration in Admin → Secrets & Config.');
      }
    } catch(err) {
      alert('Payment error: ' + (err.message || 'Unknown error') + ' — Contact: contact@pangea-carbon.com');
    }
  }

  const prices = { starter: annual ? 249 : 299, pro: annual ? 649 : 799 };

  return (
    <div style={{ padding: 24, maxWidth: 1300, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>ACCOUNT & SUBSCRIPTION</div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: '#E8EFF6', margin: 0 }}>Plans & Pricing</h1>
        <p style={{ fontSize: 13, color: '#4A6278', marginTop: 6 }}>Enterprise-grade MRV platform for Africa · Verra ACM0002 · Gold Standard · ACMI</p>
      </div>

      {user && (
        <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 20, marginBottom: 28, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,255,148,0.12)', border: '1px solid rgba(0,255,148,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#00FF94' }}>
            {(user as any).name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#E8EFF6' }}>{(user as any).name}</div>
            <div style={{ fontSize: 12, color: '#4A6278' }}>{(user as any).email} · <span style={{ color: '#00FF94' }}>FREE plan</span></div>
          </div>
        </div>
      )}

      {/* Annual toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <span style={{ fontSize: 13, color: annual ? '#4A6278' : '#E8EFF6' }}>Monthly</span>
        <div onClick={() => setAnnual(!annual)} style={{ width: 44, height: 24, borderRadius: 12, background: annual ? '#00FF94' : '#1E2D3D', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
          <div style={{ position: 'absolute', top: 3, left: annual ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: annual ? '#080B0F' : '#4A6278', transition: 'left 0.2s' }}/>
        </div>
        <span style={{ fontSize: 13, color: annual ? '#E8EFF6' : '#4A6278' }}>Annual</span>
        {annual && <span style={{ fontSize: 11, background: 'rgba(0,255,148,0.12)', color: '#00FF94', border: '1px solid rgba(0,255,148,0.25)', borderRadius: 4, padding: '2px 8px' }}>Save 17%</span>}
      </div>

      {/* Plans grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 32 }}>
        {PLANS.map(plan => {
          const displayPrice = plan.planKey === 'STARTER' ? '$' + prices.starter : plan.planKey === 'PRO' ? '$' + prices.pro : plan.price;
          return (
            <div key={plan.planKey} style={{ background: '#0D1117', border: plan.highlight ? '2px solid #00FF94' : '1px solid #1E2D3D', borderRadius: 14, padding: 22, position: 'relative', display: 'flex', flexDirection: 'column' }}>
              {plan.badge && (
                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: plan.color, color: '#080B0F', fontSize: 10, fontWeight: 800, padding: '3px 14px', borderRadius: 20, whiteSpace: 'nowrap', fontFamily: 'JetBrains Mono, monospace' }}>
                  {plan.badge}
                </div>
              )}
              <div style={{ marginBottom: 4 }}>
                <div style={{ fontSize: 10, color: plan.color, fontFamily: 'JetBrains Mono, monospace', marginBottom: 2 }}>{plan.name.toUpperCase()}</div>
                <div style={{ fontSize: 12, color: '#4A6278' }}>{plan.subtitle}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, margin: '16px 0' }}>
                <span style={{ fontSize: 30, fontWeight: 800, fontFamily: 'Syne, sans-serif', color: plan.color }}>{displayPrice}</span>
                {plan.period && <span style={{ fontSize: 12, color: '#4A6278' }}>{plan.period}</span>}
              </div>
              <div style={{ flex: 1, marginBottom: 18 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 7, fontSize: 12, color: '#8FA3B8' }}>
                    <span style={{ color: plan.color, flexShrink: 0, marginTop: 1 }}>✓</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => handlePlan(plan)} disabled={plan.disabled} style={{ width: '100%', background: plan.disabled ? '#1E2D3D' : plan.highlight ? '#00FF94' : 'transparent', color: plan.disabled ? '#4A6278' : plan.highlight ? '#080B0F' : plan.color, border: plan.highlight ? 'none' : '1px solid ' + plan.color + '40', borderRadius: 8, padding: '11px 0', fontWeight: 800, fontSize: 13, cursor: plan.disabled ? 'default' : 'pointer', fontFamily: 'Syne, sans-serif' }}>
                {plan.cta}
              </button>
            </div>
          );
        })}
      </div>

      {/* Standards included */}
      <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 14 }}>STANDARDS INCLUDED IN ALL PLANS</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {STANDARDS.map(s => (
            <div key={s} style={{ background: 'rgba(0,255,148,0.06)', border: '1px solid rgba(0,255,148,0.15)', borderRadius: 7, padding: '6px 14px', fontSize: 12, color: '#00FF94' }}>{s}</div>
          ))}
        </div>
      </div>

      {/* Enterprise contact modal */}
      {showContact && (
        <div style={{ position: 'fixed', inset: 0, background:'rgba(8,11,15,0.88)', backdropFilter:'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) { setShowContact(false); setSent(false); } }}>
          <div style={{ background: '#0D1117', border: '1px solid rgba(252,211,77,0.3)', borderRadius: 18, padding: 32, maxWidth: 500, width: '90%', position: 'relative' }}>
            <button onClick={() => { setShowContact(false); setSent(false); }} style={{ position: 'absolute', top: 16, right: 20, background: 'none', border: 'none', color: '#4A6278', fontSize: 22, cursor: 'pointer' }}>×</button>
            {!sent ? (
              <>
                <div style={{ fontSize: 10, color: '#FCD34D', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>ENTERPRISE</div>
                <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, color: '#E8EFF6', marginBottom: 6 }}>{"Let's build your custom plan"}</h2>
                <p style={{ fontSize: 13, color: '#4A6278', marginBottom: 20, lineHeight: 1.7 }}>Our team will design a plan around your portfolio size, geography, and reporting requirements.</p>
                {[
                  { label: 'NAME *', val: cName, set: setCName, ph: 'Your full name' },
                  { label: 'EMAIL *', val: cEmail, set: setCEmail, ph: 'Professional email' },
                  { label: 'COMPANY', val: cCompany, set: setCCompany, ph: 'Company or project name' },
                ].map(f => (
                  <div key={f.label} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 5 }}>{f.label}</div>
                    <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} style={{ width: '100%', background: '#121920', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '10px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}/>
                  </div>
                ))}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 5 }}>YOUR NEEDS</div>
                  <textarea value={cMsg} onChange={e => setCMsg(e.target.value)} placeholder="Describe your portfolio (MW capacity, countries, number of projects...)" rows={3} style={{ width: '100%', background: '#121920', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '10px 12px', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}/>
                </div>
                {err && <div style={{ fontSize: 12, color: '#F87171', marginBottom: 12 }}>{err}</div>}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setShowContact(false)} style={{ flex: 1, background: 'transparent', border: '1px solid #1E2D3D', borderRadius: 9, color: '#4A6278', padding: 12, cursor: 'pointer' }}>Cancel</button>
                  <button onClick={sendContact} disabled={sending} style={{ flex: 2, background: sending ? '#1E2D3D' : '#FCD34D', color: '#080B0F', border: 'none', borderRadius: 9, padding: 12, fontWeight: 800, fontSize: 14, cursor: sending ? 'wait' : 'pointer', fontFamily: 'Syne, sans-serif' }}>
                    {sending ? 'Sending...' : 'Send my request'}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, color: '#00FF94', marginBottom: 8 }}>Request received!</h2>
                <p style={{ fontSize: 13, color: '#8FA3B8', marginBottom: 20 }}>Our team will contact you within 24 hours.</p>
                <button onClick={() => { setShowContact(false); setSent(false); }} style={{ background: '#00FF94', color: '#080B0F', border: 'none', borderRadius: 9, padding: '10px 28px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Close</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
