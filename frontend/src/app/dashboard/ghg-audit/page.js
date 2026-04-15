'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useLang } from '@/lib/lang-context';
import { fetchAuthJson } from '@/lib/fetch-auth';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend
} from 'recharts';

// ─── Design tokens ─────────────────────────────────────────────────────────
const C = {
  bg:'#080B0F', card:'#0D1117', card2:'#121920', border:'#1E2D3D',
  green:'#00FF94', red:'#F87171', yellow:'#FCD34D', blue:'#38BDF8',
  purple:'#A78BFA', orange:'#F97316', muted:'#4A6278', text:'#E8EFF6', text2:'#8FA3B8',
};
const SCOPE_COLOR = { 1:C.red, 2:C.yellow, 3:C.blue };
const STATUS_C = { DRAFT:C.muted, IN_PROGRESS:C.yellow, COMPLETED:C.green, VERIFIED:C.blue };

const FRAMEWORKS = [
  { id:'GHG_PROTOCOL',  flag:'🌍', color:C.blue,   descEn:'WRI/WBCSD — International standard',           descFr:'WRI/WBCSD — Standard international' },
  { id:'ISO_14064',     flag:'📋', color:C.purple, descEn:'ISO certification framework',                   descFr:'Cadre de certification ISO' },
  { id:'BILAN_CARBONE', flag:'🇫🇷', color:C.orange, descEn:'ADEME — France & Francophone Africa',           descFr:'ADEME — France & Afrique francophone' },
];

const SCOPE_DESC = {
  1:{ en:'Direct emissions — Fuel, vehicles, industrial processes',   fr:'Émissions directes — Carburants, véhicules, procédés industriels' },
  2:{ en:'Indirect — Purchased electricity & heat',                   fr:'Indirectes — Électricité et chaleur achetées' },
  3:{ en:'Value chain — Travel, goods, waste, transport',             fr:'Chaîne de valeur — Voyages, marchandises, déchets, transport' },
};

const fmt   = (n) => (n||0).toLocaleString('fr-FR', {maximumFractionDigits:2});
const fmtT  = (n) => n>=1000?((n)/1000).toFixed(1)+'k':((n)||0).toFixed(2);
const fmtUSD= (n) => '$'+(n||0).toLocaleString('en-US',{maximumFractionDigits:0});


// ─── Standards audit GHG (9 actifs) ──────────────────────────────────────────
const AUDIT_STANDARDS = [
  { id:'GHG_PROTOCOL',  nameEn:'GHG Protocol',           nameFr:'GHG Protocol',              icon:'🌍', color:'#2563EB', edition:'WRI/WBCSD 2025',             badgeEn:'Corporate Standard', badgeFr:'Standard Corporate' },
  { id:'ISO_14064',     nameEn:'ISO 14064-1',             nameFr:'ISO 14064-1',               icon:'📋', color:'#7C3AED', edition:'ISO 2018',                    badgeEn:'ISO Certification',  badgeFr:'Certification ISO' },
  { id:'BILAN_CARBONE', nameEn:'Bilan Carbone',           nameFr:'Bilan Carbone®',            icon:'🇫🇷', color:'#059669', edition:'ADEME v8',                     badgeEn:'ADEME France',       badgeFr:'ADEME France' },
  { id:'CSRD_ESRS',     nameEn:'CSRD / ESRS E1',          nameFr:'CSRD / ESRS E1',            icon:'🇪🇺', color:'#0369A1', edition:'EFRAG 2024',                   badgeEn:'EU Mandatory 2025',  badgeFr:'UE Obligatoire 2025' },
  { id:'TCFD',          nameEn:'TCFD Framework',          nameFr:'Cadre TCFD',                icon:'🏦', color:'#B45309', edition:'FSB 2024',                     badgeEn:'Financial Disclosure',badgeFr:'Divulgation Fin.' },
  { id:'SBTi',          nameEn:'SBTi Net-Zero',           nameFr:'SBTi Net Zéro',             icon:'🎯', color:'#065F46', edition:'Corporate Standard v1.2',      badgeEn:'1.5°C Aligned',      badgeFr:'Aligné 1.5°C' },
  { id:'CDP',           nameEn:'CDP Climate',             nameFr:'CDP Climat',                icon:'🌊', color:'#6B21A8', edition:'CDP 2024',                     badgeEn:'Investor Disclosure', badgeFr:'Divulgation Invest.' },
  { id:'SEC_CLIMATE',   nameEn:'SEC Climate Rule',        nameFr:'Règle SEC Climat',          icon:'🇺🇸', color:'#B91C1C', edition:'Rule 33-11275 2025',           badgeEn:'US Listed Required',  badgeFr:'Cotés US Requis' },
  { id:'VCMI_CCP',      nameEn:'VCMI Claims Code',        nameFr:'VCMI Code Réclamations',    icon:'🏆', color:'#0E7490', edition:'VCMI 2024',                    badgeEn:'Voluntary Markets',   badgeFr:'Marchés Volontaires' },
];

