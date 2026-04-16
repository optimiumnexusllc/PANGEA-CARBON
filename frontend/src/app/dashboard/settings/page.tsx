'use client';
import { useEffect, useState } from 'react';
import { useLang } from '@/lib/lang-context';

const C = { bg:'#080B0F', card:'#0D1117', card2:'#121920', border:'#1E2D3D', green:'#00FF94', blue:'#38BDF8', purple:'#A78BFA', yellow:'#FCD34D', red:'#F87171', muted:'#4A6278', text:'#E8EFF6', text2:'#8FA3B8' };

const PLANS_STATIC = [
  { key:'free',       name:'Free',       priceDisplay:'$0',    period:'/mo', color:C.muted,   disabled:true,  badge:null,       isEnterprise:false,
    features:['1 project','Up to 500 MW','ACM0002 calculator','Read-only'] },
  { key:'starter',    name:'Starter',    priceDisplay:'$299',  period:'/mo', color:C.blue,    disabled:false, badge:null,       isEnterprise:false,
    features:['5 projects','1000 MW max','Certified PDF','API access','2 users'] },
  { key:'pro',        name:'Pro',        priceDisplay:'$799',  period:'/mo', color:C.green,   disabled:false, badge:'Best',     isEnterprise:false,
    features:['Unlimited projects','Unlimited MW','AI features','10-year Monte Carlo','10 users'] },
  { key:'enterprise', name:'Enterprise', priceDisplay:'Custom',period:'',    color:C.yellow,  disabled:false, badge:'Custom',   isEnterprise:true,
    features:['All Pro','White-label','SSO','Dedicated support','SLA 99.9%'] },
];

