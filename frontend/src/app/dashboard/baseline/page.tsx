'use client';
import { useLang } from '@/lib/lang-context';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_URL;
const h = () => ({ 'Content-Type': 'application/json', Authorization: "Bearer "+(typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '')+"" });

const GRID_CONTEXT = [
  { code: 'CI', country: 'Côte d\'Ivoire', ef: 0.547, trend: '-0.8%/an', source: 'UNFCCC 2024' },
  { code: 'KE', country: 'Kenya', ef: 0.251, trend: '-2.1%/an', source: 'Kenya MRV 2024' },
  { code: 'NG', country: 'Nigeria', ef: 0.430, trend: '-0.3%/an', source: 'UNFCCC 2023' },
  { code: 'GH', country: 'Ghana', ef: 0.342, trend: '-1.2%/an', source: 'Ghana EPA 2024' },
  { code: 'SN', country: 'Sénégal', ef: 0.643, trend: '-0.5%/an', source: 'UNFCCC 2023' },
  { code: 'MA', country: 'Maroc', ef: 0.631, trend: '-3.2%/an', source: 'UNFCCC 2024' },
  { code: 'ZA', country: 'Afrique du Sud', ef: 0.797, trend: '-2.5%/an', source: 'SA NID 2024' },
  { code: 'RW', country: 'Rwanda', ef: 0.329, trend: '-1.5%/an', source: 'Rwanda REMA 2024' },
];

