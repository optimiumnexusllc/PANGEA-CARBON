'use client';
import { useEffect, useState, useCallback } from 'react';
import { useLang } from '@/lib/lang-context';
import { fetchAuthJson } from '@/lib/fetch-auth';
import { api } from '@/lib/api';

const fmtK  = (n) => n >= 1000 ? `${((n||0)/1000).toFixed(1)}K` : String(Math.round(n||0));
const fmtUSD = (n) => '$' + (n||0).toLocaleString('en-US', { maximumFractionDigits: 0 });

const STEP_ICONS = {
  MRV_DATA:'📊', MRV_CALCULATION:'🧮', PDD:'📄', VVB_VALIDATION:'🏛️',
  MONITORING_PERIOD:'📡', MONITORING_REPORT:'📋', VVB_VERIFICATION:'✅',
  REGISTRY_SUBMISSION:'📤', REGISTRY_REVIEW:'🔍', CREDIT_ISSUANCE:'🌿', MARKET_LISTING:'🏪',
};
const STATUS_COLOR = {
  COMPLETED:'#00FF94', IN_PROGRESS:'#FCD34D', PENDING:'#2A3F55',
  BLOCKED:'#F87171', REJECTED:'#F87171',
};
const STD_COLOR = { VERRA_VCS:'#00FF94', GOLD_STANDARD:'#FCD34D', ARTICLE6:'#38BDF8', CORSIA:'#F87171' };
const STD_LABEL = { VERRA_VCS:'Verra VCS', GOLD_STANDARD:'Gold Standard', ARTICLE6:'Article 6 ITMO', CORSIA:'CORSIA' };

const VVB_LIST = ['Bureau Veritas', 'DNV GL', 'SGS', 'RINA', 'Carbon Check India', 'Aenor', 'ERM CVS', 'SCS Global'];
const STANDARDS = ['VERRA_VCS','GOLD_STANDARD','ARTICLE6','CORSIA'];
const DOC_TYPES = ['PDD','MONITORING_REPORT','VVB_VALIDATION','VVB_VERIFICATION','REGISTRY_SUBMISSION'];

