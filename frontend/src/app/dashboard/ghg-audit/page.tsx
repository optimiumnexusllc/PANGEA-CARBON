'use client';
import { useEffect, useState, useCallback } from 'react';
import { useLang } from '@/lib/lang-context';
import { fetchAuthJson } from '@/lib/fetch-auth';

const fmtCO2  = (n) => n >= 1000 ? `${(n/1000).toFixed(2)}k` : (n || 0).toFixed(2);
const fmtUSD  = (n) => '$' + (n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
const pct     = (a, t) => t > 0 ? ((a/t)*100).toFixed(1) : '0';

const SCOPE_COLOR = { 1: '#F87171', 2: '#FCD34D', 3: '#38BDF8' };
const SCOPE_LABEL = { 1: 'Scope 1', 2: 'Scope 2', 3: 'Scope 3' };
const SCOPE_DESC  = {
  1: 'Direct emissions — Fuel, vehicles, industrial processes',
  2: 'Indirect — Purchased electricity & heat',
  3: 'Value chain — Travel, goods, waste, transport',
};

const FRAMEWORKS = [
  { id: 'GHG_PROTOCOL',  label: 'GHG Protocol', flag: '🌍', desc: 'WRI/WBCSD — International standard' },
  { id: 'ISO_14064',     label: 'ISO 14064',    flag: '📋', desc: 'ISO certification framework' },
  { id: 'BILAN_CARBONE', label: 'Bilan Carbone',flag: '🇫🇷', desc: 'ADEME — France & Afrique francophone' },
];

export default function GHGAuditPage() {
  const { lang } = useLang();
  const L = (en, fr) => lang === 'fr' ? fr : en;

  const [view, setView]         = useState('dashboard'); // dashboard | list | audit | new
  const [audits, setAudits]     = useState([]);
  const [currentAudit, setCurrentAudit] = useState(null);
  const [factors, setFactors]   = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [offsetPlan, setOffsetPlan] = useState(null);
  const [newAuditForm, setNewAuditForm] = useState({ name: '', reportingYear: new Date().getFullYear()-1, framework: 'GHG_PROTOCOL', netZeroTarget: '' });
  const [addEntry, setAddEntry] = useState({ factorKey: '', quantity: '', notes: '' });
  const [filterScope, setFilterScope] = useState(0);
  const [filterCat, setFilterCat] = useState('');
  const [creating, setCreating] = useState(false);
  const [addingEntry, setAddingEntry] = useState(false);
  const [toast, setToast]       = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, f, d] = await Promise.all([
        fetchAuthJson('/ghg/audits').catch(() => ({ audits: [] })),
        fetchAuthJson('/ghg/factors').catch(() => ({ factors: [] })),
        fetchAuthJson('/ghg/dashboard').catch(() => null),
      ]);
      setAudits(a.audits || []);
      setFactors(f.factors || []);
      setDashboard(d);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadAudit = async (id) => {
    setLoading(true);
    try {
      const a = await fetchAuthJson('/ghg/audits/' + id);
      setCurrentAudit(a);
      setView('audit');
      // Charger le plan de compensation
      const plan = await fetchAuthJson('/ghg/audits/' + id + '/offset-plan').catch(() => null);
      setOffsetPlan(plan);
    } finally { setLoading(false); }
  };

  const createAudit = async () => {
    setCreating(true);
    try {
      const audit = await fetchAuthJson('/ghg/audits', { method: 'POST', body: JSON.stringify(newAuditForm) });
      showToast(L('Audit created!', 'Audit créé !'));
      await load();
      await loadAudit(audit.id);
    } catch(e) { showToast(e.message, 'error'); }
    finally { setCreating(false); }
  };

  const addEntryFn = async () => {
    if (!currentAudit || !addEntry.factorKey || !addEntry.quantity) return;
    setAddingEntry(true);
    try {
      await fetchAuthJson('/ghg/audits/' + currentAudit.id + '/entries', {
        method: 'POST',
        body: JSON.stringify(addEntry),
      });
      const updated = await fetchAuthJson('/ghg/audits/' + currentAudit.id);
      setCurrentAudit(updated);
      const plan = await fetchAuthJson('/ghg/audits/' + currentAudit.id + '/offset-plan').catch(() => null);
      setOffsetPlan(plan);
      setAddEntry({ factorKey: '', quantity: '', notes: '' });
      showToast(L('Entry added!', 'Entrée ajoutée !'));
    } catch(e) { showToast(e.message, 'error'); }
    finally { setAddingEntry(false); }
  };

  const deleteEntry = async (eid) => {
    if (!confirm('Remove this entry?')) return;
    await fetchAuthJson('/ghg/audits/' + currentAudit.id + '/entries/' + eid, { method: 'DELETE' });
    const updated = await fetchAuthJson('/ghg/audits/' + currentAudit.id);
    setCurrentAudit(updated);
    const plan = await fetchAuthJson('/ghg/audits/' + currentAudit.id + '/offset-plan').catch(() => null);
    setOffsetPlan(plan);
    showToast(L('Deleted', 'Supprimé'));
  };

  const runAI = async () => {
    if (!currentAudit) return;
    setAiLoading(true);
    try {
      const r = await fetchAuthJson('/ghg/audits/' + currentAudit.id + '/ai-analysis', { method: 'POST' });
      setCurrentAudit(a => ({ ...a, aiAnalysis: r.analysis }));
      showToast(L('AI analysis ready!', 'Analyse IA prête !'));
    } catch(e) { showToast(e.message, 'error'); }
    finally { setAiLoading(false); }
  };

  // Factor groups for the UI
  const factorGroups = {};
  (factors as any[]).forEach(f => {
    const scope = f.scope;
    if (!factorGroups[scope]) factorGroups[scope] = {};
    if (!factorGroups[scope][f.cat]) factorGroups[scope][f.cat] = [];
    factorGroups[scope][f.cat].push(f);
  });

  const filteredEntries = currentAudit?.entries?.filter(e =>
    (!filterScope || e.scope === filterScope) &&
    (!filterCat   || e.category === filterCat)
  ) || [];

  const inp = { background: '#121920', border: '1px solid #1E2D3D', borderRadius: 8, color: '#E8EFF6', padding: '10px 13px', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' };
  const card = (children, extra = {}) => (
    <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 20, ...extra }}>
      {children}
    </div>
  );

  return (
    <div style={{ padding: 20, maxWidth: 1400, margin: '0 auto' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.type === 'error' ? '#F87171' : '#00FF94', color: '#080B0F', padding: '12px 20px', borderRadius: 10, fontWeight: 700, fontSize: 13, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
          {toast.type === 'error' ? '❌ ' : '✅ '}{toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 9, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.12em', marginBottom: 4 }}>
            GHG PROTOCOL · ISO 14064 · BILAN CARBONE
          </div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: '#E8EFF6', margin: 0 }}>
            {L('Corporate Carbon Audit', 'Audit Carbone Corporate')}
          </h1>
          <p style={{ fontSize: 13, color: '#4A6278', marginTop: 6 }}>
            {L('Measure · Reduce · Offset — Scope 1, 2 & 3 aligned with GHG Protocol and ISO 14064',
               'Mesurer · Réduire · Compenser — Scope 1, 2 & 3 selon GHG Protocol et ISO 14064')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {view !== 'dashboard' && (
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={() => { setView('dashboard'); setCurrentAudit(null); setOffsetPlan(null); }}
                style={{ background: 'transparent', border: '1px solid #1E2D3D', borderRadius: 7, color: '#4A6278', padding: '7px 14px', cursor: 'pointer', fontSize: 12 }}>
                ← {L('Dashboard', 'Tableau de bord')}
              </button>
              {view === 'audit' && currentAudit && (
                <button onClick={() => deleteAudit(currentAudit.id, currentAudit.name)}
                  style={{ background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.25)', borderRadius:7, color:'#F87171', padding:'7px 12px', cursor:'pointer', fontSize:12 }}>
                  🗑 {L('Delete','Supprimer')}
                </button>
              )}
            </div>
          )}
          <button onClick={() => setView('new')}
            style={{ background: '#00FF94', color: '#080B0F', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 800, cursor: 'pointer', fontSize: 13, fontFamily: 'Syne, sans-serif' }}>
            + {L('New Audit', 'Nouvel Audit')}
          </button>
        </div>
      </div>

      {/* ── DASHBOARD VIEW ────────────────────────────────────────────────── */}
      {view === 'dashboard' && (
        <>
          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: L('Total Emissions','Émissions totales'), v: `${fmtCO2(dashboard?.totalEmissions || 0)} tCO₂e`, c: '#F87171', icon: '🌡️' },
              { label: 'Scope 1 — Direct',                      v: `${fmtCO2(dashboard?.scope1 || 0)} tCO₂e`,        c: '#F87171', icon: '🔥' },
              { label: 'Scope 2 — Electricity',                 v: `${fmtCO2(dashboard?.scope2 || 0)} tCO₂e`,        c: '#FCD34D', icon: '⚡' },
              { label: 'Scope 3 — Value chain',                 v: `${fmtCO2(dashboard?.scope3 || 0)} tCO₂e`,        c: '#38BDF8', icon: '🌐' },
            ].map(k => (
              <div key={k.label} style={{ background: '#0D1117', border: `1px solid ${k.c}20`, borderRadius: 12, padding: '14px 16px', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 12, right: 14, fontSize: 20, opacity: 0.35 }}>{k.icon}</div>
                <div style={{ fontSize: 9, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>{k.label.toUpperCase()}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: k.c, fontFamily: 'Syne, sans-serif' }}>{k.v}</div>
              </div>
            ))}
          </div>

          {/* Audit list + new audit CTA */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16 }}>
            <div>
              {card(<>
                <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 14 }}>
                  {L('AUDITS','AUDITS')} — {(audits as any[]).length}
                </div>
                {(audits as any[]).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#4A6278' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
                    <div style={{ fontSize: 14, marginBottom: 8 }}>{L('No audits yet','Aucun audit pour le moment')}</div>
                    <button onClick={() => setView('new')}
                      style={{ background: '#00FF94', color: '#080B0F', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 800, cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>
                      {L('Start first audit →','Démarrer le premier audit →')}
                    </button>
                  </div>
                ) : (audits as any[]).map(a => {
                  const total = a.scope1Total + a.scope2Total + a.scope3Total;
                  const statusC = { DRAFT:'#4A6278', IN_PROGRESS:'#FCD34D', COMPLETED:'#00FF94', VERIFIED:'#38BDF8' };
                  return (
                    <div key={a.id} onClick={() => loadAudit(a.id)}
                      style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid #1E2D3D', marginBottom: 8, cursor: 'pointer', transition: 'border-color 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor='rgba(0,255,148,0.3)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor='#1E2D3D'}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#E8EFF6' }}>{a.name}</div>
                          <div style={{ fontSize: 11, color: '#4A6278' }}>{a.framework} · {a.reportingYear} · {a._count?.entries || 0} entries</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: 9, color: statusC[a.status]||'#4A6278', background: (statusC[a.status]||'#4A6278')+'15', border: `1px solid ${statusC[a.status]||'#4A6278'}30`, borderRadius: 4, padding: '2px 8px', fontFamily: 'JetBrains Mono, monospace' }}>
                            {a.status}
                          </span>
                        </div>
                      </div>
                      {/* Scope bars */}
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {[1,2,3].map(s => {
                          const val = s===1?a.scope1Total:s===2?a.scope2Total:a.scope3Total;
                          return (
                            <div key={s} style={{ flex: 1 }}>
                              <div style={{ fontSize: 9, color: SCOPE_COLOR[s], fontFamily: 'JetBrains Mono, monospace', marginBottom: 3 }}>
                                S{s}: {fmtCO2(val)} t
                              </div>
                              <div style={{ height: 4, background: '#1E2D3D', borderRadius: 2 }}>
                                <div style={{ width: `${pct(val, total)}%`, height: '100%', background: SCOPE_COLOR[s], borderRadius: 2 }}/>
                              </div>
                            </div>
                          );
                        })}
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#E8EFF6', fontFamily: 'JetBrains Mono, monospace', minWidth: 80, textAlign: 'right' }}>
                          {fmtCO2(total)} t
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>)}
            </div>

            {/* Right: Standards info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {FRAMEWORKS.map(fw => (
                <div key={fw.id} style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{fw.flag}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#E8EFF6', marginBottom: 3 }}>{fw.label}</div>
                  <div style={{ fontSize: 11, color: '#4A6278' }}>{fw.desc}</div>
                </div>
              ))}
              {card(<>
                <div style={{ fontSize: 10, color: '#00FF94', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8 }}>AUDIT → OFFSET BRIDGE</div>
                <div style={{ fontSize: 12, color: '#8FA3B8', lineHeight: 1.7 }}>
                  {L('After your audit, PANGEA CARBON automatically calculates the carbon credits needed to offset your footprint and connects you to the African marketplace.',
                     'Après votre audit, PANGEA CARBON calcule automatiquement les crédits carbone nécessaires à la compensation et vous connecte à la marketplace africaine.')}
                </div>
              </>)}
            </div>
          </div>
        </>
      )}

      {/* ── NEW AUDIT FORM ────────────────────────────────────────────────── */}
      {view === 'new' && (
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          {card(<>
            <div style={{ fontSize: 10, color: '#00FF94', fontFamily: 'JetBrains Mono, monospace', marginBottom: 16 }}>NEW CARBON AUDIT</div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 7 }}>AUDIT NAME *</div>
              <input placeholder={L('e.g. MTN Ghana — Annual GHG Audit 2024','ex. MTN Ghana — Bilan Carbone 2024')}
                value={newAuditForm.name}
                onChange={e => setNewAuditForm(f => ({ ...f, name: e.target.value }))}
                style={inp} autoFocus/>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 7 }}>REPORTING YEAR *</div>
                <input type="number" value={newAuditForm.reportingYear}
                  onChange={e => setNewAuditForm(f => ({ ...f, reportingYear: parseInt(e.target.value) }))}
                  style={inp}/>
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 7 }}>NET ZERO TARGET YEAR</div>
                <input type="number" placeholder="e.g. 2050"
                  value={newAuditForm.netZeroTarget}
                  onChange={e => setNewAuditForm(f => ({ ...f, netZeroTarget: e.target.value }))}
                  style={inp}/>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8 }}>FRAMEWORK</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {FRAMEWORKS.map(fw => (
                  <button key={fw.id} onClick={() => setNewAuditForm(f => ({ ...f, framework: fw.id }))}
                    style={{ padding: '12px 14px', borderRadius: 9, border: `1px solid ${newAuditForm.framework===fw.id?'#00FF94':'#1E2D3D'}`, background: newAuditForm.framework===fw.id?'rgba(0,255,148,0.07)':'transparent', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 20 }}>{fw.flag}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: newAuditForm.framework===fw.id?'#00FF94':'#E8EFF6' }}>{fw.label}</div>
                      <div style={{ fontSize: 11, color: '#4A6278' }}>{fw.desc}</div>
                    </div>
                    {newAuditForm.framework===fw.id && <span style={{ marginLeft:'auto', color:'#00FF94' }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setView('dashboard')} style={{ flex:1, background:'transparent', border:'1px solid #1E2D3D', borderRadius:9, color:'#4A6278', padding:13, cursor:'pointer' }}>
                {L('Cancel','Annuler')}
              </button>
              <button onClick={createAudit} disabled={creating||!newAuditForm.name}
                style={{ flex:2, background:creating||!newAuditForm.name?'#1E2D3D':'#00FF94', color:'#080B0F', border:'none', borderRadius:9, padding:13, fontWeight:800, fontSize:14, cursor:creating?'wait':'pointer', fontFamily:'Syne, sans-serif' }}>
                {creating ? '⟳ Creating...' : `${L('Create Audit →','Créer l\'audit →')}`}
              </button>
            </div>
          </>)}
        </div>
      )}

      {/* ── AUDIT DETAIL VIEW ─────────────────────────────────────────────── */}
      {view === 'audit' && currentAudit && (
        <>
          {/* Audit header */}
          <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: '16px 22px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 9, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>
                {currentAudit.framework} · {currentAudit.reportingYear}
              </div>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: '#E8EFF6', margin: 0 }}>{currentAudit.name}</h2>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button onClick={runAI} disabled={aiLoading || !currentAudit.grandTotal}
                style={{ background: aiLoading?'#1E2D3D':'rgba(167,139,250,0.15)', border:'1px solid rgba(167,139,250,0.3)', borderRadius:8, color:'#A78BFA', padding:'9px 16px', cursor:'pointer', fontSize:12, fontWeight:600 }}>
                {aiLoading ? '⟳ Analyzing...' : '🤖 AI Analysis'}
              </button>
            </div>
          </div>

          {/* Scope summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
            {(currentAudit.scopeBreakdown || [1,2,3].map(s => ({
              scope: s, label: `Scope ${s}`,
              total: s===1?currentAudit.scope1Total:s===2?currentAudit.scope2Total:currentAudit.scope3Total,
              pct: pct(s===1?currentAudit.scope1Total:s===2?currentAudit.scope2Total:currentAudit.scope3Total, currentAudit.grandTotal||1),
              color: SCOPE_COLOR[s], description: SCOPE_DESC[s],
            }))).map(s => (
              <div key={s.scope} style={{ background: '#0D1117', border: `1px solid ${s.color}25`, borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 10, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>SCOPE {s.scope}</span>
                  <span style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>{s.pct}%</span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: 'Syne, sans-serif', marginBottom: 4 }}>
                  {fmtCO2(s.total)} tCO₂e
                </div>
                <div style={{ fontSize: 11, color: '#4A6278', marginBottom: 8 }}>{SCOPE_DESC[s.scope]}</div>
                <div style={{ height: 5, background: '#1E2D3D', borderRadius: 2 }}>
                  <div style={{ width: `${s.pct}%`, height: '100%', background: s.color, borderRadius: 2, transition: 'width 0.8s ease' }}/>
                </div>
              </div>
            ))}
          </div>

          {/* TOTAL + Offset plan banner */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div style={{ background: '#0D1117', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 12, padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>TOTAL FOOTPRINT</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: '#F87171', fontFamily: 'Syne, sans-serif' }}>{fmtCO2(currentAudit.grandTotal || 0)}</div>
                <div style={{ fontSize: 13, color: '#4A6278' }}>tCO₂e · {currentAudit.reportingYear}</div>
              </div>
              <div style={{ fontSize: 48 }}>🌡️</div>
            </div>
            {offsetPlan && (
              <div style={{ background: '#0D1117', border: '1px solid rgba(0,255,148,0.25)', borderRadius: 12, padding: '18px 22px' }}>
                <div style={{ fontSize: 10, color: '#00FF94', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8 }}>OFFSET STRATEGY</div>
                <div style={{ fontSize: 13, color: '#8FA3B8', marginBottom: 12 }}>{offsetPlan.recommendation}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(offsetPlan.strategy || []).map(o => (
                    <div key={o.standard} style={{ flex: 1, background: '#121920', borderRadius: 7, padding: '8px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>{o.standard.replace('_',' ')}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#E8EFF6' }}>{o.qty?.toLocaleString()} t</div>
                      <div style={{ fontSize: 10, color: '#00FF94' }}>{fmtUSD(o.cost)}</div>
                    </div>
                  ))}
                </div>
                <a href="/dashboard/marketplace"
                  style={{ display:'block', marginTop:12, background:'#00FF94', color:'#080B0F', borderRadius:8, padding:'10px', fontWeight:800, fontSize:13, textDecoration:'none', textAlign:'center', fontFamily:'Syne, sans-serif' }}>
                  🏪 {L('Buy Credits in Marketplace →','Acheter sur la Marketplace →')}
                </a>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 16 }}>
            {/* Add entry panel */}
            <div>
              {card(<>
                <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 14 }}>
                  {L('ADD EMISSION SOURCE','AJOUTER UNE SOURCE')}
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>SOURCE *</div>
                  <select value={addEntry.factorKey} onChange={e => setAddEntry(f => ({ ...f, factorKey: e.target.value }))} style={inp}>
                    <option value="">{L('Select emission source...','Sélectionnez une source...')}</option>
                    {[1,2,3].map(scope => (
                      <optgroup key={scope} label={`▸ Scope ${scope} — ${SCOPE_LABEL[scope]}`}>
                        {(factors as any[]).filter(f => f.scope === scope).map(f => (
                          <option key={f.key} value={f.key}>
                            {f.desc} ({f.factor} tCO₂e/{f.unit})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {addEntry.factorKey && (() => {
                  const ef = (factors as any[]).find(f => f.key === addEntry.factorKey);
                  const est = (parseFloat(addEntry.quantity) || 0) * (ef?.factor || 0);
                  return (
                    <>
                      <div style={{ background: '#121920', borderRadius: 8, padding: '10px 12px', marginBottom: 12, fontSize: 12 }}>
                        <div style={{ color: '#4A6278', marginBottom: 4 }}>{ef?.desc}</div>
                        <div style={{ color: '#8FA3B8' }}>Factor: {ef?.factor} tCO₂e/{ef?.unit} · Source: IPCC AR6 + IEA 2024</div>
                        <div style={{ color: SCOPE_COLOR[ef?.scope], fontWeight: 700, marginTop: 4 }}>
                          Scope {ef?.scope} — {ef?.category?.en || ef?.cat}
                        </div>
                        {est > 0 && <div style={{ color: '#F87171', fontWeight: 700, marginTop: 4, fontSize: 14 }}>≈ {est.toFixed(3)} tCO₂e</div>}
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>QUANTITY ({ef?.unit}) *</div>
                        <input type="number" step="any" placeholder={`e.g. 1000 ${ef?.unit}`}
                          value={addEntry.quantity}
                          onChange={e => setAddEntry(f => ({ ...f, quantity: e.target.value }))}
                          style={inp}/>
                      </div>
                    </>
                  );
                })()}

                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>NOTES</div>
                  <input placeholder={L('Optional notes...','Notes optionnelles...')}
                    value={addEntry.notes}
                    onChange={e => setAddEntry(f => ({ ...f, notes: e.target.value }))}
                    style={inp}/>
                </div>

                <button onClick={addEntryFn} disabled={addingEntry||!addEntry.factorKey||!addEntry.quantity}
                  style={{ width:'100%', background:addingEntry||!addEntry.factorKey||!addEntry.quantity?'#1E2D3D':'#00FF94', color:'#080B0F', border:'none', borderRadius:9, padding:13, fontWeight:800, fontSize:13, cursor:'pointer', fontFamily:'Syne, sans-serif' }}>
                  {addingEntry ? '⟳' : `+ ${L('Add Entry','Ajouter l\'entrée')}`}
                </button>
              </>)}
            </div>

            {/* Entries table */}
            <div>
              {card(<>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>
                    EMISSION ENTRIES ({currentAudit.entries?.length || 0})
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[0,1,2,3].map(s => (
                      <button key={s} onClick={() => setFilterScope(s === filterScope ? 0 : s)}
                        style={{ padding:'5px 10px', borderRadius:5, border:`1px solid ${s===filterScope?(s===0?'#4A6278':SCOPE_COLOR[s]):'#1E2D3D'}`, background:'transparent', color:s===filterScope?(s===0?'#8FA3B8':SCOPE_COLOR[s]):'#4A6278', cursor:'pointer', fontSize:11 }}>
                        {s === 0 ? 'All' : `S${s}`}
                      </button>
                    ))}
                  </div>
                </div>
                {filteredEntries.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'32px 0', color:'#4A6278', fontSize:13 }}>
                    {currentAudit.entries?.length === 0
                      ? L('No entries yet — add your first emission source','Aucune entrée — ajoutez une source d\'émission')
                      : L('No entries match the filter','Aucune entrée pour ce filtre')}
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                      <thead>
                        <tr style={{ borderBottom:'1px solid #1E2D3D' }}>
                          {['Scope','Source','Qty','Unit','EF','tCO₂e',''].map(h => (
                            <th key={h} style={{ padding:'6px 10px', textAlign:'left', color:'#4A6278', fontFamily:'JetBrains Mono, monospace', fontSize:9, letterSpacing:'0.06em', fontWeight:400 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...filteredEntries].sort((a,b)=>b.co2e-a.co2e).map(e => (
                          <tr key={e.id} style={{ borderBottom:'1px solid rgba(30,45,61,0.4)' }}
                            onMouseEnter={ev => ev.currentTarget.style.background='rgba(30,45,61,0.3)'}
                            onMouseLeave={ev => ev.currentTarget.style.background='transparent'}>
                            <td style={{ padding:'9px 10px' }}>
                              <span style={{ fontSize:9, color:SCOPE_COLOR[e.scope], background:SCOPE_COLOR[e.scope]+'15', border:`1px solid ${SCOPE_COLOR[e.scope]}30`, borderRadius:3, padding:'1px 6px', fontFamily:'JetBrains Mono, monospace' }}>S{e.scope}</span>
                            </td>
                            <td style={{ padding:'9px 10px', color:'#E8EFF6', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.description}</td>
                            <td style={{ padding:'9px 10px', color:'#8FA3B8', fontFamily:'JetBrains Mono, monospace' }}>{e.quantity?.toLocaleString()}</td>
                            <td style={{ padding:'9px 10px', color:'#4A6278', fontFamily:'JetBrains Mono, monospace', fontSize:10 }}>{e.unit}</td>
                            <td style={{ padding:'9px 10px', color:'#4A6278', fontFamily:'JetBrains Mono, monospace', fontSize:10 }}>{e.emissionFactor}</td>
                            <td style={{ padding:'9px 10px', color:'#F87171', fontFamily:'JetBrains Mono, monospace', fontWeight:700 }}>{e.co2e.toFixed(3)}</td>
                            <td style={{ padding:'9px 10px' }}>
                              <button onClick={() => deleteEntry(e.id)} style={{ background:'transparent', border:'none', color:'#4A6278', cursor:'pointer', fontSize:14, padding:'2px 6px' }}>×</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop:'2px solid #1E2D3D' }}>
                          <td colSpan={5} style={{ padding:'10px 10px', color:'#4A6278', fontFamily:'JetBrains Mono, monospace', fontSize:10 }}>TOTAL ({filteredEntries.length} entries)</td>
                          <td style={{ padding:'10px 10px', color:'#F87171', fontFamily:'JetBrains Mono, monospace', fontWeight:800, fontSize:14 }}>
                            {filteredEntries.reduce((s,e)=>s+e.co2e,0).toFixed(3)} tCO₂e
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </>)}

              {/* AI Analysis panel */}
              {currentAudit.aiAnalysis && (
                <div style={{ background:'#0D1117', border:'1px solid rgba(167,139,250,0.3)', borderRadius:12, padding:20, marginTop:16 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                    <span style={{ fontSize:16 }}>🤖</span>
                    <span style={{ fontSize:10, color:'#A78BFA', fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.1em' }}>AI ANALYSIS · CLAUDE OPUS</span>
                  </div>
                  <div style={{ fontSize:13, color:'#8FA3B8', lineHeight:1.8, whiteSpace:'pre-wrap' }}>
                    {currentAudit.aiAnalysis}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
