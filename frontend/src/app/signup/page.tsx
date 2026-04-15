'use client';
import { useLang } from '@/lib/lang-context';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL;

const STEPS = [
  { id:'account', label:'Votre compte' },
  { id:'org',     label:'Organisation' },
  { id:'project', label:'Premier projet' },
  { id:'plan',    label:'Plan' },
];

const PLANS = [
  { id:'trial',   name:'Trial gratuit', price:'$0',        duration:'14 jours', color:'#4A6278',
    features:['3 projets','50 MW','MRV Calculator','1 API key'] },
  { id:'starter', name:'Starter',       price:'$299/mois', duration:'mensuel',  color:'#38BDF8',
    features:['10 projets','500 MW','PDF Reports','Marketplace','5 API keys'] },
  { id:'growth',  name:'Growth',        price:'$799/mois', duration:'mensuel',  color:'#00FF94',
    features:['50 projets','5000 MW','AI Assistant','Carbon Tax Engine','20 API keys'], highlight:true },
];

// IMPORTANT: FieldLabel et TextInput définis HORS de SignupPage.
// Si définis à l'intérieur → nouveau type à chaque render → remount → perte focus.

const INP_BASE = {
  width:'100%', background:'#0D1117', border:'1px solid #1E2D3D',
  borderRadius:7, color:'#E8EFF6', padding:'10px 14px', fontSize:14,
  boxSizing:'border-box', outline:'none', fontFamily:'Inter, sans-serif',
};

function FieldLabel({ children }) {
  return (
    <label style={{ fontSize:10, color:'#4A6278', fontFamily:'JetBrains Mono, monospace',
      display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.06em' }}>
      {children}
    </label>
  );
}

function TextInput({ type='text', placeholder='', value, onChange, autoFocus=false }) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      autoFocus={autoFocus}
      style={INP_BASE}
      onFocus={e => (e.target.style.borderColor = 'rgba(0,255,148,0.4)')}
      onBlur={e  => (e.target.style.borderColor = '#1E2D3D')}
    />
  );
}

