'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { useLang } from '@/lib/lang-context';
import { fetchAuthJson } from '@/lib/fetch-auth';
import { api } from '@/lib/api';

const fmtK=(n)=>(n||0)>=1000?((n||0)/1000).toFixed(1)+'K':String(Math.round(n||0));
const fmtUSD=(n)=>'$'+Math.round(n||0).toLocaleString('en-US');
const fmtM=(n)=>(n||0)>=1e6?'$'+((n||0)/1e6).toFixed(2)+'M':fmtUSD(n);

const ICONS={MRV_DATA:'📊',MRV_CALCULATION:'🧮',PDD:'📄',VVB_VALIDATION:'🏛️',MONITORING_PERIOD:'📡',MONITORING_REPORT:'📋',VVB_VERIFICATION:'✅',REGISTRY_SUBMISSION:'📤',REGISTRY_REVIEW:'🔍',CREDIT_ISSUANCE:'🌿',MARKET_LISTING:'🏪'};
const SC={COMPLETED:'#00FF94',IN_PROGRESS:'#FCD34D',PENDING:'#2A3F55',BLOCKED:'#F87171'};
const STDC={VERRA_VCS:'#00FF94',GOLD_STANDARD:'#FCD34D',ARTICLE6:'#38BDF8',CORSIA:'#F87171'};
const STDL={VERRA_VCS:'Verra VCS',GOLD_STANDARD:'Gold Standard',ARTICLE6:'Article 6 ITMO',CORSIA:'CORSIA'};
const VVB_OPTIONS=[
  {name:'Bureau Veritas',contact:'environmental@bureauveritas.com',regions:'CI/GH/KE/NG/ZA'},
  {name:'DNV AS',contact:'carbon.programmes@dnv.com',regions:'KE/ZA/ET/TZ'},
  {name:'SGS SA',contact:'climate.change@sgs.com',regions:'CI/GH/SN/CM/ML'},
  {name:'SCS Global Services',contact:'climate@scsglobalservices.com',regions:'KE/TZ/RW/UG'},
  {name:'AENOR',contact:'internacionalizacion@aenor.com',regions:'MA/SN/CI'},
  {name:'RINA Services',contact:'sustainability@rina.org',regions:'ZA/NG/ET'},
];

const DOC_TYPE_LABELS = {
  PDD:'📄 Project Design Document',
  MONITORING_REPORT:'📋 Rapport de Monitoring',
  VVB_VALIDATION_STATEMENT:'🏛️ Statement de Validation VVB',
  VVB_VERIFICATION_STATEMENT:'✅ Statement de Vérification VVB',
  REGISTRY_SUBMISSION_PACKAGE:'📤 Package Soumission Registre',
  BASELINE_STUDY:'📊 Étude Baseline',
  STAKEHOLDER_CONSULTATION:'🤝 Consultation Parties Prenantes',
  OTHER:'📁 Autre Document',
};

const DOC_TYPES=['PDD','MONITORING_REPORT','VVB_VALIDATION_STATEMENT','VVB_VERIFICATION_STATEMENT','REGISTRY_SUBMISSION_PACKAGE','BASELINE_STUDY','STAKEHOLDER_CONSULTATION','OTHER'];

const STEP_REQUIREMENTS = {
  MRV_DATA:            { docs:[], desc:'≥1 lecture de production enregistrée dans Projets' },
  MRV_CALCULATION:     { docs:[], desc:'Calcul MRV exécuté depuis le module MRV' },
  PDD:                 { docs:['PDD'], desc:'Project Design Document uploadé' },
  VVB_VALIDATION:      { docs:['VVB_VALIDATION_STATEMENT'], desc:'VVB assigné + Validation Statement uploadé' },
  MONITORING_PERIOD:   { docs:[], desc:'Données de monitoring enregistrées' },
  MONITORING_REPORT:   { docs:['MONITORING_REPORT'], desc:'Rapport de Monitoring annuel uploadé' },
  VVB_VERIFICATION:    { docs:['VVB_VERIFICATION_STATEMENT'], desc:'VVB Verification Statement uploadé' },
  REGISTRY_SUBMISSION: { docs:['PDD','MONITORING_REPORT','VVB_VALIDATION_STATEMENT','VVB_VERIFICATION_STATEMENT','REGISTRY_SUBMISSION_PACKAGE'], desc:'Package complet: PDD + Monitoring + 2 VVB Statements + Package Registre' },
  REGISTRY_REVIEW:     { docs:[], desc:'Crédits confirmés renseignés (quantité officielle registre)' },
  CREDIT_ISSUANCE:     { docs:[], desc:'Quantité de crédits confirmée par le registre officiel' },
  MARKET_LISTING:      { docs:[], desc:'Crédits émis sur blockchain PANGEA CARBON' },
};