export default function PipelinePage() {
  const { lang } = useLang();
  const L = (en, fr) => lang === 'fr' ? fr : en;

  const [view, setView]       = useState('list');
  const [pipelines, setPipelines] = useState([]);
  const [current, setCurrent] = useState(null);
  const [stepDefs, setStepDefs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast]     = useState(null);

  // Forms
  const [newForm, setNewForm] = useState({ projectId: '', vintage: new Date().getFullYear()-1, standard: 'VERRA_VCS' });
  const [vvbForm, setVvbForm] = useState({ vvbName: '', vvbContact: '' });
  const [docForm, setDocForm] = useState({ type: 'PDD', name: '', fileUrl: '' });
  const [advanceNotes, setAdvanceNotes] = useState('');
  const [creating, setCreating] = useState(false);
  const [advancing, setAdvancing] = useState('');

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, proj, s] = await Promise.all([
        fetchAuthJson('/pipeline').catch(() => ({ pipelines: [], stepDefinitions: [] })),
        api.getProjects().catch(() => []),
        fetchAuthJson('/pipeline/stats/global').catch(() => null),
      ]);
      setPipelines(p.pipelines || []);
      setStepDefs(p.stepDefinitions || []);
      setProjects(Array.isArray(proj) ? proj : proj.projects || []);
      setStats(s);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadPipeline = async (id) => {
    setLoading(true);
    try {
      const r = await fetchAuthJson('/pipeline/' + id);
      setCurrent(r);
      if (r.stepDefinitions?.length) setStepDefs(r.stepDefinitions);
      setView('detail');
    } finally { setLoading(false); }
  };

  const createPipeline = async () => {
    if (!newForm.projectId) return;
    setCreating(true);
    try {
      const r = await fetchAuthJson('/pipeline', { method: 'POST', body: JSON.stringify(newForm) });
      showToast(L('Pipeline started!', 'Pipeline démarré !'));
      await load();
      await loadPipeline(r.pipeline.id);
    } catch(e) { showToast(e.message || 'Error', 'error'); }
    finally { setCreating(false); }
  };

  const advance = async (stepKey) => {
    if (!current) return;
    setAdvancing(stepKey);
    try {
      const r = await fetchAuthJson('/pipeline/' + current.pipeline.id + '/advance', {
        method: 'POST', body: JSON.stringify({ stepKey, notes: advanceNotes }),
      });
      setCurrent(prev => ({ ...prev, pipeline: r.pipeline }));
      setAdvanceNotes('');
      showToast(L('Step completed!', 'Étape validée !'));
      await load();
    } catch(e) { showToast(e.message, 'error'); }
    finally { setAdvancing(''); }
  };

  const assignVVB = async () => {
    if (!current || !vvbForm.vvbName) return;
    try {
      await fetchAuthJson('/pipeline/' + current.pipeline.id + '/assign-vvb', {
        method: 'POST', body: JSON.stringify(vvbForm),
      });
      await loadPipeline(current.pipeline.id);
      showToast(L('VVB assigned!', 'VVB assigné !'));
    } catch(e) { showToast(e.message, 'error'); }
  };

  const addDocument = async () => {
    if (!current || !docForm.name) return;
    try {
      await fetchAuthJson('/pipeline/' + current.pipeline.id + '/documents', {
        method: 'POST', body: JSON.stringify(docForm),
      });
      await loadPipeline(current.pipeline.id);
      setDocForm({ type: 'PDD', name: '', fileUrl: '' });
      showToast(L('Document added!', 'Document ajouté !'));
    } catch(e) { showToast(e.message, 'error'); }
  };

  const inp = { background: '#121920', border: '1px solid #1E2D3D', borderRadius: 8, color: '#E8EFF6', padding: '10px 13px', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' as const };

  // Reconstruct step list for current pipeline
  const pipelineSteps = current?.pipeline?.steps || [];

  return (
    <div style={{ padding: 20, maxWidth: 1400, margin: '0 auto' }}>

      {toast && (
        <div style={{ position:'fixed', top:20, right:20, zIndex:9999, background:toast.type==='error'?'#F87171':'#00FF94', color:'#080B0F', padding:'12px 20px', borderRadius:10, fontWeight:700, fontSize:13, boxShadow:'0 4px 20px rgba(0,0,0,0.4)' }}>
          {toast.type==='error'?'❌ ':'✅ '}{toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 22, display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ fontSize:9, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.12em', marginBottom:4 }}>
            VERRA ACM0002 · GOLD STANDARD · ARTICLE 6 PIPELINE
          </div>
          <h1 style={{ fontFamily:'Syne, sans-serif', fontSize:24, fontWeight:800, color:'#E8EFF6', margin:0 }}>
            {L('Carbon Credit Issuance Pipeline','Pipeline Émission de Crédits Carbone')}
          </h1>
          <p style={{ fontSize:13, color:'#4A6278', marginTop:6, maxWidth:600 }}>
            {L('Complete 11-step workflow from MRV data collection to marketplace listing. Verra ACM0002 · ISO 14064 · Gold Standard.',
               'Workflow 11 étapes complet de la collecte MRV à la mise en vente. Verra ACM0002 · ISO 14064 · Gold Standard.')}
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {view !== 'list' && (
            <button onClick={() => { setView('list'); setCurrent(null); }}
              style={{ background:'transparent', border:'1px solid #1E2D3D', borderRadius:8, color:'#4A6278', padding:'9px 16px', cursor:'pointer', fontSize:12 }}>
              ← {L('All Pipelines','Tous les pipelines')}
            </button>
          )}
          <button onClick={() => setView('new')}
            style={{ background:'#00FF94', color:'#080B0F', border:'none', borderRadius:8, padding:'10px 20px', fontWeight:800, cursor:'pointer', fontSize:13, fontFamily:'Syne, sans-serif' }}>
            + {L('New Pipeline','Nouveau Pipeline')}
          </button>
        </div>
      </div>

      {/* ── WORKFLOW EXPLAINER ───────────────────────────────────────────── */}
      {view === 'list' && (
        <>
          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
            {[
              { label:L('Active Pipelines','Pipelines actifs'),    v:String(stats?.active||0),                      c:'#FCD34D', icon:'⚡' },
              { label:L('Completed','Complétés'),                   v:String(stats?.completed||0),                   c:'#00FF94', icon:'✅' },
              { label:L('Credits in Pipeline','Crédits en cours'), v:`${fmtK(stats?.creditsInPipeline||0)} tCO₂e`, c:'#38BDF8', icon:'🌿' },
              { label:L('Credits Issued','Crédits émis'),          v:`${fmtK(stats?.creditsIssued||0)} tCO₂e`,     c:'#A78BFA', icon:'🏆' },
            ].map(k => (
              <div key={k.label} style={{ background:'#0D1117', border:`1px solid ${k.c}20`, borderRadius:12, padding:'14px 16px', position:'relative' }}>
                <div style={{ position:'absolute', top:12, right:14, fontSize:20, opacity:0.35 }}>{k.icon}</div>
                <div style={{ fontSize:9, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>{k.label.toUpperCase()}</div>
                <div style={{ fontSize:22, fontWeight:800, color:k.c, fontFamily:'Syne, sans-serif' }}>{k.v}</div>
              </div>
            ))}
          </div>

          {/* Workflow diagram strip */}
          <div style={{ background:'#0D1117', border:'1px solid #1E2D3D', borderRadius:12, padding:'18px 20px', marginBottom:20, overflowX:'auto' }}>
            <div style={{ fontSize:10, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:14 }}>
              {L('THE REAL CARBON CREDIT WORKFLOW — 11 STEPS · 6-24 MONTHS','LE VRAI WORKFLOW CRÉDIT CARBONE — 11 ÉTAPES · 6-24 MOIS')}
            </div>
            <div style={{ display:'flex', gap:0, alignItems:'center', minWidth:900 }}>
              {stepDefs.map((step, i) => (
                <div key={step.key} style={{ display:'flex', alignItems:'center', flex:1 }}>
                  <div style={{ textAlign:'center', flex:1 }}>
                    <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(0,255,148,0.1)', border:'1px solid rgba(0,255,148,0.25)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 6px', fontSize:16 }}>
                      {STEP_ICONS[step.key]}
                    </div>
                    <div style={{ fontSize:9, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', textAlign:'center', lineHeight:1.3, maxWidth:70 }}>
                      {step.title.split(' ').slice(0,3).join(' ')}
                    </div>
                    <div style={{ fontSize:8, color:'#2A3F55', marginTop:3 }}>{step.duration?.split(' ').slice(0,2).join(' ')}</div>
                  </div>
                  {i < stepDefs.length - 1 && (
                    <div style={{ width:24, flexShrink:0, textAlign:'center', color:'#2A3F55', fontSize:16, lineHeight:1 }}>→</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Pipeline list */}
          <div style={{ background:'#0D1117', border:'1px solid #1E2D3D', borderRadius:12, overflow:'hidden' }}>
            <div style={{ padding:'14px 18px', background:'#121920', borderBottom:'1px solid #1E2D3D' }}>
              <span style={{ fontSize:10, color:'#4A6278', fontFamily:'JetBrains Mono, monospace' }}>
                {L('ACTIVE PIPELINES','PIPELINES ACTIFS')} — {(pipelines as any[]).length}
              </span>
            </div>
            {(pipelines as any[]).length === 0 ? (
              <div style={{ padding:48, textAlign:'center', color:'#4A6278' }}>
                <div style={{ fontSize:48, marginBottom:14 }}>🌿</div>
                <div style={{ fontSize:15, fontWeight:600, color:'#E8EFF6', marginBottom:8 }}>
                  {L('No pipelines yet','Aucun pipeline pour le moment')}
                </div>
                <p style={{ fontSize:13, maxWidth:400, margin:'0 auto 20px', lineHeight:1.7 }}>
                  {L('Start a pipeline to guide a project through the complete carbon credit certification process.',
                     'Démarrez un pipeline pour guider un projet dans le processus complet de certification de crédits carbone.')}
                </p>
                <button onClick={() => setView('new')}
                  style={{ background:'#00FF94', color:'#080B0F', border:'none', borderRadius:9, padding:'12px 28px', fontWeight:800, cursor:'pointer', fontFamily:'Syne, sans-serif', fontSize:14 }}>
                  {L('Start first pipeline →','Démarrer le premier pipeline →')}
                </button>
              </div>
            ) : (pipelines as any[]).map(p => {
              const completed = p.steps.filter(s => s.status === 'COMPLETED').length;
              const total = p.steps.length || 11;
              const pct = Math.round((completed / total) * 100);
              const currentStepDef = stepDefs.find(s => s.key === p.currentStep);
              const statusC = p.status === 'COMPLETED' ? '#00FF94' : p.status === 'BLOCKED' ? '#F87171' : '#FCD34D';
              return (
                <div key={p.id} onClick={() => loadPipeline(p.id)}
                  style={{ padding:'16px 20px', borderBottom:'1px solid rgba(30,45,61,0.4)', cursor:'pointer', transition:'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background='rgba(30,45,61,0.3)'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                    <div>
                      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4 }}>
                        <span style={{ fontSize:9, color:STD_COLOR[p.standard]||'#4A6278', background:(STD_COLOR[p.standard]||'#4A6278')+'15', border:`1px solid ${STD_COLOR[p.standard]||'#4A6278'}30`, borderRadius:4, padding:'2px 8px', fontFamily:'JetBrains Mono, monospace' }}>
                          {STD_LABEL[p.standard]}
                        </span>
                        <span style={{ fontSize:9, color:statusC, background:statusC+'15', border:`1px solid ${statusC}30`, borderRadius:4, padding:'2px 8px', fontFamily:'JetBrains Mono, monospace' }}>
                          {p.status}
                        </span>
                        <span style={{ fontSize:10, color:'#4A6278' }}>Vintage {p.vintage}</span>
                      </div>
                      <div style={{ fontSize:15, fontWeight:700, color:'#E8EFF6' }}>{p.project?.name}</div>
                      <div style={{ fontSize:11, color:'#4A6278' }}>
                        {p.project?.countryCode} · {p.project?.type} · {p.project?.installedMW}MW
                      </div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:18, fontWeight:800, color:'#00FF94', fontFamily:'Syne, sans-serif' }}>
                        {fmtK(p.estimatedCredits)} tCO₂e
                      </div>
                      <div style={{ fontSize:10, color:'#4A6278' }}>≈ {fmtUSD(p.estimatedCredits * 12)} potential</div>
                    </div>
                  </div>
                  {/* Progress bar with steps */}
                  <div style={{ marginBottom:8 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:10, color:statusC, fontFamily:'JetBrains Mono, monospace' }}>
                        {currentStepDef?.icon} {currentStepDef?.title || p.currentStep}
                      </span>
                      <span style={{ fontSize:10, color:'#4A6278', fontFamily:'JetBrains Mono, monospace' }}>{pct}% · {completed}/{total} steps</span>
                    </div>
                    <div style={{ height:6, background:'#1E2D3D', borderRadius:3, overflow:'hidden' }}>
                      <div style={{ width:`${pct}%`, height:'100%', background: p.status==='BLOCKED'?'#F87171':'#00FF94', borderRadius:3, transition:'width 0.8s ease' }}/>
                    </div>
                  </div>
                  {/* Step dots */}
                  <div style={{ display:'flex', gap:3 }}>
                    {p.steps.map(s => (
                      <div key={s.id} title={s.title || s.stepKey}
                        style={{ flex:1, height:4, borderRadius:2, background:STATUS_COLOR[s.status]||'#2A3F55', transition:'background 0.2s', cursor:'default' }}/>
                    ))}
                  </div>
                  {p.vvbName && (
                    <div style={{ marginTop:8, fontSize:11, color:'#4A6278' }}>
                      🏛️ VVB: {p.vvbName} {p.vvbContact && `· ${p.vvbContact}`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── NEW PIPELINE FORM ────────────────────────────────────────────── */}
      {view === 'new' && (
        <div style={{ maxWidth:580, margin:'0 auto' }}>
          <div style={{ background:'#0D1117', border:'1px solid #1E2D3D', borderRadius:14, padding:28 }}>
            <div style={{ fontSize:10, color:'#00FF94', fontFamily:'JetBrains Mono, monospace', marginBottom:18 }}>
              {L('START CREDIT ISSUANCE PIPELINE','DÉMARRER UN PIPELINE D\'ÉMISSION')}
            </div>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:10, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:7 }}>PROJECT *</div>
              <select value={newForm.projectId} onChange={e => setNewForm(f => ({ ...f, projectId: e.target.value }))} style={inp}>
                <option value="">{L('Select project...','Sélectionnez un projet...')}</option>
                {(projects as any[]).map(p => <option key={p.id} value={p.id}>{p.name} — {p.countryCode} · {p.installedMW}MW</option>)}
              </select>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
              <div>
                <div style={{ fontSize:10, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:7 }}>VINTAGE YEAR *</div>
                <input type="number" value={newForm.vintage} onChange={e => setNewForm(f => ({ ...f, vintage: parseInt(e.target.value) }))} style={inp}/>
              </div>
              <div>
                <div style={{ fontSize:10, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:7 }}>STANDARD *</div>
                <select value={newForm.standard} onChange={e => setNewForm(f => ({ ...f, standard: e.target.value }))} style={inp}>
                  {STANDARDS.map(s => <option key={s} value={s}>{STD_LABEL[s]}</option>)}
                </select>
              </div>
            </div>
            {/* Info box */}
            <div style={{ background:'rgba(0,255,148,0.05)', border:'1px solid rgba(0,255,148,0.15)', borderRadius:9, padding:'12px 14px', marginBottom:20 }}>
              <div style={{ fontSize:11, color:'#00FF94', fontWeight:600, marginBottom:6 }}>
                {L('What happens next?','Que se passe-t-il ensuite ?')}
              </div>
              <div style={{ fontSize:12, color:'#8FA3B8', lineHeight:1.7 }}>
                {L('PANGEA CARBON will guide your project through 11 steps: MRV data validation → PDD drafting → VVB validation → monitoring → verification → registry submission → credit issuance → marketplace listing.',
                   'PANGEA CARBON va guider votre projet en 11 étapes: validation données MRV → rédaction PDD → validation VVB → monitoring → vérification → soumission registre → émission crédits → listing marketplace.')}
              </div>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setView('list')} style={{ flex:1, background:'transparent', border:'1px solid #1E2D3D', borderRadius:9, color:'#4A6278', padding:13, cursor:'pointer' }}>
                {L('Cancel','Annuler')}
              </button>
              <button onClick={createPipeline} disabled={creating||!newForm.projectId}
                style={{ flex:2, background:creating||!newForm.projectId?'#1E2D3D':'#00FF94', color:'#080B0F', border:'none', borderRadius:9, padding:13, fontWeight:800, fontSize:13, cursor:creating?'wait':'pointer', fontFamily:'Syne, sans-serif' }}>
                {creating ? '⟳' : `🚀 ${L('Start Pipeline →','Démarrer →')}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PIPELINE DETAIL VIEW ─────────────────────────────────────────── */}
      {view === 'detail' && current && (() => {
        const p = current.pipeline;
        const completedSteps = pipelineSteps.filter(s => s.status === 'COMPLETED').length;
        const progressPct = Math.round((completedSteps / 11) * 100);

        return (
          <div style={{ display:'grid', gridTemplateColumns:'320px 1fr', gap:20 }}>

            {/* Left: Step tracker */}
            <div>
              {/* Summary card */}
              <div style={{ background:'#0D1117', border:`1px solid ${STD_COLOR[p.standard]||'#1E2D3D'}40`, borderRadius:12, padding:18, marginBottom:16 }}>
                <span style={{ fontSize:9, color:STD_COLOR[p.standard], background:STD_COLOR[p.standard]+'15', border:`1px solid ${STD_COLOR[p.standard]}30`, borderRadius:4, padding:'2px 8px', fontFamily:'JetBrains Mono, monospace' }}>
                  {STD_LABEL[p.standard]}
                </span>
                <div style={{ fontSize:16, fontWeight:700, color:'#E8EFF6', marginTop:10, marginBottom:4 }}>{p.project?.name}</div>
                <div style={{ fontSize:11, color:'#4A6278', marginBottom:12 }}>Vintage {p.vintage} · {p.project?.countryCode}</div>
                <div style={{ fontSize:28, fontWeight:800, color:'#00FF94', fontFamily:'Syne, sans-serif' }}>{fmtK(p.estimatedCredits)}</div>
                <div style={{ fontSize:11, color:'#4A6278', marginBottom:12 }}>tCO₂e estimated</div>
                <div style={{ height:8, background:'#1E2D3D', borderRadius:4, overflow:'hidden' }}>
                  <div style={{ width:`${progressPct}%`, height:'100%', background:'#00FF94', borderRadius:4, transition:'width 1s ease' }}/>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:6, fontSize:11 }}>
                  <span style={{ color:'#4A6278' }}>{completedSteps}/{11} steps</span>
                  <span style={{ color:'#00FF94', fontFamily:'JetBrains Mono, monospace' }}>{progressPct}%</span>
                </div>
              </div>

              {/* Steps list */}
              <div style={{ background:'#0D1117', border:'1px solid #1E2D3D', borderRadius:12, padding:16 }}>
                <div style={{ fontSize:10, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:14 }}>WORKFLOW STEPS</div>
                {(stepDefs as any[]).map((def, i) => {
                  const step = pipelineSteps.find(s => s.stepKey === def.key);
                  const status = step?.status || 'PENDING';
                  const color = STATUS_COLOR[status] || '#2A3F55';
                  const isCurrent = p.currentStep === def.key;
                  return (
                    <div key={def.key} style={{ display:'flex', gap:10, marginBottom:10, alignItems:'flex-start' }}>
                      {/* Line connector */}
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
                        <div style={{ width:28, height:28, borderRadius:'50%', background:color+'15', border:`2px solid ${color}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, flexShrink:0 }}>
                          {status === 'COMPLETED' ? '✓' : STEP_ICONS[def.key]}
                        </div>
                        {i < (stepDefs as any[]).length - 1 && (
                          <div style={{ width:2, height:16, background:status==='COMPLETED'?'#00FF94':'#1E2D3D', margin:'2px 0' }}/>
                        )}
                      </div>
                      <div style={{ flex:1, paddingTop:4 }}>
                        <div style={{ fontSize:12, fontWeight: isCurrent ? 700 : 400, color: isCurrent ? '#E8EFF6' : status==='PENDING' ? '#2A3F55' : '#8FA3B8' }}>
                          {def.title}
                        </div>
                        {isCurrent && (
                          <div style={{ fontSize:10, color:'#FCD34D', fontFamily:'JetBrains Mono, monospace' }}>← CURRENT</div>
                        )}
                        {status === 'BLOCKED' && (
                          <div style={{ fontSize:10, color:'#F87171' }}>BLOCKED</div>
                        )}
                        <div style={{ fontSize:9, color:'#2A3F55', marginTop:1 }}>{def.duration}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Current step action panel + documents */}
            <div>
              {/* Current step panel */}
              {(() => {
                const currentStepDef = (stepDefs as any[]).find(s => s.key === p.currentStep);
                const currentStepData = pipelineSteps.find(s => s.stepKey === p.currentStep);
                if (!currentStepDef) return null;
                return (
                  <div style={{ background:'#0D1117', border:`2px solid rgba(252,211,77,0.3)`, borderRadius:14, padding:24, marginBottom:16 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                      <span style={{ fontSize:28 }}>{STEP_ICONS[currentStepDef.key]}</span>
                      <div>
                        <div style={{ fontSize:9, color:'#FCD34D', fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.1em', marginBottom:3 }}>
                          STEP {currentStepDef.number}/11 · {L('CURRENT','EN COURS')}
                        </div>
                        <div style={{ fontSize:18, fontWeight:800, color:'#E8EFF6', fontFamily:'Syne, sans-serif' }}>{currentStepDef.title}</div>
                      </div>
                    </div>

                    <div style={{ background:'#121920', borderRadius:10, padding:'12px 14px', marginBottom:16 }}>
                      <div style={{ fontSize:13, color:'#8FA3B8', lineHeight:1.7, marginBottom:8 }}>{currentStepDef.description}</div>
                      <div style={{ display:'flex', gap:16, fontSize:11 }}>
                        <span style={{ color:'#4A6278' }}>⏱ {currentStepDef.duration}</span>
                        <span style={{ color:'#4A6278' }}>📋 {currentStepDef.requirement}</span>
                      </div>
                    </div>

                    {/* VVB assignment for VVB steps */}
                    {(p.currentStep === 'VVB_VALIDATION' || p.currentStep === 'VVB_VERIFICATION') && !p.vvbName && (
                      <div style={{ background:'rgba(56,189,248,0.08)', border:'1px solid rgba(56,189,248,0.2)', borderRadius:10, padding:'14px 16px', marginBottom:16 }}>
                        <div style={{ fontSize:11, color:'#38BDF8', fontWeight:600, marginBottom:10 }}>
                          🏛️ {L('Assign a VVB (Validation & Verification Body)','Assigner un VVB')}
                        </div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
                          <div>
                            <div style={{ fontSize:9, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:5 }}>VVB NAME *</div>
                            <select value={vvbForm.vvbName} onChange={e => setVvbForm(f => ({ ...f, vvbName: e.target.value }))} style={inp}>
                              <option value="">Select VVB...</option>
                              {VVB_LIST.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                          </div>
                          <div>
                            <div style={{ fontSize:9, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:5 }}>VVB CONTACT</div>
                            <input placeholder="email@vvb.com" value={vvbForm.vvbContact} onChange={e => setVvbForm(f => ({ ...f, vvbContact: e.target.value }))} style={inp}/>
                          </div>
                        </div>
                        <button onClick={assignVVB} disabled={!vvbForm.vvbName}
                          style={{ background:!vvbForm.vvbName?'#1E2D3D':'#38BDF8', color:'#080B0F', border:'none', borderRadius:8, padding:'9px 18px', fontWeight:700, cursor:'pointer', fontSize:12 }}>
                          {L('Assign VVB →','Assigner le VVB →')}
                        </button>
                      </div>
                    )}

                    {p.vvbName && (
                      <div style={{ fontSize:12, color:'#8FA3B8', marginBottom:12, padding:'8px 12px', background:'rgba(0,255,148,0.06)', borderRadius:7 }}>
                        🏛️ VVB: <strong style={{ color:'#E8EFF6' }}>{p.vvbName}</strong> {p.vvbContact && `· ${p.vvbContact}`}
                      </div>
                    )}

                    {/* Notes + Advance button */}
                    <div style={{ marginBottom:12 }}>
                      <div style={{ fontSize:9, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>
                        {L('COMPLETION NOTES','NOTES DE VALIDATION')}
                      </div>
                      <input placeholder={L('e.g. VVB statement received, document reference...','ex. Rapport VVB reçu, référence document...')}
                        value={advanceNotes} onChange={e => setAdvanceNotes(e.target.value)} style={inp}/>
                    </div>
                    <button onClick={() => advance(p.currentStep)} disabled={!!advancing}
                      style={{ width:'100%', background:advancing?'#1E2D3D':'#00FF94', color:'#080B0F', border:'none', borderRadius:9, padding:'13px', fontWeight:800, fontSize:14, cursor:advancing?'wait':'pointer', fontFamily:'Syne, sans-serif' }}>
                      {advancing === p.currentStep
                        ? '⟳ Processing...'
                        : `✓ ${L('Mark step as complete →','Valider cette étape →')}`}
                    </button>
                  </div>
                );
              })()}

              {/* Completed — show issuance info */}
              {p.status === 'COMPLETED' && p.issuanceId && (
                <div style={{ background:'rgba(0,255,148,0.08)', border:'2px solid rgba(0,255,148,0.3)', borderRadius:12, padding:20, marginBottom:16 }}>
                  <div style={{ fontSize:10, color:'#00FF94', fontFamily:'JetBrains Mono, monospace', marginBottom:8 }}>🎉 PIPELINE COMPLETED — CREDITS ISSUED</div>
                  <div style={{ fontSize:24, fontWeight:800, color:'#00FF94', fontFamily:'Syne, sans-serif', marginBottom:4 }}>
                    {fmtK(p.confirmedCredits || p.estimatedCredits)} tCO₂e
                  </div>
                  <div style={{ fontSize:12, color:'#8FA3B8', marginBottom:16 }}>
                    {L('Carbon credits successfully issued and recorded on PANGEA CARBON blockchain.',
                       'Crédits carbone émis et enregistrés sur la blockchain PANGEA CARBON.')}
                  </div>
                  <a href="/dashboard/marketplace" style={{ display:'inline-block', background:'#00FF94', color:'#080B0F', borderRadius:9, padding:'11px 24px', fontWeight:800, textDecoration:'none', fontFamily:'Syne, sans-serif', fontSize:13 }}>
                    🏪 {L('View on Marketplace →','Voir sur la Marketplace →')}
                  </a>
                </div>
              )}

              {/* Documents panel */}
              <div style={{ background:'#0D1117', border:'1px solid #1E2D3D', borderRadius:12, padding:20 }}>
                <div style={{ fontSize:10, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:14 }}>
                  {L('DOCUMENTS','DOCUMENTS')} ({(current.pipeline.documents || []).length})
                </div>
                {/* Add doc form */}
                <div style={{ background:'#121920', borderRadius:9, padding:14, marginBottom:14 }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
                    <div>
                      <div style={{ fontSize:9, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:5 }}>TYPE</div>
                      <select value={docForm.type} onChange={e => setDocForm(f => ({ ...f, type: e.target.value }))} style={inp}>
                        {DOC_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize:9, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:5 }}>DOCUMENT NAME *</div>
                      <input placeholder="e.g. PDD v1.2.pdf" value={docForm.name} onChange={e => setDocForm(f => ({ ...f, name: e.target.value }))} style={inp}/>
                    </div>
                  </div>
                  <div style={{ marginBottom:8 }}>
                    <div style={{ fontSize:9, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:5 }}>URL / REFERENCE</div>
                    <input placeholder="https://..." value={docForm.fileUrl} onChange={e => setDocForm(f => ({ ...f, fileUrl: e.target.value }))} style={inp}/>
                  </div>
                  <button onClick={addDocument} disabled={!docForm.name}
                    style={{ background:!docForm.name?'#1E2D3D':'rgba(0,255,148,0.15)', border:'1px solid rgba(0,255,148,0.3)', borderRadius:7, color:'#00FF94', padding:'9px 16px', cursor:'pointer', fontSize:12, fontWeight:600 }}>
                    + {L('Add Document','Ajouter document')}
                  </button>
                </div>
                {/* Docs list */}
                {(current.pipeline.documents || []).length === 0 ? (
                  <div style={{ textAlign:'center', padding:'16px 0', color:'#2A3F55', fontSize:12 }}>
                    {L('No documents yet','Aucun document encore')}
                  </div>
                ) : (current.pipeline.documents || []).map(doc => (
                  <div key={doc.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 12px', background:'#121920', borderRadius:8, marginBottom:6 }}>
                    <div>
                      <div style={{ fontSize:11, color:'#E8EFF6' }}>{doc.name}</div>
                      <div style={{ fontSize:9, color:'#4A6278', fontFamily:'JetBrains Mono, monospace' }}>{doc.type} · SHA-{doc.hash}</div>
                    </div>
                    {doc.fileUrl && (
                      <a href={doc.fileUrl} target="_blank" rel="noreferrer"
                        style={{ fontSize:11, color:'#00FF94', textDecoration:'none', padding:'4px 10px', border:'1px solid rgba(0,255,148,0.2)', borderRadius:5 }}>
                        Open →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
