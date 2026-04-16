'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || '';

// ─── Types d'organisation ─────────────────────────────────────────────────────
const SUPPLY_TYPES = [
  { id:'EPC',        label:'EPC',         icon:'🏗️', color:'#38BDF8',
    desc:'Engineering, Procurement & Construction' },
  { id:'IPP',        label:'IPP',         icon:'⚡', color:'#00FF94',
    desc:'Independent Power Producer' },
  { id:'Developpeur',label:'Développeur', icon:'🌱', color:'#A78BFA',
    desc:'Développeur de projets carbone' },
];

const DEMAND_TYPES = [
  { id:'CORPORATE_VOLUNTARY', label:'Corporate Buyer',    icon:'🏢', color:'#38BDF8',
    desc:'Offset volontaire ESG / Net Zero' },
  { id:'COMPLIANCE_CBAM',     label:'CBAM Compliance',    icon:'🇪🇺', color:'#F97316',
    desc:"Exportateurs vers l'UE — CBAM" },
  { id:'STRATEGIC_NETZERO',   label:'Strategic Net Zero', icon:'🎯', color:'#00FF94',
    desc:'Engagement Net Zero signé (SBTi, UNFCCC)' },
  { id:'FINANCIAL',           label:'Financial / ESG',    icon:'💼', color:'#A78BFA',
    desc:'Banques, fonds ESG, assurance' },
  { id:'COMPLIANCE_CORSIA',   label:'CORSIA Aviation',    icon:'✈️', color:'#FCD34D',
    desc:'Compagnies aériennes — CORSIA' },
];

const ALL_TYPES = [...SUPPLY_TYPES, ...DEMAND_TYPES];
const SUPPLY_IDS = SUPPLY_TYPES.map(t => t.id);
const DEMAND_IDS = DEMAND_TYPES.map(t => t.id);

const PROJECT_TYPES = ['SOLAR','WIND','HYDRO','BIOMASS','HYBRID'];
const COUNTRIES_AFRICA = [
  'Côte d\'Ivoire','Kenya','Nigeria','Ghana','Sénégal','Cameroun',
  'Éthiopie','Afrique du Sud','Maroc','Égypte','Tanzania','Rwanda',
  'Ouganda','Mali','Burkina Faso','Bénin','Togo','Niger','RD Congo',
  'Angola','Mozambique','Zambie','Zimbabwe','Namibie','Botswana','Tunisie','Algérie',
];

const CBAM_SECTORS = ['Acier','Ciment','Aluminium','Engrais','Électricité','Hydrogène'];
const CORSIA_REGIONS = ['Afrique','Europe','Asie-Pacifique','Moyen-Orient','Amériques','Mondial'];

// ─── Styles ───────────────────────────────────────────────────────────────────
const CARD = '#0D1117';
const BORDER = '#1E2D3D';
const GREEN = '#00FF94';
const MUTED = '#4A6278';
const TEXT = '#E8EFF6';