const STDS=['VERRA_VCS','GOLD_STANDARD','ARTICLE6','CORSIA'];
const STEP_DESC={
  MRV_DATA:'Energy production data collected via IoT/SCADA or CSV. Minimum 12 monthly readings required.',
  MRV_CALCULATION:'Gross reductions = EG_RE × EF_grid (ACM0002 §3.1). Leakage 3% (§4.2) and uncertainty 5% (§8.1) deducted.',
  PDD:'Project Design Document: methodology, baseline, additionality, monitoring plan. Verra VCS v4.0 / GS v1.2 template.',
  VVB_VALIDATION:'Accredited VVB verifies PDD against Verra/GS methodology. Issues validation statement.',
  MONITORING_PERIOD:'Continuous IoT/SCADA monitoring. Minimum 12 months. Data archived with SHA-256 integrity verification.',
  MONITORING_REPORT:'Annual compilation: production data, emission calculations, QA/QC documentation.',
  VVB_VERIFICATION:'Independent spot-checks, data verification, uncertainty assessment. Issues verification statement.',
  REGISTRY_SUBMISSION:'Package submitted to Verra/GS: PDD + Monitoring Report + VVB Statements + Supporting docs.',
  REGISTRY_REVIEW:'Verra/GS technical review + 30-day public stakeholder consultation. Final approval.',
  CREDIT_ISSUANCE:'VCUs issued on official Verra registry + PANGEA CARBON blockchain. Serial numbers assigned.',
  MARKET_LISTING:'Credits listed on PANGEA CARBON Exchange at live CBL market reference price.',
};

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
  const [creating, setCreating] = useState(false);
  const [advancing, setAdvancing] = useState('');
  const [confirmBlock, setConfirmBlock] = useState(null);
  const [confirmDocDelete, setConfirmDocDelete] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [newForm, setNewForm] = useState({ projectId:'', vintage:new Date().getFullYear()-1, standard:'VERRA_VCS' });
  const [vvbForm, setVvbForm] = useState({ vvbName:'', vvbContact:'' });
  const [docForm, setDocForm] = useState({ type:'PDD', name:'', fileUrl:'' });
  const [advNotes, setAdvNotes] = useState('');
  const [confirmedCredits, setConfirmedCredits] = useState('');
  const [uploading, setUploading] = useState(false);
  const [gateError, setGateError] = useState(null);

  const toast$ = (msg, type='success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const [p, proj, s] = await Promise.all([
        fetchAuthJson('/pipeline').catch(() => ({ pipelines:[], stepDefinitions:[] })),
        api.getProjects().catch(() => ({ projects:[] })),
        fetchAuthJson('/pipeline/stats/global').catch(() => null),
      ]);
      setPipelines(p.pipelines || []);
      if (p.stepDefinitions?.length) setStepDefs(p.stepDefinitions);
      setProjects(Array.isArray(proj) ? proj : proj.projects || []);
      setStats(s);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  const loadDetail = useCallback(async (id) => {
    setLoading(true);
    try {
      const r = await fetchAuthJson('/pipeline/' + id);
      setCurrent(r);
      if (r.stepDefinitions?.length) setStepDefs(r.stepDefinitions);
      setView('detail');
    } catch(e) { toast$(e.message||'Load failed','error'); }
    finally { setLoading(false); }
  }, []);

  const createPipeline = async () => {
    if (!newForm.projectId) return;
    setCreating(true);
    try {
      const r = await fetchAuthJson('/pipeline', { method:'POST', body:JSON.stringify(newForm) });
      if (r.error) throw new Error(r.error);
      toast$(r.message || 'Pipeline started!');
      await loadList();
      if (r.pipeline?.id) await loadDetail(r.pipeline.id);
    } catch(e) { toast$(e.message||'Error','error'); }
    finally { setCreating(false); }
  };

  const advance = async (stepKey) => {
    if (!current || advancing) return;
    setAdvancing(stepKey);
    try {
      const body = { stepKey, notes:advNotes };
      if ((stepKey === 'REGISTRY_REVIEW' || stepKey === 'CREDIT_ISSUANCE') && confirmedCredits) {
        body.confirmedCredits = parseFloat(confirmedCredits);
      }
      const r = await fetchAuthJson('/pipeline/' + current.pipeline.id + '/advance', {
        method:'POST', body:JSON.stringify(body)
      });
      if (r.error) throw new Error(r.error);
      setCurrent(r);
      if (r.stepDefinitions?.length) setStepDefs(r.stepDefinitions);
      setAdvNotes('');
      setConfirmedCredits('');
      toast$(r.message || 'Step completed!');
      loadList();
    } catch(e) { toast$(e.message||'Failed','error'); }
    finally { setAdvancing(''); }
  };

  const blockStep = async (stepKey, reason) => {
    if (!current) return;
    try {
      const r = await fetchAuthJson('/pipeline/' + current.pipeline.id + '/block', {
        method:'POST', body:JSON.stringify({ stepKey, reason })
      });
      setCurrent(r);
      setConfirmBlock(null);
      toast$('Step blocked','error');
    } catch(e) { toast$(e.message,'error'); }
  };

  const assignVVB = async () => {
    if (!current || !vvbForm.vvbName) return;
    try {
      const r = await fetchAuthJson('/pipeline/' + current.pipeline.id + '/assign-vvb', {
        method:'POST', body:JSON.stringify(vvbForm)
      });
      setCurrent(r);
      toast$('VVB assigned!');
    } catch(e) { toast$(e.message,'error'); }
  };

  const addDoc = async () => {
    if (!current) { toast$('No pipeline selected','error'); return; }
    if (!docForm.name.trim()) { toast$('Document name is required','error'); return; }
    try {
      const body = { type:docForm.type, name:docForm.name.trim(), fileUrl:docForm.fileUrl||null };
      await fetchAuthJson('/pipeline/' + current.pipeline.id + '/documents', {
        method:'POST', body:JSON.stringify(body)
      });
      setDocForm({ type:'PDD', name:'', fileUrl:'' });
      await loadDetail(current.pipeline.id);
      toast$('Document added!');
    } catch(e) { toast$(e.message||'Failed to add document','error'); }
  };

  const uploadFile = async (file, docType) => {
    if (!current || !file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', docType || docForm.type || 'PDD');
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(apiUrl+'/pipeline/'+current.pipeline.id+'/upload', {
        method: 'POST',
        headers: { Authorization: 'Bearer '+token },
        body: fd,
      });
      if (!res.ok) {
        // Fallback: juste enregistrer le nom sans upload
        const body = { type:docForm.type, name:file.name, fileUrl:null };
        await fetchAuthJson('/pipeline/' + current.pipeline.id + '/documents', {
          method:'POST', body:JSON.stringify(body)
        });
        toast$(file.name+' registered (upload not configured)');
      } else {
        toast$(file.name+' uploaded!');
      }
      setDocForm({ type:'PDD', name:'', fileUrl:'' });
      await loadDetail(current.pipeline.id);
    } catch(e) { toast$(e.message||'Upload failed','error'); }
    finally { setUploading(false); }
  };

  const deleteDoc = async (docId) => {
    setConfirmDocDelete(docId);
  };

  const executeDeleteDoc = async (docId) => {
    setConfirmDocDelete(null);
    try {
      await fetchAuthJson('/pipeline/' + current.pipeline.id + '/documents/' + docId, { method:'DELETE' });
      await loadDetail(current.pipeline.id);
      toast$('Deleted');
    } catch(e) { toast$(e.message,'error'); }
  };

  const cancelPipeline = async () => {
    setConfirmCancel(false);
    if (!current) return;
    try {
      await fetchAuthJson('/pipeline/' + current.pipeline.id, { method:'DELETE' });
      toast$('Pipeline cancelled');
      setView('list');
      setCurrent(null);
      loadList();
    } catch(e) { toast$(e.message,'error'); }
  };

  const inp = {
    background:'#121920', border:'1px solid #1E2D3D', borderRadius:8,
    color:'#E8EFF6', padding:'9px 12px', fontSize:13, outline:'none',
    width:'100%', boxSizing:'border-box',
  };
  const p = current?.pipeline;
  const pSteps = p?.steps || [];
  const completedN = pSteps.filter(s => s.status === 'COMPLETED').length;
  const progressPct = Math.round((completedN / 11) * 100);
  const curDef = stepDefs.find(s => s.key === p?.currentStep);

  return (
    <div style={{ padding:20, maxWidth:1400, margin:'0 auto' }}>

      {toast && (
        <div style={{ position:'fixed', top:20, right:20, zIndex:99999, maxWidth:420 }}>
          <div style={{ background:toast.type==='error'?'rgba(248,113,113,0.1)':toast.type==='warning'?'rgba(252,211,77,0.1)':'rgba(0,255,148,0.08)', border:'1px solid '+(toast.type==='error'?'rgba(248,113,113,0.35)':toast.type==='warning'?'rgba(252,211,77,0.3)':'rgba(0,255,148,0.3)'), borderRadius:12, padding:'14px 18px', display:'flex', alignItems:'center', gap:12, backdropFilter:'blur(20px)', boxShadow:'0 8px 32px rgba(0,0,0,0.5)', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3, background:toast.type==='error'?'#F87171':toast.type==='warning'?'#FCD34D':'#00FF94', borderRadius:'12px 0 0 12px' }}/>
            <div style={{ width:22, height:22, borderRadius:'50%', background:toast.type==='error'?'rgba(248,113,113,0.15)':'rgba(0,255,148,0.15)', border:'1px solid '+(toast.type==='error'?'rgba(248,113,113,0.3)':'rgba(0,255,148,0.3)'), display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, color:toast.type==='error'?'#F87171':'#00FF94', fontWeight:800, marginLeft:8 }}>
              {toast.type==='error'?'✗':'✓'}
            </div>
            <span style={{ fontSize:13, color:'#E8EFF6', flex:1 }}>{toast.msg}</span>
          </div>
        </div>
      )}

      {confirmBlock && (
        <div style={{ position:'fixed', inset:0, background:'rgba(8,11,15,0.88)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1100, padding:16 }}>
          <div style={{ background:'#0D1117', border:'1px solid rgba(248,113,113,0.4)', borderRadius:16, padding:28, maxWidth:420, width:'100%' }}>
            <div style={{ fontSize:9, color:'#F87171', fontFamily:'JetBrains Mono, monospace', marginBottom:8 }}>BLOCK STEP</div>
            <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:17, color:'#E8EFF6', marginBottom:16 }}>Block: {ICONS[confirmBlock.stepKey]} {confirmBlock.title}?</h2>
            <textarea placeholder="Reason for blocking..." id="blockReason" style={{ ...inp, height:80, resize:'vertical', marginBottom:14 }}/>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setConfirmBlock(null)} style={{ flex:1, background:'transparent', border:'1px solid #1E2D3D', borderRadius:8, color:'#4A6278', padding:12, cursor:'pointer' }}>Cancel</button>
              <button onClick={() => blockStep(confirmBlock.stepKey, (document.getElementById('blockReason') ? document.getElementById('blockReason').value : 'Blocked'))}
                style={{ flex:1, background:'#F87171', color:'#fff', border:'none', borderRadius:8, padding:12, fontWeight:700, cursor:'pointer' }}>
                🔒 Block step
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ fontSize:9, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.12em', marginBottom:4 }}>VERRA ACM0002 · GOLD STANDARD · ARTICLE 6 PIPELINE</div>
          <h1 style={{ fontFamily:'Syne, sans-serif', fontSize:22, fontWeight:800, color:'#E8EFF6', margin:'0 0 4px' }}>
            {L('Carbon Credit Issuance Pipeline','Pipeline Émission Crédits Carbone')}
          </h1>
          <p style={{ fontSize:13, color:'#4A6278', margin:0 }}>
            {L('11-step workflow · MRV → PDD → VVB → Registry → Blockchain issuance · Real VVBs accredited',
               'Workflow 11 étapes · MRV → PDD → VVB → Registre → Émission blockchain · VVBs accrédités réels')}
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {view !== 'list' && (
            <button onClick={() => { setView('list'); setCurrent(null); }}
              style={{ background:'transparent', border:'1px solid #1E2D3D', borderRadius:8, color:'#4A6278', padding:'9px 16px', cursor:'pointer', fontSize:12 }}>
              ← {L('All','Tous')}
            </button>
          )}
          <button onClick={() => setView('new')}
            style={{ background:'#00FF94', color:'#080B0F', border:'none', borderRadius:8, padding:'10px 20px', fontWeight:800, cursor:'pointer', fontSize:13, fontFamily:'Syne, sans-serif' }}>
            + {L('New Pipeline','Nouveau')}
          </button>
        </div>
      </div>

      {/* LIST */}
      {view === 'list' && (<>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:18 }}>
          {[
            { label:L('Active','Actifs'), v:String(stats?.active||0), c:'#FCD34D', icon:'⚡' },
            { label:L('Completed','Terminés'), v:String(stats?.completed||0), c:'#00FF94', icon:'🏆' },
            { label:L('Credits in pipeline','En cours'), v:`${fmtK(stats?.creditsInPipeline||0)} t`, c:'#38BDF8', icon:'🌿' },
            { label:L('Credits issued','Émis'), v:`${fmtK(stats?.creditsIssued||0)} t`, c:'#A78BFA', icon:'⛓️' },
          ].map(k => (
            <div key={k.label} style={{ background:'#0D1117', border:`1px solid ${k.c}20`, borderRadius:12, padding:'13px 15px', position:'relative' }}>
              <div style={{ position:'absolute', top:12, right:14, fontSize:18, opacity:0.3 }}>{k.icon}</div>
              <div style={{ fontSize:9, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:5 }}>{k.label.toUpperCase()}</div>
              <div style={{ fontSize:22, fontWeight:800, color:k.c, fontFamily:'Syne, sans-serif' }}>{k.v}</div>
            </div>
          ))}
        </div>

        {stepDefs.length > 0 && (
          <div style={{ background:'#0D1117', border:'1px solid #1E2D3D', borderRadius:12, padding:'16px 18px', marginBottom:18, overflowX:'auto' }}>
            <div style={{ fontSize:9, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:12 }}>WORKFLOW — 11 STEPS · 6-24 MONTHS</div>
            <div style={{ display:'flex', alignItems:'center', minWidth:880 }}>
              {stepDefs.map((s, i) => (
                <div key={s.key} style={{ display:'flex', alignItems:'center', flex:1 }}>
                  <div style={{ textAlign:'center', flex:1 }}>
                    <div style={{ width:30, height:30, borderRadius:'50%', background:'rgba(0,255,148,0.08)', border:'1px solid rgba(0,255,148,0.2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 4px', fontSize:13 }}>{ICONS[s.key]}</div>
                    <div style={{ fontSize:9, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', lineHeight:1.3, maxWidth:65 }}>{s.title.split(' ').slice(0,2).join(' ')}</div>
                    <div style={{ fontSize:8, color:'#2A3F55', marginTop:2 }}>{(s.duration||'').split(' ').slice(0,2).join(' ')}</div>
                  </div>
                  {i < stepDefs.length-1 && <div style={{ width:18, flexShrink:0, color:'#2A3F55', fontSize:13, textAlign:'center' }}>→</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ background:'#0D1117', border:'1px solid #1E2D3D', borderRadius:12, overflow:'hidden' }}>
          <div style={{ padding:'12px 18px', background:'#121920', borderBottom:'1px solid #1E2D3D', display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontSize:10, color:'#4A6278', fontFamily:'JetBrains Mono, monospace' }}>PIPELINES — {pipelines.length}</span>
            <button onClick={loadList} style={{ background:'transparent', border:'none', color:'#4A6278', cursor:'pointer', fontSize:12 }}>↺</button>
          </div>
          {loading ? (
            <div style={{ padding:40, textAlign:'center', color:'#4A6278' }}>⟳ Loading...</div>
          ) : pipelines.length === 0 ? (
            <div style={{ padding:48, textAlign:'center' }}>
              <div style={{ fontSize:44, marginBottom:12 }}>🌿</div>
              <div style={{ fontSize:15, color:'#E8EFF6', marginBottom:16 }}>{L('No pipelines yet','Aucun pipeline')}</div>
              <button onClick={() => setView('new')} style={{ background:'#00FF94', color:'#080B0F', border:'none', borderRadius:9, padding:'11px 24px', fontWeight:800, cursor:'pointer', fontFamily:'Syne, sans-serif' }}>
                {L('Start first pipeline →','Démarrer →')}
              </button>
            </div>
          ) : pipelines.map(pl => {
            const done = pl.steps.filter(s => s.status === 'COMPLETED').length;
            const pct  = Math.round((done/(pl.steps.length||11))*100);
            const curS = stepDefs.find(s => s.key === pl.currentStep);
            const sc   = pl.status==='COMPLETED'?'#00FF94':pl.status==='BLOCKED'?'#F87171':'#FCD34D';
            return (
              <div key={pl.id} onClick={() => loadDetail(pl.id)}
                style={{ padding:'15px 18px', borderBottom:'1px solid rgba(30,45,61,0.4)', cursor:'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(30,45,61,0.3)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:9 }}>
                  <div>
                    <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:4 }}>
                      <span style={{ fontSize:9, color:STDC[pl.standard]||'#4A6278', background:(STDC[pl.standard]||'#4A6278')+'15', border:`1px solid ${STDC[pl.standard]||'#4A6278'}30`, borderRadius:4, padding:'2px 7px', fontFamily:'JetBrains Mono, monospace' }}>{STDL[pl.standard]}</span>
                      <span style={{ fontSize:9, color:sc, background:sc+'15', borderRadius:4, padding:'2px 7px', fontFamily:'JetBrains Mono, monospace' }}>{pl.status}</span>
                      <span style={{ fontSize:10, color:'#4A6278' }}>Vintage {pl.vintage}</span>
                    </div>
                    <div style={{ fontSize:14, fontWeight:700, color:'#E8EFF6' }}>{pl.project?.name}</div>
                    <div style={{ fontSize:11, color:'#4A6278' }}>{pl.project?.countryCode} · {pl.project?.type} · {pl.project?.installedMW}MW</div>
                    {pl.vvbName && <div style={{ fontSize:10, color:'#4A6278', marginTop:2 }}>🏛️ {pl.vvbName}</div>}
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:17, fontWeight:800, color:'#00FF94', fontFamily:'Syne, sans-serif' }}>{fmtK(pl.estimatedCredits)} tCO₂e</div>
                    <div style={{ fontSize:10, color:'#4A6278' }}>≈ {fmtM((pl.estimatedCredits||0)*12)} potential</div>
                    <div style={{ fontSize:9, color:'#2A3F55' }}>{pl._count?.documents||0} docs</div>
                  </div>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, fontSize:10 }}>
                  <span style={{ color:sc, fontFamily:'JetBrains Mono, monospace' }}>{ICONS[pl.currentStep]} {curS?.title||pl.currentStep}</span>
                  <span style={{ color:'#4A6278', fontFamily:'JetBrains Mono, monospace' }}>{pct}% · {done}/{pl.steps.length}</span>
                </div>
                <div style={{ height:5, background:'#1E2D3D', borderRadius:3, overflow:'hidden', marginBottom:5 }}>
                  <div style={{ width:`${pct}%`, height:'100%', background:pl.status==='BLOCKED'?'#F87171':'#00FF94', borderRadius:3 }}/>
                </div>
                <div style={{ display:'flex', gap:2 }}>
                  {pl.steps.map(s => <div key={s.id} title={s.stepKey} style={{ flex:1, height:3, borderRadius:1, background:SC[s.status]||'#2A3F55' }}/>)}
                </div>
              </div>
            );
          })}
        </div>
      </>)}

      {/* NEW */}
      {view === 'new' && (
        <div style={{ maxWidth:600, margin:'0 auto' }}>
          <div style={{ background:'#0D1117', border:'1px solid #1E2D3D', borderRadius:14, padding:28 }}>
            <div style={{ fontSize:10, color:'#00FF94', fontFamily:'JetBrains Mono, monospace', marginBottom:18 }}>NEW CREDIT ISSUANCE PIPELINE</div>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:10, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>PROJECT *</div>
              <select value={newForm.projectId} onChange={e => setNewForm(f => ({ ...f, projectId:e.target.value }))} style={inp}>
                <option value="">{L('Select project...','Sélectionnez...')}</option>
                {projects.map(pr => <option key={pr.id} value={pr.id}>{pr.name} — {pr.countryCode} · {pr.type} · {pr.installedMW}MW</option>)}
              </select>
              {projects.length === 0 && <div style={{ fontSize:11, color:'#FCD34D', marginTop:5 }}>⚠ {L('No projects — create one in Projects tab','Aucun projet — créez-en un dans Projets')}</div>}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
              <div>
                <div style={{ fontSize:10, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>VINTAGE YEAR *</div>
                <input type="number" min="2015" max="2030" value={newForm.vintage} onChange={e => setNewForm(f => ({ ...f, vintage:parseInt(e.target.value) }))} style={inp}/>
              </div>
              <div>
                <div style={{ fontSize:10, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>STANDARD *</div>
                <select value={newForm.standard} onChange={e => setNewForm(f => ({ ...f, standard:e.target.value }))} style={inp}>
                  {STDS.map(s => <option key={s} value={s}>{STDL[s]}</option>)}
                </select>
              </div>
            </div>
            <div style={{ background:'rgba(0,255,148,0.05)', border:'1px solid rgba(0,255,148,0.15)', borderRadius:9, padding:'12px 14px', marginBottom:20 }}>
              <div style={{ fontSize:11, color:'#00FF94', fontWeight:600, marginBottom:5 }}>{L('What happens next?','Que se passe-t-il ?')}</div>
              <div style={{ fontSize:12, color:'#8FA3B8', lineHeight:1.7 }}>
                {L('11-step workflow: MRV auto-check → PDD → VVB validation → Monitoring → Verification → Registry → Blockchain issuance. Duration: 6-24 months.',
                   '11 étapes: MRV auto → PDD → Validation VVB → Monitoring → Vérification → Registre → Émission blockchain. Durée: 6-24 mois.')}
              </div>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setView('list')} style={{ flex:1, background:'transparent', border:'1px solid #1E2D3D', borderRadius:9, color:'#4A6278', padding:13, cursor:'pointer' }}>
                {L('Cancel','Annuler')}
              </button>
              <button onClick={createPipeline} disabled={creating||!newForm.projectId}
                style={{ flex:2, background:creating||!newForm.projectId?'#1E2D3D':'#00FF94', color:'#080B0F', border:'none', borderRadius:9, padding:13, fontWeight:800, fontSize:13, cursor:creating||!newForm.projectId?'not-allowed':'pointer', fontFamily:'Syne, sans-serif' }}>
                {creating ? '⟳ Creating...' : `🚀 ${L('Start Pipeline →','Démarrer →')}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL */}
      {view === 'detail' && current && p && (
        <div style={{ display:'grid', gridTemplateColumns:'290px 1fr', gap:16 }}>

          {/* Left: timeline */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ background:'#0D1117', border:`1px solid ${STDC[p.standard]||'#1E2D3D'}40`, borderRadius:12, padding:16 }}>
              <span style={{ fontSize:9, color:STDC[p.standard], background:STDC[p.standard]+'15', border:`1px solid ${STDC[p.standard]}30`, borderRadius:4, padding:'2px 8px', fontFamily:'JetBrains Mono, monospace' }}>{STDL[p.standard]}</span>
              <div style={{ fontSize:15, fontWeight:700, color:'#E8EFF6', marginTop:10, marginBottom:2 }}>{p.project?.name}</div>
              <div style={{ fontSize:11, color:'#4A6278', marginBottom:10 }}>Vintage {p.vintage} · {p.project?.countryCode}</div>
              <div style={{ fontSize:24, fontWeight:800, color:'#00FF94', fontFamily:'Syne, sans-serif' }}>{fmtK(p.confirmedCredits||p.estimatedCredits)}</div>
              <div style={{ fontSize:10, color:'#4A6278', marginBottom:10 }}>{p.confirmedCredits?'tCO₂e confirmed':'tCO₂e estimated'}</div>
              <div style={{ height:6, background:'#1E2D3D', borderRadius:3 }}>
                <div style={{ width:`${progressPct}%`, height:'100%', background:p.status==='BLOCKED'?'#F87171':'#00FF94', borderRadius:3, transition:'width 0.8s' }}/>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginTop:4 }}>
                <span style={{ color:'#4A6278' }}>{completedN}/11</span>
                <span style={{ color:'#00FF94', fontFamily:'JetBrains Mono, monospace' }}>{progressPct}%</span>
              </div>
              {p.vvbName && <div style={{ marginTop:10, padding:'7px 10px', background:'rgba(56,189,248,0.08)', borderRadius:7, fontSize:11, color:'#38BDF8' }}>🏛️ {p.vvbName}</div>}
              {p.issuanceId && <div style={{ marginTop:6, padding:'6px 10px', background:'rgba(0,255,148,0.06)', borderRadius:7, fontSize:10, color:'#00FF94', fontFamily:'monospace', wordBreak:'break-all' }}>⛓️ {p.issuanceId.slice(0,24)}...</div>}
            </div>

            <div style={{ background:'#0D1117', border:'1px solid #1E2D3D', borderRadius:12, padding:14 }}>
              <div style={{ fontSize:9, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:12 }}>WORKFLOW STEPS</div>
              {stepDefs.map((def, i) => {
                const st  = pSteps.find(s => s.stepKey === def.key);
                const sts = st?.status||'PENDING';
                const col = SC[sts]||'#2A3F55';
                const isCur = p.currentStep === def.key;
                return (
                  <div key={def.key} style={{ display:'flex', gap:8, marginBottom:7, alignItems:'flex-start' }}>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
                      <div style={{ width:24, height:24, borderRadius:'50%', background:col+'15', border:`2px solid ${col}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, flexShrink:0 }}>
                        {sts==='COMPLETED'?'✓':ICONS[def.key]}
                      </div>
                      {i < stepDefs.length-1 && <div style={{ width:2, height:12, background:sts==='COMPLETED'?'#00FF94':'#1E2D3D', margin:'2px 0' }}/>}
                    </div>
                    <div style={{ flex:1, paddingTop:2 }}>
                      <div style={{ fontSize:11, fontWeight:isCur?700:400, color:isCur?'#E8EFF6':sts==='PENDING'?'#2A3F55':'#8FA3B8' }}>{def.title}</div>
                      {isCur && <div style={{ fontSize:9, color:'#FCD34D', fontFamily:'JetBrains Mono, monospace' }}>← CURRENT</div>}
                      {sts==='BLOCKED' && <div style={{ fontSize:9, color:'#F87171' }}>BLOCKED</div>}
                      {sts==='COMPLETED' && st?.completedAt && <div style={{ fontSize:9, color:'#2A3F55' }}>{new Date(st.completedAt).toLocaleDateString()}</div>}
                    </div>
                  </div>
                );
              })}
            </div>

            {p.status==='ACTIVE' && (
              <button onClick={cancelPipeline} style={{ background:'transparent', border:'1px solid rgba(248,113,113,0.3)', borderRadius:9, color:'#F87171', padding:'9px', cursor:'pointer', fontSize:12 }}>
                {L('Cancel pipeline','Annuler le pipeline')}
              </button>
            )}
          </div>

          {/* Right: action + docs */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

            {/* Current step action */}
            {curDef && p.status!=='COMPLETED' && (
              <div style={{ background:'#0D1117', border:'2px solid rgba(252,211,77,0.35)', borderRadius:14, padding:22 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                  <span style={{ fontSize:24 }}>{ICONS[curDef.key]}</span>
                  <div>
                    <div style={{ fontSize:9, color:'#FCD34D', fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.1em', marginBottom:2 }}>STEP {curDef.n}/11 · IN PROGRESS</div>
                    <div style={{ fontSize:17, fontWeight:800, color:'#E8EFF6', fontFamily:'Syne, sans-serif' }}>{curDef.title}</div>
                  </div>
                  <button onClick={() => setConfirmBlock({ stepKey:curDef.key, title:curDef.title })}
                    style={{ marginLeft:'auto', background:'transparent', border:'1px solid rgba(248,113,113,0.3)', borderRadius:7, color:'#F87171', padding:'6px 12px', cursor:'pointer', fontSize:11 }}>
                    🔒 {L('Block','Bloquer')}
                  </button>
                </div>

                <div style={{ background:'#121920', borderRadius:9, padding:'12px 14px', marginBottom:14 }}>
                  <div style={{ fontSize:12, color:'#8FA3B8', lineHeight:1.7, marginBottom:7 }}>{STEP_DESC[curDef.key] || curDef.description || ''}</div>
                  <div style={{ display:'flex', gap:14, fontSize:11 }}>
                    <span style={{ color:'#4A6278' }}>⏱ {curDef.duration}</span>
                    <span style={{ color:'#4A6278' }}>📋 {curDef.requirement}</span>
                  </div>
                </div>

                {/* VVB panel */}
                {(p.currentStep==='VVB_VALIDATION'||p.currentStep==='VVB_VERIFICATION') && (
                  <div style={{ background:'rgba(56,189,248,0.08)', border:'1px solid rgba(56,189,248,0.2)', borderRadius:10, padding:14, marginBottom:14 }}>
                    <div style={{ fontSize:11, color:'#38BDF8', fontWeight:600, marginBottom:10 }}>
                      🏛️ {p.vvbName ? `VVB: ${p.vvbName}` : L('Assign Accredited VVB','Assigner VVB accrédité')}
                    </div>
                    {!p.vvbName && (<>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
                        <div>
                          <div style={{ fontSize:9, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:4 }}>VVB *</div>
                          <select value={vvbForm.vvbName} onChange={e => {
                            const v = VVB_OPTIONS.find(x => x.name===e.target.value);
                            setVvbForm({ vvbName:e.target.value, vvbContact:v?.contact||'' });
                          }} style={inp}>
                            <option value="">Select VVB...</option>
                            {VVB_OPTIONS.map(v => <option key={v.name} value={v.name}>{v.name} ({v.regions})</option>)}
                          </select>
                        </div>
                        <div>
                          <div style={{ fontSize:9, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:4 }}>CONTACT</div>
                          <input value={vvbForm.vvbContact} onChange={e => setVvbForm(f => ({ ...f, vvbContact:e.target.value }))} style={inp}/>
                        </div>
                      </div>
                      <button onClick={assignVVB} disabled={!vvbForm.vvbName}
                        style={{ background:!vvbForm.vvbName?'#1E2D3D':'#38BDF8', color:'#080B0F', border:'none', borderRadius:8, padding:'9px 18px', fontWeight:700, cursor:'pointer', fontSize:12 }}>
                        {L('Assign VVB →','Assigner →')}
                      </button>
                    </>)}
                  </div>
                )}

                {/* Confirmed credits field */}
                {(p.currentStep==='REGISTRY_REVIEW'||p.currentStep==='CREDIT_ISSUANCE') && (
                  <div style={{ marginBottom:14 }}>
                    <div style={{ fontSize:9, color:'#FCD34D', fontFamily:'JetBrains Mono, monospace', marginBottom:5 }}>
                      CONFIRMED CREDITS (tCO₂e) — {L('from official registry','du registre officiel')}
                    </div>
                    <input type="number" step="1" placeholder={`${Math.round(p.estimatedCredits||0).toLocaleString()} (estimated — enter confirmed qty from Verra/GS)`}
                      value={confirmedCredits} onChange={e => setConfirmedCredits(e.target.value)} style={inp}/>
                  </div>
                )}

                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:9, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:5 }}>NOTES / EVIDENCE REFERENCE</div>
                  <input placeholder={L('e.g. VVB statement BV-2026-CI-0042, PDD v2.1...','ex. Rapport VVB BV-2026-CI-0042, PDD v2.1...')}
                    value={advNotes} onChange={e => setAdvNotes(e.target.value)} style={inp}/>
                </div>

                {/* BOUTON NEXT — BIEN VISIBLE */}
                <div style={{ background:'rgba(0,255,148,0.04)', border:'1px solid rgba(0,255,148,0.15)', borderRadius:10, padding:'14px', marginTop:4 }}>
                  <div style={{ fontSize:9, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:8, textAlign:'center' }}>
                    {L('COMPLETE THIS STEP & ADVANCE','VALIDER CETTE ÉTAPE & PASSER À LA SUIVANTE')}
                    {curDef && stepDefs[stepDefs.findIndex(s=>s.key===p.currentStep)+1] && (
                      <span style={{ color:'#2A3F55' }}> → {stepDefs[stepDefs.findIndex(s=>s.key===p.currentStep)+1]?.title}</span>
                    )}
                  </div>
                  <button onClick={() => advance(p.currentStep)} disabled={!!advancing}
                    style={{ width:'100%', background:advancing?'#1E2D3D':'#00FF94', color:'#080B0F', border:'none', borderRadius:9, padding:'14px', fontWeight:800, fontSize:15, cursor:advancing?'wait':'pointer', fontFamily:'Syne, sans-serif', letterSpacing:'0.02em' }}>
                    {advancing===p.currentStep ? '⟳ Processing...'
                      : p.currentStep==='REGISTRY_REVIEW' ? `🌿 ${L('Issue Credits → Step 10','Émettre Crédits → Étape 10')}`
                      : p.currentStep==='MARKET_LISTING' ? `🏪 ${L('Complete Pipeline → Marketplace','Finaliser → Marketplace')}`
                      : `✓ ${L('Next step','Étape suivante')} →`}
                  </button>
                </div>
              </div>
            )}

            {/* Completed */}
            {p.status==='COMPLETED' && (
              <div style={{ background:'rgba(0,255,148,0.07)', border:'2px solid rgba(0,255,148,0.3)', borderRadius:12, padding:20, textAlign:'center' }}>
                <div style={{ fontSize:9, color:'#00FF94', fontFamily:'JetBrains Mono, monospace', marginBottom:8 }}>🎉 PIPELINE COMPLETED — CREDITS ISSUED ON BLOCKCHAIN</div>
                <div style={{ fontSize:28, fontWeight:800, color:'#00FF94', fontFamily:'Syne, sans-serif', marginBottom:4 }}>
                  {fmtK(p.confirmedCredits||p.estimatedCredits)} tCO₂e
                </div>
                <div style={{ fontSize:12, color:'#8FA3B8', marginBottom:14 }}>
                  {L('Successfully issued on PANGEA CARBON blockchain.','Émis avec succès sur la blockchain PANGEA CARBON.')}
                </div>
                {p.issuanceId && <div style={{ fontSize:11, color:'#4A6278', fontFamily:'monospace', marginBottom:14 }}>ID: {p.issuanceId}</div>}
                <a href="/dashboard/marketplace" style={{ display:'inline-block', background:'#00FF94', color:'#080B0F', borderRadius:9, padding:'11px 24px', fontWeight:800, textDecoration:'none', fontFamily:'Syne, sans-serif' }}>
                  🏪 {L('View on Marketplace →','Voir sur la Marketplace →')}
                </a>
              </div>
            )}

            {/* Blocked */}
            {p.status==='BLOCKED' && (
              <div style={{ background:'rgba(248,113,113,0.08)', border:'2px solid rgba(248,113,113,0.3)', borderRadius:12, padding:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:9, color:'#F87171', fontFamily:'JetBrains Mono, monospace', marginBottom:4 }}>PIPELINE BLOCKED</div>
                  <div style={{ fontSize:13, color:'#8FA3B8' }}>{L('Resolve issue then unblock.','Résolvez puis débloquez.')}</div>
                </div>
                <button onClick={() => {
                  fetchAuthJson('/pipeline/'+p.id+'/unblock',{method:'POST',body:JSON.stringify({stepKey:p.currentStep})})
                    .then(r=>{setCurrent(r);toast$('Unblocked!');})
                    .catch(e=>toast$(e.message,'error'));
                }} style={{ background:'transparent', border:'1px solid #F87171', borderRadius:8, color:'#F87171', padding:'9px 16px', cursor:'pointer', fontSize:12 }}>
                  {L('Unblock →','Débloquer →')}
                </button>
              </div>
            )}

            {/* Documents */}
            <div style={{ background:'#0D1117', border:'1px solid #1E2D3D', borderRadius:12, padding:18 }}>
              <div style={{ fontSize:10, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:14 }}>PIPELINE DOCUMENTS ({(p.documents||[]).length})</div>
              <div style={{ background:'#121920', borderRadius:9, padding:14, marginBottom:14 }}>
                {/* Type selector */}
                <div style={{ marginBottom:10 }}>
                  <div style={{ fontSize:9, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:4 }}>DOCUMENT TYPE</div>
                  <select value={docForm.type} onChange={e => setDocForm(f => ({ ...f, type:e.target.value }))} style={inp}>
                    {DOC_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
                  </select>
                </div>

                {/* File picker — méthode 1 */}
                <div style={{ marginBottom:10 }}>
                  <div style={{ fontSize:9, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>
                    {L('UPLOAD FROM COMPUTER',"IMPORTER DEPUIS L'ORDINATEUR")}
                  </div>
                  <label style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'rgba(0,255,148,0.05)', border:'1px dashed rgba(0,255,148,0.25)', borderRadius:8, cursor:'pointer' }}>
                    <span style={{ fontSize:20 }}>📁</span>
                    <div>
                      <div style={{ fontSize:12, color:'#00FF94', fontWeight:600 }}>
                        {uploading ? '⟳ Uploading...' : L('Choose file','Choisir un fichier')}
                      </div>
                      <div style={{ fontSize:10, color:'#4A6278' }}>PDF · DOC · DOCX · XLSX · PNG · ZIP (max 50MB)</div>
                    </div>
                    <input type="file" accept=".pdf,.doc,.docx,.xlsx,.csv,.png,.jpg,.jpeg,.zip"
                      style={{ display:'none' }}
                      disabled={uploading}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setDocForm(f => ({ ...f, name:file.name }));
                          uploadFile(file, docForm.type);
                        }
                        e.target.value = '';
                      }}/>
                  </label>
                </div>

                {/* Séparateur */}
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                  <div style={{ flex:1, height:1, background:'#1E2D3D' }}/>
                  <span style={{ fontSize:10, color:'#2A3F55' }}>{L('or enter manually','ou saisir manuellement')}</span>
                  <div style={{ flex:1, height:1, background:'#1E2D3D' }}/>
                </div>

                {/* Saisie manuelle — méthode 2 */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
                  <div>
                    <div style={{ fontSize:9, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:4 }}>NAME *</div>
                    <input placeholder="PDD_v2.1.pdf" value={docForm.name}
                      onChange={e => setDocForm(f => ({ ...f, name:e.target.value }))} style={inp}/>
                  </div>
                  <div>
                    <div style={{ fontSize:9, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:4 }}>URL / DRIVE LINK</div>
                    <input placeholder="https://drive.google.com/..." value={docForm.fileUrl}
                      onChange={e => setDocForm(f => ({ ...f, fileUrl:e.target.value }))} style={inp}/>
                  </div>
                </div>
                <button onClick={addDoc} disabled={!docForm.name.trim() || uploading}
                  style={{ background:!docForm.name.trim()||uploading?'#1E2D3D':'rgba(0,255,148,0.12)', border:'1px solid rgba(0,255,148,0.3)', borderRadius:7, color:!docForm.name.trim()||uploading?'#2A3F55':'#00FF94', padding:'8px 16px', cursor:!docForm.name.trim()||uploading?'not-allowed':'pointer', fontSize:12, fontWeight:600 }}>
                  + {L('Add manually','Ajouter manuellement')}
                </button>
              </div>
              {(p.documents||[]).length === 0 ? (
                <div style={{ textAlign:'center', padding:'12px 0', color:'#2A3F55', fontSize:12 }}>{L('No documents yet','Aucun document')}</div>
              ) : (p.documents||[]).map(doc => (
                <div key={doc.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', background:'rgba(0,255,148,0.03)', border:'1px solid rgba(0,255,148,0.08)', borderRadius:9, marginBottom:6 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                      <span style={{ fontSize:11, color:'#00FF94', fontFamily:'JetBrains Mono, monospace', background:'rgba(0,255,148,0.1)', border:'1px solid rgba(0,255,148,0.2)', borderRadius:4, padding:'1px 7px', whiteSpace:'nowrap', flexShrink:0 }}>
                        {DOC_TYPE_LABELS[doc.type] || doc.type}
                      </span>
                    </div>
                    <div style={{ fontSize:12, color:'#E8EFF6', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{doc.name}</div>
                    <div style={{ fontSize:9, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginTop:2 }}>SHA-{doc.hash?.slice(0,8)} · {new Date(doc.uploadedAt||Date.now()).toLocaleDateString()}</div>
                  </div>
                  <div style={{ display:'flex', gap:5 }}>
                    {doc.fileUrl && <a href={doc.fileUrl} target="_blank" rel="noreferrer" style={{ fontSize:11, color:'#00FF94', textDecoration:'none', padding:'3px 9px', border:'1px solid rgba(0,255,148,0.2)', borderRadius:5 }}>Open →</a>}
                    <button onClick={() => setConfirmDocDelete(doc.id)} style={{ background:'transparent', border:'1px solid rgba(248,113,113,0.2)', borderRadius:5, color:'#F87171', padding:'3px 8px', cursor:'pointer', fontSize:11 }}>×</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modale suppression document */}
      {confirmDocDelete && (
        <div onClick={e => { if(e.target===e.currentTarget) setConfirmDocDelete(null); }}
          style={{ position:'fixed', inset:0, background:'rgba(8,11,15,0.88)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10001, backdropFilter:'blur(10px)' }}>
          <div style={{ background:'#0D1117', border:'1px solid rgba(248,113,113,0.3)', borderRadius:16, padding:28, maxWidth:420, width:'90%', boxShadow:'0 24px 80px rgba(0,0,0,0.7)' }}>
            <div style={{ display:'flex', gap:14, alignItems:'center', marginBottom:16 }}>
              <div style={{ width:44, height:44, borderRadius:12, background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🗑</div>
              <div>
                <div style={{ fontSize:9, color:'#F87171', fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.1em', marginBottom:3 }}>PIPELINE · DOCUMENT</div>
                <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:16, fontWeight:800, color:'#F87171', margin:0 }}>{L('Delete this document?','Supprimer ce document ?')}</h2>
              </div>
            </div>
            <div style={{ height:1, background:'linear-gradient(90deg,rgba(248,113,113,0.2) 0%,transparent 100%)', marginBottom:16 }}/>
            <p style={{ fontSize:13, color:'#8FA3B8', marginBottom:20, lineHeight:1.6 }}>
              {L('This document will be permanently deleted from the pipeline. This action cannot be undone.',
                 'Ce document sera définitivement supprimé du pipeline. Cette action est irréversible.')}
            </p>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setConfirmDocDelete(null)} style={{ flex:1, background:'transparent', border:'1px solid #1E2D3D', borderRadius:9, color:'#4A6278', padding:11, cursor:'pointer', fontSize:13 }}>
                {L('Cancel','Annuler')}
              </button>
              <button onClick={() => executeDeleteDoc(confirmDocDelete)}
                style={{ flex:1, background:'rgba(248,113,113,0.12)', border:'1px solid rgba(248,113,113,0.4)', borderRadius:9, color:'#F87171', padding:11, fontWeight:700, cursor:'pointer', fontSize:13, fontFamily:'Syne, sans-serif' }}>
                🗑 {L('Delete','Supprimer')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale annulation pipeline */}
      {confirmCancel && (
        <div onClick={e => { if(e.target===e.currentTarget) setConfirmCancel(false); }}
          style={{ position:'fixed', inset:0, background:'rgba(8,11,15,0.88)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10001, backdropFilter:'blur(10px)' }}>
          <div style={{ background:'#0D1117', border:'1px solid rgba(248,113,113,0.3)', borderRadius:16, padding:28, maxWidth:440, width:'90%', boxShadow:'0 24px 80px rgba(0,0,0,0.7)' }}>
            <div style={{ display:'flex', gap:14, alignItems:'center', marginBottom:16 }}>
              <div style={{ width:44, height:44, borderRadius:12, background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>⚠</div>
              <div>
                <div style={{ fontSize:9, color:'#F87171', fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.1em', marginBottom:3 }}>PIPELINE · ANNULATION</div>
                <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:16, fontWeight:800, color:'#F87171', margin:0 }}>{L('Cancel this pipeline?','Annuler ce pipeline ?')}</h2>
              </div>
            </div>
            <div style={{ height:1, background:'linear-gradient(90deg,rgba(248,113,113,0.2) 0%,transparent 100%)', marginBottom:16 }}/>
            <p style={{ fontSize:13, color:'#8FA3B8', marginBottom:20, lineHeight:1.6 }}>
              {L('The pipeline will be cancelled and all progress will be archived. Credits cannot be issued from a cancelled pipeline.',
                 'Le pipeline sera annulé et toute la progression sera archivée. Aucun crédit ne pourra être émis depuis un pipeline annulé.')}
            </p>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setConfirmCancel(false)} style={{ flex:1, background:'transparent', border:'1px solid #1E2D3D', borderRadius:9, color:'#4A6278', padding:11, cursor:'pointer', fontSize:13 }}>
                {L('Keep pipeline','Garder le pipeline')}
              </button>
              <button onClick={cancelPipeline}
                style={{ flex:1, background:'rgba(248,113,113,0.12)', border:'1px solid rgba(248,113,113,0.4)', borderRadius:9, color:'#F87171', padding:11, fontWeight:700, cursor:'pointer', fontSize:13, fontFamily:'Syne, sans-serif' }}>
                ⚠ {L('Cancel pipeline','Annuler le pipeline')}
              </button>
            </div>
          </div>
        </div>
      )}


    </div>

  );
}