export default function GHGAuditPage() {
  const { lang } = useLang();
  const L = (en, fr) => lang === 'fr' ? fr : en;

  const [view, setView] = useState('dashboard');
  const [audits, setAudits] = useState([]);
  const [currentAudit, setCurrentAudit] = useState(null);
  const [factors, setFactors] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [offsetPlan, setOffsetPlan] = useState(null);
  const [newAuditForm, setNewAuditForm] = useState({ name:'', reportingYear:new Date().getFullYear()-1, framework:'GHG_PROTOCOL', netZeroTarget:'' });
  const [addEntry, setAddEntry] = useState({ factorKey:'', quantity:'', notes:'' });
  const [filterScope, setFilterScope] = useState(0);
  const [creating, setCreating] = useState(false);
  const [addingEntry, setAddingEntry] = useState(false);
  const [toast, setToast] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [confirmDeleteEntry, setConfirmDeleteEntry] = useState(null);
  const [activeTab, setActiveTab] = useState('entries');
  const [searchEntry, setSearchEntry] = useState('');
  const [generatingKey, setGeneratingKey] = useState(null);
  const [showReportPanel, setShowReportPanel] = useState(false);

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),4000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, f, d] = await Promise.all([
        fetchAuthJson('/ghg/audits').catch(()=>({ audits:[] })),
        fetchAuthJson('/ghg/factors').catch(()=>({ factors:[] })),
        fetchAuthJson('/ghg/dashboard').catch(()=>null),
      ]);
      setAudits(a.audits || []);
      setFactors(f.factors || []);
      setDashboard(d);
    } finally { setLoading(false); }
  }, []);

  useEffect(()=>{ load(); },[load]);

  const loadAudit = useCallback(async (id) => {
    setLoading(true);
    try {
      const a = await fetchAuthJson('/ghg/audits/'+id);
      setCurrentAudit(a);
      setView('audit');
      const plan = await fetchAuthJson('/ghg/audits/'+id+'/offset-plan').catch(()=>null);
      setOffsetPlan(plan);
    } finally { setLoading(false); }
  }, []);

  const createAudit = async () => {
    setCreating(true);
    try {
      const audit = await fetchAuthJson('/ghg/audits',{method:'POST',body:JSON.stringify(newAuditForm)});
      showToast(L('Audit created!','Audit créé !'));
      await load();
      await loadAudit(audit.id);
    } catch(e) { showToast(e.message,'error'); }
    finally { setCreating(false); }
  };

  const addEntryFn = async () => {
    if (!currentAudit||!addEntry.factorKey||!addEntry.quantity) return;
    setAddingEntry(true);
    try {
      await fetchAuthJson('/ghg/audits/'+currentAudit.id+'/entries',{method:'POST',body:JSON.stringify(addEntry)});
      const [updated, plan] = await Promise.all([
        fetchAuthJson('/ghg/audits/'+currentAudit.id),
        fetchAuthJson('/ghg/audits/'+currentAudit.id+'/offset-plan').catch(()=>null),
      ]);
      setCurrentAudit(updated);
      setOffsetPlan(plan);
      setAddEntry({factorKey:'',quantity:'',notes:''});
      showToast(L('Entry added!','Entrée ajoutée !'));
    } catch(e) { showToast(e.message,'error'); }
    finally { setAddingEntry(false); }
  };

  const executeDeleteEntry = async () => {
    if (!confirmDeleteEntry) return;
    const eid = confirmDeleteEntry;
    setConfirmDeleteEntry(null);
    try {
      await fetchAuthJson('/ghg/audits/'+currentAudit.id+'/entries/'+eid,{method:'DELETE'});
      const [updated, plan] = await Promise.all([
        fetchAuthJson('/ghg/audits/'+currentAudit.id),
        fetchAuthJson('/ghg/audits/'+currentAudit.id+'/offset-plan').catch(()=>null),
      ]);
      setCurrentAudit(updated);
      setOffsetPlan(plan);
      showToast(L('Deleted','Supprimé'));
    } catch(e) { showToast(e.message,'error'); }
  };

  const confirmDeleteAudit = async () => {
    if (!deleteConfirm) return;
    try {
      await fetchAuthJson('/ghg/audits/'+deleteConfirm.id,{method:'DELETE'});
      showToast(L('Audit deleted','Audit supprimé'));
      setDeleteConfirm(null);
      setCurrentAudit(null);
      setView('dashboard');
      await load();
    } catch(e) { showToast(e.message,'error'); }
  };

  const downloadAuditReport = async (auditId, auditName, reportingYear, stdId, lang) => {
    const key = auditId+'-'+stdId+'-'+lang;
    setGeneratingKey(key);
    showToast(L('Generating','Génération')+' '+stdId+' ('+lang.toUpperCase()+')...', 'info');
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
      const url = (process.env.NEXT_PUBLIC_API_URL||'')+'/ghg/audits/'+auditId+'/report?lang='+lang+'&standard='+stdId;
      const res = await fetch(url, { headers:{ Authorization:'Bearer '+token } });
      if (!res.ok) { const e=await res.json().catch(()=>({error:'Error'})); throw new Error(e.error); }
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href=objUrl;
      a.download = 'PANGEA-GHG-'+stdId+'-'+auditName.replace(/[^a-zA-Z0-9]/g,'-').slice(0,20)+'-'+reportingYear+'-'+lang.toUpperCase()+'.pdf';
      a.click();
      URL.revokeObjectURL(objUrl);
      showToast(L('Report downloaded!','Rapport téléchargé !')+' ('+stdId+' · '+lang.toUpperCase()+')');
    } catch(e) { showToast(e.message||'Error', 'error'); }
    finally { setGeneratingKey(null); }
  };

  const runAI = async () => {
    if (!currentAudit) return;
    setAiLoading(true);
    try {
      const r = await fetchAuthJson('/ghg/audits/'+currentAudit.id+'/ai-analysis',{method:'POST'});
      setCurrentAudit(a=>({...a, aiAnalysis:r.analysis}));
      showToast(L('AI analysis ready!','Analyse IA prête !'));
    } catch(e) { showToast(e.message,'error'); }
    finally { setAiLoading(false); }
  };

  // Computed data
  const factorsByScope = useMemo(()=>{
    const g = {};
    factors.forEach(f=>{
      if(!g[f.scope]) g[f.scope]={};
      if(!g[f.scope][f.cat]) g[f.scope][f.cat]=[];
      g[f.scope][f.cat].push(f);
    });
    return g;
  },[factors]);

  const filteredEntries = useMemo(()=>(currentAudit?.entries||[])
    .filter(e=>(!filterScope||e.scope===filterScope)&&(!searchEntry||e.description?.toLowerCase().includes(searchEntry.toLowerCase())))
    .sort((a,b)=>b.co2e-a.co2e)
  ,[currentAudit,filterScope,searchEntry]);

  const scopeChartData = useMemo(()=>{
    if (!currentAudit) return [];
    const total = currentAudit.grandTotal||1;
    return [1,2,3].map(s=>{
      const val = s===1?currentAudit.scope1Total:s===2?currentAudit.scope2Total:currentAudit.scope3Total;
      return { name:'S'+s, value:+val.toFixed(2), pct:+((val/total)*100).toFixed(1), color:SCOPE_COLOR[s] };
    }).filter(d=>d.value>0);
  },[currentAudit]);

  const categoryChartData = useMemo(()=>{
    if (!currentAudit?.entries?.length) return [];
    const cats = {};
    currentAudit.entries.forEach(e=>{
      const cat = e.category||'Other';
      cats[cat] = (cats[cat]||0)+e.co2e;
    });
    return Object.entries(cats).map(([cat,val])=>({ cat:cat.split(' ')[0], val:+val.toFixed(2) })).sort((a,b)=>b.val-a.val).slice(0,8);
  },[currentAudit]);

  const dashboardScopeData = useMemo(()=>{
    if (!dashboard) return [];
    return [
      { name:'S1', value:+(dashboard.scope1||0).toFixed(2), color:C.red },
      { name:'S2', value:+(dashboard.scope2||0).toFixed(2), color:C.yellow },
      { name:'S3', value:+(dashboard.scope3||0).toFixed(2), color:C.blue },
    ].filter(d=>d.value>0);
  },[dashboard]);

  const selectedFactor = useMemo(()=>factors.find(f=>f.key===addEntry.factorKey),[factors,addEntry.factorKey]);
  const estimatedCO2 = useMemo(()=>(parseFloat(addEntry.quantity)||0)*(selectedFactor?.factor||0),[addEntry.quantity,selectedFactor]);

  const inp = {
    background:C.card2, border:'1px solid '+C.border, borderRadius:8,
    color:C.text, padding:'10px 13px', fontSize:13, outline:'none',
    width:'100%', boxSizing:'border-box',
  };

  const TTContent = ({ active, payload, label }) => {
    if (!active||!payload?.length) return null;
    return (
      <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:8, padding:'10px 14px', fontSize:11 }}>
        <div style={{ color:C.muted, marginBottom:4, fontFamily:'JetBrains Mono, monospace' }}>{label||payload[0]?.name}</div>
        {payload.map((p,i)=>(
          <div key={i} style={{ color:p.color||C.text }}>{p.name}: {p.value} tCO₂e</div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ padding:20, maxWidth:1500, margin:'0 auto' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed',top:20,right:20,zIndex:99999,maxWidth:420 }}>
          <div style={{ background:toast.type==='error'?'rgba(248,113,113,0.08)':'rgba(0,255,148,0.06)', border:'1px solid '+(toast.type==='error'?'rgba(248,113,113,0.35)':'rgba(0,255,148,0.3)'), borderRadius:12, padding:'14px 18px', display:'flex', alignItems:'center', gap:12, backdropFilter:'blur(20px)', boxShadow:'0 8px 32px rgba(0,0,0,0.5)', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute',left:0,top:0,bottom:0,width:3,background:toast.type==='error'?C.red:C.green }}/>
            <div style={{ width:22,height:22,borderRadius:'50%',background:toast.type==='error'?'rgba(248,113,113,0.15)':'rgba(0,255,148,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:toast.type==='error'?C.red:C.green,fontWeight:800,marginLeft:8 }}>
              {toast.type==='error'?'✗':'✓'}
            </div>
            <span style={{ fontSize:13,color:C.text,flex:1 }}>{toast.msg}</span>
          </div>
        </div>
      )}

      {/* ── MODAL: Delete Audit ────────────────────────────────────────────── */}
      {deleteConfirm && (
        <div onClick={e=>{if(e.target===e.currentTarget)setDeleteConfirm(null);}}
          style={{ position:'fixed',inset:0,background:'rgba(8,11,15,0.88)',backdropFilter:'blur(10px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10001,padding:16 }}>
          <div style={{ background:C.card,border:'1px solid rgba(248,113,113,0.35)',borderRadius:16,padding:28,maxWidth:460,width:'100%',boxShadow:'0 24px 80px rgba(0,0,0,0.7)',position:'relative',overflow:'hidden' }}>
            <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,'+C.red+' 0%,rgba(248,113,113,0.2) 100%)' }}/>
            <div style={{ display:'flex',gap:14,alignItems:'center',marginBottom:16 }}>
              <div style={{ width:48,height:48,borderRadius:12,background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0 }}>🗑</div>
              <div>
                <div style={{ fontSize:9,color:C.red,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.12em',marginBottom:4 }}>GHG AUDIT · {L('DELETE','SUPPRESSION')}</div>
                <h2 style={{ fontFamily:'Syne, sans-serif',fontSize:17,fontWeight:800,color:C.red,margin:0 }}>{L('Delete this audit?','Supprimer cet audit ?')}</h2>
              </div>
            </div>
            <div style={{ height:1,background:'linear-gradient(90deg,rgba(248,113,113,0.25) 0%,transparent 100%)',marginBottom:18 }}/>
            <div style={{ background:'rgba(248,113,113,0.05)',border:'1px solid rgba(248,113,113,0.15)',borderRadius:10,padding:'14px 16px',marginBottom:20 }}>
              <div style={{ fontSize:13,color:C.text,fontWeight:700,marginBottom:6 }}>{deleteConfirm.name}</div>
              <p style={{ fontSize:12,color:C.text2,margin:0,lineHeight:1.7 }}>
                {L('All emission entries and AI analysis will be permanently deleted. This action cannot be undone.','Toutes les entrées et analyses IA seront définitivement supprimées. Cette action est irréversible.')}
              </p>
            </div>
            <div style={{ display:'flex',gap:10 }}>
              <button onClick={()=>setDeleteConfirm(null)} style={{ flex:1,background:'transparent',border:'1px solid '+C.border,borderRadius:9,color:C.muted,padding:12,cursor:'pointer',fontSize:13 }}>{L('Cancel','Annuler')}</button>
              <button onClick={confirmDeleteAudit} style={{ flex:1,background:'rgba(248,113,113,0.12)',border:'1px solid rgba(248,113,113,0.4)',borderRadius:9,color:C.red,padding:12,fontWeight:800,cursor:'pointer',fontSize:13,fontFamily:'Syne, sans-serif' }}>
                🗑 {L('Delete permanently','Supprimer définitivement')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Delete Entry ────────────────────────────────────────────── */}
      {confirmDeleteEntry && (
        <div onClick={e=>{if(e.target===e.currentTarget)setConfirmDeleteEntry(null);}}
          style={{ position:'fixed',inset:0,background:'rgba(8,11,15,0.88)',backdropFilter:'blur(10px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10002,padding:16 }}>
          <div style={{ background:C.card,border:'1px solid rgba(167,139,250,0.35)',borderRadius:16,padding:28,maxWidth:440,width:'100%',boxShadow:'0 24px 80px rgba(0,0,0,0.7)',position:'relative',overflow:'hidden' }}>
            <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,'+C.purple+' 0%,rgba(167,139,250,0.2) 100%)' }}/>
            <div style={{ display:'flex',gap:14,alignItems:'center',marginBottom:16 }}>
              <div style={{ width:48,height:48,borderRadius:12,background:'rgba(167,139,250,0.1)',border:'1px solid rgba(167,139,250,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0 }}>📋</div>
              <div>
                <div style={{ fontSize:9,color:C.purple,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.12em',marginBottom:4 }}>GHG AUDIT · {L('DELETE ENTRY','SUPPRESSION ENTRÉE')}</div>
                <h2 style={{ fontFamily:'Syne, sans-serif',fontSize:17,fontWeight:800,color:C.purple,margin:0 }}>{L('Delete this entry?','Supprimer cette entrée ?')}</h2>
              </div>
            </div>
            <div style={{ height:1,background:'linear-gradient(90deg,rgba(167,139,250,0.25) 0%,transparent 100%)',marginBottom:18 }}/>
            <p style={{ fontSize:12,color:C.text2,marginBottom:20,lineHeight:1.7 }}>
              {L('This emission entry will be permanently removed and totals recalculated.','Cette entrée sera supprimée définitivement et les totaux seront recalculés.')}
            </p>
            <div style={{ display:'flex',gap:10 }}>
              <button onClick={()=>setConfirmDeleteEntry(null)} style={{ flex:1,background:'transparent',border:'1px solid '+C.border,borderRadius:9,color:C.muted,padding:12,cursor:'pointer',fontSize:13 }}>{L('Cancel','Annuler')}</button>
              <button onClick={executeDeleteEntry} style={{ flex:1,background:'rgba(167,139,250,0.1)',border:'1px solid rgba(167,139,250,0.4)',borderRadius:9,color:C.purple,padding:12,fontWeight:800,cursor:'pointer',fontSize:13,fontFamily:'Syne, sans-serif' }}>
                🗑 {L('Delete entry',"Supprimer l'entrée")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom:24, display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ fontSize:9,color:C.blue,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.14em',marginBottom:6 }}>GHG PROTOCOL · ISO 14064 · BILAN CARBONE · IPCC AR6</div>
          <h1 style={{ fontFamily:'Syne, sans-serif',fontSize:26,fontWeight:800,color:C.text,margin:'0 0 6px' }}>
            {L('Corporate Carbon Audit','Audit Carbone Corporate')}
          </h1>
          <p style={{ fontSize:13,color:C.muted,margin:0,maxWidth:650 }}>
            {L('Measure · Reduce · Offset — Scope 1, 2 & 3 aligned with GHG Protocol, ISO 14064 and CSRD.','Mesurer · Réduire · Compenser — Scope 1, 2 & 3 selon GHG Protocol, ISO 14064 et CSRD.')}
          </p>
        </div>
        <div style={{ display:'flex',gap:8,flexShrink:0 }}>
          {view !== 'dashboard' && (
            <>
              <button onClick={()=>{ setView('dashboard'); setCurrentAudit(null); setOffsetPlan(null); setActiveTab('entries'); }}
                style={{ background:'transparent',border:'1px solid '+C.border,borderRadius:8,color:C.muted,padding:'9px 16px',cursor:'pointer',fontSize:12 }}>
                ← {L('Dashboard','Tableau de bord')}
              </button>
              {view==='audit'&&currentAudit&&(
                <button onClick={()=>setDeleteConfirm({id:currentAudit.id,name:currentAudit.name})}
                  style={{ background:'rgba(248,113,113,0.06)',border:'1px solid rgba(248,113,113,0.2)',borderRadius:8,color:C.red,padding:'9px 12px',cursor:'pointer',fontSize:12 }}>
                  🗑 {L('Delete','Supprimer')}
                </button>
              )}
            </>
          )}
          <button onClick={()=>setView('new')}
            style={{ background:C.green,color:C.bg,border:'none',borderRadius:9,padding:'10px 22px',fontWeight:800,cursor:'pointer',fontSize:13,fontFamily:'Syne, sans-serif' }}>
            + {L('New Audit','Nouvel Audit')}
          </button>
        </div>
      </div>

      {/* ── DASHBOARD ──────────────────────────────────────────────────────── */}
      {view==='dashboard' && (
        <>
          {/* KPI Row */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20 }}>
            {[
              { l:L('Total Emissions','Émissions totales'), v:fmtT(dashboard?.totalEmissions||0)+' tCO₂e', c:C.red,    icon:'🌡️' },
              { l:'Scope 1 — '+L('Direct','Directes'),     v:fmtT(dashboard?.scope1||0)+' tCO₂e',         c:C.red,    icon:'🔥' },
              { l:'Scope 2 — '+L('Electricity','Électricité'), v:fmtT(dashboard?.scope2||0)+' tCO₂e',     c:C.yellow, icon:'⚡' },
              { l:'Scope 3 — '+L('Value Chain','Chaîne valeur'), v:fmtT(dashboard?.scope3||0)+' tCO₂e',  c:C.blue,   icon:'🌐' },
            ].map(k=>(
              <div key={k.l} style={{ background:C.card,border:'1px solid '+k.c+'22',borderRadius:12,padding:'14px 18px',position:'relative',overflow:'hidden' }}>
                <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,'+k.c+' 0%,transparent 100%)' }}/>
                <div style={{ position:'absolute',top:14,right:14,fontSize:22,opacity:0.25 }}>{k.icon}</div>
                <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:6 }}>{k.l.toUpperCase()}</div>
                <div style={{ fontSize:22,fontWeight:800,color:k.c,fontFamily:'Syne, sans-serif' }}>{k.v}</div>
                <div style={{ fontSize:9,color:C.muted,marginTop:4,fontFamily:'JetBrains Mono, monospace' }}>{audits.length} {L('audits','audits')}</div>
              </div>
            ))}
          </div>

          <div style={{ display:'grid',gridTemplateColumns:'1fr 340px',gap:16 }}>

            {/* Left: Audit list */}
            <div>
              <div style={{ background:C.card,border:'1px solid '+C.border,borderRadius:14,overflow:'hidden' }}>
                <div style={{ padding:'14px 20px',borderBottom:'1px solid '+C.border,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                  <div style={{ fontSize:10,color:C.muted,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.1em' }}>
                    {L('AUDITS','AUDITS')} — {audits.length}
                  </div>
                  <button onClick={load} style={{ background:'transparent',border:'none',color:C.muted,cursor:'pointer',fontSize:14 }}>↺</button>
                </div>
                {loading ? (
                  <div style={{ padding:48,textAlign:'center',color:C.muted,fontFamily:'JetBrains Mono, monospace',fontSize:11 }}>◌ {L('Loading audits...','Chargement des audits...')}</div>
                ) : audits.length===0 ? (
                  <div style={{ padding:56,textAlign:'center' }}>
                    <div style={{ fontSize:48,marginBottom:16 }}>📊</div>
                    <div style={{ fontSize:16,color:C.text,fontWeight:700,marginBottom:8,fontFamily:'Syne, sans-serif' }}>{L('No audits yet','Aucun audit')}</div>
                    <div style={{ fontSize:13,color:C.muted,marginBottom:20,maxWidth:360,margin:'0 auto 20px',lineHeight:1.7 }}>
                      {L('Create your first GHG audit to measure your corporate carbon footprint across Scope 1, 2 and 3.','Créez votre premier audit GHG pour mesurer votre empreinte carbone Scope 1, 2 et 3.')}
                    </div>
                    <button onClick={()=>setView('new')} style={{ background:C.green,color:C.bg,border:'none',borderRadius:9,padding:'12px 28px',fontWeight:800,cursor:'pointer',fontFamily:'Syne, sans-serif',fontSize:14 }}>
                      {L('Start first audit →','Démarrer le premier audit →')}
                    </button>
                  </div>
                ) : audits.map((a,i)=>{
                  const total = a.scope1Total+a.scope2Total+a.scope3Total;
                  const sc = STATUS_C[a.status]||C.muted;
                  const fw = FRAMEWORKS.find(f=>f.id===a.framework);
                  return (
                    <div key={a.id} onClick={()=>loadAudit(a.id)}
                      style={{ padding:'16px 20px',borderBottom:i<audits.length-1?'1px solid '+C.border+'40':'none',cursor:'pointer',transition:'background .12s' }}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(30,45,61,0.3)'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10 }}>
                        <div>
                          <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:4 }}>
                            <span style={{ fontSize:13 }}>{fw?.flag||'📊'}</span>
                            <div style={{ fontSize:14,fontWeight:700,color:C.text }}>{a.name}</div>
                          </div>
                          <div style={{ fontSize:10,color:C.muted,fontFamily:'JetBrains Mono, monospace' }}>
                            {a.framework} · {a.reportingYear} · {a._count?.entries||0} {L('entries','entrées')}
                          </div>
                        </div>
                        <div style={{ textAlign:'right',flexShrink:0 }}>
                          <span style={{ fontSize:8,color:sc,background:sc+'15',border:'1px solid '+sc+'30',borderRadius:4,padding:'2px 8px',fontFamily:'JetBrains Mono, monospace',display:'block',marginBottom:6 }}>
                            {a.status}
                          </span>
                          <div style={{ fontSize:14,fontWeight:800,color:C.text2,fontFamily:'JetBrains Mono, monospace' }}>{fmtT(total)} t</div>
                        </div>
                      </div>
                      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6 }}>
                        {[1,2,3].map(s=>{
                          const val = s===1?a.scope1Total:s===2?a.scope2Total:a.scope3Total;
                          const pctVal = total>0?Math.round(val/total*100):0;
                          return (
                            <div key={s}>
                              <div style={{ display:'flex',justifyContent:'space-between',marginBottom:3 }}>
                                <span style={{ fontSize:9,color:SCOPE_COLOR[s],fontFamily:'JetBrains Mono, monospace' }}>S{s}: {fmtT(val)} t</span>
                                <span style={{ fontSize:9,color:C.muted }}>{pctVal}%</span>
                              </div>
                              <div style={{ height:3,background:C.border,borderRadius:2 }}>
                                <div style={{ width:pctVal+'%',height:'100%',background:SCOPE_COLOR[s],borderRadius:2 }}/>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Standards + chart + bridge */}
            <div style={{ display:'flex',flexDirection:'column',gap:12 }}>

              {/* Donut chart if data */}
              {dashboardScopeData.length > 0 && (
                <div style={{ background:C.card,border:'1px solid '+C.border,borderRadius:14,padding:18 }}>
                  <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:10 }}>
                    {L('SCOPE BREAKDOWN','RÉPARTITION PAR SCOPE')}
                  </div>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie data={dashboardScopeData} dataKey="value" cx="50%" cy="50%" outerRadius={55} innerRadius={30}>
                        {dashboardScopeData.map((d,i)=><Cell key={i} fill={d.color}/>)}
                      </Pie>
                      <Tooltip content={<TTContent/>}/>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display:'flex',gap:8,justifyContent:'center',marginTop:6 }}>
                    {dashboardScopeData.map(d=>(
                      <div key={d.name} style={{ fontSize:9,color:d.color,fontFamily:'JetBrains Mono, monospace' }}>
                        ■ {d.name}: {d.value}t
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Frameworks */}
              {FRAMEWORKS.map(fw=>(
                <div key={fw.id} style={{ background:C.card,border:'1px solid '+fw.color+'20',borderRadius:10,padding:'12px 14px',display:'flex',gap:10,alignItems:'center' }}>
                  <span style={{ fontSize:22,flexShrink:0 }}>{fw.flag}</span>
                  <div>
                    <div style={{ fontSize:12,fontWeight:700,color:C.text }}>{fw.id.replace('_',' ')}</div>
                    <div style={{ fontSize:10,color:C.muted }}>{lang==='fr'?fw.descFr:fw.descEn}</div>
                  </div>
                </div>
              ))}

              {/* Offset bridge */}
              <div style={{ background:'rgba(0,255,148,0.05)',border:'1px solid rgba(0,255,148,0.2)',borderRadius:12,padding:16 }}>
                <div style={{ fontSize:9,color:C.green,fontFamily:'JetBrains Mono, monospace',marginBottom:8 }}>AUDIT → OFFSET BRIDGE</div>
                <div style={{ fontSize:12,color:C.text2,lineHeight:1.7,marginBottom:12 }}>
                  {L('After your audit, PANGEA CARBON automatically calculates the African carbon credits needed to offset your footprint.','Après votre audit, PANGEA CARBON calcule automatiquement les crédits carbone africains pour compenser votre empreinte.')}
                </div>
                <a href="/dashboard/marketplace" style={{ display:'block',background:'rgba(0,255,148,0.1)',border:'1px solid rgba(0,255,148,0.25)',borderRadius:8,padding:'9px 14px',color:C.green,textDecoration:'none',fontSize:12,fontWeight:700,textAlign:'center' }}>
                  🏪 {L('African Carbon Marketplace →','Marketplace Carbone Africaine →')}
                </a>
              </div>

              {/* CSRD compliance note */}
              <div style={{ background:'rgba(56,189,248,0.05)',border:'1px solid rgba(56,189,248,0.15)',borderRadius:10,padding:'12px 14px' }}>
                <div style={{ fontSize:9,color:C.blue,fontFamily:'JetBrains Mono, monospace',marginBottom:6 }}>⚖️ CSRD COMPLIANCE 2025</div>
                <div style={{ fontSize:10,color:C.text2,lineHeight:1.6 }}>
                  {L('CSRD requires Scope 1+2+3 GHG reporting for EU companies >250 employees. PANGEA audits are aligned with EFRAG taxonomy.','La CSRD impose le reporting GHG Scope 1+2+3 pour les entreprises UE >250 salariés. Les audits PANGEA sont alignés avec la taxonomie EFRAG.')}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── NEW AUDIT ──────────────────────────────────────────────────────── */}
      {view==='new' && (
        <div style={{ maxWidth:640,margin:'0 auto' }}>
          <div style={{ background:C.card,border:'1px solid rgba(0,255,148,0.2)',borderRadius:16,padding:28,position:'relative',overflow:'hidden' }}>
            <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,'+C.green+' 0%,transparent 100%)' }}/>
            <div style={{ fontSize:9,color:C.green,fontFamily:'JetBrains Mono, monospace',marginBottom:18,letterSpacing:'0.1em' }}>
              + {L('NEW CARBON AUDIT','NOUVEL AUDIT CARBONE')}
            </div>

            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:7 }}>{L('AUDIT NAME *','NOM DE L\'AUDIT *')}</div>
              <input placeholder={L('e.g. MTN Ghana — Annual GHG Audit 2024','ex. MTN Ghana — Bilan Carbone Annuel 2024')}
                value={newAuditForm.name} onChange={e=>setNewAuditForm(f=>({...f,name:e.target.value}))}
                style={inp} autoFocus/>
            </div>

            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16 }}>
              <div>
                <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:7 }}>{L('REPORTING YEAR *','ANNÉE DE RÉFÉRENCE *')}</div>
                <input type="number" value={newAuditForm.reportingYear} onChange={e=>setNewAuditForm(f=>({...f,reportingYear:parseInt(e.target.value)}))} style={inp}/>
              </div>
              <div>
                <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:7 }}>{L('NET ZERO TARGET YEAR','ANNÉE OBJECTIF NET ZÉRO')}</div>
                <input type="number" placeholder="2050" value={newAuditForm.netZeroTarget} onChange={e=>setNewAuditForm(f=>({...f,netZeroTarget:e.target.value}))} style={inp}/>
              </div>
            </div>

            <div style={{ marginBottom:22 }}>
              <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:10 }}>FRAMEWORK</div>
              <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
                {FRAMEWORKS.map(fw=>{
                  const sel = newAuditForm.framework===fw.id;
                  return (
                    <button key={fw.id} onClick={()=>setNewAuditForm(f=>({...f,framework:fw.id}))}
                      style={{ padding:'13px 16px',borderRadius:10,border:'1px solid '+(sel?fw.color+'50':C.border),background:sel?fw.color+'08':'transparent',cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:14,transition:'all .15s' }}>
                      <span style={{ fontSize:22 }}>{fw.flag}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13,fontWeight:600,color:sel?fw.color:C.text }}>{fw.id.replace('_',' ')}</div>
                        <div style={{ fontSize:10,color:C.muted }}>{lang==='fr'?fw.descFr:fw.descEn}</div>
                      </div>
                      {sel && <span style={{ color:fw.color,fontWeight:800,fontSize:16 }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ background:'rgba(0,255,148,0.04)',border:'1px solid rgba(0,255,148,0.12)',borderRadius:9,padding:'12px 14px',marginBottom:20 }}>
              <div style={{ fontSize:11,color:C.green,fontWeight:600,marginBottom:5 }}>{L('What happens next?','Que se passe-t-il ensuite ?')}</div>
              <div style={{ fontSize:11,color:C.text2,lineHeight:1.7 }}>
                {L('You\'ll add emission sources (Scope 1, 2, 3). PANGEA calculates tCO₂e using IPCC AR6 + IEA 2024 factors. AI analyzes your footprint and recommends an offset strategy.','Vous ajouterez des sources d\'émission (Scope 1, 2, 3). PANGEA calcule les tCO₂e avec les facteurs IPCC AR6 + AIE 2024. L\'IA analyse votre empreinte et recommande une stratégie de compensation.')}
              </div>
            </div>

            <div style={{ display:'flex',gap:10 }}>
              <button onClick={()=>setView('dashboard')} style={{ flex:1,background:'transparent',border:'1px solid '+C.border,borderRadius:9,color:C.muted,padding:13,cursor:'pointer',fontSize:13 }}>
                {L('Cancel','Annuler')}
              </button>
              <button onClick={createAudit} disabled={creating||!newAuditForm.name.trim()}
                style={{ flex:2,background:creating||!newAuditForm.name.trim()?C.card2:C.green,color:creating||!newAuditForm.name.trim()?C.muted:C.bg,border:'none',borderRadius:9,padding:13,fontWeight:800,fontSize:14,cursor:creating||!newAuditForm.name.trim()?'not-allowed':'pointer',fontFamily:'Syne, sans-serif',opacity:!newAuditForm.name.trim()?0.5:1 }}>
                {creating ? '⟳ '+L('Creating...','Création...') : L('Create Audit →',"Créer l'audit →")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AUDIT DETAIL ───────────────────────────────────────────────────── */}
      {view==='audit' && currentAudit && (
        <>
          {/* Audit header card */}
          <div style={{ background:C.card,border:'1px solid '+C.border,borderRadius:14,padding:'18px 24px',marginBottom:20,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
            <div>
              <div style={{ display:'flex',gap:8,alignItems:'center',marginBottom:6 }}>
                <span style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',background:C.card2,border:'1px solid '+C.border,borderRadius:4,padding:'2px 8px' }}>
                  {currentAudit.framework}
                </span>
                <span style={{ fontSize:9,color:STATUS_C[currentAudit.status]||C.muted,background:(STATUS_C[currentAudit.status]||C.muted)+'15',border:'1px solid '+(STATUS_C[currentAudit.status]||C.muted)+'30',borderRadius:4,padding:'2px 8px',fontFamily:'JetBrains Mono, monospace' }}>
                  {currentAudit.status}
                </span>
                <span style={{ fontSize:9,color:C.muted }}>{currentAudit.reportingYear}</span>
              </div>
              <h2 style={{ fontFamily:'Syne, sans-serif',fontSize:20,fontWeight:800,color:C.text,margin:0 }}>{currentAudit.name}</h2>
            </div>
            <button onClick={runAI} disabled={aiLoading||!(currentAudit.grandTotal>0)}
              style={{ background:aiLoading?C.card2:'rgba(167,139,250,0.12)',border:'1px solid rgba(167,139,250,0.3)',borderRadius:9,color:aiLoading?C.muted:C.purple,padding:'10px 18px',cursor:aiLoading||!currentAudit.grandTotal?'not-allowed':'pointer',fontSize:12,fontWeight:700,display:'flex',alignItems:'center',gap:8 }}>
              {aiLoading ? '⟳ '+L('Analyzing...','Analyse...') : '🤖 AI '+L('Analysis','Analyse')}
            </button>
          </div>

          {/* Report download panel */}
          {showReportPanel && (
            <div style={{ background:C.card,border:'1px solid rgba(0,255,148,0.2)',borderRadius:14,padding:20,marginBottom:20,position:'relative',overflow:'hidden' }}>
              <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,'+C.green+' 0%,transparent 100%)' }}/>
              <div style={{ fontSize:9,color:C.green,fontFamily:'JetBrains Mono, monospace',marginBottom:14,letterSpacing:'0.1em' }}>
                📥 {L('AUDIT REPORTS — 9 STANDARDS × 2 LANGUAGES','RAPPORTS D'AUDIT — 9 STANDARDS × 2 LANGUES')} · {AUDIT_STANDARDS.length*2} PDF
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8 }}>
                {AUDIT_STANDARDS.map(std=>{
                  const keyEN = currentAudit.id+'-'+std.id+'-en';
                  const keyFR = currentAudit.id+'-'+std.id+'-fr';
                  const isGenEN = generatingKey===keyEN;
                  const isGenFR = generatingKey===keyFR;
                  return (
                    <div key={std.id} style={{ background:C.card2,border:'1px solid '+std.color+'20',borderRadius:10,padding:'12px 14px' }}>
                      <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:8 }}>
                        <span style={{ fontSize:16 }}>{std.icon}</span>
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ fontSize:11,fontWeight:700,color:std.color,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                            {lang==='fr'?std.nameFr:std.nameEn}
                          </div>
                          <div style={{ fontSize:8,color:C.muted,fontFamily:'JetBrains Mono, monospace' }}>
                            {std.edition}
                          </div>
                        </div>
                      </div>
                      <div style={{ display:'flex',gap:5 }}>
                        <button onClick={()=>downloadAuditReport(currentAudit.id,currentAudit.name,currentAudit.reportingYear,std.id,'en')} disabled={!!isGenEN}
                          style={{ flex:1,background:isGenEN?C.card:'rgba(56,189,248,0.08)',border:'1px solid rgba(56,189,248,0.2)',borderRadius:6,color:isGenEN?C.muted:C.blue,padding:'6px 0',cursor:isGenEN?'wait':'pointer',fontSize:10,fontWeight:700 }}>
                          {isGenEN?'⟳':'📥'} EN
                        </button>
                        <button onClick={()=>downloadAuditReport(currentAudit.id,currentAudit.name,currentAudit.reportingYear,std.id,'fr')} disabled={!!isGenFR}
                          style={{ flex:1,background:isGenFR?C.card:'rgba(167,139,250,0.08)',border:'1px solid rgba(167,139,250,0.2)',borderRadius:6,color:isGenFR?C.muted:C.purple,padding:'6px 0',cursor:isGenFR?'wait':'pointer',fontSize:10,fontWeight:700 }}>
                          {isGenFR?'⟳':'📥'} FR
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop:10,fontSize:10,color:C.muted,fontFamily:'JetBrains Mono, monospace' }}>
                ⚡ {AUDIT_STANDARDS.length} {L('standards','standards')} × 2 {L('languages','langues')} = {AUDIT_STANDARDS.length*2} {L('PDF reports','rapports PDF')} · {L('Click to download instantly','Cliquez pour télécharger instantanément')}
              </div>
            </div>
          )}

          {/* Scope cards + total */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20 }}>
            {[
              { scope:0, l:L('Total Footprint','Empreinte totale'), v:currentAudit.grandTotal||0, c:C.red, icon:'🌡️' },
              { scope:1, l:'Scope 1 — '+L('Direct','Directes'),    v:currentAudit.scope1Total||0, c:C.red,    icon:'🔥' },
              { scope:2, l:'Scope 2 — '+L('Electricity','Électr.'), v:currentAudit.scope2Total||0, c:C.yellow, icon:'⚡' },
              { scope:3, l:'Scope 3 — '+L('Value Chain','Chaîne'), v:currentAudit.scope3Total||0, c:C.blue,   icon:'🌐' },
            ].map(s=>{
              const pctVal = s.scope>0&&currentAudit.grandTotal>0?+(s.v/currentAudit.grandTotal*100).toFixed(1):100;
              const desc = s.scope>0 ? SCOPE_DESC[s.scope] : null;
              return (
                <div key={s.l} style={{ background:C.card,border:'1px solid '+s.c+'22',borderRadius:12,padding:'16px 18px',position:'relative',overflow:'hidden' }}>
                  <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,'+s.c+' 0%,transparent 100%)' }}/>
                  <div style={{ position:'absolute',top:12,right:14,fontSize:20,opacity:0.2 }}>{s.icon}</div>
                  <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:6 }}>
                    {s.scope>0?'SCOPE '+s.scope+' · ':'TOTAL · '}{pctVal}%
                  </div>
                  <div style={{ fontSize:22,fontWeight:800,color:s.c,fontFamily:'Syne, sans-serif' }}>{fmtT(s.v)}</div>
                  <div style={{ fontSize:10,color:C.muted,marginBottom:8 }}>tCO₂e</div>
                  {s.scope>0 && desc && (
                    <div style={{ fontSize:9,color:C.muted,lineHeight:1.5,marginBottom:6 }}>{lang==='fr'?desc.fr:desc.en}</div>
                  )}
                  {s.scope>0 && <div style={{ height:4,background:C.border,borderRadius:2 }}>
                    <div style={{ width:pctVal+'%',height:'100%',background:s.c,borderRadius:2 }}/>
                  </div>}
                </div>
              );
            })}
          </div>

          {/* Offset plan */}
          {offsetPlan && (
            <div style={{ background:'rgba(0,255,148,0.05)',border:'1px solid rgba(0,255,148,0.25)',borderRadius:14,padding:'18px 22px',marginBottom:20,display:'flex',justifyContent:'space-between',alignItems:'center',gap:20,flexWrap:'wrap' }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:9,color:C.green,fontFamily:'JetBrains Mono, monospace',marginBottom:8 }}>
                  🌿 {L('RECOMMENDED OFFSET STRATEGY','STRATÉGIE DE COMPENSATION RECOMMANDÉE')}
                </div>
                <div style={{ fontSize:12,color:C.text2,marginBottom:12,lineHeight:1.7 }}>{offsetPlan.recommendation}</div>
                <div style={{ display:'flex',gap:10,flexWrap:'wrap' }}>
                  {(offsetPlan.strategy||[]).map(o=>(
                    <div key={o.standard} style={{ background:C.card2,border:'1px solid '+C.border,borderRadius:9,padding:'10px 14px',textAlign:'center',minWidth:120 }}>
                      <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:4 }}>{o.standard.replace('_',' ')}</div>
                      <div style={{ fontSize:14,fontWeight:800,color:C.text }}>{(o.qty||0).toLocaleString()} t</div>
                      <div style={{ fontSize:11,color:C.green,fontWeight:600 }}>{fmtUSD(o.cost)}</div>
                    </div>
                  ))}
                </div>
              </div>
              <a href="/dashboard/marketplace" style={{ background:C.green,color:C.bg,borderRadius:10,padding:'12px 24px',fontWeight:800,fontSize:13,textDecoration:'none',fontFamily:'Syne, sans-serif',flexShrink:0,whiteSpace:'nowrap' }}>
                🏪 {L('Buy African Credits →','Acheter Crédits Africains →')}
              </a>
            </div>
          )}

          {/* Main grid: add entry + data */}
          <div style={{ display:'grid',gridTemplateColumns:'320px 1fr',gap:16 }}>

            {/* Add entry panel */}
            <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
              <div style={{ background:C.card,border:'1px solid '+C.border,borderRadius:14,padding:18 }}>
                <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:14,letterSpacing:'0.1em' }}>
                  + {L('ADD EMISSION SOURCE','AJOUTER UNE SOURCE')}
                </div>

                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:6 }}>SOURCE *</div>
                  <select value={addEntry.factorKey} onChange={e=>setAddEntry(f=>({...f,factorKey:e.target.value}))} style={inp}>
                    <option value="">{L('Select emission source...','Sélectionnez une source...')}</option>
                    {[1,2,3].map(scope=>(
                      <optgroup key={scope} label={'▸ Scope '+scope+' — '+(lang==='fr'?SCOPE_DESC[scope].fr:SCOPE_DESC[scope].en).split('—')[0].trim()}>
                        {factors.filter(f=>f.scope===scope).map(f=>(
                          <option key={f.key} value={f.key}>{f.desc} ({f.factor} tCO₂e/{f.unit})</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {selectedFactor && (
                  <div style={{ background:'rgba(56,189,248,0.05)',border:'1px solid rgba(56,189,248,0.15)',borderRadius:9,padding:'12px 14px',marginBottom:12 }}>
                    <div style={{ fontSize:11,color:C.blue,fontWeight:600,marginBottom:4 }}>{selectedFactor.desc}</div>
                    <div style={{ fontSize:10,color:C.muted,marginBottom:6 }}>
                      {L('Factor','Facteur')}: <strong style={{ color:C.text }}>{selectedFactor.factor}</strong> tCO₂e/{selectedFactor.unit} · IPCC AR6 + IEA 2024
                    </div>
                    <div style={{ fontSize:9,padding:'2px 8px',background:SCOPE_COLOR[selectedFactor.scope]+'15',color:SCOPE_COLOR[selectedFactor.scope],border:'1px solid '+SCOPE_COLOR[selectedFactor.scope]+'30',borderRadius:4,display:'inline-block',fontFamily:'JetBrains Mono, monospace' }}>
                      Scope {selectedFactor.scope}
                    </div>
                    {estimatedCO2>0 && (
                      <div style={{ marginTop:8,padding:'8px 10px',background:'rgba(248,113,113,0.08)',borderRadius:7,fontSize:14,fontWeight:800,color:C.red,fontFamily:'JetBrains Mono, monospace' }}>
                        ≈ {estimatedCO2.toFixed(3)} tCO₂e
                      </div>
                    )}
                  </div>
                )}

                {selectedFactor && (
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:6 }}>
                      {L('QUANTITY','QUANTITÉ')} ({selectedFactor.unit}) *
                    </div>
                    <input type="number" step="any" placeholder={'e.g. 1000 '+selectedFactor.unit}
                      value={addEntry.quantity} onChange={e=>setAddEntry(f=>({...f,quantity:e.target.value}))}
                      style={inp}/>
                  </div>
                )}

                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:6 }}>NOTES ({L('optional','optionnel')})</div>
                  <input placeholder={L('Optional notes, source reference...','Notes, référence source...')}
                    value={addEntry.notes} onChange={e=>setAddEntry(f=>({...f,notes:e.target.value}))}
                    style={inp}/>
                </div>

                <button onClick={addEntryFn} disabled={addingEntry||!addEntry.factorKey||!addEntry.quantity}
                  style={{ width:'100%',background:addingEntry||!addEntry.factorKey||!addEntry.quantity?C.card2:C.green,color:addingEntry||!addEntry.factorKey||!addEntry.quantity?C.muted:C.bg,border:'none',borderRadius:9,padding:13,fontWeight:800,fontSize:13,cursor:addingEntry||!addEntry.factorKey||!addEntry.quantity?'not-allowed':'pointer',fontFamily:'Syne, sans-serif',opacity:!addEntry.factorKey||!addEntry.quantity?0.5:1 }}>
                  {addingEntry ? '⟳' : '+ '+L('Add entry',"Ajouter l'entrée")}
                </button>
              </div>

              {/* Scope breakdown mini chart */}
              {scopeChartData.length > 0 && (
                <div style={{ background:C.card,border:'1px solid '+C.border,borderRadius:14,padding:16 }}>
                  <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:10 }}>
                    {L('SCOPE DISTRIBUTION','RÉPARTITION PAR SCOPE')}
                  </div>
                  <ResponsiveContainer width="100%" height={120}>
                    <PieChart>
                      <Pie data={scopeChartData} dataKey="value" cx="50%" cy="50%" outerRadius={45} innerRadius={25}>
                        {scopeChartData.map((d,i)=><Cell key={i} fill={d.color}/>)}
                      </Pie>
                      <Tooltip content={<TTContent/>}/>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap',marginTop:4 }}>
                    {scopeChartData.map(d=>(
                      <span key={d.name} style={{ fontSize:9,color:d.color,fontFamily:'JetBrains Mono, monospace' }}>■ {d.name}: {d.pct}%</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: entries + charts */}
            <div style={{ display:'flex',flexDirection:'column',gap:14 }}>

              {/* Tabs */}
              <div style={{ display:'flex',gap:2,borderBottom:'1px solid '+C.border }}>
                {([
                  ['entries', '📋 '+L('Entries','Entrées')],
                  ['charts',  '📊 '+L('Charts','Graphiques')],
                  ['ai',      '🤖 AI '+L('Analysis','Analyse')],
                ] ).map(([id,label])=>(
                  <button key={id} onClick={()=>setActiveTab(id)}
                    style={{ padding:'9px 18px',border:'none',cursor:'pointer',fontSize:12,fontWeight:600,fontFamily:'JetBrains Mono, monospace',borderBottom:'2px solid '+(activeTab===id?C.green:'transparent'),background:'transparent',color:activeTab===id?C.green:C.muted }}>
                    {label}
                  </button>
                ))}
              </div>

              {/* ENTRIES tab */}
              {activeTab==='entries' && (
                <div style={{ background:C.card,border:'1px solid '+C.border,borderRadius:14,overflow:'hidden' }}>
                  <div style={{ padding:'14px 18px',borderBottom:'1px solid '+C.border,display:'flex',gap:10,alignItems:'center',flexWrap:'wrap' }}>
                    <div style={{ fontSize:10,color:C.muted,fontFamily:'JetBrains Mono, monospace',flexShrink:0 }}>
                      {L('ENTRIES','ENTRÉES')} ({currentAudit.entries?.length||0})
                    </div>
                    <input placeholder={L('Search...','Rechercher...')} value={searchEntry} onChange={e=>setSearchEntry(e.target.value)}
                      style={{ ...inp, width:160, padding:'5px 10px', fontSize:11 }}/>
                    <div style={{ display:'flex',gap:4,marginLeft:'auto' }}>
                      {[0,1,2,3].map(s=>(
                        <button key={s} onClick={()=>setFilterScope(s===filterScope?0:s)}
                          style={{ padding:'5px 10px',borderRadius:5,border:'1px solid '+(s===filterScope?(s===0?C.muted:SCOPE_COLOR[s]):C.border),background:'transparent',color:s===filterScope?(s===0?C.text2:SCOPE_COLOR[s]):C.muted,cursor:'pointer',fontSize:11 }}>
                          {s===0?L('All','Tout'):'S'+s}
                        </button>
                      ))}
                    </div>
                  </div>
                  {filteredEntries.length===0 ? (
                    <div style={{ padding:'40px 0',textAlign:'center',color:C.muted,fontSize:13 }}>
                      {currentAudit.entries?.length===0
                        ? L('No entries yet — add your first emission source','Aucune entrée — ajoutez une source')
                        : L('No entries match the filter','Aucune entrée pour ce filtre')}
                    </div>
                  ) : (
                    <table style={{ width:'100%',borderCollapse:'collapse',fontSize:11 }}>
                      <thead>
                        <tr style={{ background:'rgba(255,255,255,0.02)' }}>
                          {['Scope',L('Source','Source'),L('Quantity','Quantité'),L('Unit','Unité'),'EF','tCO₂e',''].map(h=>(
                            <th key={h} style={{ padding:'9px 12px',textAlign:'left',fontSize:8,color:C.muted,fontFamily:'JetBrains Mono, monospace',borderBottom:'1px solid '+C.border }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEntries.map(e=>(
                          <tr key={e.id} style={{ borderBottom:'1px solid '+C.border+'22' }}
                            onMouseEnter={ev=>ev.currentTarget.style.background='rgba(30,45,61,0.25)'}
                            onMouseLeave={ev=>ev.currentTarget.style.background='transparent'}>
                            <td style={{ padding:'9px 12px' }}>
                              <span style={{ fontSize:9,color:SCOPE_COLOR[e.scope],background:SCOPE_COLOR[e.scope]+'15',border:'1px solid '+SCOPE_COLOR[e.scope]+'30',borderRadius:3,padding:'1px 6px',fontFamily:'JetBrains Mono, monospace' }}>S{e.scope}</span>
                            </td>
                            <td style={{ padding:'9px 12px',color:C.text,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{e.description}</td>
                            <td style={{ padding:'9px 12px',color:C.text2,fontFamily:'JetBrains Mono, monospace' }}>{(e.quantity||0).toLocaleString()}</td>
                            <td style={{ padding:'9px 12px',color:C.muted,fontFamily:'JetBrains Mono, monospace',fontSize:10 }}>{e.unit}</td>
                            <td style={{ padding:'9px 12px',color:C.muted,fontFamily:'JetBrains Mono, monospace',fontSize:10 }}>{e.emissionFactor}</td>
                            <td style={{ padding:'9px 12px',color:C.red,fontFamily:'JetBrains Mono, monospace',fontWeight:700 }}>{(e.co2e||0).toFixed(3)}</td>
                            <td style={{ padding:'9px 12px' }}>
                              <button onClick={()=>setConfirmDeleteEntry(e.id)} style={{ background:'transparent',border:'none',color:C.muted,cursor:'pointer',fontSize:14,padding:'2px 6px' }}>×</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop:'2px solid '+C.border }}>
                          <td colSpan={5} style={{ padding:'10px 12px',color:C.muted,fontFamily:'JetBrains Mono, monospace',fontSize:9 }}>TOTAL ({filteredEntries.length})</td>
                          <td style={{ padding:'10px 12px',color:C.red,fontFamily:'JetBrains Mono, monospace',fontWeight:800,fontSize:14 }}>
                            {filteredEntries.reduce((s,e)=>s+(e.co2e||0),0).toFixed(3)} tCO₂e
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>
              )}

              {/* CHARTS tab */}
              {activeTab==='charts' && (
                <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
                  {categoryChartData.length > 0 ? (
                    <>
                      <div style={{ background:C.card,border:'1px solid '+C.border,borderRadius:14,padding:18 }}>
                        <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:12 }}>
                          {L('TOP EMISSION SOURCES (tCO₂e)','TOP SOURCES D\'ÉMISSIONS (tCO₂e)')}
                        </div>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={categoryChartData} layout="vertical">
                            <XAxis type="number" tick={{ fontSize:9, fill:C.muted }}/>
                            <YAxis type="category" dataKey="cat" tick={{ fontSize:9, fill:C.muted }} width={70}/>
                            <Tooltip content={<TTContent/>}/>
                            <Bar dataKey="val" name="tCO₂e" fill={C.red} radius={[0,4,4,0]}/>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div style={{ background:C.card,border:'1px solid '+C.border,borderRadius:14,padding:18 }}>
                        <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:12 }}>
                          {L('SCOPE BREAKDOWN (tCO₂e)','RÉPARTITION PAR SCOPE (tCO₂e)')}
                        </div>
                        <ResponsiveContainer width="100%" height={180}>
                          <BarChart data={[{ name:currentAudit.reportingYear+'', s1:currentAudit.scope1Total||0, s2:currentAudit.scope2Total||0, s3:currentAudit.scope3Total||0 }]}>
                            <XAxis dataKey="name" tick={{ fontSize:10, fill:C.muted }}/>
                            <YAxis tickFormatter={v=>v+'t'} tick={{ fontSize:10, fill:C.muted }} width={50}/>
                            <Tooltip content={<TTContent/>}/>
                            <Bar dataKey="s1" name="Scope 1" fill={C.red} stackId="a" radius={[0,0,0,0]}/>
                            <Bar dataKey="s2" name="Scope 2" fill={C.yellow} stackId="a"/>
                            <Bar dataKey="s3" name="Scope 3" fill={C.blue} stackId="a" radius={[3,3,0,0]}/>
                            <Legend/>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  ) : (
                    <div style={{ background:C.card,border:'1px solid '+C.border,borderRadius:14,padding:48,textAlign:'center',color:C.muted }}>
                      <div style={{ fontSize:40,marginBottom:12 }}>📊</div>
                      <div style={{ fontSize:14,color:C.text }}>{L('Add entries to see charts','Ajoutez des entrées pour voir les graphiques')}</div>
                    </div>
                  )}
                </div>
              )}

              {/* AI ANALYSIS tab */}
              {activeTab==='ai' && (
                <div style={{ background:C.card,border:'1px solid rgba(167,139,250,0.2)',borderRadius:14,padding:22 }}>
                  <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:16 }}>
                    <div style={{ width:36,height:36,borderRadius:9,background:'rgba(167,139,250,0.1)',border:'1px solid rgba(167,139,250,0.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18 }}>🤖</div>
                    <div>
                      <div style={{ fontSize:9,color:C.purple,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.1em' }}>AI ANALYSIS · CLAUDE · IPCC AR6</div>
                      <div style={{ fontSize:12,color:C.text2 }}>{L('Intelligent carbon footprint analysis','Analyse intelligente de l\'empreinte carbone')}</div>
                    </div>
                  </div>
                  {currentAudit.aiAnalysis ? (
                    <div style={{ fontSize:13,color:C.text2,lineHeight:1.9,whiteSpace:'pre-wrap',background:C.card2,borderRadius:9,padding:16 }}>
                      {currentAudit.aiAnalysis}
                    </div>
                  ) : (
                    <div style={{ textAlign:'center',padding:'32px 0' }}>
                      <div style={{ fontSize:11,color:C.muted,marginBottom:16,lineHeight:1.7 }}>
                        {L('Run AI analysis to get: reduction recommendations, offset strategy, CSRD compliance check, industry benchmarks.','Lancez l\'analyse IA pour obtenir: recommandations de réduction, stratégie de compensation, vérification CSRD, comparaisons sectorielles.')}
                      </div>
                      <button onClick={runAI} disabled={aiLoading||!(currentAudit.grandTotal>0)}
                        style={{ background:'rgba(167,139,250,0.12)',border:'1px solid rgba(167,139,250,0.3)',borderRadius:9,color:C.purple,padding:'12px 24px',cursor:aiLoading||!currentAudit.grandTotal?'not-allowed':'pointer',fontSize:13,fontWeight:700 }}>
                        {aiLoading?'⟳ '+L('Analyzing...','Analyse en cours...'):L('Run AI Analysis','Lancer l\'analyse IA')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