const inp = {
  width:'100%', padding:'11px 14px', background:'#0A1628',
  border:'1px solid '+BORDER, borderRadius:9, color:TEXT, fontSize:13,
  outline:'none', boxSizing:'border-box' as const, fontFamily:'Inter, sans-serif',
};

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize:10, color:MUTED, fontFamily:'JetBrains Mono, monospace', marginBottom:6, letterSpacing:'0.05em' }}>{children}</div>;
}
function Input(props: any) {
  return <input style={inp} {...props}/>;
}
function Select({ children, ...props }: any) {
  return <select style={inp} {...props}>{children}</select>;
}

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    // Step 0: Compte
    name: '', email: '', password: '',
    // Step 1: Organisation
    orgName: '', orgCountry: 'Côte d\'Ivoire', orgType: '',
    // Supply: Step 2
    projectName: '', projectType: 'SOLAR', projectMW: '', projectCountry: '',
    // Demand: Step 2
    sector: '', annualEmissions: '', annualBudget: '', annualVolume: '',
    cbamSectors: [] as string[], cbamExportsToEU: '',
    corsiaRoutes: '', corsiaFleetSize: '',
    contactTitle: '',
    // Step 3: Plan
    plan: 'TRIAL',
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const isSupply = SUPPLY_IDS.includes(form.orgType);
  const isDemand = DEMAND_IDS.includes(form.orgType);
  const selectedType = ALL_TYPES.find(t => t.id === form.orgType);

  // Steps adaptatifs
  const steps = [
    { id:'account', label:'Compte' },
    { id:'org', label:'Organisation' },
    { id: isSupply ? 'project' : isDemand ? 'profile' : 'context', label: isSupply ? 'Projet' : isDemand ? 'Profil carbone' : 'Contexte' },
    { id:'plan', label:'Plan' },
  ];

  const validateStep = () => {
    setError('');
    if (step === 0) {
      if (!form.name.trim()) return setError('Nom complet requis'), false;
      if (!form.email.trim() || !form.email.includes('@')) return setError('Email valide requis'), false;
      if (form.password.length < 8) return setError('Mot de passe: 8 caractères minimum'), false;
    }
    if (step === 1) {
      if (!form.orgName.trim()) return setError('Nom de l\'organisation requis'), false;
      if (!form.orgType) return setError('Sélectionnez votre type d\'organisation'), false;
    }
    return true;
  };

  const next = () => { if (validateStep()) setStep(s => Math.min(s + 1, 3)); };
  const back = () => { setError(''); setStep(s => Math.max(s - 1, 0)); };

  const submit = async () => {
    setLoading(true); setError('');
    try {
      // 1. Inscription
      const regRes = await fetch(API+'/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, email: form.email, password: form.password,
          organization: form.orgName, orgType: form.orgType, orgCountry: form.orgCountry,
        }),
      });
      if (!regRes.ok) {
        const e = await regRes.json();
        throw new Error(e.error || 'Erreur lors de l\'inscription');
      }
      const { accessToken, refreshToken, user } = await regRes.json();
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      // 2. Créer le premier projet (supply side uniquement)
      if (isSupply && form.projectName.trim() && form.projectMW) {
        await fetch(API+'/projects', {
          method: 'POST',
          headers: { 'Content-Type':'application/json', Authorization:'Bearer '+accessToken },
          body: JSON.stringify({
            name: form.projectName, type: form.projectType,
            country: form.projectCountry || form.orgCountry,
            countryCode: 'CI',
            installedMW: parseFloat(form.projectMW) || 10,
            startDate: new Date().toISOString().split('T')[0],
          }),
        }).catch(() => {});
      }

      // 3. Sauvegarder le profil carbone (demand side)
      if (isDemand && (form.annualEmissions || form.annualBudget)) {
        await fetch(API+'/buyers/profile', {
          method: 'PUT',
          headers: { 'Content-Type':'application/json', Authorization:'Bearer '+accessToken },
          body: JSON.stringify({
            buyerType: form.orgType,
            sector: form.sector,
            country: form.orgCountry,
            totalEmissions: parseFloat(form.annualEmissions) || null,
            annualBudgetUSD: parseFloat(form.annualBudget) || null,
            annualVolumeT: parseFloat(form.annualVolume) || null,
            cbamSectors: form.cbamSectors.join(','),
            cbamExportsToEU: parseFloat(form.cbamExportsToEU) || null,
            corsiaRoutes: form.corsiaRoutes,
            corsiaFleetSize: parseInt(form.corsiaFleetSize) || null,
            contactTitle: form.contactTitle,
            status: 'PROSPECT',
          }),
        }).catch(() => {});
      }

      // 4. Redirection (pas de checkout Stripe ici — email de vérification d'abord)
      setSuccess(true);
      setTimeout(() => router.push('/auth/check-email?email='+encodeURIComponent(form.email)), 1500);

    } catch(e: any) {
      setError(e.message || 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:'100vh', background:'#080B0F', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ width:'100%', maxWidth:580 }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <a href="/" style={{ display:'inline-flex', alignItems:'center', gap:8, textDecoration:'none' }}>
            <div style={{ width:32, height:32, borderRadius:8, background:'rgba(0,255,148,0.15)', border:'1px solid rgba(0,255,148,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>⬡</div>
            <span style={{ fontFamily:'Syne, sans-serif', fontWeight:700, fontSize:18, color:TEXT }}>PANGEA CARBON</span>
          </a>
          <div style={{ fontSize:12, color:MUTED, marginTop:6, fontFamily:'JetBrains Mono, monospace' }}>Créez votre compte — 14 jours gratuits</div>
        </div>

        {/* Stepper */}
        <div style={{ display:'flex', alignItems:'center', marginBottom:24 }}>
          {steps.map((s, i) => (
            <div key={s.id} style={{ display:'flex', alignItems:'center', flex: i < steps.length-1 ? 1 : 0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ width:26, height:26, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, fontFamily:'JetBrains Mono, monospace',
                  background: i < step ? GREEN : i === step ? 'rgba(0,255,148,0.15)' : CARD,
                  color:      i < step ? '#080B0F' : i === step ? GREEN : MUTED,
                  border:'1px solid '+(i < step ? GREEN : i === step ? 'rgba(0,255,148,0.4)' : BORDER) }}>
                  {i < step ? '✓' : i+1}
                </div>
                <span style={{ fontSize:11, color: i === step ? TEXT : MUTED, whiteSpace:'nowrap' }}>{s.label}</span>
              </div>
              {i < steps.length-1 && <div style={{ flex:1, height:1, background: i < step ? 'rgba(0,255,148,0.3)' : BORDER, margin:'0 10px' }}/>}
            </div>
          ))}
        </div>

        {/* Card */}
        <div style={{ background:CARD, border:'1px solid '+BORDER, borderRadius:14, padding:28 }}>

          {error && (
            <div style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.25)', borderRadius:9, padding:'11px 16px', marginBottom:18, fontSize:13, color:'#F87171', display:'flex', gap:10, alignItems:'center' }}>
              <span>✗</span>{error}
            </div>
          )}

          {success && (
            <div style={{ background:'rgba(0,255,148,0.1)', border:'1px solid rgba(0,255,148,0.3)', borderRadius:9, padding:'14px 18px', textAlign:'center' }}>
              <div style={{ fontSize:28, marginBottom:8 }}>✓</div>
              <div style={{ fontSize:14, color:GREEN, fontWeight:700 }}>Compte créé ! Vérifiez votre email.</div>
            </div>
          )}

          {!success && (
            <>
              {/* ── STEP 0: Compte ──────────────────────────────────────────── */}
              {step === 0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                  <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:20, fontWeight:800, margin:0, color:TEXT }}>Créez votre compte</h2>
                  <div>
                    <Label>NOM COMPLET *</Label>
                    <Input placeholder="Dayiri Esdras" value={form.name} onChange={(e:any) => set('name', e.target.value)} autoFocus/>
                  </div>
                  <div>
                    <Label>EMAIL PROFESSIONNEL *</Label>
                    <Input type="email" placeholder="vous@organisation.com" value={form.email} onChange={(e:any) => set('email', e.target.value)}/>
                  </div>
                  <div>
                    <Label>MOT DE PASSE * (8 caractères minimum)</Label>
                    <Input type="password" placeholder="••••••••••••" value={form.password} onChange={(e:any) => set('password', e.target.value)}/>
                  </div>
                </div>
              )}

              {/* ── STEP 1: Organisation ────────────────────────────────────── */}
              {step === 1 && (
                <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
                  <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:20, fontWeight:800, margin:0, color:TEXT }}>Votre organisation</h2>
                  <div>
                    <Label>NOM DE L'ORGANISATION *</Label>
                    <Input placeholder="Solar Africa Mali, CFAO Aeolus, MTN Ghana..." value={form.orgName} onChange={(e:any) => set('orgName', e.target.value)} autoFocus/>
                  </div>
                  <div>
                    <Label>PAYS PRINCIPAL</Label>
                    <Select value={form.orgCountry} onChange={(e:any) => set('orgCountry', e.target.value)}>
                      {COUNTRIES_AFRICA.map(c => <option key={c} value={c}>{c}</option>)}
                    </Select>
                  </div>

                  {/* Type selector */}
                  <div>
                    <Label>TYPE D'ORGANISATION *</Label>

                    {/* Supply */}
                    <div style={{ fontSize:10, color:GREEN, fontFamily:'JetBrains Mono, monospace', marginBottom:8, marginTop:4 }}>
                      ⚡ SUPPLY SIDE — Producteurs de crédits carbone
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:12 }}>
                      {SUPPLY_TYPES.map(t => (
                        <button key={t.id} type="button" onClick={() => set('orgType', t.id)}
                          style={{ padding:'14px 10px', borderRadius:10, cursor:'pointer', border:'1px solid '+(form.orgType===t.id?t.color:BORDER), background:form.orgType===t.id?t.color+'15':CARD, textAlign:'left', transition:'all .2s' }}>
                          <div style={{ fontSize:22, marginBottom:6 }}>{t.icon}</div>
                          <div style={{ fontSize:12, fontWeight:700, color:form.orgType===t.id?t.color:TEXT }}>{t.label}</div>
                          <div style={{ fontSize:10, color:MUTED, marginTop:3, lineHeight:1.4 }}>{t.desc}</div>
                        </button>
                      ))}
                    </div>

                    {/* Demand */}
                    <div style={{ fontSize:10, color:'#F97316', fontFamily:'JetBrains Mono, monospace', marginBottom:8 }}>
                      🏢 DEMAND SIDE — Acheteurs de crédits carbone
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8 }}>
                      {DEMAND_TYPES.map(t => (
                        <button key={t.id} type="button" onClick={() => set('orgType', t.id)}
                          style={{ padding:'12px 14px', borderRadius:10, cursor:'pointer', border:'1px solid '+(form.orgType===t.id?t.color:BORDER), background:form.orgType===t.id?t.color+'15':CARD, textAlign:'left', transition:'all .2s', display:'flex', gap:10, alignItems:'flex-start' }}>
                          <span style={{ fontSize:20, flexShrink:0 }}>{t.icon}</span>
                          <div>
                            <div style={{ fontSize:12, fontWeight:700, color:form.orgType===t.id?t.color:TEXT }}>{t.label}</div>
                            <div style={{ fontSize:10, color:MUTED, marginTop:2, lineHeight:1.4 }}>{t.desc}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 2A: Premier projet (Supply) ────────────────────────── */}
              {step === 2 && isSupply && (
                <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                  <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                    <span style={{ fontSize:24 }}>{selectedType?.icon}</span>
                    <div>
                      <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:18, fontWeight:800, margin:0, color:TEXT }}>Premier projet</h2>
                      <div style={{ fontSize:11, color:MUTED }}>Optionnel — vous pouvez l'ajouter plus tard</div>
                    </div>
                  </div>
                  <div>
                    <Label>NOM DU PROJET</Label>
                    <Input placeholder="Centrale Solaire Korhogo 50MW" value={form.projectName} onChange={(e:any) => set('projectName', e.target.value)} autoFocus/>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    <div>
                      <Label>TYPE DE PROJET</Label>
                      <Select value={form.projectType} onChange={(e:any) => set('projectType', e.target.value)}>
                        {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </Select>
                    </div>
                    <div>
                      <Label>PUISSANCE INSTALLÉE (MW)</Label>
                      <Input type="number" placeholder="50" value={form.projectMW} onChange={(e:any) => set('projectMW', e.target.value)}/>
                    </div>
                  </div>
                  <div>
                    <Label>PAYS DU PROJET</Label>
                    <Select value={form.projectCountry || form.orgCountry} onChange={(e:any) => set('projectCountry', e.target.value)}>
                      {COUNTRIES_AFRICA.map(c => <option key={c} value={c}>{c}</option>)}
                    </Select>
                  </div>
                  {form.projectMW && (
                    <div style={{ padding:'12px 16px', background:'rgba(0,255,148,0.06)', border:'1px solid rgba(0,255,148,0.15)', borderRadius:10, fontSize:12, color:'#00FF94', lineHeight:1.8 }}>
                      💡 Estimation pour <strong>{form.projectMW} MW</strong> solaire :<br/>
                      <span style={{ color:'#E8EFF6' }}>
                        ~{Math.round(parseFloat(form.projectMW||'0') * 8760 * 0.85 * 0.547 * 0.92).toLocaleString()} tCO₂e/an
                        · ~${Math.round(parseFloat(form.projectMW||'0') * 8760 * 0.85 * 0.547 * 0.92 * 12).toLocaleString()}/an
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 2B: Profil carbone (Demand) ────────────────────────── */}
              {step === 2 && isDemand && (
                <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                  <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                    <span style={{ fontSize:24 }}>{selectedType?.icon}</span>
                    <div>
                      <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:18, fontWeight:800, margin:0, color:TEXT }}>Profil carbone</h2>
                      <div style={{ fontSize:11, color:MUTED }}>Pour personnaliser vos recommandations — optionnel</div>
                    </div>
                  </div>

                  {/* Champs selon le type demand */}
                  {(form.orgType === 'CORPORATE_VOLUNTARY' || form.orgType === 'STRATEGIC_NETZERO' || form.orgType === 'FINANCIAL') && (
                    <>
                      <div>
                        <Label>SECTEUR D'ACTIVITÉ</Label>
                        <Select value={form.sector} onChange={(e:any) => set('sector', e.target.value)}>
                          <option value="">Sélectionner</option>
                          {['ENERGY','MANUFACTURING','TRANSPORT','FINANCE','TECH','AGRI','MINING','CONSTRUCTION','RETAIL','HEALTHCARE','OTHER'].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </Select>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                        <div>
                          <Label>ÉMISSIONS TOTALES (tCO₂e/an)</Label>
                          <Input type="number" placeholder="50000" value={form.annualEmissions} onChange={(e:any) => set('annualEmissions', e.target.value)}/>
                        </div>
                        <div>
                          <Label>BUDGET CARBONE (USD/an)</Label>
                          <Input type="number" placeholder="600000" value={form.annualBudget} onChange={(e:any) => set('annualBudget', e.target.value)}/>
                        </div>
                        <div>
                          <Label>CRÉDITS NÉCESSAIRES (tCO₂e/an)</Label>
                          <Input type="number" placeholder="10000" value={form.annualVolume} onChange={(e:any) => set('annualVolume', e.target.value)}/>
                        </div>
                        <div>
                          <Label>TITRE DU RESPONSABLE ESG</Label>
                          <Input placeholder="Chief Sustainability Officer" value={form.contactTitle} onChange={(e:any) => set('contactTitle', e.target.value)}/>
                        </div>
                      </div>
                    </>
                  )}

                  {form.orgType === 'COMPLIANCE_CBAM' && (
                    <>
                      <div style={{ padding:'12px 16px', background:'rgba(249,115,22,0.08)', border:'1px solid rgba(249,115,22,0.2)', borderRadius:10, fontSize:12, color:'#F97316', lineHeight:1.7 }}>
                        🇪🇺 Le CBAM (Carbon Border Adjustment Mechanism) entre en vigueur progressivement. PANGEA CARBON peut vous aider à réduire votre exposition via des crédits volontaires certifiés.
                      </div>
                      <div>
                        <Label>SECTEUR(S) CBAM CONCERNÉS</Label>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
                          {CBAM_SECTORS.map(s => {
                            const sel = form.cbamSectors.includes(s);
                            return (
                              <button key={s} type="button" onClick={() => set('cbamSectors', sel ? form.cbamSectors.filter(x => x !== s) : [...form.cbamSectors, s])}
                                style={{ padding:'8px', borderRadius:8, border:'1px solid '+(sel?'rgba(249,115,22,0.5)':BORDER), background:sel?'rgba(249,115,22,0.1)':CARD, color:sel?'#F97316':MUTED, fontSize:11, cursor:'pointer' }}>
                                {s}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                        <div>
                          <Label>EXPORTS VERS UE (USD/an)</Label>
                          <Input type="number" placeholder="5000000" value={form.cbamExportsToEU} onChange={(e:any) => set('cbamExportsToEU', e.target.value)}/>
                        </div>
                        <div>
                          <Label>BUDGET CARBONE (USD/an)</Label>
                          <Input type="number" placeholder="300000" value={form.annualBudget} onChange={(e:any) => set('annualBudget', e.target.value)}/>
                        </div>
                      </div>
                    </>
                  )}

                  {form.orgType === 'COMPLIANCE_CORSIA' && (
                    <>
                      <div style={{ padding:'12px 16px', background:'rgba(252,211,77,0.08)', border:'1px solid rgba(252,211,77,0.2)', borderRadius:10, fontSize:12, color:'#FCD34D', lineHeight:1.7 }}>
                        ✈️ CORSIA (Carbon Offsetting Scheme for International Aviation) — PANGEA CARBON offre des crédits CORSIA-eligible certifiés Verra/Gold Standard.
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                        <div>
                          <Label>TAILLE DE FLOTTE (avions)</Label>
                          <Input type="number" placeholder="12" value={form.corsiaFleetSize} onChange={(e:any) => set('corsiaFleetSize', e.target.value)}/>
                        </div>
                        <div>
                          <Label>VOLUME CRÉDITS (tCO₂e/an)</Label>
                          <Input type="number" placeholder="50000" value={form.annualVolume} onChange={(e:any) => set('annualVolume', e.target.value)}/>
                        </div>
                      </div>
                      <div>
                        <Label>RÉGIONS DE ROUTES (optionnel)</Label>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                          {CORSIA_REGIONS.map(r => {
                            const sel = form.corsiaRoutes.includes(r);
                            return (
                              <button key={r} type="button" onClick={() => {
                                const prev = form.corsiaRoutes ? form.corsiaRoutes.split(',') : [];
                                const next = sel ? prev.filter(x => x !== r) : [...prev, r];
                                set('corsiaRoutes', next.join(','));
                              }} style={{ padding:'6px 12px', borderRadius:8, border:'1px solid '+(sel?'rgba(252,211,77,0.5)':BORDER), background:sel?'rgba(252,211,77,0.1)':CARD, color:sel?'#FCD34D':MUTED, fontSize:11, cursor:'pointer' }}>
                                {r}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── STEP 3: Plan ─────────────────────────────────────────────── */}
              {step === 3 && (
                <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                  <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:18, fontWeight:800, margin:0, color:TEXT }}>Choisissez votre plan</h2>
                  <div style={{ fontSize:12, color:MUTED }}>Commencez avec l'essai gratuit — upgrade à tout moment.</div>

                  {[
                    { id:'TRIAL',      label:'Trial gratuit', price:'$0',    period:'14 jours',   badge:'', color:'#4A6278',
                      features: isSupply
                        ? ['3 projets · 50 MW','MRV Calculator','Africa Map','1 clé API']
                        : ['Profil acheteur','Carbon Desk','CBAM Calculator','1 clé API'] },
                    { id:'STARTER',    label:'Starter',       price:'$299',  period:'/mois',     badge:'', color:'#38BDF8',
                      features: isSupply
                        ? ['10 projets · 500 MW','PDF Reports','Marketplace','Credit Pipeline','5 clés API']
                        : ['Marketplace acheteur','PDF Reports','GHG Audit','Seller Portal','5 clés API'] },
                    { id:'GROWTH',     label:'Growth',        price:'$799',  period:'/mois',     badge:'POPULAIRE', color:'#00FF94',
                      features: isSupply
                        ? ['50 projets · 5000 MW','AI Assistant','Carbon Tax Engine','dMRV Satellite','20 clés API']
                        : ['AI Carbon Intelligence','Forward Contracts','Carbon Tax Engine','Analytics','20 clés API'] },
                    { id:'ENTERPRISE', label:'Enterprise',    price:'Sur devis', period:'',      badge:'', color:'#A78BFA',
                      features: ['Projets illimités','White Label','SSO / SAML','Support dédié','API illimitée'] },
                  ].map(plan => (
                    <div key={plan.id} onClick={() => set('plan', plan.id)}
                      style={{ padding:'18px 20px', borderRadius:12, border:'1px solid '+(form.plan===plan.id?plan.color:BORDER), background:form.plan===plan.id?plan.color+'10':CARD, cursor:'pointer', transition:'all .2s', position:'relative' }}>
                      {plan.badge && (
                        <div style={{ position:'absolute', top:-10, right:16, fontSize:9, padding:'3px 10px', background:plan.color, color:'#080B0F', borderRadius:20, fontFamily:'JetBrains Mono, monospace', fontWeight:700 }}>{plan.badge}</div>
                      )}
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                        <div>
                          <div style={{ fontSize:14, fontWeight:700, color:form.plan===plan.id?plan.color:TEXT }}>{plan.label}</div>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          <span style={{ fontSize:18, fontWeight:800, color:plan.color, fontFamily:'Syne, sans-serif' }}>{plan.price}</span>
                          {plan.period && <span style={{ fontSize:11, color:MUTED }}> {plan.period}</span>}
                        </div>
                      </div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:'4px 14px' }}>
                        {plan.features.map(f => (
                          <span key={f} style={{ fontSize:11, color:form.plan===plan.id?TEXT:'#8FA3B8' }}>
                            <span style={{ color:plan.color }}>→</span> {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Navigation ───────────────────────────────────────────────── */}
              <div style={{ display:'flex', gap:10, marginTop:24 }}>
                {step > 0 && (
                  <button type="button" onClick={back}
                    style={{ padding:'12px 20px', borderRadius:9, border:'1px solid '+BORDER, background:'transparent', color:MUTED, cursor:'pointer', fontSize:13 }}>
                    ← Retour
                  </button>
                )}
                {step < 3 ? (
                  <button type="button" onClick={next}
                    style={{ flex:1, padding:'13px', borderRadius:9, border:'1px solid rgba(0,255,148,0.35)', background:'rgba(0,255,148,0.1)', color:GREEN, cursor:'pointer', fontSize:14, fontWeight:800, fontFamily:'Syne, sans-serif' }}>
                    Continuer →
                  </button>
                ) : (
                  <button type="button" onClick={submit} disabled={loading}
                    style={{ flex:1, padding:'13px', borderRadius:9, border:'1px solid '+(loading?BORDER:'rgba(0,255,148,0.35)'), background:loading?CARD:'rgba(0,255,148,0.12)', color:loading?MUTED:GREEN, cursor:loading?'wait':'pointer', fontSize:14, fontWeight:800, fontFamily:'Syne, sans-serif' }}>
                    {loading ? '⟳ Création du compte...' : '🚀 Créer mon compte'}
                  </button>
                )}
              </div>

              <div style={{ textAlign:'center', marginTop:16, fontSize:11, color:MUTED, lineHeight:1.8 }}>
                En créant un compte, vous acceptez nos <a href="/legal" style={{ color:MUTED }}>CGU</a> · Données protégées · PANGEA CARBON Africa<br/>
                Déjà un compte ? <a href="/auth/login" style={{ color:GREEN }}>Se connecter</a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}