export default function SignupPage() {
  const { lang } = useLang();
  const L = (en, fr) => lang === 'fr' ? fr : en;
  const router = useRouter();

  const [step, setStep]       = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [form, setForm]       = useState({
    name:'', email:'', password:'',
    orgName:'', orgCountry:'', orgType:'EPC',
    projectName:'', projectType:'SOLAR', projectMW:'',
    plan:'trial',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const next = () => {
    setError('');
    if (step === 0) {
      if (!form.name.trim())        { setError('Nom requis'); return; }
      if (!form.email.trim())       { setError('Email requis'); return; }
      if (form.password.length < 8) { setError('Password: 8 caractères minimum'); return; }
    }
    if (step === 1 && !form.orgName.trim()) { setError("Nom de l'organisation requis"); return; }
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };

  const submit = async () => {
    setLoading(true); setError('');
    try {
      const regRes = await fetch(`${API}/auth/register`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body:JSON.stringify({ name:form.name, email:form.email, password:form.password, organization:form.orgName, orgType:form.orgType, orgCountry:form.orgCountry }),
      });
      if (!regRes.ok) { const e = await regRes.json(); throw new Error(e.error || 'Registration failed'); }
      const { accessToken, refreshToken, user } = await regRes.json();
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      if (form.projectName.trim() && form.projectMW) {
        await fetch(`${API}/projects`, {
          method:'POST',
          headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${accessToken}` },
          body:JSON.stringify({
            name:form.projectName, type:form.projectType,
            country:form.orgCountry || "Cote d'Ivoire", countryCode:'CI',
            installedMW:parseFloat(form.projectMW) || 10,
            startDate:new Date().toISOString().split('T')[0],
          }),
        }).catch(() => {});
      }

      if (form.plan !== 'trial') {
        const checkRes = await fetch(`${API}/billing/checkout`, {
          method:'POST',
          headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${accessToken}` },
          body:JSON.stringify({ plan:form.plan }),
        }).catch(() => null);
        if (checkRes && checkRes.ok) {
          const { url } = await checkRes.json();
          if (url) { window.location.href = url; return; }
        }
      }

      router.push(`/auth/check-email?email=${encodeURIComponent(form.email)}`);
    } catch(e) { setError(e.message || 'Erreur reseau'); }
    finally { setLoading(false); }
  };

  const btnType = { EPC:'EPC', IPP:'IPP', Dev:'Developpeur' };

  return (
    <div style={{ minHeight:'100vh', background:'#080B0F', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ width:'100%', maxWidth:520 }}>

        <div style={{ textAlign:'center', marginBottom:32 }}>
          <a href="/landing" style={{ display:'inline-flex', alignItems:'center', gap:8, textDecoration:'none' }}>
            <div style={{ width:32, height:32, borderRadius:8, background:'rgba(0,255,148,0.15)', border:'1px solid rgba(0,255,148,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>⬡</div>
            <span style={{ fontFamily:'Syne, sans-serif', fontWeight:700, fontSize:18, color:'#E8EFF6' }}>PANGEA CARBON</span>
          </a>
          <div style={{ fontSize:13, color:'#4A6278', marginTop:8 }}>Créez votre compte — 14 jours gratuits</div>
        </div>

        {/* Stepper */}
        <div style={{ display:'flex', alignItems:'center', marginBottom:28 }}>
          {STEPS.map((s, i) => (
            <div key={s.id} style={{ display:'flex', alignItems:'center', flex: i < STEPS.length-1 ? 1 : 0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{
                  width:24, height:24, borderRadius:'50%', display:'flex', alignItems:'center',
                  justifyContent:'center', fontSize:10, fontWeight:700, fontFamily:'JetBrains Mono, monospace',
                  background:  i < step ? '#00FF94' : i === step ? 'rgba(0,255,148,0.15)' : '#0D1117',
                  color:       i < step ? '#080B0F' : i === step ? '#00FF94' : '#2A3F55',
                  border:`1px solid ${i < step ? '#00FF94' : i === step ? 'rgba(0,255,148,0.4)' : '#1E2D3D'}`,
                }}>
                  {i < step ? 'v' : i+1}
                </div>
                <span style={{ fontSize:11, color: i === step ? '#E8EFF6' : '#4A6278', whiteSpace:'nowrap' }}>{s.label}</span>
              </div>
              {i < STEPS.length-1 && (
                <div style={{ flex:1, height:1, background: i < step ? 'rgba(0,255,148,0.3)' : '#1E2D3D', margin:'0 8px' }}/>
              )}
            </div>
          ))}
        </div>

        <div style={{ background:'#121920', border:'1px solid #1E2D3D', borderRadius:12, padding:28 }}>
          {error && (
            <div style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.2)', borderRadius:7, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#F87171' }}>
              {error}
            </div>
          )}

          {step === 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:20, fontWeight:700, margin:'0 0 4px', color:'#E8EFF6' }}>Créez votre compte</h2>
              <div>
                <FieldLabel>Full name *</FieldLabel>
                <TextInput placeholder="Dayiri Esdras" value={form.name} onChange={e => set('name', e.target.value)} autoFocus={true}/>
              </div>
              <div>
                <FieldLabel>Email professionnel *</FieldLabel>
                <TextInput type="email" placeholder="vous@organisation.com" value={form.email} onChange={e => set('email', e.target.value)}/>
              </div>
              <div>
                <FieldLabel>Password *</FieldLabel>
                <TextInput type="password" placeholder="8 caractères minimum" value={form.password} onChange={e => set('password', e.target.value)}/>
              </div>
            </div>
          )}

          {step === 1 && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:20, fontWeight:700, margin:'0 0 4px', color:'#E8EFF6' }}>Votre organisation</h2>
              <div>
                <FieldLabel>Nom de l'organisation *</FieldLabel>
                <TextInput placeholder="CFAO Aeolus / SolarAfrica Mali" value={form.orgName} onChange={e => set('orgName', e.target.value)} autoFocus={true}/>
              </div>
              <div>
                <FieldLabel>Type d'organisation</FieldLabel>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {[
                    { id:'EPC',                   label:'EPC',                       icon:'🏗️', desc:'Engineering, Procurement & Construction' },
                    { id:'IPP',                   label:'IPP',                       icon:'⚡', desc:'Independent Power Producer' },
                    { id:'Developpeur',           label:'Développeur',               icon:'🌱', desc:'Développeur de projets carbone' },
                    { id:'CORPORATE_VOLUNTARY',   label:'Corporate Buyer',           icon:'🏢', desc:'Offset volontaire — ESG / Net Zero' },
                    { id:'COMPLIANCE_CBAM',       label:'CBAM Compliance',           icon:'🇪🇺', desc:'Exportateurs vers l'UE — CBAM' },
                    { id:'STRATEGIC_NETZERO',     label:'Strategic Net Zero',        icon:'🎯', desc:'Engagement Net Zero signé (SBTi)' },
                    { id:'FINANCIAL',             label:'Financial / ESG Fund',      icon:'💼', desc:'Banque, fonds ESG, assurance' },
                    { id:'COMPLIANCE_CORSIA',     label:'CORSIA Aviation',           icon:'✈️', desc:'Compagnies aériennes — CORSIA' },
                  ].map(t => (
                    <button key={t.id} type="button" onClick={() => set('orgType', t.id)}
                      style={{ padding:'12px 14px', borderRadius:9, cursor:'pointer', fontSize:12,
                        border:     form.orgType===t.id ? '1px solid rgba(0,255,148,0.4)' : '1px solid #1E2D3D',
                        background: form.orgType===t.id ? 'rgba(0,255,148,0.08)' : '#0D1117',
                        color:      form.orgType===t.id ? '#00FF94' : '#4A6278',
                        textAlign:'left', display:'flex', flexDirection:'column', gap:3 }}>
                      <span style={{ fontSize:16 }}>{t.icon}</span>
                      <span style={{ fontWeight:700, color: form.orgType===t.id ? '#00FF94' : '#E8EFF6', fontSize:12 }}>{t.label}</span>
                      <span style={{ fontSize:10, color:'#4A6278', lineHeight:1.4 }}>{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <FieldLabel>Pays principal</FieldLabel>
                <TextInput placeholder="Cote d'Ivoire, Kenya, Nigeria..." value={form.orgCountry} onChange={e => set('orgCountry', e.target.value)}/>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:20, fontWeight:700, margin:'0 0 4px', color:'#E8EFF6' }}>Premier projet</h2>
              <p style={{ fontSize:13, color:'#4A6278', margin:0 }}>Optionnel — vous pouvez en ajouter plus tard</p>
              <div>
                <FieldLabel>Nom du projet</FieldLabel>
                <TextInput placeholder="Parc Solaire Abidjan Nord" value={form.projectName} onChange={e => set('projectName', e.target.value)} autoFocus={true}/>
              </div>
              <div>
                <FieldLabel>Type d'energie</FieldLabel>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:6 }}>
                  {[['SOLAR','☀️'],['WIND','💨'],['HYDRO','💧'],['BIOMASS','🌿'],['HYBRID','⚡']].map(([t, icon]) => (
                    <button key={t} type="button" onClick={() => set('projectType', t)}
                      style={{ padding:'8px 4px', borderRadius:7, cursor:'pointer', textAlign:'center',
                        border:     form.projectType===t ? '1px solid rgba(0,255,148,0.4)' : '1px solid #1E2D3D',
                        background: form.projectType===t ? 'rgba(0,255,148,0.08)' : '#0D1117' }}>
                      <div style={{ fontSize:18 }}>{icon}</div>
                      <div style={{ fontSize:9, color: form.projectType===t ? '#00FF94' : '#4A6278', marginTop:2 }}>{t}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <FieldLabel>Puissance installee (MW)</FieldLabel>
                <TextInput type="number" placeholder="10.5" value={form.projectMW} onChange={e => set('projectMW', e.target.value)}/>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:20, fontWeight:700, margin:'0 0 16px', color:'#E8EFF6' }}>Choisissez votre plan</h2>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {PLANS.map(plan => (
                  <div key={plan.id} onClick={() => set('plan', plan.id)}
                    style={{ padding:'14px 16px', borderRadius:9, cursor:'pointer',
                      border:`1px solid ${form.plan===plan.id ? plan.color : '#1E2D3D'}`,
                      background: form.plan===plan.id ? plan.color+'08' : '#0D1117',
                      display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ width:18, height:18, borderRadius:'50%', border:`2px solid ${plan.color}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        {form.plan===plan.id && <div style={{ width:8, height:8, borderRadius:'50%', background:plan.color }}/>}
                      </div>
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ fontSize:14, fontWeight:600, color:'#E8EFF6' }}>{plan.name}</span>
                          {plan.highlight && <span style={{ fontSize:9, background:'rgba(0,255,148,0.15)', color:'#00FF94', border:'1px solid rgba(0,255,148,0.3)', borderRadius:3, padding:'1px 6px', fontFamily:'JetBrains Mono, monospace' }}>POPULAIRE</span>}
                        </div>
                        <div style={{ fontSize:11, color:'#4A6278' }}>{plan.features.join(' · ')}</div>
                      </div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontSize:16, fontWeight:700, color:plan.color, fontFamily:'Syne, sans-serif' }}>{plan.price}</div>
                      <div style={{ fontSize:10, color:'#4A6278' }}>{plan.duration}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display:'flex', justifyContent:'space-between', marginTop:24, gap:10 }}>
            {step > 0 ? (
              <button type="button" onClick={() => { setError(''); setStep(s => s-1); }}
                style={{ background:'transparent', border:'1px solid #1E2D3D', borderRadius:7, color:'#4A6278', padding:'10px 16px', cursor:'pointer', fontSize:13 }}>
                Retour
              </button>
            ) : (
              <a href="/auth/login" style={{ color:'#4A6278', fontSize:13, textDecoration:'none', display:'flex', alignItems:'center' }}>
                Deja un compte ?
              </a>
            )}
            {step < STEPS.length-1 ? (
              <button type="button" onClick={next}
                style={{ background:'#00FF94', color:'#080B0F', border:'none', borderRadius:7, padding:'10px 22px', fontWeight:700, fontSize:13, cursor:'pointer', flex:1, maxWidth:200 }}>
                Continuer
              </button>
            ) : (
              <button type="button" onClick={submit} disabled={loading}
                style={{ background:loading?'#1E2D3D':'#00FF94', color:loading?'#4A6278':'#080B0F', border:'none', borderRadius:7, padding:'10px 22px', fontWeight:700, fontSize:13, cursor:loading?'wait':'pointer', flex:1 }}>
                {loading ? 'Creation...' : 'Creer mon compte'}
              </button>
            )}
          </div>
        </div>

        <p style={{ textAlign:'center', fontSize:11, color:'#2A3F55', marginTop:16 }}>
          En creant un compte, vous acceptez nos CGU · Donnees protegees · PANGEA CARBON Africa
        </p>
      </div>
    </div>
  );
}
