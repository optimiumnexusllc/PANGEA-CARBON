'use client';
import { PlanLimitModal } from '@/components/PlanGate';
import { useLang } from '@/lib/lang-context';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { AFRICAN_COUNTRIES } from '@/lib/african-countries';

const STEPS = ['Informations', 'Localisation', 'Paramètres MRV', 'Confirmation'];

export default function NewProjectPage() {
  const { t, lang } = useLang();
  const L = (en, fr) => lang === 'fr' ? fr : en;
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [countries, setCountries] = useState(AFRICAN_COUNTRIES); // Static fallback
  const [loading, setLoading] = useState(false);
  const [planLimitError, setPlanLimitError] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '', description: '', type: 'SOLAR',
    country: '', countryCode: '', latitude: '', longitude: '',
    installedMW: '', startDate: new Date().toISOString().split('T')[0],
    standard: 'Verra VCS', baselineEF: '',
  });

  useEffect(() => {
    // Charger depuis l'API en arrière-plan (enrichissement, maj EF)
    // La liste statique est déjà disponible immédiatement
    api.getCountries()
      .then(data => { if (Array.isArray(data) && data.length > 0) setCountries(data); })
      .catch(() => { /* Utiliser la liste statique AFRICAN_COUNTRIES */ });
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const selectCountry = (code) => {
    const c = countries.find((x) => x.code === code);
    if (c) { set('countryCode', c.code); set('country', c.name); set('baselineEF', String(c.ef)); }
  };

  const submit = async () => {
    setPlanLimitError(null);
    setLoading(true); setError('');
    try {
      const project = await api.createProject({
        ...form,
        installedMW: parseFloat(form.installedMW),
        baselineEF: parseFloat(form.baselineEF),
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
      });
      router.push('/dashboard/projects/'+project.id);
    } catch(e) {
      const err = e as any;
      if (err.status === 402 || err.code === 'PLAN_PROJECT_LIMIT' || err.code === 'PLAN_MW_LIMIT' || err.code === 'PLAN_REQUIRED' || err.code === 'PLAN_LIMIT_REACHED') {
        setPlanLimitError({ code: err.code, currentPlan: err.currentPlan, requiredPlan: err.requiredPlan, max: err.maxProjects || err.max, current: err.currentCount || err.current, error: err.message || err.error });
      } else {
        setError(err.message || 'Error creating project');
      }
    } finally { setLoading(false); }
  };

  const Label = ({ children }: any) => (
    <label style={{ fontSize: 11, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
      {children}
    </label>
  );

  return (
    <div className="p-6" style={{ maxWidth: 720, margin: '0 auto' }}>
      {planLimitError && <PlanLimitModal error={planLimitError} onClose={()=>setPlanLimitError(null)}/>}
      {/* Header */}
      <div className="mb-8">
        <a href="/dashboard/projects" style={{ fontSize: 12, color: '#4A6278', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
          ← Back aux projets
        </a>
        <h1 className="text-2xl font-semibold mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>New project MRV</h1>
        <p style={{ fontSize: 13, color: '#4A6278' }}>Enregistrez un projet d'énergie renouvelable pour commencer à générer des crédits carbone</p>
      </div>

      {/* Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32 }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: i < step ? 'pointer' : 'default' }}
              onClick={() => i < step && setStep(i)}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace',
                background: i < step ? '#00FF94' : i === step ? 'rgba(0,255,148,0.15)' : '#0D1117',
                color: i < step ? '#080B0F' : i === step ? '#00FF94' : '#4A6278',
                border: i === step ? '1px solid rgba(0,255,148,0.4)' : '1px solid #1E2D3D' }}>
                {i < step ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 12, color: i === step ? '#E8EFF6' : '#4A6278', whiteSpace: 'nowrap' }}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div style={{ flex: 1, height: 1, background: i < step ? 'rgba(0,255,148,0.3)' : '#1E2D3D', margin: '0 12px' }}/>}
          </div>
        ))}
      </div>

      {/* Form Steps */}
      <div className="card animate-slide-up" style={{ padding: 28 }}>
        {error && <div className="badge badge-danger mb-4" style={{ width: '100%', justifyContent: 'center', padding: '8px 12px', borderRadius: 6 }}>{error}</div>}

        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <Label>Nom du projet *</Label>
              <input className="input-dark" placeholder="ex: Parc Solaire Abidjan Nord" value={form.name} onChange={e => set('name', e.target.value)}/>
            </div>
            <div>
              <Label>Description</Label>
              <textarea className="input-dark" rows={3} placeholder="Description du projet, partenaires, objectifs..." value={form.description} onChange={e => set('description', e.target.value)} style={{ resize: 'vertical' }}/>
            </div>
            <div>
              <Label>Type d'énergie *</Label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                {[['SOLAR','☀️','Solaire'],['WIND','💨','Éolien'],['HYDRO','💧','Hydraulique'],['BIOMASS','🌿','Biomasse'],['HYBRID','⚡','Hybride']].map(([t, icon, label]) => (
                  <button key={t} onClick={() => set('type', t)}
                    style={{ padding: '12px 8px', borderRadius: 8, border: form.type === t ? '1px solid rgba(0,255,148,0.4)' : '1px solid #1E2D3D',
                      background: form.type === t ? 'rgba(0,255,148,0.08)' : '#0D1117', cursor: 'pointer', textAlign: 'center' }}>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
                    <div style={{ fontSize: 11, color: form.type === t ? '#00FF94' : '#4A6278' }}>{label}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Standard de certification</Label>
              <select className="input-dark" value={form.standard} onChange={e => set('standard', e.target.value)}>
                <option>Verra VCS</option>
                <option>Gold Standard</option>
                <option>Article 6 Paris</option>
              </select>
            </div>
          </div>
        )}

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <Label>Country *</Label>
              <select className="input-dark" value={form.countryCode} onChange={e => selectCountry(e.target.value)}>
                <option value="">{countries.length === 0 ? 'Chargement...' : 'Sélectionner un pays africain'}</option>
                {['WEST','CENTRAL','EAST','SOUTH','NORTH','INDIAN'].map(region => {
                  const regionCountries = countries.filter(x => x.region === region);
                  if (!regionCountries.length) return null;
                  const regionLabel = {
                    WEST:'Afrique de l\'Ouest', CENTRAL:'Afrique Centrale',
                    EAST:'Afrique de l\'Est', SOUTH:'Afrique Australe',
                    NORTH:'Afrique du Nord', INDIAN:'Océan Indien',
                  }[region] || region;
                  return (
                    <optgroup key={region} label={regionLabel}>
                      {regionCountries.map(country => (
                        <option key={country.code} value={country.code}>
                          {country.name} — {country.ef} tCO₂/MWh ({country.source})
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
              {form.countryCode && (
                <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(0,255,148,0.05)', borderRadius: 6, border: '1px solid rgba(0,255,148,0.1)', fontSize: 12, color: '#00FF94' }}>
                  ✓ Emission Factor: {form.baselineEF} tCO₂e/MWh — Source: {countries.find(x => x.code === form.countryCode)?.source || 'UNFCCC 2024'}
                </div>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <Label>Latitude (optionnel)</Label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <input className="input-dark" type="number" step="any" placeholder="5.3600" value={form.latitude} onChange={e => set('latitude', e.target.value)} style={{ flex: 1 }}/>
                  {form.countryCode && (
                    <button type="button" onClick={async () => {
                      try {
                        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/meta/geocode/${form.countryCode), {
                          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')) }
                        });
                        if (res.ok) { const d = await res.json(); set('latitude', d.lat); set('longitude', d.lng); }
                      } catch(_e) {}
                    }}
                      style={{ background: 'rgba(0,255,148,0.1)', border: '1px solid rgba(0,255,148,0.3)', borderRadius: 7, color: '#00FF94', padding: '8px 12px', cursor: 'pointer', fontSize: 11, whiteSpace: 'nowrap', fontFamily: 'JetBrains Mono, monospace' }}>
                      📍 Auto
                    </button>
                  )}
                </div>
              </div>
              <div>
                <Label>Longitude (optionnel)</Label>
                <input className="input-dark" type="number" step="any" placeholder="-4.0083" value={form.longitude} onChange={e => set('longitude', e.target.value)}/>
              </div>
            </div>
            <div>
              <Label>Date de démarrage *</Label>
              <input className="input-dark" type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)}/>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <Label>Installed capacity (MW) *</Label>
              <input className="input-dark" type="number" step="0.001" min="0.001" placeholder="10.5" value={form.installedMW} onChange={e => set('installedMW', e.target.value)}/>
              {form.installedMW && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#4A6278' }}>
                  Annual production estimée (85% CF) : <span style={{ color: '#38BDF8' }}>{(parseFloat(form.installedMW) * 8760 * 0.85).toFixed(0)} MWh/an</span>
                </div>
              )}
            </div>
            <div>
              <Label>Facteur d'émission grille (tCO₂e/MWh)</Label>
              <input className="input-dark" type="number" step="0.001" placeholder="Auto-rempli depuis le pays" value={form.baselineEF} onChange={e => set('baselineEF', e.target.value)}/>
              <div style={{ marginTop: 6, fontSize: 11, color: '#4A6278' }}>Verra ACM0002 — Combined Margin factor</div>
            </div>
            {form.installedMW && form.baselineEF && (
              <div style={{ background: '#0D1117', border: '1px solid rgba(0,255,148,0.15)', borderRadius: 8, padding: 16 }}>
                <div style={{ fontSize: 11, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 12 }}>ESTIMATION ANNUELLE</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  {[
                    ['Production', (parseFloat(form.installedMW) * 8760 * 0.85).toFixed(0) + ' MWh', '#38BDF8'],
                    ['Net credits', ((parseFloat(form.installedMW) * 8760 * 0.85) * parseFloat(form.baselineEF) * 0.92).toFixed(0) + ' tCO₂e', '#00FF94'],
                    ['Revenus est.', '$' + (((parseFloat(form.installedMW) * 8760 * 0.85) * parseFloat(form.baselineEF) * 0.92) * 12).toFixed(0), '#FCD34D'],
                  ].map(([label, value, color]) => (
                    <div key={label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color, fontFamily: 'Syne, sans-serif' }}>{value}</div>
                      <div style={{ fontSize: 10, color: '#4A6278', marginTop: 2 }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div>
            <div style={{ fontSize: 13, color: '#4A6278', marginBottom: 20 }}>Vérifiez les informations avant création</div>
            {[
              ['Nom', form.name], ['Type', form.type], ['Country', `${form.country} (${form.countryCode})`],
              ['Puissance', `${form.installedMW} MW`], ['Facteur EF', `${form.baselineEF} tCO₂e/MWh`],
              ['Standard', form.standard], ['Démarrage', form.startDate],
            ].map(([k, v]) => v && (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #1E2D3D' }}>
                <span style={{ fontSize: 12, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>{k}</span>
                <span style={{ fontSize: 13, color: '#E8EFF6', fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
          <button className="btn-ghost" onClick={() => step > 0 && setStep(step - 1)} style={{ opacity: step === 0 ? 0.3 : 1 }} disabled={step === 0}>
            ← Précédent
          </button>
          {step < 3 ? (
            <button className="btn-primary" onClick={() => setStep(step + 1)}
              disabled={step === 0 && !form.name || step === 1 && !form.countryCode || step === 2 && (!form.installedMW || !form.baselineEF)}>
              Next →
            </button>
          ) : (
            <button className="btn-primary" onClick={submit} disabled={loading}>
              {loading ? 'Création...' : '✓ Create le projet'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
