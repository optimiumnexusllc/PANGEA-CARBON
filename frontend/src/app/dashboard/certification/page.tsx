'use client';
import { useLang } from '@/lib/lang-context';
import { useEffect, useState } from 'react';
import { fetchAuthJson } from '@/lib/fetch-auth';

const TIER_CONFIG = {
  VERIFIED:     { color: '#38BDF8', glow: 'rgba(56,189,248,0.3)',   icon: 'V', rank: 1 },
  CERTIFIED:    { color: '#00FF94', glow: 'rgba(0,255,148,0.3)',    icon: 'C', rank: 2 },
  ELITE:        { color: '#A78BFA', glow: 'rgba(167,139,250,0.3)',  icon: 'E', rank: 3 },
  ELITE_CORSIA: { color: '#FCD34D', glow: 'rgba(252,211,77,0.3)',   icon: 'G', rank: 4 },
};

function CertificationPage() {
  const [projects, setProjects] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(null);
  const [cert, setCert] = useState(null);
  const [issuing, setIssuing] = useState(false);
  const [tab, setTab] = useState('portfolio');
  const [msg, setMsg] = useState(null);
  const [form, setForm] = useState({ standards: [], acmiCompliant: false, corsiaEligible: false, auditorName: '', auditorUrl: '' });

  useEffect(() => {
    fetchAuthJson('/auth/me').then(u => {
      fetchAuthJson('/projects').then(d => setProjects(d.projects || []));
    }).catch(console.error);
    fetchAuthJson('/certification/portfolio').then(setPortfolio).catch(console.error);
  }, []);

  function flash(text, ok) { setMsg({ text, ok: ok !== false }); setTimeout(() => setMsg(null), 5000); }

  async function selectProject(p) {
    setSelected(p);
    setScore(null);
    setCert(null);
    try {
      const [s, c] = await Promise.all([
        fetchAuthJson('/certification/project/' + p.id + '/score').catch(() => null),
        fetchAuthJson('/certification/project/' + p.id).catch(() => null),
      ]);
      setScore(s);
      setCert(c);
    } catch(_e) {}
  }

  async function issueCert() {
    if (!selected) return;
    setIssuing(true);
    try {
      const d = await fetchAuthJson('/certification/project/' + selected.id + '/issue', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setCert(d.certification);
      setScore(prev => ({ ...prev, tier: d.tier, tierInfo: d.tierInfo }));
      fetchAuthJson('/certification/portfolio').then(setPortfolio).catch(console.error);
      flash('Certification emise avec succes — Tier: ' + d.tier);
    } catch (e) { flash(e.message, false); }
    finally { setIssuing(false); }
  }

  async function revokeCert() {
    if (!selected || !cert) return;
    try {
      await fetchAuthJson('/certification/project/' + selected.id + '/revoke', { method: 'DELETE' });
      setCert(prev => ({ ...prev, revokedAt: new Date().toISOString() }));
      flash('Certification revoquee');
    } catch (e) { flash(e.message, false); }
  }

  function toggleStandard(s) {
    setForm(prev => ({
      ...prev,
      standards: prev.standards.includes(s) ? prev.standards.filter(x => x !== s) : [...prev.standards, s]
    }));
  }

  const tierCfg = score ? (TIER_CONFIG[score.tier] || TIER_CONFIG.VERIFIED) : null;

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, color: '#00FF94', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4, letterSpacing: '0.15em' }}>
          PANGEA CARBON · CERTIFICATION ENGINE · AFRICA
        </div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800, color: '#E8EFF6', margin: 0 }}>
          Certification Lab
        </h1>
        <p style={{ fontSize: 13, color: '#4A6278', marginTop: 6 }}>
          Emettez des certifications PANGEA pour vos projets · ACMI · CORSIA · Gold Standard · Verra
        </p>
      </div>

      {msg && (
        <div style={{ background: msg.ok ? 'rgba(0,255,148,0.08)' : 'rgba(248,113,113,0.08)', border: '1px solid', borderColor: msg.ok ? 'rgba(0,255,148,0.25)' : 'rgba(248,113,113,0.25)', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: msg.ok ? '#00FF94' : '#F87171' }}>
          {msg.text}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 10, padding: 4, marginBottom: 24, width: 'fit-content' }}>
        {[['portfolio', 'Portfolio'], ['issue', 'Emettre'], ['standards', 'Standards ACMI']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ padding: '8px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, background: tab === id ? '#1E2D3D' : 'transparent', color: tab === id ? '#E8EFF6' : '#4A6278', fontWeight: tab === id ? 600 : 400 }}>
            {label}
          </button>
        ))}
      </div>

      {/* PORTFOLIO TAB */}
      {tab === 'portfolio' && (
        <div>
          {/* Stats globales */}
          {portfolio && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
              {Object.entries(TIER_CONFIG).map(([tier, cfg]) => (
                <div key={tier} style={{ background: `linear-gradient(135deg, ${cfg.glow} 0%, rgba(13,17,23,0.8) 100%)`, border: `1px solid ${cfg.color}30`, borderRadius: 12, padding: 20 }}>
                  <div style={{ fontSize: 11, color: cfg.color, fontFamily: 'JetBrains Mono, monospace', marginBottom: 8, letterSpacing: '0.1em' }}>{tier.replace('_', ' ')}</div>
                  <div style={{ fontSize: 36, fontWeight: 800, color: cfg.color, fontFamily: 'Syne, sans-serif' }}>
                    {portfolio.stats[tier] || 0}
                  </div>
                  <div style={{ fontSize: 11, color: '#4A6278', marginTop: 4 }}>projet{(portfolio.stats[tier] || 0) !== 1 ? 's' : ''} certifie{(portfolio.stats[tier] || 0) !== 1 ? 's' : ''}</div>
                </div>
              ))}
            </div>
          )}

          {/* Liste des certifications */}
          <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', background: '#121920', borderBottom: '1px solid #1E2D3D', fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>
              CERTIFICATIONS ACTIVES
            </div>
            {portfolio && portfolio.certifications.length === 0 && (
              <div style={{ padding: 48, textAlign: 'center', color: '#4A6278' }}>
                Aucune certification emise. Allez dans "Emettre" pour certifier un projet.
              </div>
            )}
            {portfolio && portfolio.certifications.map((c) => {
              const cfg = TIER_CONFIG[c.tier] || TIER_CONFIG.VERIFIED;
              const isValid = !c.revokedAt && new Date(c.expiresAt) > new Date();
              return (
                <div key={c.id} style={{ padding: '16px 20px', borderBottom: '1px solid rgba(30,45,61,0.4)', display: 'flex', alignItems: 'center', gap: 16 }}>
                  {/* Badge mini */}
                  <div style={{ width: 44, height: 44, background: `${cfg.color}15`, border: `2px solid ${cfg.color}40`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                    &#x2B21;
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#E8EFF6' }}>{c.project?.name}</span>
                      <span style={{ fontSize: 9, background: `${cfg.color}20`, color: cfg.color, border: `1px solid ${cfg.color}40`, borderRadius: 4, padding: '2px 8px', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.05em' }}>
                        {c.tier.replace('_', ' ')}
                      </span>
                      {!isValid && (
                        <span style={{ fontSize: 9, background: 'rgba(248,113,113,0.1)', color: '#F87171', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 4, padding: '2px 8px', fontFamily: 'JetBrains Mono, monospace' }}>
                          {c.revokedAt ? 'REVOQUE' : 'EXPIRE'}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>
                      {c.project?.country} · {c.project?.type} · Expire: {new Date(c.expiresAt).toLocaleDateString('fr-FR')}
                    </div>
                    {c.standards.length > 0 && (
                      <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {c.standards.map(s => (
                          <span key={s} style={{ fontSize: 9, background: 'rgba(0,255,148,0.08)', color: '#00FF94', border: '1px solid rgba(0,255,148,0.2)', borderRadius: 3, padding: '1px 6px', fontFamily: 'JetBrains Mono, monospace' }}>{s}</span>
                        ))}
                        {c.acmiCompliant && <span style={{ fontSize: 9, background: 'rgba(0,255,148,0.12)', color: '#00FF94', border: '1px solid rgba(0,255,148,0.3)', borderRadius: 3, padding: '1px 6px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>ACMI</span>}
                        {c.corsiaEligible && <span style={{ fontSize: 9, background: 'rgba(252,211,77,0.1)', color: '#FCD34D', border: '1px solid rgba(252,211,77,0.25)', borderRadius: 3, padding: '1px 6px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>CORSIA</span>}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <a href={'/verify/' + c.hash} target="_blank"
                      style={{ fontSize: 11, background: 'transparent', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 5, color: '#38BDF8', padding: '4px 10px', cursor: 'pointer', textDecoration: 'none', display: 'inline-block', marginBottom: 4 }}>
                      Verifier
                    </a>
                    <div style={{ fontSize: 10, color: '#2A3F55', fontFamily: 'JetBrains Mono, monospace', marginTop: 4 }}>
                      {c.hash.slice(0, 8)}...
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ISSUE TAB */}
      {tab === 'issue' && (
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20 }}>
          {/* Sélection projet */}
          <div>
            <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 10 }}>SELECTIONNEZ UN PROJET</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 500, overflowY: 'auto' }}>
              {projects.map(p => (
                <div key={p.id} onClick={() => selectProject(p)}
                  style={{ background: selected?.id === p.id ? 'rgba(0,255,148,0.08)' : '#0D1117', border: `1px solid ${selected?.id === p.id ? 'rgba(0,255,148,0.3)' : '#1E2D3D'}`, borderRadius: 10, padding: 14, cursor: 'pointer' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#E8EFF6', marginBottom: 3 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>{p.country} · {p.type} · {p.installedMW} MW</div>
                  {p.certification && (
                    <div style={{ marginTop: 6, fontSize: 9, color: '#00FF94', fontFamily: 'JetBrains Mono, monospace' }}>Deja certifie</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Panel certification */}
          <div>
            {!selected ? (
              <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 48, textAlign: 'center', color: '#4A6278' }}>
                Selectionnez un projet pour voir son score de certification
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Score card */}
                {score && (
                  <div style={{ background: `linear-gradient(135deg, ${tierCfg?.glow || 'rgba(30,45,61,0.5)'} 0%, rgba(13,17,23,0.95) 100%)`, border: `1px solid ${tierCfg?.color || '#1E2D3D'}40`, borderRadius: 12, padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8 }}>SCORE DE CERTIFICATION</div>
                        <div style={{ fontSize: 56, fontWeight: 800, color: tierCfg?.color || '#E8EFF6', fontFamily: 'Syne, sans-serif', lineHeight: 1 }}>
                          {score.score}
                          <span style={{ fontSize: 20, color: '#4A6278' }}>/100</span>
                        </div>
                        <div style={{ fontSize: 13, color: tierCfg?.color || '#E8EFF6', marginTop: 8, fontWeight: 600 }}>
                          Tier eligible: {score.tier?.replace('_', ' ')}
                        </div>
                        <div style={{ fontSize: 12, color: '#8FA3B8', marginTop: 4 }}>{score.tierInfo?.badge}</div>
                      </div>
                      {/* Gauge */}
                      <div style={{ position: 'relative', width: 90, height: 90 }}>
                        <svg width="90" height="90" viewBox="0 0 90 90">
                          <circle cx="45" cy="45" r="38" fill="none" stroke="#1E2D3D" strokeWidth="8"/>
                          <circle cx="45" cy="45" r="38" fill="none" stroke={tierCfg?.color || '#00FF94'} strokeWidth="8"
                            strokeDasharray={`${score.score * 2.389} 238.9`} strokeLinecap="round"
                            transform="rotate(-90 45 45)" strokeDashoffset="0"/>
                          <text x="45" y="50" textAnchor="middle" fill={tierCfg?.color || '#E8EFF6'} fontSize="16" fontWeight="800">
                            {score.score}
                          </text>
                        </svg>
                      </div>
                    </div>

                    {/* Checks */}
                    <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      {Object.entries(score.checks || {}).map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                          <span style={{ color: v ? '#00FF94' : '#F87171', fontSize: 14 }}>{v ? '✓' : '✗'}</span>
                          <span style={{ color: v ? '#8FA3B8' : '#4A6278' }}>{k.replace(/_/g, ' ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Certification existante */}
                {cert && !cert.error && (
                  <div style={{ background: 'rgba(30,45,61,0.5)', border: '1px solid #1E2D3D', borderRadius: 12, padding: 20 }}>
                    <div style={{ fontSize: 11, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8 }}>CERTIFICATION ACTUELLE</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 13, color: TIER_CONFIG[cert.tier]?.color || '#E8EFF6', fontWeight: 600 }}>{cert.tier?.replace('_', ' ')}</div>
                        <div style={{ fontSize: 11, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginTop: 4 }}>
                          Hash: {cert.hash?.slice(0, 16)}...
                        </div>
                        <div style={{ fontSize: 11, color: '#4A6278', marginTop: 2 }}>
                          Expire: {cert.expiresAt ? new Date(cert.expiresAt).toLocaleDateString('fr-FR') : '—'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <a href={'/verify/' + cert.hash} target="_blank"
                          style={{ fontSize: 11, background: 'transparent', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 5, color: '#38BDF8', padding: '4px 10px', cursor: 'pointer', textDecoration: 'none', textAlign: 'center' }}>
                          Voir le badge
                        </a>
                        <button onClick={revokeCert}
                          style={{ fontSize: 11, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 5, color: '#F87171', padding: '4px 10px', cursor: 'pointer' }}>
                          Revoquer
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Formulaire certification */}
                <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 24 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#E8EFF6', marginBottom: 16 }}>
                    {cert && !cert.error ? 'Renouveler / Mettre a niveau' : 'Emettre une certification'}
                  </div>

                  {/* Standards */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 8 }}>STANDARDS APPLICABLES</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {['VERRA_VCS', 'GOLD_STANDARD', 'ACM0002', 'ARTICLE_6', 'CORSIA', 'ACR', 'CAR', 'PLAN_VIVO', 'ICVCM_CCP'].map(s => (
                        <button key={s} onClick={() => toggleStandard(s)}
                          style={{ fontSize: 11, background: form.standards.includes(s) ? 'rgba(0,255,148,0.12)' : 'transparent', border: `1px solid ${form.standards.includes(s) ? 'rgba(0,255,148,0.4)' : '#1E2D3D'}`, borderRadius: 6, color: form.standards.includes(s) ? '#00FF94' : '#4A6278', padding: '5px 10px', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }}>
                          {s.replace(/_/g, ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Options */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div onClick={() => setForm(prev => ({ ...prev, acmiCompliant: !prev.acmiCompliant }))}
                      style={{ background: form.acmiCompliant ? 'rgba(0,255,148,0.06)' : '#121920', border: `1px solid ${form.acmiCompliant ? 'rgba(0,255,148,0.3)' : '#1E2D3D'}`, borderRadius: 8, padding: 14, cursor: 'pointer' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: form.acmiCompliant ? '#00FF94' : '#E8EFF6', marginBottom: 3 }}>
                        {form.acmiCompliant ? '✓' : '○'} Conforme ACMI
                      </div>
                      <div style={{ fontSize: 10, color: '#4A6278' }}>African Carbon Markets Initiative</div>
                    </div>
                    <div onClick={() => setForm(prev => ({ ...prev, corsiaEligible: !prev.corsiaEligible }))}
                      style={{ background: form.corsiaEligible ? 'rgba(252,211,77,0.06)' : '#121920', border: `1px solid ${form.corsiaEligible ? 'rgba(252,211,77,0.3)' : '#1E2D3D'}`, borderRadius: 8, padding: 14, cursor: 'pointer' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: form.corsiaEligible ? '#FCD34D' : '#E8EFF6', marginBottom: 3 }}>
                        {form.corsiaEligible ? '✓' : '○'} Eligible CORSIA
                      </div>
                      <div style={{ fontSize: 10, color: '#4A6278' }}>Aviation internationale</div>
                    </div>
                  </div>

                  {/* Auditeur */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                    {[{ label: 'NOM AUDITEUR TIERS', key: 'auditorName', ph: 'Bureau Veritas, SGS...' }, { label: 'URL AUDITEUR', key: 'auditorUrl', ph: 'https://...' }].map(f => (
                      <div key={f.key}>
                        <label style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 5 }}>{f.label}</label>
                        <input value={form[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.ph}
                          style={{ width: '100%', background: '#121920', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '9px 12px', fontSize: 12, outline: 'none' }}/>
                      </div>
                    ))}
                  </div>

                  {/* Tier preview */}
                  {score && (
                    <div style={{ background: '#121920', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 12 }}>
                      <span style={{ color: '#4A6278' }}>Tier qui sera emis: </span>
                      <span style={{ color: TIER_CONFIG[score.tier]?.color || '#E8EFF6', fontWeight: 700 }}>
                        {(() => {
                          if (score.score >= 85 && form.corsiaEligible && form.acmiCompliant) return 'ELITE CORSIA';
                          if (score.score >= 70 && form.acmiCompliant) return 'ELITE';
                          if (score.score >= 40 && form.auditorName) return 'CERTIFIED';
                          return 'VERIFIED';
                        })()}
                      </span>
                    </div>
                  )}

                  <button onClick={issueCert} disabled={issuing || !selected}
                    style={{ width: '100%', background: issuing ? '#1E2D3D' : 'linear-gradient(135deg, #00FF94, #00CC77)', color: '#080B0F', border: 'none', borderRadius: 10, padding: 14, fontWeight: 800, fontSize: 15, cursor: issuing ? 'wait' : 'pointer', fontFamily: 'Syne, sans-serif', letterSpacing: '0.05em' }}>
                    {issuing ? 'Generation du certificat...' : 'Emettre la certification'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STANDARDS ACMI TAB */}
      {tab === 'standards' && <ACMIStandardsPanel />}
    </div>
  );
}

function ACMIStandardsPanel() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetchAuthJson('/certification/standards/africa').then(setData).catch(console.error);
  }, []);

  const COUNTRIES_ACMI = [
    { code: 'CI', name: "Cote d'Ivoire", potential: '45M tCO2e/an', status: 'Actif', color: '#F59E0B' },
    { code: 'KE', name: 'Kenya', potential: '60M tCO2e/an', status: 'Leader', color: '#00FF94' },
    { code: 'NG', name: 'Nigeria', potential: '120M tCO2e/an', status: 'Actif', color: '#3B82F6' },
    { code: 'GH', name: 'Ghana', potential: '30M tCO2e/an', status: 'Actif', color: '#8B5CF6' },
    { code: 'SN', name: 'Senegal', potential: '20M tCO2e/an', status: 'En dev.', color: '#EC4899' },
    { code: 'ET', name: 'Ethiopie', potential: '80M tCO2e/an', status: 'Actif', color: '#F97316' },
    { code: 'RW', name: 'Rwanda', potential: '15M tCO2e/an', status: 'Leader', color: '#10B981' },
    { code: 'ZA', name: 'Afrique du Sud', potential: '90M tCO2e/an', status: 'Actif', color: '#38BDF8' },
    { code: 'TZ', name: 'Tanzanie', potential: '70M tCO2e/an', status: 'En dev.', color: '#A78BFA' },
    { code: 'UG', name: 'Ouganda', potential: '25M tCO2e/an', status: 'En dev.', color: '#FCD34D' },
    { code: 'MZ', name: 'Mozambique', potential: '35M tCO2e/an', status: 'En dev.', color: '#F87171' },
    { code: 'CM', name: 'Cameroun', potential: '55M tCO2e/an', status: 'Actif', color: '#34D399' },
  ];

  const TIER_LABELS = [
    { tier: 'PANGEA VERIFIED', color: '#38BDF8', desc: 'Donnees MRV verifiees sur la plateforme', req: 'MRV + Lectures', validity: '12 mois', premium: '+$1-2/t' },
    { tier: 'PANGEA CERTIFIED', color: '#00FF94', desc: 'Standard reconnu + audit tiers independant', req: 'VERIFIED + Auditeur + Standard', validity: '24 mois', premium: '+$3-5/t' },
    { tier: 'PANGEA ELITE', color: '#A78BFA', desc: 'Conforme ACMI + co-benefices ODD documentes', req: 'CERTIFIED + ACMI + ODD', validity: '36 mois', premium: '+$6-10/t' },
    { tier: 'PANGEA ELITE + CORSIA', color: '#FCD34D', desc: 'Eligible aviation internationale CORSIA', req: 'ELITE + Validation CORSIA', validity: '36 mois', premium: '+$12-18/t' },
  ];

  return (
    <div>
      {/* ACMI Hero */}
      <div style={{ background: 'linear-gradient(135deg, rgba(0,255,148,0.06) 0%, rgba(13,17,23,0.9) 100%)', border: '1px solid rgba(0,255,148,0.15)', borderRadius: 14, padding: 28, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div style={{ fontSize: 10, color: '#00FF94', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6, letterSpacing: '0.15em' }}>AFRICAN CARBON MARKETS INITIATIVE</div>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: '#E8EFF6', margin: 0, marginBottom: 10 }}>ACMI — Le marche carbone africain</h2>
            <p style={{ fontSize: 13, color: '#8FA3B8', lineHeight: 1.8, maxWidth: 600 }}>
              Lancee a la COP27 en 2022, l ACMI vise 300 millions de credits carbone par an d ici 2030.
              Soutenue par 9 chefs d Etat africains, elle est destinee a devenir le standard de reference
              pour le marche carbone africain — un marche estime a $6 milliards d ici 2030.
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#00FF94', fontFamily: 'Syne, sans-serif' }}>300M</div>
            <div style={{ fontSize: 11, color: '#4A6278' }}>tCO2e/an cible 2030</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#A78BFA', fontFamily: 'Syne, sans-serif', marginTop: 8 }}>$6B</div>
            <div style={{ fontSize: 11, color: '#4A6278' }}>valeur marche estimee 2030</div>
          </div>
        </div>
      </div>

      {/* Tiers PANGEA */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 12, letterSpacing: '0.1em' }}>SYSTEME DE CERTIFICATION PANGEA CARBON</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {TIER_LABELS.map((t, i) => (
            <div key={t.tier} style={{ background: `linear-gradient(135deg, ${t.color}08 0%, rgba(13,17,23,0.9) 100%)`, border: `1px solid ${t.color}30`, borderRadius: 12, padding: 20, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: 60, height: 60, background: `${t.color}08`, borderRadius: '0 0 0 100%' }} />
              <div style={{ fontSize: 9, color: t.color, fontFamily: 'JetBrains Mono, monospace', marginBottom: 6, letterSpacing: '0.12em' }}>TIER {i + 1}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: t.color, fontFamily: 'Syne, sans-serif', marginBottom: 6 }}>⬡ {t.tier}</div>
              <div style={{ fontSize: 12, color: '#8FA3B8', marginBottom: 12, lineHeight: 1.6 }}>{t.desc}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[['Conditions', t.req, '#4A6278'], ['Validite', t.validity, '#4A6278'], ['Prime de prix', t.premium, t.color]].map(([label, val, col]) => (
                  <div key={label}>
                    <div style={{ fontSize: 9, color: '#2A3F55', fontFamily: 'JetBrains Mono, monospace', marginBottom: 2 }}>{label.toUpperCase()}</div>
                    <div style={{ fontSize: 11, color: col, fontWeight: 600 }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pays ACMI */}
      <div>
        <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 12, letterSpacing: '0.1em' }}>PAYS MEMBRES ACMI — POTENTIEL MARCHE</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {COUNTRIES_ACMI.map(c => (
            <div key={c.code} style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 10, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, background: `${c.color}15`, border: `1px solid ${c.color}30`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: c.color, fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>
                {c.code}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#E8EFF6', marginBottom: 2 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: c.color, fontFamily: 'JetBrains Mono, monospace' }}>{c.potential}</div>
              </div>
              <span style={{ fontSize: 9, background: c.status === 'Leader' ? 'rgba(0,255,148,0.1)' : 'rgba(30,45,61,0.8)', border: `1px solid ${c.status === 'Leader' ? 'rgba(0,255,148,0.3)' : '#1E2D3D'}`, borderRadius: 4, padding: '2px 7px', color: c.status === 'Leader' ? '#00FF94' : '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>
                {c.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CertificationPage;