export default function BaselinePage() {
  const { t, lang } = useLang();
  const L = (en, fr) => lang === 'fr' ? fr : en;
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState('');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    api.getProjects().then(d => {
      setProjects(d.projects || []);
      if (d.projects?.[0]) { setSelected(d.projects[0].id); loadHistory(d.projects[0].id); }
    });
  }, []);

  const loadHistory = (id) => {
    fetch(""+(API)+"/baseline/"+(id)+"", { headers: h() })
      .then(r => r.json()).then(d => setHistory(d.assessments || [])).catch(() => {});
  };

  const runAssessment = async () => {
    if (!selected) return;
    setRunning(true); setResult(null);
    try {
      const d = await fetch(""+(API)+"/baseline/assess/"+(selected)+"", { method: 'POST', headers: h() }).then(r => r.json());
      setResult(d);
      loadHistory(selected);
    } finally { setRunning(false); }
  };

  const proj = projects.find((p) => p.id === selected);
  const gridRef = GRID_CONTEXT.find(g => g.code === proj?.countryCode);

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <a href="/dashboard/standards" style={{ fontSize: 12, color: '#4A6278', textDecoration: 'none' }}>← Carbon Hub</a>
        <div style={{ fontSize: 10, color: '#EF9F27', fontFamily: 'JetBrains Mono, monospace', margin: '8px 0 4px' }}>AI BASELINE SETTER · CLAUDE + UNFCCC + SATELLITE</div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: '#E8EFF6', margin: 0 }}>AI Baseline Setter</h1>
        <p style={{ fontSize: 13, color: '#4A6278', marginTop: 4 }}>Baseline défensible en 30 secondes. Zero site visits. Données UNFCCC officielles + validation satellite.</p>
      </div>

      {/* Grid reference table */}
      <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, marginBottom: 20, overflow: 'hidden' }}>
        <div style={{ padding: '10px 20px', background: '#121920', borderBottom: '1px solid #1E2D3D', fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>
          BASE DE DONNÉES GRID EF — UNFCCC · PANGEA CARBON DATABASE (18 PAYS AFRICAINS)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0 }}>
          {GRID_CONTEXT.map((g, i) => (
            <div key={g.code} style={{ padding: '10px 16px', borderRight: i % 4 !== 3 ? '1px solid rgba(30,45,61,0.4)' : 'none', borderBottom: i < 4 ? '1px solid rgba(30,45,61,0.4)' : 'none',
              background: g.code === proj?.countryCode ? 'rgba(239,159,39,0.06)' : 'transparent' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', padding: '1px 5px', background: g.code === proj?.countryCode ? 'rgba(239,159,39,0.2)' : 'rgba(74,98,120,0.3)', borderRadius: 3, color: g.code === proj?.countryCode ? '#EF9F27' : '#8FA3B8' }}>{g.code}</span>
                <span style={{ fontSize: 11, color: g.code === proj?.countryCode ? '#E8EFF6' : '#4A6278' }}>{g.country}</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: g.code === proj?.countryCode ? '#EF9F27' : '#8FA3B8', fontFamily: 'JetBrains Mono, monospace' }}>{g.ef} <span style={{ fontSize: 10, fontWeight: 400, color: '#4A6278' }}>tCO₂/MWh</span></div>
              <div style={{ fontSize: 10, color: '#2A3F55' }}>{g.trend} · {g.source}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Assessment trigger */}
        <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 10, color: '#EF9F27', fontFamily: 'JetBrains Mono, monospace', marginBottom: 14 }}>LANCER L'ÉVALUATION IA</div>

          <label style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Project cible</label>
          <select value={selected} onChange={e => { setSelected(e.target.value); loadHistory(e.target.value); setResult(null); }}
            style={{ width: '100%', background: '#121920', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '10px', fontSize: 13, marginBottom: 20 }}>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.countryCode} · {p.installedMW} MW</option>)}
          </select>

          {/* Methodology info */}
          <div style={{ background: '#121920', borderRadius: 8, padding: 14, marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: '#EF9F27', marginBottom: 10 }}>ACM0002 METHODOLOGY — Combined Margin</div>
            {[
              ['Sources données', 'UNFCCC NID + IEA + Satellite Sentinel-2'],
              ['Méthode de calcul', 'Operating Margin + Build Margin (50/50)'],
              ['Intervalle de confiance', '90% (standard Verra)'],
              ['Validité', '2 ans (renouvelable)'],
              ['Terrain requis', 'Zero site visits ✓'],
            ].map(([k, v]) => (
              <div key={String(k)} style={{ display: 'flex', gap: 10, marginBottom: 6, fontSize: 12 }}>
                <span style={{ color: '#4A6278', minWidth: 150 }}>{k}</span>
                <span style={{ color: '#E8EFF6' }}>{v}</span>
              </div>
            ))}
          </div>

          {gridRef && (
            <div style={{ background: 'rgba(239,159,39,0.06)', border: '1px solid rgba(239,159,39,0.2)', borderRadius: 8, padding: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#EF9F27', marginBottom: 6 }}>EF RÉFÉRENCE — {gridRef.country}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#EF9F27', fontFamily: 'Syne, sans-serif' }}>{gridRef.ef} tCO₂/MWh</div>
              <div style={{ fontSize: 11, color: '#4A6278', marginTop: 3 }}>Tendance: {gridRef.trend} · Source: {gridRef.source}</div>
            </div>
          )}

          <button onClick={runAssessment} disabled={running || !selected}
            style={{ width: '100%', background: running ? '#1E2D3D' : '#EF9F27', color: running ? '#4A6278' : '#080B0F',
              border: 'none', borderRadius: 8, padding: '13px', fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s' }}>
            {running ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(74,98,120,0.3)', borderTopColor: '#4A6278', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/>
                Analyse IA en cours...
              </span>
            ) : '🤖 Start l\'évaluation IA baseline'}
          </button>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>

        {/* Result */}
        <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 10, color: '#EF9F27', fontFamily: 'JetBrains Mono, monospace', marginBottom: 14 }}>RÉSULTAT — AI ASSESSMENT</div>

          {result ? (
            <div>
              {/* Main result */}
              <div style={{ background: 'rgba(239,159,39,0.06)', border: '1px solid rgba(239,159,39,0.2)', borderRadius: 10, padding: 18, marginBottom: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#EF9F27', marginBottom: 8 }}>BASELINE EF RECOMMANDÉ</div>
                <div style={{ fontSize: 40, fontWeight: 800, color: '#EF9F27', fontFamily: 'Syne, sans-serif' }}>{result.recommendedEF}</div>
                <div style={{ fontSize: 13, color: '#4A6278' }}>tCO₂/MWh · Méthode ACM0002 Combined Margin</div>
                {result.comparison?.difference !== 0 && (
                  <div style={{ fontSize: 12, color: result.comparison?.difference > 0 ? '#00FF94' : '#F87171', marginTop: 6 }}>
                    {result.comparison?.difference > 0 ? '↑' : '↓'} {Math.abs(result.comparison?.difference || 0).toFixed(4)} vs baseline actuel
                    {result.comparison?.impactOnCredits ? ` = ${result.comparison.impactOnCredits > 0 ? '+' : ''}${Math.round(result.comparison.impactOnCredits)} tCO₂e` : ''}
                  </div>
                )}
              </div>

              {/* Grid data */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                {[
                  ['Source', result.gridData?.source],
                  ['Tendance réseau', `${result.gridData?.trend}%/an`],
                  ['Incertitude', `±${(result.gridData?.uncertainty * 100).toFixed(0)}%`],
                  ['Validité', result.assessment?.validUntil ? new Date(result.assessment.validUntil).getFullYear() : '—'],
                ].map(([k, v]) => (
                  <div key={String(k)} style={{ background: '#121920', borderRadius: 6, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 2 }}>{k}</div>
                    <div style={{ fontSize: 12, color: '#E8EFF6' }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* AI analysis */}
              {result.aiAnalysis && (
                <div style={{ background: '#121920', borderRadius: 8, padding: 14, marginBottom: 14 }}>
                  <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>🤖</span> ANALYSE CLAUDE AI
                  </div>
                  <p style={{ fontSize: 12, color: '#8FA3B8', lineHeight: 1.7, margin: 0 }}>{result.aiAnalysis}</p>
                </div>
              )}

              {/* Actions */}
              {result.assessment?.recommendedActions?.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: '#EF9F27', marginBottom: 8 }}>ACTIONS RECOMMANDÉES</div>
                  {result.assessment.recommendedActions.map((a, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 12 }}>
                      <span style={{ color: '#EF9F27', flexShrink: 0 }}>→</span>
                      <span style={{ color: '#8FA3B8' }}>{a}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: '#4A6278' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
              <div style={{ fontSize: 14, color: '#E8EFF6', marginBottom: 8 }}>Ready pour l'évaluation IA</div>
              <div style={{ fontSize: 13 }}>Sélectionnez un projet et lancez l'analyse. Claude va consulter la base UNFCCC, analyser les données satellite et définir un baseline défensible.</div>
              <div style={{ marginTop: 16, fontSize: 11, color: '#2A3F55' }}>Validé: Verra ACM0002 · Gold Standard · Article 6</div>
            </div>
          )}
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, marginTop: 20, overflow: 'hidden' }}>
          <div style={{ padding: '10px 20px', background: '#121920', borderBottom: '1px solid #1E2D3D', fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>
            HISTORIQUE DES BASELINES — {history.length} ÉVALUATION{history.length > 1 ? 'S' : ''}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              {['Date', 'Baseline EF', 'Méthode', 'Sources', 'Satellite', 'Valide jusqu\'au'].map(col => (
                <th key={col} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', borderBottom: '1px solid #1E2D3D' }}>{col}</th>
              ))}
            </tr></thead>
            <tbody>
              {history.map((a) => (
                <tr key={a.id} style={{ borderBottom: '1px solid rgba(30,45,61,0.4)' }}>
                  <td style={{ padding: '9px 14px', fontSize: 12, color: '#8FA3B8', fontFamily: 'JetBrains Mono, monospace' }}>{new Date(a.assessmentDate).toLocaleDateString('en-US')}</td>
                  <td style={{ padding: '9px 14px', fontSize: 14, color: '#EF9F27', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{a.baselineEF}</td>
                  <td style={{ padding: '9px 14px', fontSize: 11, color: '#4A6278' }}>{a.methodology}</td>
                  <td style={{ padding: '9px 14px', fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>{(a.dataSourcesUsed || []).join(', ')}</td>
                  <td style={{ padding: '9px 14px' }}><span style={{ fontSize: 10, color: a.satelliteValidated ? '#00FF94' : '#4A6278' }}>{a.satelliteValidated ? '✓ Validé' : '—'}</span></td>
                  <td style={{ padding: '9px 14px', fontSize: 11, color: '#4A6278' }}>{a.validUntil ? new Date(a.validUntil).toLocaleDateString('en-US') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}