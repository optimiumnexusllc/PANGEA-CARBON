'use client';
import { useLang } from '@/lib/lang-context';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_URL;
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('accessToken') : ''}` });
const fmt = (n: number) => n?.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) ?? '0';

const SDG_LIST = [
  { key: 'sdg7', name: 'Énergie propre', emoji: '⚡', core: true },
  { key: 'sdg13', name: 'Action climatique', emoji: '🌍', core: true },
  { key: 'sdg8', name: 'Travail décent', emoji: '💼', core: true },
  { key: 'sdg1', name: 'Pas de pauvreté', emoji: '🏘️', core: false },
  { key: 'sdg3', name: 'Bonne santé', emoji: '💊', core: false },
  { key: 'sdg5', name: 'Égalité des sexes', emoji: '⚖️', core: false },
  { key: 'sdg9', name: 'Innovation', emoji: '🏭', core: false },
  { key: 'sdg10', name: 'Inégalités réduites', emoji: '⚖️', core: false },
  { key: 'sdg11', name: 'Villes durables', emoji: '🏙️', core: false },
  { key: 'sdg15', name: 'Vie terrestre', emoji: '🌲', core: false },
];

export default function SDGPage() {
  const { t } = useLang();
  const [projects, setProjects] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [scores, setScores] = useState({});
  const [jobs, setJobs] = useState('');
  const [households, setHouseholds] = useState('');
  const [result, setResult] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const year = new Date().getFullYear();

  useEffect(() => {
    api.getProjects().then(d => { setProjects(d.projects || []); if (d.projects?.[0]) setSelected(d.projects[0].id); });
    fetch(`${API}/sdg/portfolio/summary`, { headers: h() }).then(r => r.json()).then(setSummary).catch(() => {});
  }, []);

  const submit = async () => {
    setSaving(true);
    const res = await fetch(`${API}/sdg/score`, {
      method: 'POST', headers: h(),
      body: JSON.stringify({ projectId: selected, year, sdgInputs: scores, jobsCreated: parseInt(jobs || '0'), householdsElectrified: parseInt(households || '0') })
    });
    const d = await res.json();
    setResult(d);
    setSaving(false);
  };

  const stars = result?.gsStarRating || 0;

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <a href="/dashboard/standards" style={{ fontSize: 12, color: '#4A6278', textDecoration: 'none' }}>← Carbon Hub</a>
        <div style={{ fontSize: 10, color: '#FCD34D', fontFamily: 'JetBrains Mono, monospace', margin: '8px 0 4px' }}>GOLD STANDARD · 17 SDG CO-BENEFITS SCORING</div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: '#E8EFF6', margin: 0 }}>SDG Impact Scoring</h1>
        <p style={{ fontSize: 13, color: '#4A6278', marginTop: 4 }}>Évaluez vos 17 ODD. Débloquez la certification Gold Standard et le premium prix.</p>
      </div>

      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Projets évalués', value: summary.summary?.totalProjects || 0, color: '#FCD34D' },
            { label: 'Note GS moy.', value: `${(summary.summary?.avgGsStarRating || 0).toFixed(1)}★`, color: '#FCD34D' },
            { label: 'Premium moyen', value: `$${(summary.summary?.avgPremiumUSD || 0).toFixed(0)}/t`, color: '#00FF94' },
            { label: 'Emplois créés', value: fmt(summary.summary?.totalJobsCreated || 0), color: '#38BDF8' },
          ].map(k => (
            <div key={k.label} style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>{k.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: k.color, fontFamily: 'Syne, sans-serif' }}>{String(k.value)}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Scoring form */}
        <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 10, color: '#FCD34D', fontFamily: 'JetBrains Mono, monospace', marginBottom: 14 }}>ÉVALUER UN PROJET</div>
          <select value={selected} onChange={e => setSelected(e.target.value)}
            style={{ width: '100%', background: '#121920', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '9px', fontSize: 13, marginBottom: 16 }}>
            {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          {SDG_LIST.map(sdg => (
            <div key={sdg.key} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ fontSize: 12, color: sdg.core ? '#E8EFF6' : '#8FA3B8', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{sdg.emoji}</span> {sdg.name}
                  {sdg.core && <span style={{ fontSize: 9, background: 'rgba(252,211,77,0.15)', color: '#FCD34D', borderRadius: 3, padding: '1px 4px' }}>CORE</span>}
                </div>
                <span style={{ fontSize: 12, color: '#FCD34D', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{scores[sdg.key] || 0}/10</span>
              </div>
              <input type="range" min={0} max={10} step={0.5} value={scores[sdg.key] || 0}
                onChange={e => setScores(s => ({ ...s, [sdg.key]: parseFloat(e.target.value) }))}
                style={{ width: '100%', accentColor: '#FCD34D', cursor: 'pointer' }}/>
            </div>
          ))}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '16px 0' }}>
            {[['Emplois directs créés', jobs, setJobs], ['Foyers électrifiés', households, setHouseholds]].map(([label, val, setter]) => (
              <div key={String(label)}>
                <label style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>{label}</label>
                <input type="number" value={String(val)} onChange={(e: any) => (setter as any)(e.target.value)} placeholder="0"
                  style={{ width: '100%', background: '#121920', border: '1px solid #1E2D3D', borderRadius: 6, color: '#E8EFF6', padding: '8px 10px', fontSize: 13, boxSizing: 'border-box' as const, outline: 'none' }}/>
              </div>
            ))}
          </div>

          <button onClick={submit} disabled={saving || !selected}
            style={{ width: '100%', background: '#FCD34D', color: '#080B0F', border: 'none', borderRadius: 8, padding: '11px', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Calcul en cours...' : '🌱 Calculer le score SDG Gold Standard'}
          </button>
        </div>

        {/* Result */}
        <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 10, color: '#FCD34D', fontFamily: 'JetBrains Mono, monospace', marginBottom: 14 }}>RÉSULTAT GOLD STANDARD</div>
          {result ? (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#4A6278', marginBottom: 8 }}>CERTIFICATION GOLD STANDARD</div>
                <div style={{ fontSize: 32, marginBottom: 4 }}>{'★'.repeat(stars)}{'☆'.repeat(5 - stars)}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#FCD34D', fontFamily: 'Syne, sans-serif' }}>{stars} Étoile{stars > 1 ? 's' : ''} Gold Standard</div>
                <div style={{ fontSize: 13, color: '#4A6278', marginTop: 4 }}>Score total: {result.totalScore?.toFixed(1)}/100</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Premium par tonne', value: `+$${result.premiumUSD}/tCO₂e`, color: '#00FF94' },
                  { label: 'vs Verra standard', value: `+${((result.premiumUSD / 12) * 100).toFixed(0)}%`, color: '#FCD34D' },
                ].map(k => (
                  <div key={k.label} style={{ background: '#121920', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: '#4A6278', marginBottom: 4 }}>{k.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: k.color, fontFamily: 'Syne, sans-serif' }}>{k.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 11, color: '#4A6278', marginBottom: 8 }}>Top SDG scores :</div>
              {SDG_LIST.filter(s => (scores[s.key] || 0) >= 7).map(sdg => (
                <div key={sdg.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 12 }}>
                  <span style={{ color: '#8FA3B8' }}>{sdg.emoji} {sdg.name}</span>
                  <span style={{ color: '#FCD34D', fontFamily: 'JetBrains Mono, monospace' }}>{scores[sdg.key]}/10</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#4A6278' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
              <div>Évaluez vos SDG co-bénéfices pour calculer votre score Gold Standard et le premium de prix.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