export default function SettingsPage() {
  const { lang } = useLang();
  const L = (en, fr) => lang === 'fr' ? fr : en;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('');
  const [showContact, setShowContact] = useState(false);
  const [cName, setCName] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cMsg, setCMsg] = useState('');
  const [err, setErr] = useState('');
  const [tab, setTab] = useState('billing');

  useEffect(() => {
    try {
      const u = localStorage.getItem('user');
      if (u) setUser(JSON.parse(u));
    } catch(_e) {}
  }, []);

  const currentPlan = (user?.plan || user?.organization?.plan || 'TRIAL').toLowerCase();

  const handleCheckout = async (plan) => {
    if (plan.isEnterprise) { setShowContact(true); return; }
    if (plan.disabled) return;
    setLoading(true); setMsg('');
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || '';
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
      const res = await fetch(base + '/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ plan: plan.key }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.code === 'STRIPE_NOT_CONFIGURED') {
        setMsg(lang==='fr'?'Stripe non configure. Ajoutez la cle Stripe dans Admin Secrets.':'Stripe not configured. Add Stripe key in Admin Secrets.');
        setMsgType('warn');
      } else {
        setMsg(data.error || (lang==='fr'?'Erreur paiement. Reessayez.':'Payment error. Please try again.'));
        setMsgType('error');
      }
    } catch(e) {
      setMsg(lang==='fr'?'Erreur de connexion.':'Connection error. Check your network.');
      setMsgType('error');
    } finally { setLoading(false); }
  };

  const sendContact = async () => {
    if (!cName || !cEmail) { setErr(lang==='fr'?'Nom et email requis.':'Name and email required.'); return; }
    setLoading(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(base + '/email-composer/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cName, email: cEmail, message: cMsg, subject: 'Enterprise Plan Inquiry' }),
      });
      const data = await res.json();
      if (data.success || res.ok) {
        setShowContact(false);
        setMsg(lang==='fr'?'Demande envoyee. Nous vous repondrons sous 24h.':'Inquiry sent. We will reply within 24h.');
        setMsgType('success');
      }
    } catch(e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ padding:24, maxWidth:1100, margin:'0 auto' }}>
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:9, color:C.green, fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.14em', marginBottom:4 }}>
          PANGEA CARBON · SUBSCRIPTION
        </div>
        <h1 style={{ fontFamily:'Syne, sans-serif', fontSize:24, fontWeight:800, color:C.text, margin:0 }}>
          {L('Plans & Billing','Plans et Facturation')}
        </h1>
        <p style={{ fontSize:13, color:C.muted, marginTop:6 }}>
          {L('Manage your subscription and access to premium features.',
             'Gerez votre abonnement et acces aux fonctionnalites premium.')}
        </p>
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:24 }}>
        {['billing','account'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding:'8px 18px', borderRadius:8, border:'1px solid ' + (tab===t ? C.green : C.border),
              background: tab===t ? 'rgba(0,255,148,0.08)' : 'transparent',
              color: tab===t ? C.green : C.muted, cursor:'pointer', fontSize:13, fontWeight:600 }}>
            {t === 'billing' ? L('Billing','Facturation') : L('Account','Compte')}
          </button>
        ))}
      </div>

      {msg && (
        <div style={{ background: msgType==='error' ? 'rgba(248,113,113,0.08)' : msgType==='warn' ? 'rgba(252,211,77,0.08)' : 'rgba(0,255,148,0.08)',
          border: '1px solid ' + (msgType==='error' ? C.red : msgType==='warn' ? C.yellow : C.green),
          borderRadius:10, padding:'12px 16px', marginBottom:20, color: msgType==='error' ? C.red : msgType==='warn' ? C.yellow : C.green, fontSize:13 }}>
          {msg}
        </div>
      )}

      {tab === 'billing' && (
        <div>
          <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:12, padding:'12px 16px', marginBottom:24, display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:C.green }}/>
            <div style={{ fontSize:13, color:C.text2 }}>
              {L('Current plan','Plan actuel')}:
              <strong style={{ color:C.text, marginLeft:6 }}>{currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}</strong>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))', gap:16 }}>
            {PLANS_STATIC.map(plan => {
              const isCurrent = currentPlan === plan.key;
              return (
                <div key={plan.key} style={{ background:C.card, border:'2px solid ' + (isCurrent ? plan.color : C.border),
                  borderRadius:14, padding:20, display:'flex', flexDirection:'column', gap:12,
                  opacity: plan.disabled ? 0.6 : 1, position:'relative', overflow:'hidden' }}>
                  {isCurrent && (
                    <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:plan.color }}/>
                  )}
                  {plan.badge && (
                    <div style={{ position:'absolute', top:12, right:12, background:plan.color, color:C.bg,
                      fontSize:9, fontWeight:800, padding:'2px 8px', borderRadius:4 }}>
                      {plan.badge}
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:4 }}>
                      {plan.key.toUpperCase()}
                    </div>
                    <div style={{ fontFamily:'Syne, sans-serif', fontSize:20, fontWeight:800, color:plan.color }}>
                      {plan.priceDisplay}
                    </div>
                    {plan.period && <div style={{ fontSize:11, color:C.muted }}>{plan.period}</div>}
                  </div>
                  <div style={{ flex:1 }}>
                    {plan.features.map((f, i) => (
                      <div key={i} style={{ fontSize:12, color:C.text2, padding:'3px 0', display:'flex', gap:6 }}>
                        <span style={{ color:plan.color }}>✓</span> {f}
                      </div>
                    ))}
                  </div>
                  <button onClick={() => handleCheckout(plan)} disabled={loading || isCurrent || plan.disabled}
                    style={{ background: isCurrent ? 'transparent' : plan.color, color: isCurrent ? C.muted : C.bg,
                      border: '1px solid ' + (isCurrent ? C.border : plan.color), borderRadius:9,
                      padding:'10px 0', fontWeight:700, fontSize:13, cursor: isCurrent || plan.disabled ? 'default' : 'pointer',
                      width:'100%', fontFamily:'Syne, sans-serif',
                      opacity: loading ? 0.7 : 1 }}>
                    {isCurrent ? L('Current plan','Plan actuel') : plan.isEnterprise ? L('Contact us','Nous contacter') : L('Upgrade','Passer a ce plan')}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'account' && (
        <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:14, padding:24, maxWidth:500 }}>
          <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:16, fontWeight:800, color:C.text, margin:'0 0 16px' }}>
            {L('Account Information','Informations du compte')}
          </h2>
          {user && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {[
                [L('Name','Nom'), user.name],
                [L('Email','Email'), user.email],
                [L('Role','Role'), user.role],
                [L('Plan','Plan'), currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)],
              ].map(([label, value]) => (
                <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0',
                  borderBottom:'1px solid '+C.border }}>
                  <div style={{ fontSize:12, color:C.muted }}>{label}</div>
                  <div style={{ fontSize:13, color:C.text, fontWeight:600 }}>{value || '—'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showContact && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowContact(false); }}
          style={{ position:'fixed', inset:0, background:'rgba(8,11,15,0.85)', backdropFilter:'blur(12px)',
            display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
          <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:16, padding:28, width:440, maxWidth:'90vw' }}>
            <div style={{ height:3, background:'linear-gradient(90deg,'+C.yellow+',transparent)', borderRadius:3, marginBottom:20 }}/>
            <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:18, fontWeight:800, color:C.text, margin:'0 0 6px' }}>
              Enterprise
            </h2>
            <p style={{ fontSize:13, color:C.muted, marginBottom:20 }}>
              {L('Tell us about your portfolio and we will get back to you within 24 hours.',
                 'Dites-nous en plus sur votre portefeuille et nous vous repondrons sous 24h.')}
            </p>
            {err && <div style={{ color:C.red, fontSize:12, marginBottom:12 }}>{err}</div>}
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {[[L('Your name','Votre nom'), cName, setCName],[L('Your email','Votre email'), cEmail, setCEmail]].map(([label, val, setter]) => (
                <div key={label}>
                  <div style={{ fontSize:11, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:4 }}>{label.toUpperCase()}</div>
                  <input value={val} onChange={e => setter(e.target.value)}
                    style={{ width:'100%', background:C.card2, border:'1px solid '+C.border, borderRadius:8,
                      color:C.text, padding:'9px 12px', fontSize:13, boxSizing:'border-box' }}/>
                </div>
              ))}
              <div>
                <div style={{ fontSize:11, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:4 }}>
                  {L('MESSAGE (optional)','MESSAGE (optionnel)').toUpperCase()}
                </div>
                <textarea value={cMsg} onChange={e => setCMsg(e.target.value)} rows={3}
                  style={{ width:'100%', background:C.card2, border:'1px solid '+C.border, borderRadius:8,
                    color:C.text, padding:'9px 12px', fontSize:13, resize:'none', boxSizing:'border-box' }}/>
              </div>
            </div>
            <div style={{ display:'flex', gap:10, marginTop:20 }}>
              <button onClick={sendContact} disabled={loading}
                style={{ flex:1, background:C.yellow, color:C.bg, border:'none', borderRadius:9,
                  padding:'11px 0', fontWeight:700, fontSize:13, cursor:'pointer', opacity:loading?0.7:1 }}>
                {loading ? L('Sending...','Envoi...') : L('Send inquiry','Envoyer')}
              </button>
              <button onClick={() => setShowContact(false)}
                style={{ flex:1, background:'transparent', border:'1px solid '+C.border, borderRadius:9,
                  color:C.muted, padding:'11px 0', cursor:'pointer', fontSize:13 }}>
                {L('Cancel','Annuler')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
