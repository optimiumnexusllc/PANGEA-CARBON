'use client';
import { useLang } from '@/lib/lang-context';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL;

const STEPS = [
  { id: 'account', label: 'Votre compte' },
  { id: 'org', label: 'Votre organisation' },
  { id: 'project', label: 'Premier projet' },
  { id: 'plan', label: 'Choisir un plan' },
];

const PLANS = [
  { id: 'trial', name: 'Trial gratuit', price: '$0', duration: '14 jours', color: '#4A6278', features: ['5 projets', '50 MW', 'Toutes les features'] },
  { id: 'starter', name: 'Starter', price: '$299/mois', duration: 'mensuel', color: '#38BDF8', features: ['5 projets', '50 MW', 'MRV + PDF', '2 users'] },
  { id: 'pro', name: 'Pro', price: '$799/mois', duration: 'mensuel', color: '#00FF94', features: ['Illimité', 'Equipment API', 'AI Assistant', '10 users'], highlight: true },
];

export default function SignupPage() {
  const { t, lang } = useLang();
  const L = (en, fr) => lang === 'fr' ? fr : en;
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    orgName: '', orgCountry: '', orgType: 'EPC',
    projectName: '', projectType: 'SOLAR', projectMW: '',
    plan: 'trial',
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const next = () => {
    setError('');
    if (step === 0 && (!form.name || !form.email || !form.password)) { setError('Tous les champs sont requis'); return; }
    if (step === 1 && !form.orgName) { setError('Nom de l\'organisation requis'); return; }
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };

  const submit = async () => {
    setLoading(true); setError('');
    try {
      // 1. Créer le compte
      const regRes = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password, organization: form.orgName }),
      });
      if (!regRes.ok) { const e = await regRes.json(); throw new Error(e.error); }
      const { accessToken, refreshToken, user } = await regRes.json();
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      // 2. Créer le premier projet si renseigné
      if (form.projectName && form.projectMW) {
        await fetch(`${API}/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({
            name: form.projectName, type: form.projectType,
            country: form.orgCountry || 'Côte d\'Ivoire', countryCode: 'CI',
            installedMW: parseFloat(form.projectMW),
            startDate: new Date().toISOString().split('T')[0],
          }),
        });
      }

      // 3. Si plan payant → Stripe checkout
      if (form.plan !== 'trial') {
        const checkRes = await fetch(`${API}/billing/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ plan: form.plan }),
        });
        const { url } = await checkRes.json();
        if (url) { window.location.href = url; return; }
      }

      router.push(`/auth/check-email?email=${encodeURIComponent(form.email)}`);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const Label = ({ children }: any) => (
    <label style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{children}</label>
  );
  const Input = ({ type = 'text', placeholder, value, onChange, ...props }: any) => (
    <input type={type} placeholder={placeholder} value={value} onChange={onChange} {...props}
      style={{ width: '100%', background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '10px 14px', fontSize: 14, boxSizing: 'border-box', outline: 'none', fontFamily: 'Inter, sans-serif' }}
      onFocus={e => e.target.style.borderColor = 'rgba(0,255,148,0.4)'}
      onBlur={e => e.target.style.borderColor = '#1E2D3D'}/>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#080B0F', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 520 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <a href="/landing" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(0,255,148,0.15)', border: '1px solid rgba(0,255,148,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⬡</div>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18, color: '#E8EFF6' }}>PANGEA CARBON</span>
          </a>
          <div style={{ fontSize: 13, color: '#4A6278', marginTop: 8 }}>Créez votre compte — 14 jours gratuits</div>
        </div>

        {/* Stepper */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
          {STEPS.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                  background: i < step ? '#00FF94' : i === step ? 'rgba(0,255,148,0.15)' : '#0D1117',
                  color: i < step ? '#080B0F' : i === step ? '#00FF94' : '#2A3F55',
                  border: `1px solid ${i < step ? '#00FF94' : i === step ? 'rgba(0,255,148,0.4)' : '#1E2D3D'}` }}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: 11, color: i === step ? '#E8EFF6' : '#4A6278', whiteSpace: 'nowrap' }}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div style={{ flex: 1, height: 1, background: i < step ? 'rgba(0,255,148,0.3)' : '#1E2D3D', margin: '0 8px' }}/>}
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div style={{ background: '#121920', border: '1px solid #1E2D3D', borderRadius: 12, padding: 28 }}>
          {error && <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 7, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#F87171' }}>{error}</div>}

          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700, margin: '0 0 4px', color: '#E8EFF6' }}>Créez votre compte</h2>
              <div><Label>Full name *</Label><Input placeholder="Dayiri Esdras" value={form.name} onChange={(e: any) => set('name', e.target.value)}/></div>
              <div><Label>Email professionnel *</Label><Input type="email" placeholder="vous@organisation.com" value={form.email} onChange={(e: any) => set('email', e.target.value)}/></div>
              <div><Label>Password *</Label><Input type="password" placeholder="8 caractères minimum" value={form.password} onChange={(e: any) => set('password', e.target.value)}/></div>
            </div>
          )}

          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700, margin: '0 0 4px', color: '#E8EFF6' }}>Votre organisation</h2>
              <div><Label>Nom de l'organisation *</Label><Input placeholder="CFAO Aeolus / SolarAfrica Mali" value={form.orgName} onChange={(e: any) => set('orgName', e.target.value)}/></div>
              <div>
                <Label>Type</Label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {['EPC', 'IPP', 'Développeur'].map(t => (
                    <button key={t} onClick={() => set('orgType', t)}
                      style={{ padding: '10px', borderRadius: 7, border: form.orgType === t ? '1px solid rgba(0,255,148,0.4)' : '1px solid #1E2D3D',
                        background: form.orgType === t ? 'rgba(0,255,148,0.08)' : '#0D1117', cursor: 'pointer',
                        color: form.orgType === t ? '#00FF94' : '#4A6278', fontSize: 13 }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div><Label>Pays principal</Label><Input placeholder="Côte d'Ivoire, Kenya, Nigeria..." value={form.orgCountry} onChange={(e: any) => set('orgCountry', e.target.value)}/></div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700, margin: '0 0 4px', color: '#E8EFF6' }}>Premier projet</h2>
              <p style={{ fontSize: 13, color: '#4A6278', margin: 0 }}>Optionnel — vous pouvez en ajouter plus tard</p>
              <div><Label>Nom du projet</Label><Input placeholder="Parc Solaire Abidjan Nord" value={form.projectName} onChange={(e: any) => set('projectName', e.target.value)}/></div>
              <div>
                <Label>Type d'énergie</Label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                  {[['SOLAR','☀️'],['WIND','💨'],['HYDRO','💧'],['BIOMASS','🌿'],['HYBRID','⚡']].map(([t, icon]) => (
                    <button key={t} onClick={() => set('projectType', t)}
                      style={{ padding: '8px 4px', borderRadius: 7, border: form.projectType === t ? '1px solid rgba(0,255,148,0.4)' : '1px solid #1E2D3D',
                        background: form.projectType === t ? 'rgba(0,255,148,0.08)' : '#0D1117', cursor: 'pointer', textAlign: 'center' }}>
                      <div style={{ fontSize: 18 }}>{icon}</div>
                      <div style={{ fontSize: 9, color: form.projectType === t ? '#00FF94' : '#4A6278', marginTop: 2 }}>{t}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div><Label>Puissance installée (MW)</Label><Input type="number" placeholder="10.5" value={form.projectMW} onChange={(e: any) => set('projectMW', e.target.value)}/></div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700, margin: '0 0 16px', color: '#E8EFF6' }}>Choisissez votre plan</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {PLANS.map(plan => (
                  <div key={plan.id} onClick={() => set('plan', plan.id)}
                    style={{ padding: '14px 16px', borderRadius: 9, border: `1px solid ${form.plan === plan.id ? plan.color : '#1E2D3D'}`,
                      background: form.plan === plan.id ? `${plan.color}08` : '#0D1117', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.15s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${plan.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {form.plan === plan.id && <div style={{ width: 8, height: 8, borderRadius: '50%', background: plan.color }}/>}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#E8EFF6' }}>{plan.name}</div>
                        <div style={{ fontSize: 11, color: '#4A6278' }}>{plan.features.join(' · ')}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: plan.color, fontFamily: 'Syne, sans-serif' }}>{plan.price}</div>
                      <div style={{ fontSize: 10, color: '#4A6278' }}>{plan.duration}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, gap: 10 }}>
            {step > 0 ? (
              <button onClick={() => setStep(s => s - 1)} style={{ background: 'transparent', border: '1px solid #1E2D3D', borderRadius: 7, color: '#4A6278', padding: '10px 16px', cursor: 'pointer', fontSize: 13 }}>← Retour</button>
            ) : (
              <a href="/auth/login" style={{ color: '#4A6278', fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>Already have an account ?</a>
            )}
            {step < STEPS.length - 1 ? (
              <button onClick={next} style={{ background: '#00FF94', color: '#080B0F', border: 'none', borderRadius: 7, padding: '10px 22px', fontWeight: 700, fontSize: 13, cursor: 'pointer', flex: 1, maxWidth: 200 }}>
                Continuer →
              </button>
            ) : (
              <button onClick={submit} disabled={loading} style={{ background: '#00FF94', color: '#080B0F', border: 'none', borderRadius: 7, padding: '10px 22px', fontWeight: 700, fontSize: 13, cursor: 'pointer', flex: 1, opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Création...' : '✓ Create my account'}
              </button>
            )}
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#2A3F55', marginTop: 16 }}>
          En créant un compte, vous acceptez nos CGU · Données protégées · PANGEA CARBON Africa
        </p>
      </div>
    </div>
  );
}
