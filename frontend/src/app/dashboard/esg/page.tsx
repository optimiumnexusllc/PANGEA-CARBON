'use client';
import { useLang } from '@/lib/lang-context';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { fetchAuthJson } from '@/lib/fetch-auth';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

const C = {
  bg:'#080B0F', card:'#0D1117', card2:'#0A1628', border:'#1E2D3D',
  green:'#00FF94', red:'#F87171', yellow:'#FCD34D', blue:'#38BDF8',
  purple:'#A78BFA', orange:'#F97316', muted:'#4A6278', text:'#E8EFF6', text2:'#8FA3B8',
};

const PILLAR_C = { E:C.green, S:C.blue, G:C.purple };
const PILLAR_ICON = { E:'🌍', S:'👥', G:'🏛' };

const ESG_STANDARDS = [
  { id:'GRI',     nameEn:'GRI Standards 2024',          nameFr:'Standards GRI 2024',         icon:'🌍', color:C.green,  badge:'Universal' },
  { id:'CSRD',    nameEn:'CSRD / ESRS E1-S1-G1',       nameFr:'CSRD / ESRS Complet',         icon:'🇪🇺', color:C.blue,   badge:'EU Mandatory' },
  { id:'SASB',    nameEn:'SASB Industry Standards',     nameFr:'Standards Sectoriels SASB',   icon:'📊', color:C.purple, badge:'Investor-grade' },
  { id:'IFRS',    nameEn:'IFRS S1 + S2 (ISSB)',         nameFr:'IFRS S1+S2 (ISSB)',           icon:'📋', color:C.yellow, badge:'Global Baseline' },
  { id:'UNGC',    nameEn:'UN Global Compact + SDGs',    nameFr:'Pacte Mondial ONU + ODD',     icon:'🇺🇳', color:'#0E7490', badge:'10 Principles' },
  { id:'KING_IV', nameEn:'King IV Report (Africa)',     nameFr:'Rapport King IV (Afrique)',   icon:'👑', color:C.red,    badge:'African Governance' },
  { id:'TCFD',    nameEn:'TCFD Framework 2024',         nameFr:'Cadre TCFD 2024',             icon:'🏦', color:C.orange, badge:'Climate Finance' },
  { id:'BTEAM',   nameEn:'B Corp / B Team Standards',  nameFr:'Standards B Corp',            icon:'🏆', color:'#065F46',badge:'Force for Good' },
];

const SECTORS = ['Energy','Industry','Finance','Agriculture','Transport','Technology','Healthcare','Construction','OTHER'];

const LEVEL_CONFIG = {
  PLATINUM:{ color:C.blue,   bg:'rgba(96,165,250,0.1)',  border:'rgba(96,165,250,0.3)',  icon:'💎', min:80 },
  GOLD:    { color:C.yellow, bg:'rgba(252,211,77,0.1)',  border:'rgba(252,211,77,0.3)',  icon:'🏆', min:65 },
  SILVER:  { color:C.text2,  bg:'rgba(226,232,240,0.1)',border:'rgba(226,232,240,0.3)', icon:'🥈', min:50 },
  BRONZE:  { color:C.orange, bg:'rgba(249,115,22,0.1)',  border:'rgba(249,115,22,0.3)', icon:'🥉', min:35 },
  BASIC:   { color:C.muted,  bg:'rgba(74,98,120,0.1)',   border:'rgba(74,98,120,0.3)',   icon:'📋', min:0  },
};

const QUESTIONS_FLAT = {
  E: [
    { id:'E1', qEn:'Do you measure and report GHG emissions (Scope 1, 2, 3)?', qFr:'Mesurez-vous et déclarez-vous vos émissions GES (Scope 1, 2, 3) ?', weight:10, std:'GRI 305 / ESRS E1', sdg:13, type:'bool', cat:'Climate' },
    { id:'E2', qEn:'Do you have a science-based net-zero target (SBTi)?', qFr:'Avez-vous un objectif net-zéro basé sur la science (SBTi) ?', weight:8, std:'SBTi / ESRS E1', sdg:13, type:'bool', cat:'Climate' },
    { id:'E3', qEn:'What % of your energy comes from renewables?', qFr:'Quel % de votre énergie provient des énergies renouvelables ?', weight:7, std:'GRI 302', sdg:7, type:'pct', cat:'Climate' },
    { id:'E4', qEn:'Do you have a climate transition plan with milestones?', qFr:'Avez-vous un plan de transition climatique avec jalons ?', weight:7, std:'TCFD / CSRD', sdg:13, type:'bool', cat:'Climate' },
    { id:'E5', qEn:'Do you purchase carbon credits (Verra/Gold Standard)?', qFr:'Achetez-vous des crédits carbone (Verra/Gold Standard) ?', weight:5, std:'VCMI', sdg:13, type:'bool', cat:'Climate' },
    { id:'E6', qEn:'Do you measure and report water consumption?', qFr:'Mesurez-vous et déclarez-vous votre consommation d\'eau ?', weight:6, std:'GRI 303', sdg:6, type:'bool', cat:'Environment' },
    { id:'E7', qEn:'Do you have a zero-waste-to-landfill target?', qFr:'Avez-vous un objectif zéro déchet en décharge ?', weight:4, std:'GRI 306', sdg:12, type:'bool', cat:'Environment' },
    { id:'E8', qEn:'Do you assess your impact on local biodiversity?', qFr:'Évaluez-vous votre impact sur la biodiversité locale ?', weight:5, std:'GRI 304 / ESRS E4', sdg:15, type:'bool', cat:'Environment' },
    { id:'E9', qEn:'Do you have an environmental management system (ISO 14001)?', qFr:'Disposez-vous d\'un système de management environnemental (ISO 14001) ?', weight:5, std:'ISO 14001', sdg:12, type:'bool', cat:'Environment' },
    { id:'E10', qEn:'Do you assess environmental risks in your supply chain?', qFr:'Évaluez-vous les risques environnementaux dans votre chaîne d\'approvisionnement ?', weight:6, std:'CSDDD / ESRS E1', sdg:12, type:'bool', cat:'Supply Chain' },
    { id:'E11', qEn:'Do you require environmental standards from key suppliers?', qFr:'Exigez-vous des standards environnementaux de vos fournisseurs clés ?', weight:5, std:'GRI 308', sdg:12, type:'bool', cat:'Supply Chain' },
  ],
  S: [
    { id:'S1', qEn:'Do you publish an employee safety report (LTIR)?', qFr:'Publiez-vous un rapport de sécurité des employés (LTIR) ?', weight:8, std:'GRI 403', sdg:8, type:'bool', cat:'Labor' },
    { id:'S2', qEn:'% women in management positions?', qFr:'% de femmes dans des postes de direction ?', weight:7, std:'GRI 405 / ESRS S1', sdg:5, type:'pct', cat:'Labor' },
    { id:'S3', qEn:'Do you pay living wages above national minimum?', qFr:'Versez-vous des salaires décents au-dessus du minimum national ?', weight:7, std:'GRI 202 / ILO', sdg:8, type:'bool', cat:'Labor' },
    { id:'S4', qEn:'Average training hours per employee per year?', qFr:'Heures de formation moyennes par employé par an ?', weight:5, std:'GRI 404', sdg:4, type:'number', cat:'Labor' },
    { id:'S5', qEn:'Do you allow freedom of association?', qFr:'Respectez-vous la liberté d\'association syndicale ?', weight:7, std:'ILO / GRI 407', sdg:8, type:'bool', cat:'Labor' },
    { id:'S6', qEn:'Do you prohibit child labor and forced labor?', qFr:'Interdisez-vous le travail des enfants et le travail forcé ?', weight:9, std:'ILO Core', sdg:8, type:'bool', cat:'Labor' },
    { id:'S7', qEn:'Do you measure community investment (% revenue)?', qFr:'Mesurez-vous l\'investissement communautaire (% du CA) ?', weight:6, std:'GRI 413', sdg:11, type:'bool', cat:'Community' },
    { id:'S8', qEn:'Do you conduct community impact assessments?', qFr:'Réalisez-vous des évaluations d\'impact communautaire ?', weight:6, std:'IFC PS 5', sdg:11, type:'bool', cat:'Community' },
    { id:'S9', qEn:'Do you have a community grievance mechanism?', qFr:'Disposez-vous d\'un mécanisme de réclamation communautaire ?', weight:5, std:'IFC PS 2', sdg:16, type:'bool', cat:'Community' },
    { id:'S10', qEn:'% of workforce from local communities?', qFr:'% de la main-d\'oeuvre issu de la communauté locale ?', weight:5, std:'GRI 413', sdg:8, type:'pct', cat:'Community' },
    { id:'S11', qEn:'Have you conducted human rights due diligence?', qFr:'Avez-vous réalisé une diligence raisonnable droits humains ?', weight:8, std:'UNGP / CSDDD', sdg:16, type:'bool', cat:'Human Rights' },
    { id:'S12', qEn:'Do you have an anti-modern slavery policy?', qFr:'Disposez-vous d\'une politique anti-esclavage moderne ?', weight:7, std:'CSDDD', sdg:8, type:'bool', cat:'Human Rights' },
  ],
  G: [
    { id:'G1', qEn:'Does your board have an ESG/sustainability committee?', qFr:'Votre conseil a-t-il un comité ESG/développement durable ?', weight:8, std:'GRI 2 / King IV', sdg:16, type:'bool', cat:'Board' },
    { id:'G2', qEn:'% of independent board members?', qFr:'% d\'administrateurs indépendants ?', weight:7, std:'King IV / OECD', sdg:16, type:'pct', cat:'Board' },
    { id:'G3', qEn:'Is ESG performance linked to executive compensation?', qFr:'La performance ESG est-elle liée à la rémunération des dirigeants ?', weight:7, std:'ESRS G1 / King IV', sdg:16, type:'bool', cat:'Board' },
    { id:'G4', qEn:'Does the board have climate competency (TCFD)?', qFr:'Le conseil dispose-t-il de compétences climatiques (TCFD) ?', weight:6, std:'TCFD / ESRS G1', sdg:13, type:'bool', cat:'Board' },
    { id:'G5', qEn:'Do you have a public anti-corruption/bribery policy?', qFr:'Disposez-vous d\'une politique anti-corruption publiée ?', weight:9, std:'GRI 205 / UNGC P10', sdg:16, type:'bool', cat:'Ethics' },
    { id:'G6', qEn:'Do you have a whistleblower protection mechanism?', qFr:'Disposez-vous d\'un mécanisme de protection des lanceurs d\'alerte ?', weight:7, std:'GRI 2-26 / ESRS G1', sdg:16, type:'bool', cat:'Ethics' },
    { id:'G7', qEn:'Are you a UN Global Compact signatory?', qFr:'Êtes-vous signataire du Pacte Mondial ONU ?', weight:6, std:'UNGC', sdg:17, type:'bool', cat:'Ethics' },
    { id:'G8', qEn:'Do you publish a tax transparency report?', qFr:'Publiez-vous un rapport de transparence fiscale ?', weight:5, std:'GRI 207', sdg:16, type:'bool', cat:'Ethics' },
    { id:'G9', qEn:'Do you publish an annual sustainability/ESG report?', qFr:'Publiez-vous un rapport développement durable/ESG annuel ?', weight:8, std:'GRI 2 / CSRD', sdg:17, type:'bool', cat:'Transparency' },
    { id:'G10', qEn:'Is your ESG data externally assured/audited?', qFr:'Vos données ESG sont-elles vérifiées par un tiers externe ?', weight:7, std:'ISAE 3000', sdg:16, type:'bool', cat:'Transparency' },
    { id:'G11', qEn:'Do you disclose climate-related financial risks (TCFD)?', qFr:'Divulguez-vous les risques financiers liés au climat (TCFD) ?', weight:6, std:'TCFD / IFRS S2', sdg:13, type:'bool', cat:'Transparency' },
    { id:'G12', qEn:'Do you have a supplier code of conduct?', qFr:'Disposez-vous d\'un code de conduite fournisseurs ?', weight:5, std:'GRI 2 / CSDDD', sdg:12, type:'bool', cat:'Transparency' },
  ],
};

function calcScore(responses) {
  const pillars = { E:{s:0,m:0}, S:{s:0,m:0}, G:{s:0,m:0} };
  Object.entries(QUESTIONS_FLAT).forEach(([p,qs])=>{
    qs.forEach(q=>{
      pillars[p].m += q.weight*10;
      const r = responses[q.id];
      if(r!==undefined&&r!==null&&r!==''){
        if(q.type==='bool') pillars[p].s += r?q.weight*10:0;
        else if(q.type==='pct') pillars[p].s += (Math.min(100,parseFloat(r)||0)/100)*q.weight*10;
        else if(q.type==='number') pillars[p].s += (Math.min(1,(parseFloat(r)||0)/40))*q.weight*10;
      }
    });
  });
  const eS = pillars.E.m>0?Math.round(pillars.E.s/pillars.E.m*100):0;
  const sS = pillars.S.m>0?Math.round(pillars.S.s/pillars.S.m*100):0;
  const gS = pillars.G.m>0?Math.round(pillars.G.s/pillars.G.m*100):0;
  const tot = Math.round(eS*0.4+sS*0.35+gS*0.25);
  const rating = tot>=80?'AAA':tot>=65?'AA':tot>=50?'A':tot>=35?'BBB':tot>=20?'BB':'B';
  const level = tot>=80?'PLATINUM':tot>=65?'GOLD':tot>=50?'SILVER':tot>=35?'BRONZE':'BASIC';
  return { eScore:eS, sScore:sS, gScore:gS, total:tot, rating, level };
}

export default function ESGPage() {
  const { lang } = useLang();
  const L = (en, fr) => lang==='fr'?fr:en;

  const [tab, setTab] = useState('dashboard');
  const [assessments, setAssessments] = useState([]);
  const [current, setCurrent] = useState(null);
  const [responses, setResponses] = useState({});
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(null);
  const [toast, setToast] = useState(null);
  const [showReports, setShowReports] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [newForm, setNewForm] = useState({ companyName:'', reportingYear:new Date().getFullYear()-1, sector:'OTHER', country:'CI', framework:'GRI' });
  const [creating, setCreating] = useState(false);
  const [filterPillar, setFilterPillar] = useState('E');
  const autoSaveTimerRef = useRef(null);

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),4500); };
  const score = useMemo(()=>calcScore(responses),[responses]);
  const levelCfg = LEVEL_CONFIG[score.level]||LEVEL_CONFIG.BASIC;

  const load = useCallback(async()=>{
    setLoading(true);
    try {
      const [a,d] = await Promise.all([
        fetchAuthJson('/esg/assessments').catch(()=>({assessments:[]})),
        fetchAuthJson('/esg/dashboard').catch(()=>null),
      ]);
      setAssessments(a.assessments||[]);
      setDashboard(d);
    } finally { setLoading(false); }
  },[]);

  useEffect(()=>{ load(); },[load]);

  const openAssessment = async(a) => {
    setCurrent(a); setResponses(a.responses||{}); setTab('assess'); setShowReports(false);
  };

  const createAssessment = async() => {
    setCreating(true);
    try {
      const a = await fetchAuthJson('/esg/assessments',{method:'POST',body:JSON.stringify(newForm)});
      showToast_SKIP('Évaluation créée !'));
      await load(); setCurrent(a); setResponses({}); setTab('assess');
    } catch(e) { showToast(e.message,'error'); }
    finally { setCreating(false); }
  };

  const saveResponses = useCallback(async(resp) => {
    if (!current) return;
    setSaving(true);
    try {
      const updated = await fetchAuthJson('/esg/assessments/'+current.id+'/responses',{method:'PUT',body:JSON.stringify({responses:resp})});
      setCurrent(updated);
      await load();
    } catch(e) { console.error(e); }
    finally { setSaving(false); }
  },[current]);

  const setResponse = (id, val) => {
    const r = {...responses, [id]:val};
    setResponses(r);
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(()=>saveResponses(r), 1500);
  };

  const downloadReport = async(stdId, pdfLang) => {
    const key = current.id+'-'+stdId+'-'+pdfLang;
    setGeneratingKey(key);
    showToast((lang==='fr'?'Génération':'Generating')+' '+stdId+' ('+pdfLang.toUpperCase()+')...','info');
    try {
      const token = typeof window!=='undefined'?localStorage.getItem('accessToken'):'';
      const url = (process.env.NEXT_PUBLIC_API_URL||'')+'/esg/assessments/'+current.id+'/report?lang='+pdfLang+'&standard='+stdId;
      const res = await fetch(url,{headers:{Authorization:'Bearer '+token}});
      if(!res.ok){const e=await res.json().catch(()=>({error:'Error'}));throw new Error(e.error);}
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href=objUrl;
      a.download='PANGEA-ESG-'+stdId+'-'+(current.companyName||'Company').replace(/[^a-zA-Z0-9]/g,'-').slice(0,15)+'-'+(current.reportingYear||2024)+'-'+pdfLang.toUpperCase()+'.pdf';
      a.click(); URL.revokeObjectURL(objUrl);
      showToast((lang==='fr'?'Téléchargé !':'Downloaded!')+' '+stdId+' ('+pdfLang.toUpperCase()+')');
    } catch(e) { showToast(e.message||'Error','error'); }
    finally { setGeneratingKey(null); }
  };

  const deleteAssessment = async() => {
    if(!deleteConfirm) return;
    try {
      await fetchAuthJson('/esg/assessments/'+deleteConfirm.id,{method:'DELETE'});
      showToast(lang==='fr'?'Supprimé':'Deleted');
      setDeleteConfirm(null); setCurrent(null); setTab('dashboard'); await load();
    } catch(e) { showToast(e.message,'error'); }
  };

  const totalQ = Object.values(QUESTIONS_FLAT).flat().length;
  const answeredQ = Object.keys(responses).length;
  const progressPct = Math.round(answeredQ/totalQ*100);

  const inp = { background:C.card2, border:'1px solid '+C.border, borderRadius:8, color:C.text, padding:'9px 12px', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box' };

  return (
    <div style={{ padding:20, maxWidth:1500, margin:'0 auto' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed',top:20,right:20,zIndex:99999,maxWidth:440 }}>
          <div style={{ background:toast.type==='error'?'rgba(248,113,113,0.08)':toast.type==='info'?'rgba(56,189,248,0.06)':'rgba(0,255,148,0.06)', border:'1px solid '+(toast.type==='error'?'rgba(248,113,113,0.35)':toast.type==='info'?'rgba(56,189,248,0.3)':'rgba(0,255,148,0.3)'), borderRadius:12, padding:'14px 18px', display:'flex', alignItems:'center', gap:12, backdropFilter:'blur(20px)', boxShadow:'0 8px 32px rgba(0,0,0,0.5)', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute',left:0,top:0,bottom:0,width:3,background:toast.type==='error'?C.red:toast.type==='info'?C.blue:C.green }}/>
            <span style={{ fontSize:13,color:C.text,marginLeft:8 }}>{toast.msg}</span>
          </div>
        </div>
      )}

      {/* MODAL: Delete */}
      {deleteConfirm && (
        <div onClick={e=>{if(e.target===e.currentTarget)setDeleteConfirm(null);}}
          style={{ position:'fixed',inset:0,background:'rgba(8,11,15,0.88)',backdropFilter:'blur(10px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10001,padding:16 }}>
          <div style={{ background:C.card,border:'1px solid rgba(248,113,113,0.35)',borderRadius:16,padding:28,maxWidth:460,width:'100%',boxShadow:'0 24px 80px rgba(0,0,0,0.7)',position:'relative',overflow:'hidden' }}>
            <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,'+C.red+' 0%,rgba(248,113,113,0.2) 100%)' }}/>
            <div style={{ display:'flex',gap:14,alignItems:'center',marginBottom:16 }}>
              <div style={{ width:48,height:48,borderRadius:12,background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0 }}>🗑</div>
              <div>
                <div style={{ fontSize:9,color:C.red,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.12em',marginBottom:4 }}>ESG · {L('DELETE ASSESSMENT','SUPPRESSION ÉVALUATION')}</div>
                <h2 style={{ fontFamily:'Syne, sans-serif',fontSize:17,fontWeight:800,color:C.red,margin:0 }}>{L('Delete this assessment?','Supprimer cette évaluation ?')}</h2>
              </div>
            </div>
            <div style={{ height:1,background:'linear-gradient(90deg,rgba(248,113,113,0.25) 0%,transparent 100%)',marginBottom:18 }}/>
            <div style={{ background:'rgba(248,113,113,0.05)',border:'1px solid rgba(248,113,113,0.15)',borderRadius:10,padding:'14px 16px',marginBottom:20 }}>
              <div style={{ fontSize:13,color:C.text,fontWeight:700,marginBottom:6 }}>{deleteConfirm.companyName} — {deleteConfirm.reportingYear}</div>
              <p style={{ fontSize:12,color:C.text2,margin:0,lineHeight:1.7 }}>{L('All responses and scores will be permanently deleted. This action cannot be undone.','Toutes les réponses et scores seront définitivement supprimés. Cette action est irréversible.')}</p>
            </div>
            <div style={{ display:'flex',gap:10 }}>
              <button onClick={()=>setDeleteConfirm(null)} style={{ flex:1,background:'transparent',border:'1px solid '+C.border,borderRadius:9,color:C.muted,padding:12,cursor:'pointer',fontSize:13 }}>{L('Cancel','Annuler')}</button>
              <button onClick={deleteAssessment} style={{ flex:1,background:'rgba(248,113,113,0.12)',border:'1px solid rgba(248,113,113,0.4)',borderRadius:9,color:C.red,padding:12,fontWeight:800,cursor:'pointer',fontSize:13,fontFamily:'Syne, sans-serif' }}>
                🗑 {L('Delete permanently','Supprimer définitivement')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom:24, display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
        <div>
          <div style={{ fontSize:9,color:C.green,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.15em',marginBottom:8 }}>GRI · CSRD · SASB · IFRS S1/S2 · UN SDGs · KING IV · TCFD · B CORP</div>
          <h1 style={{ fontFamily:'Syne, sans-serif',fontSize:26,fontWeight:800,color:C.text,margin:0,marginBottom:6 }}>ESG Intelligence Engine</h1>
          <p style={{ fontSize:13,color:C.muted,margin:0,maxWidth:700 }}>
            {L('Corporate ESG Assessment — Environmental, Social & Governance. From audit to certified attestation across 8 international standards.','Évaluation ESG Corporate — Environnement, Social & Gouvernance. De l\'audit à l\'attestation certifiée sur 8 standards internationaux.')}
          </p>
        </div>
        <div style={{ display:'flex',gap:8,flexShrink:0 }}>
          {tab!=='dashboard' && (
            <button onClick={()=>{setTab('dashboard');setCurrent(null);setShowReports(false);}}
              style={{ background:'transparent',border:'1px solid '+C.border,borderRadius:8,color:C.muted,padding:'9px 16px',cursor:'pointer',fontSize:12 }}>
              ← {L('Dashboard','Tableau de bord')}
            </button>
          )}
          <button onClick={()=>setTab('new')}
            style={{ background:C.green,color:C.bg,border:'none',borderRadius:9,padding:'10px 22px',fontWeight:800,cursor:'pointer',fontSize:13,fontFamily:'Syne, sans-serif' }}>
            + {L('New Assessment','Nouvelle Évaluation')}
          </button>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display:'flex',gap:2,marginBottom:24,borderBottom:'1px solid '+C.border }}>
        {([
          ['dashboard','📊 '+L('Dashboard','Tableau de bord'), C.green],
          ...(current?[
            ['assess','📋 '+L('Assessment','Évaluation'), C.blue],
            ['score','🏆 '+L('ESG Score','Score ESG'), C.yellow],
            ['reports','📥 '+L('Reports','Rapports'), C.purple],
          ['passport','🛂 '+L('Passport','Passeport'), C.orange],
          ] as any:[]),
        ] as [string,string,string][]).map(([id,label,color])=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{ padding:'11px 20px',border:'none',cursor:'pointer',fontSize:12,fontWeight:600,fontFamily:'JetBrains Mono, monospace',borderBottom:'2px solid '+(tab===id?color:'transparent'),background:'transparent',color:tab===id?color:C.muted,transition:'all .15s' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD ──────────────────────────────────────────────────────── */}
      {tab==='dashboard' && (
        <>
          {/* KPIs */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:24 }}>
            {[
              { l:L('Total Assessments','Évaluations totales'), v:assessments.length, c:C.blue, icon:'📊' },
              { l:L('ESG Score','Score ESG'), v:(dashboard?.latestScore||0)+'%', c:C.green, icon:'🏆' },
              { l:'E — '+L('Environment','Environnement'), v:(dashboard?.eScore||0)+'%', c:C.green, icon:'🌍' },
              { l:'S — Social', v:(dashboard?.sScore||0)+'%', c:C.blue, icon:'👥' },
              { l:'G — '+L('Governance','Gouvernance'), v:(dashboard?.gScore||0)+'%', c:C.purple, icon:'🏛' },
            ].map(k=>(
              <div key={k.l} style={{ background:C.card,border:'1px solid '+k.c+'22',borderRadius:12,padding:'14px 18px',position:'relative',overflow:'hidden' }}>
                <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,'+k.c+' 0%,transparent 100%)' }}/>
                <div style={{ position:'absolute',top:12,right:14,fontSize:20,opacity:0.2 }}>{k.icon}</div>
                <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:6 }}>{k.l.toUpperCase()}</div>
                <div style={{ fontSize:24,fontWeight:800,color:k.c,fontFamily:'Syne, sans-serif' }}>{k.v}</div>
              </div>
            ))}
          </div>

          <div style={{ display:'grid',gridTemplateColumns:'1fr 320px',gap:16 }}>
            <div style={{ background:C.card,border:'1px solid '+C.border,borderRadius:14,overflow:'hidden' }}>
              <div style={{ padding:'14px 20px',borderBottom:'1px solid '+C.border,fontSize:10,color:C.muted,fontFamily:'JetBrains Mono, monospace' }}>
                {L('ASSESSMENTS','ÉVALUATIONS')} — {assessments.length}
              </div>
              {assessments.length===0 ? (
                <div style={{ padding:56,textAlign:'center' }}>
                  <div style={{ fontSize:52,marginBottom:16 }}>⬡</div>
                  <div style={{ fontSize:18,color:C.text,fontWeight:700,marginBottom:8,fontFamily:'Syne, sans-serif' }}>{L('No ESG assessments yet','Aucune évaluation ESG')}</div>
                  <div style={{ fontSize:13,color:C.muted,marginBottom:20,lineHeight:1.7 }}>{L('Start your first assessment to measure E, S & G performance across 33 questions.','Démarrez votre première évaluation pour mesurer la performance E, S & G sur 33 questions.')}</div>
                  <button onClick={()=>setTab('new')} style={{ background:C.green,color:C.bg,border:'none',borderRadius:9,padding:'12px 28px',fontWeight:800,cursor:'pointer',fontFamily:'Syne, sans-serif' }}>
                    {L('Start assessment →','Démarrer l\'évaluation →')}
                  </button>
                </div>
              ) : assessments.map((a,i)=>{
                const lc = LEVEL_CONFIG[a.level||'BASIC'];
                return (
                  <div key={a.id} onClick={()=>openAssessment(a)} style={{ padding:'16px 20px',borderBottom:i<assessments.length-1?'1px solid '+C.border+'40':'none',cursor:'pointer',display:'flex',alignItems:'center',gap:16,transition:'background .12s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(30,45,61,0.3)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <div style={{ width:44,height:44,borderRadius:12,background:lc.bg,border:'1px solid '+lc.border,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0 }}>⬡</div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:14,fontWeight:700,color:C.text,marginBottom:4 }}>{a.companyName}</div>
                      <div style={{ fontSize:10,color:C.muted,fontFamily:'JetBrains Mono, monospace' }}>{a.framework} · {a.sector} · {a.country} · {a.reportingYear}</div>
                    </div>
                    <div style={{ textAlign:'right',flexShrink:0 }}>
                      <div style={{ fontSize:20,fontWeight:800,color:lc.color,fontFamily:'JetBrains Mono, monospace' }}>{Math.round(a.totalScore||0)}%</div>
                      <div style={{ fontSize:9,color:lc.color,fontFamily:'JetBrains Mono, monospace' }}>{a.rating} · {a.level}</div>
                    </div>
                    <div style={{ display:'flex',flexDirection:'column',gap:3,flexShrink:0 }}>
                      {(['E','S','G'] as const).map(p=>(
                        <div key={p} style={{ display:'flex',alignItems:'center',gap:6 }}>
                          <span style={{ fontSize:8,color:PILLAR_C[p],width:10 }}>{p}</span>
                          <div style={{ width:60,height:4,background:C.border,borderRadius:2 }}>
                            <div style={{ width:Math.round((p==='E'?a.eScore:p==='S'?a.sScore:a.gScore)||0)+'%',height:'100%',background:PILLAR_C[p],borderRadius:2 }}/>
                          </div>
                          <span style={{ fontSize:8,color:PILLAR_C[p],fontFamily:'JetBrains Mono, monospace' }}>{Math.round(p==='E'?a.eScore:p==='S'?a.sScore:a.gScore||0)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right: standards + why ESG */}
            <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
              <div style={{ background:C.card,border:'1px solid rgba(0,255,148,0.15)',borderRadius:14,padding:18 }}>
                <div style={{ fontSize:9,color:C.green,fontFamily:'JetBrains Mono, monospace',marginBottom:12 }}>⬡ PANGEA ESG ENGINE</div>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:6 }}>
                  {ESG_STANDARDS.slice(0,6).map(s=>(
                    <div key={s.id} style={{ background:C.card2,border:'1px solid '+s.color+'20',borderRadius:8,padding:'8px 10px' }}>
                      <div style={{ fontSize:13,marginBottom:3 }}>{s.icon}</div>
                      <div style={{ fontSize:10,fontWeight:700,color:s.color }}>{s.id}</div>
                      <div style={{ fontSize:8,color:C.muted,fontFamily:'JetBrains Mono, monospace' }}>{s.badge}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background:'rgba(56,189,248,0.05)',border:'1px solid rgba(56,189,248,0.15)',borderRadius:12,padding:16 }}>
                <div style={{ fontSize:9,color:C.blue,fontFamily:'JetBrains Mono, monospace',marginBottom:8 }}>🌍 WHY ESG + PANGEA CARBON</div>
                <div style={{ fontSize:11,color:C.text2,lineHeight:1.7 }}>
                  {L('CSRD (2025) mandates E+S+G reporting for EU-linked companies. African exporters face CBAM + CSDDD supply chain requirements. PANGEA ESG covers all 3 pillars with attestation certificates aligned with DFI requirements (IFC, AFDB, Proparco).','La CSRD (2025) impose le reporting E+S+G pour les entreprises liées à l\'UE. Les exportateurs africains font face au CBAM + CSDDD. PANGEA ESG couvre les 3 piliers avec des attestations alignées sur les exigences DFI (IFC, AFDB, Proparco).')}
                </div>
              </div>
              <div style={{ background:'rgba(167,139,250,0.05)',border:'1px solid rgba(167,139,250,0.15)',borderRadius:12,padding:16 }}>
                <div style={{ fontSize:9,color:C.purple,fontFamily:'JetBrains Mono, monospace',marginBottom:8 }}>📊 33 {L('QUESTIONS · 3 PILLARS','QUESTIONS · 3 PILIERS')}</div>
                {(['E','S','G'] as const).map(p=>(
                  <div key={p} style={{ display:'flex',alignItems:'center',gap:8,marginBottom:4 }}>
                    <span style={{ fontSize:12 }}>{PILLAR_ICON[p]}</span>
                    <span style={{ fontSize:11,color:PILLAR_C[p],fontWeight:600 }}>{p==='E'?L('Environmental','Environnement'):p==='S'?'Social':L('Governance','Gouvernance')}</span>
                    <span style={{ fontSize:10,color:C.muted,marginLeft:'auto',fontFamily:'JetBrains Mono, monospace' }}>{QUESTIONS_FLAT[p].length} {L('questions','questions')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── NEW ASSESSMENT ─────────────────────────────────────────────────── */}
      {tab==='new' && (
        <div style={{ maxWidth:640,margin:'0 auto' }}>
          <div style={{ background:C.card,border:'1px solid rgba(0,255,148,0.2)',borderRadius:16,padding:28,position:'relative',overflow:'hidden' }}>
            <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,'+C.green+' 0%,transparent 100%)' }}/>
            <div style={{ fontSize:9,color:C.green,fontFamily:'JetBrains Mono, monospace',marginBottom:18,letterSpacing:'0.1em' }}>+ {L('NEW ESG ASSESSMENT','NOUVELLE ÉVALUATION ESG')}</div>

            <div style={{ display:'grid',gridTemplateColumns:'1fr',gap:14,marginBottom:20 }}>
              <div>
                <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:6 }}>{L('COMPANY NAME *','NOM DE L\'ENTREPRISE *')}</div>
                <input placeholder={L('e.g. MTN Ghana, CFAO Group, Africa Finance Corp...','ex. MTN Ghana, CFAO Groupe, Africa Finance Corp...')} value={newForm.companyName} onChange={e=>setNewForm(f=>({...f,companyName:e.target.value}))} style={inp} autoFocus/>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
                <div>
                  <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:6 }}>{L('REPORTING YEAR','ANNÉE DE RÉFÉRENCE')}</div>
                  <input type="number" value={newForm.reportingYear} onChange={e=>setNewForm(f=>({...f,reportingYear:parseInt(e.target.value)}))} style={inp}/>
                </div>
                <div>
                  <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:6 }}>PAYS / COUNTRY</div>
                  <input placeholder="CI, NG, GH, KE, ZA..." value={newForm.country} onChange={e=>setNewForm(f=>({...f,country:e.target.value}))} style={inp}/>
                </div>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
                <div>
                  <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:6 }}>{L('SECTOR','SECTEUR')}</div>
                  <select value={newForm.sector} onChange={e=>setNewForm(f=>({...f,sector:e.target.value}))} style={inp}>
                    {SECTORS.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:6 }}>{L('PRIMARY FRAMEWORK','RÉFÉRENTIEL PRINCIPAL')}</div>
                  <select value={newForm.framework} onChange={e=>setNewForm(f=>({...f,framework:e.target.value}))} style={inp}>
                    {ESG_STANDARDS.map(s=><option key={s.id} value={s.id}>{s.id} — {lang==='fr'?s.nameFr:s.nameEn}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div style={{ background:'rgba(0,255,148,0.04)',border:'1px solid rgba(0,255,148,0.12)',borderRadius:9,padding:'12px 14px',marginBottom:20 }}>
              <div style={{ fontSize:11,color:C.green,fontWeight:600,marginBottom:5 }}>{L('What\'s in this assessment?','Qu\'y a-t-il dans cette évaluation ?')}</div>
              <div style={{ fontSize:11,color:C.text2,lineHeight:1.7 }}>
                {L('33 questions across E (Environmental), S (Social) and G (Governance). Auto-scored 0-100 with AAA-B rating. Generate certified reports in EN + FR across 8 international standards.','33 questions sur E (Environnement), S (Social) et G (Gouvernance). Score automatique 0-100 avec notation AAA-B. Générez des rapports certifiés EN + FR sur 8 standards internationaux.')}
              </div>
            </div>

            <div style={{ display:'flex',gap:10 }}>
              <button onClick={()=>setTab('dashboard')} style={{ flex:1,background:'transparent',border:'1px solid '+C.border,borderRadius:9,color:C.muted,padding:13,cursor:'pointer' }}>{L('Cancel','Annuler')}</button>
              <button onClick={createAssessment} disabled={creating||!newForm.companyName.trim()}
                style={{ flex:2,background:creating||!newForm.companyName.trim()?C.card2:C.green,color:creating||!newForm.companyName.trim()?C.muted:C.bg,border:'none',borderRadius:9,padding:13,fontWeight:800,fontSize:14,cursor:creating||!newForm.companyName.trim()?'not-allowed':'pointer',fontFamily:'Syne, sans-serif',opacity:!newForm.companyName.trim()?0.5:1 }}>
                {creating?'⟳ '+L('Creating...','Création...'):L('Start ESG Assessment →','Démarrer l\'évaluation ESG →')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ASSESSMENT (questions) ─────────────────────────────────────────── */}
      {tab==='assess' && current && (
        <div>
          {/* Progress bar */}
          <div style={{ background:C.card,border:'1px solid '+C.border,borderRadius:12,padding:'14px 20px',marginBottom:20,display:'flex',alignItems:'center',gap:16 }}>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex',justifyContent:'space-between',marginBottom:6 }}>
                <div style={{ fontSize:10,color:C.muted,fontFamily:'JetBrains Mono, monospace' }}>{L('PROGRESS','PROGRESSION')} — {answeredQ}/{totalQ} {L('answered','répondues')}</div>
                <div style={{ display:'flex',gap:8 }}>
                  {saving && <div style={{ fontSize:10,color:C.muted,fontFamily:'JetBrains Mono, monospace' }}>⟳ {L('Auto-saving...','Sauvegarde...')}</div>}
                  <div style={{ fontSize:10,color:score.total>0?levelCfg.color:C.muted,fontFamily:'JetBrains Mono, monospace' }}>
                    {score.total>0?'Score: '+score.total+'% · '+score.rating+' · '+score.level:'—'}
                  </div>
                </div>
              </div>
              <div style={{ height:6,background:C.border,borderRadius:3 }}>
                <div style={{ width:progressPct+'%',height:'100%',background:C.green,borderRadius:3,transition:'width 0.5s' }}/>
              </div>
            </div>
            <div style={{ display:'flex',gap:8,flexShrink:0 }}>
              <button onClick={()=>saveResponses(responses)} disabled={saving}
                style={{ background:'rgba(0,255,148,0.1)',border:'1px solid rgba(0,255,148,0.3)',borderRadius:8,color:C.green,padding:'8px 16px',cursor:'pointer',fontSize:12,fontWeight:700 }}>
                {saving?'⟳':'💾'} {L('Save','Sauvegarder')}
              </button>
              {current && <button onClick={()=>setDeleteConfirm(current)} style={{ background:'rgba(248,113,113,0.06)',border:'1px solid rgba(248,113,113,0.2)',borderRadius:8,color:C.red,padding:'8px 12px',cursor:'pointer',fontSize:11 }}>🗑</button>}
            </div>
          </div>

          {/* Pillar filter */}
          <div style={{ display:'flex',gap:8,marginBottom:20 }}>
            {(['E','S','G'] as const).map(p=>{
              const pc = PILLAR_C[p];
              const pScore = p==='E'?score.eScore:p==='S'?score.sScore:score.gScore;
              return (
                <button key={p} onClick={()=>setFilterPillar(p)}
                  style={{ flex:1,padding:'14px 16px',borderRadius:12,border:'1px solid '+(filterPillar===p?pc+'50':C.border),background:filterPillar===p?pc+'10':C.card,cursor:'pointer',textAlign:'left',transition:'all .15s' }}>
                  <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:6 }}>
                    <span style={{ fontSize:20 }}>{PILLAR_ICON[p]}</span>
                    <div>
                      <div style={{ fontSize:12,fontWeight:700,color:filterPillar===p?pc:C.text }}>
                        {p==='E'?L('Environmental','Environnement'):p==='S'?'Social':L('Governance','Gouvernance')}
                      </div>
                      <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace' }}>{QUESTIONS_FLAT[p].length} {L('questions','questions')}</div>
                    </div>
                    <div style={{ marginLeft:'auto',textAlign:'right' }}>
                      <div style={{ fontSize:18,fontWeight:800,color:pc,fontFamily:'JetBrains Mono, monospace' }}>{pScore}%</div>
                    </div>
                  </div>
                  <div style={{ height:4,background:C.border,borderRadius:2 }}>
                    <div style={{ width:pScore+'%',height:'100%',background:pc,borderRadius:2 }}/>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Questions */}
          <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
            {QUESTIONS_FLAT[filterPillar as 'E'|'S'|'G'].map((q,i)=>{
              const val = responses[q.id];
              const answered = val!==undefined&&val!==null&&val!=='';
              const pc = PILLAR_C[filterPillar as 'E'|'S'|'G'];
              return (
                <div key={q.id} style={{ background:C.card,border:'1px solid '+(answered?pc+'20':C.border),borderRadius:12,padding:'16px 18px',borderLeft:'3px solid '+(answered?pc:C.border) }}>
                  <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10 }}>
                    <div style={{ flex:1,marginRight:16 }}>
                      <div style={{ display:'flex',gap:8,alignItems:'center',marginBottom:6 }}>
                        <span style={{ fontSize:9,padding:'2px 7px',background:pc+'15',color:pc,border:'1px solid '+pc+'30',borderRadius:4,fontFamily:'JetBrains Mono, monospace',flexShrink:0 }}>{q.id}</span>
                        <span style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace' }}>SDG {q.sdg} · {q.std} · {q.cat}</span>
                        <span style={{ fontSize:8,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginLeft:'auto' }}>w: {q.weight}</span>
                      </div>
                      <div style={{ fontSize:13,color:answered?C.text:C.text2,lineHeight:1.6 }}>
                        {lang==='fr'?q.qFr:q.qEn}
                      </div>
                    </div>
                    <div style={{ flexShrink:0,minWidth:140 }}>
                      {q.type==='bool' && (
                        <div style={{ display:'flex',gap:6 }}>
                          <button onClick={()=>setResponse(q.id,true)}
                            style={{ flex:1,padding:'8px',borderRadius:7,border:'1px solid '+(val===true?C.green:C.border),background:val===true?'rgba(0,255,148,0.12)':'transparent',color:val===true?C.green:C.muted,cursor:'pointer',fontSize:12,fontWeight:val===true?700:400 }}>
                            {L('Yes','Oui')}
                          </button>
                          <button onClick={()=>setResponse(q.id,false)}
                            style={{ flex:1,padding:'8px',borderRadius:7,border:'1px solid '+(val===false?C.red:C.border),background:val===false?'rgba(248,113,113,0.08)':'transparent',color:val===false?C.red:C.muted,cursor:'pointer',fontSize:12,fontWeight:val===false?700:400 }}>
                            {L('No','Non')}
                          </button>
                        </div>
                      )}
                      {q.type==='pct' && (
                        <div>
                          <input type="number" min="0" max="100" placeholder="0–100 %" value={val||''} onChange={e=>setResponse(q.id,e.target.value)}
                            style={{ ...inp, width:100, textAlign:'center' }}/>
                          {val && <div style={{ fontSize:9,color:pc,textAlign:'center',marginTop:3,fontFamily:'JetBrains Mono, monospace' }}>{val}%</div>}
                        </div>
                      )}
                      {q.type==='number' && (
                        <div>
                          <input type="number" min="0" placeholder="0" value={val||''} onChange={e=>setResponse(q.id,e.target.value)}
                            style={{ ...inp, width:100, textAlign:'center' }}/>
                          {val && <div style={{ fontSize:9,color:pc,textAlign:'center',marginTop:3 }}>{val} hrs/yr</div>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── NEXT / PREVIOUS ── */}
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:20,padding:'16px 0',borderTop:'1px solid '+C.border }}>
            <div style={{ fontSize:11,color:C.muted,fontFamily:'JetBrains Mono, monospace' }}>
              {QUESTIONS_FLAT[filterPillar as 'E'|'S'|'G'].filter(q=>responses[q.id]!==undefined&&responses[q.id]!==null&&responses[q.id]!=='').length}
              {' / '}{QUESTIONS_FLAT[filterPillar as 'E'|'S'|'G'].length} {lang==='fr'?'répondues dans ce pilier':'answered in this pillar'}
            </div>
            <div style={{ display:'flex',gap:10 }}>
              {filterPillar !== 'E' && (
                <button onClick={()=>setFilterPillar(filterPillar==='G'?'S':'E')}
                  style={{ background:'transparent',border:'1px solid '+C.border,borderRadius:9,color:C.muted,padding:'11px 20px',cursor:'pointer',fontSize:13,fontWeight:600 }}>
                  ← {lang==='fr'?'Précédent':'Previous'}
                </button>
              )}
              {filterPillar !== 'G' ? (
                <button onClick={()=>setFilterPillar(filterPillar==='E'?'S':'G')}
                  style={{ background:filterPillar==='E'?PILLAR_C['S']:PILLAR_C['G'],color:'#080B0F',border:'none',borderRadius:9,padding:'11px 24px',cursor:'pointer',fontSize:13,fontWeight:800,fontFamily:'Syne, sans-serif' }}>
                  {filterPillar==='E'?'Next: 👥 Social →':'Next: 🏛 Governance →'}
                  {lang==='fr'&&filterPillar==='E'?' / Suivant: 👥 Social →':lang==='fr'?' / Gouvernance →':''}
                </button>
              ) : (
                <button onClick={()=>{ saveResponses(responses); setTab('score'); }}
                  style={{ background:C.green,color:'#080B0F',border:'none',borderRadius:9,padding:'11px 24px',cursor:'pointer',fontSize:13,fontWeight:800,fontFamily:'Syne, sans-serif' }}>
                  {lang==='fr'?'🏆 Voir mon Score ESG →':'🏆 View my ESG Score →'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── ESG SCORE ──────────────────────────────────────────────────────── */}
      {tab==='score' && current && (
        <div>
          {/* Level + rating */}
          <div style={{ background:C.card,border:'2px solid '+levelCfg.border,borderRadius:16,padding:24,marginBottom:20,position:'relative',overflow:'hidden' }}>
            <div style={{ position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,'+levelCfg.color+' 0%,transparent 100%)' }}/>
            <div style={{ display:'flex',alignItems:'center',gap:20,flexWrap:'wrap' }}>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:9,color:levelCfg.color,fontFamily:'JetBrains Mono, monospace',marginBottom:4 }}>{L('OVERALL ESG SCORE','SCORE ESG GLOBAL')}</div>
                <div style={{ fontSize:64,fontWeight:800,color:levelCfg.color,fontFamily:'Syne, sans-serif',lineHeight:1 }}>{score.total}</div>
                <div style={{ fontSize:14,color:levelCfg.color,fontFamily:'JetBrains Mono, monospace' }}>/100 · {score.rating}</div>
              </div>
              <div style={{ flex:1,minWidth:200 }}>
                <div style={{ fontSize:18,fontWeight:800,color:levelCfg.color,fontFamily:'Syne, sans-serif',marginBottom:6 }}>
                  {levelCfg.icon} {score.level}
                </div>
                <div style={{ fontSize:12,color:C.text2,marginBottom:12,lineHeight:1.7 }}>
                  {score.level==='PLATINUM'?L('Outstanding ESG leadership — DFI-ready, publication recommended','Leadership ESG exceptionnel — Prêt DFI, publication recommandée'):
                   score.level==='GOLD'?L('Strong ESG performance — eligible for impact investor disclosure','Performance ESG solide — éligible divulgation investisseurs impact'):
                   score.level==='SILVER'?L('Good ESG foundation — address priority gaps for certification','Bonne base ESG — combler les lacunes prioritaires pour certification'):
                   score.level==='BRONZE'?L('Emerging ESG practice — significant improvement needed','Pratique ESG émergente — amélioration significative requise'):
                   L('Basic ESG — initiate systematic approach across all pillars','ESG basique — initier une approche systématique sur tous les piliers')}
                </div>
                {/* Pillar bars */}
                {(['E','S','G'] as const).map(p=>{
                  const s = p==='E'?score.eScore:p==='S'?score.sScore:score.gScore;
                  const pc = PILLAR_C[p];
                  return (
                    <div key={p} style={{ marginBottom:8 }}>
                      <div style={{ display:'flex',justifyContent:'space-between',marginBottom:3 }}>
                        <span style={{ fontSize:11,color:pc }}>{PILLAR_ICON[p]} {p==='E'?L('Environmental','Environnement'):p==='S'?'Social':L('Governance','Gouvernance')}</span>
                        <span style={{ fontSize:11,color:pc,fontFamily:'JetBrains Mono, monospace',fontWeight:700 }}>{s}%</span>
                      </div>
                      <div style={{ height:6,background:C.border,borderRadius:3 }}>
                        <div style={{ width:s+'%',height:'100%',background:pc,borderRadius:3,transition:'width 0.8s' }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Radar */}
              <div style={{ width:200,height:160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={[
                    { subject:'E', value:score.eScore, benchmark:42 },
                    { subject:'S', value:score.sScore, benchmark:38 },
                    { subject:'G', value:score.gScore, benchmark:35 },
                  ]}>
                    <PolarGrid stroke={C.border}/>
                    <PolarAngleAxis dataKey="subject" tick={{ fill:C.muted, fontSize:11 }}/>
                    <Radar name={L('Score','Score')} dataKey="value" fill={levelCfg.color+'30'} stroke={levelCfg.color} strokeWidth={2}/>
                    <Radar name={L('Africa avg','Moy. Afrique')} dataKey="benchmark" fill="transparent" stroke={C.muted} strokeDasharray="4 2"/>
                    <Tooltip/>
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Compliance status */}
          <div style={{ background:C.card,border:'1px solid '+C.border,borderRadius:14,padding:20,marginBottom:16 }}>
            <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:14 }}>{L('COMPLIANCE STATUS BY FRAMEWORK','ÉTAT DE CONFORMITÉ PAR RÉFÉRENTIEL')}</div>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10 }}>
              {([
                { std:'CSRD', req:['E1','E2','E4','S11','G1','G9','G10'] },
                { std:'GRI',  req:['G9','E1','S1','S6','G5'] },
                { std:'UNGC', req:['S5','S6','S12','G5','G7','E10'] },
                { std:'TCFD', req:['E2','E4','G1','G4','G11'] },
              ]).map(({std,req})=>{
                const met = req.filter(id=>responses[id]).length;
                const pct = Math.round(met/req.length*100);
                const col = pct>=80?C.green:pct>=50?C.yellow:C.red;
                return (
                  <div key={std} style={{ background:C.card2,border:'1px solid '+col+'20',borderRadius:10,padding:'14px 16px' }}>
                    <div style={{ fontSize:13,fontWeight:700,color:col,marginBottom:6 }}>{std}</div>
                    <div style={{ fontSize:24,fontWeight:800,color:col,fontFamily:'JetBrains Mono, monospace' }}>{pct}%</div>
                    <div style={{ fontSize:10,color:C.muted,marginTop:4 }}>{met}/{req.length} {L('met','atteints')}</div>
                    <div style={{ height:3,background:C.border,borderRadius:2,marginTop:8 }}>
                      <div style={{ width:pct+'%',height:'100%',background:col,borderRadius:2 }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Answered questions bar chart */}
          <div style={{ background:C.card,border:'1px solid '+C.border,borderRadius:14,padding:20 }}>
            <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:14 }}>{L('SCORE BY PILLAR — 0-100%','SCORE PAR PILIER — 0-100%')}</div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={[
                { name:L('Environmental','Environnement'), score:score.eScore, benchmark:42 },
                { name:'Social', score:score.sScore, benchmark:38 },
                { name:L('Governance','Gouvernance'), score:score.gScore, benchmark:35 },
              ]}>
                <XAxis dataKey="name" tick={{ fontSize:11, fill:C.muted }}/>
                <YAxis domain={[0,100]} tick={{ fontSize:10, fill:C.muted }} width={35}/>
                <Tooltip/>
                <Bar dataKey="score" name={L('Score','Score')} radius={[4,4,0,0]}>
                  <Cell fill={C.green}/>
                  <Cell fill={C.blue}/>
                  <Cell fill={C.purple}/>
                </Bar>
                <Bar dataKey="benchmark" name={L('Africa avg','Moy. Afrique')} fill={C.muted+'50'} radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── REPORTS ────────────────────────────────────────────────────────── */}
      {tab==='reports' && current && (
        <div>
          <div style={{ background:C.card,border:'1px solid rgba(0,255,148,0.2)',borderRadius:16,padding:24,marginBottom:20,position:'relative',overflow:'hidden' }}>
            <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,'+C.green+' 0%,transparent 100%)' }}/>
            <div style={{ fontSize:9,color:C.green,fontFamily:'JetBrains Mono, monospace',marginBottom:12,letterSpacing:'0.1em' }}>
              📥 {L('ESG REPORTS — 8 STANDARDS × 2 LANGUAGES = 16 PDF REPORTS','RAPPORTS ESG — 8 STANDARDS × 2 LANGUES = 16 RAPPORTS PDF')}
            </div>
            <div style={{ fontSize:12,color:C.text2,marginBottom:16,lineHeight:1.7 }}>
              {L('Each report includes: cover + ESG score + pillar breakdown + compliance status + SDG alignment + ESG Attestation Certificate (Page 3).','Chaque rapport comprend : couverture + score ESG + répartition par pilier + état de conformité + alignement ODD + Certificat d\'Attestation ESG (Page 3).')}
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10 }}>
              {ESG_STANDARDS.map(std=>{
                const keyEN = current.id+'-'+std.id+'-en';
                const keyFR = current.id+'-'+std.id+'-fr';
                const isGenEN = generatingKey===keyEN;
                const isGenFR = generatingKey===keyFR;
                return (
                  <div key={std.id} style={{ background:C.card2,border:'1px solid '+std.color+'25',borderRadius:12,padding:'14px 16px' }}>
                    <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:8 }}>
                      <span style={{ fontSize:18 }}>{std.icon}</span>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:11,fontWeight:700,color:std.color,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                          {lang==='fr'?std.nameFr:std.nameEn}
                        </div>
                        <div style={{ fontSize:8,color:C.muted,fontFamily:'JetBrains Mono, monospace' }}>{std.badge}</div>
                      </div>
                    </div>
                    <div style={{ display:'flex',gap:5 }}>
                      <button onClick={()=>downloadReport(std.id,'en')} disabled={!!isGenEN}
                        style={{ flex:1,background:isGenEN?C.card:'rgba(56,189,248,0.08)',border:'1px solid rgba(56,189,248,0.2)',borderRadius:6,color:isGenEN?C.muted:C.blue,padding:'7px 0',cursor:isGenEN?'wait':'pointer',fontSize:10,fontWeight:700 }}>
                        {isGenEN?'⟳':'📥'} EN
                      </button>
                      <button onClick={()=>downloadReport(std.id,'fr')} disabled={!!isGenFR}
                        style={{ flex:1,background:isGenFR?C.card:'rgba(167,139,250,0.08)',border:'1px solid rgba(167,139,250,0.2)',borderRadius:6,color:isGenFR?C.muted:C.purple,padding:'7px 0',cursor:isGenFR?'wait':'pointer',fontSize:10,fontWeight:700 }}>
                        {isGenFR?'⟳':'📥'} FR
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop:12,fontSize:10,color:C.muted,fontFamily:'JetBrains Mono, monospace' }}>
              ⚡ {ESG_STANDARDS.length} standards × 2 {L('languages','langues')} = {ESG_STANDARDS.length*2} PDF · {L('Includes ESG Attestation Certificate (Page 3)','Inclut le Certificat d\'Attestation ESG (Page 3)')}
            </div>
          </div>

          {/* What's in the PDF */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12 }}>
            {[
              { icon:'📊', title:L('Page 1: ESG Score','Page 1 : Score ESG'), desc:L('Overall score, pillar breakdown, company metadata, compliance status (CSRD/GRI/UNGC/TCFD)','Score global, répartition piliers, métadonnées entreprise, conformité CSRD/GRI/UNGC/TCFD') },
              { icon:'📋', title:L('Page 2: Responses + SDGs','Page 2 : Réponses + ODD'), desc:L('Detailed question responses by pillar, SDG alignment matrix, strengths and priority gaps','Réponses détaillées par pilier, matrice alignement ODD, points forts et lacunes prioritaires') },
              { icon:'🏆', title:L('Page 3: ESG Certificate','Page 3 : Certificat ESG'), desc:L('Official ESG attestation certificate with unique ID, verifiable at pangea-carbon.com/verify/','Certificat d\'attestation ESG officiel avec ID unique, vérifiable sur pangea-carbon.com/verify/') },
            ].map(item=>(
              <div key={item.title} style={{ background:C.card,border:'1px solid '+C.border,borderRadius:12,padding:18 }}>
                <div style={{ fontSize:24,marginBottom:10 }}>{item.icon}</div>
                <div style={{ fontSize:12,fontWeight:700,color:C.text,marginBottom:6 }}>{item.title}</div>
                <div style={{ fontSize:11,color:C.text2,lineHeight:1.6 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PASSPORT ESG ─────────────────────────────────────────────── */}
      {tab==='passport' && current && (
        <div style={{ maxWidth:760, margin:'0 auto' }}>
          <div style={{ background:C.card, border:'2px solid '+levelCfg.color+'50', borderRadius:20, overflow:'hidden', boxShadow:'0 24px 80px rgba(0,0,0,0.6)' }}>
            <div style={{ background:'linear-gradient(135deg,#080B0F 0%,'+levelCfg.color+'18 100%)', padding:'28px 32px', borderBottom:'2px solid '+levelCfg.color+'30', position:'relative' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:4, background:'linear-gradient(90deg,'+levelCfg.color+' 0%,transparent 100%)' }}/>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontSize:9, color:C.green, fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.15em', marginBottom:6 }}>PANGEA CARBON · {lang==='fr'?'PASSEPORT DE CONFORMITÉ ESG':'ESG COMPLIANCE PASSPORT'}</div>
                  <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:22, fontWeight:800, color:C.text, margin:'0 0 6px' }}>{current.companyName}</h2>
                  <div style={{ fontSize:12, color:C.muted }}>{current.framework} · {current.sector} · {current.country} · {current.reportingYear}</div>
                </div>
                <div style={{ textAlign:'center', background:levelCfg.bg, border:'2px solid '+levelCfg.border, borderRadius:14, padding:'16px 20px', minWidth:110 }}>
                  <div style={{ fontSize:36 }}>{levelCfg.icon}</div>
                  <div style={{ fontSize:13, fontWeight:800, color:levelCfg.color, fontFamily:'Syne, sans-serif', marginTop:4 }}>{score.level}</div>
                  <div style={{ fontSize:10, color:levelCfg.color, fontFamily:'JetBrains Mono, monospace' }}>{score.rating}</div>
                </div>
              </div>
            </div>

            <div style={{ padding:'24px 32px', borderBottom:'1px solid '+C.border, display:'grid', gridTemplateColumns:'140px 1fr', gap:24, alignItems:'center' }}>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>ESG SCORE</div>
                <div style={{ fontSize:60, fontWeight:800, color:levelCfg.color, fontFamily:'Syne, sans-serif', lineHeight:1 }}>{score.total}</div>
                <div style={{ fontSize:12, color:C.muted }}>/100</div>
              </div>
              <div>
                {([
                  ['E', lang==='fr'?'Environnement':'Environmental', score.eScore, C.green, '40%'],
                  ['S', 'Social', score.sScore, C.blue, '35%'],
                  ['G', lang==='fr'?'Gouvernance':'Governance', score.gScore, C.purple, '25%'],
                ] as [string,string,number,string,string][]).map(([code,name,val,col,weight])=>(
                  <div key={code} style={{ marginBottom:12 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:12, color:C.text }}>{code} — {name}</span>
                      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                        <span style={{ fontSize:10, color:C.muted }}>{weight}</span>
                        <span style={{ fontSize:13, color:col, fontWeight:800, fontFamily:'JetBrains Mono, monospace' }}>{Math.round(val)}%</span>
                      </div>
                    </div>
                    <div style={{ height:8, background:C.border, borderRadius:4 }}>
                      <div style={{ width:Math.round(val)+'%', height:'100%', background:col, borderRadius:4, transition:'width 0.8s ease' }}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding:'24px 32px', borderBottom:'1px solid '+C.border }}>
              <div style={{ fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:16 }}>
                {lang==='fr'?'STATUT DE CONFORMITÉ — 8 STANDARDS INTERNATIONAUX':'COMPLIANCE STATUS — 8 INTERNATIONAL STANDARDS'}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
                {([
                  ['GRI','🌍',C.green,['E1','S1','G9','G5']],
                  ['CSRD','🇪🇺',C.blue,['E1','E2','E4','S11','G1','G9','G10']],
                  ['SASB','📊',C.purple,['E1','E3','S1','G9']],
                  ['IFRS S2','📋',C.yellow,['E1','E2','E4','G11']],
                  ['UNGC','🇺🇳','#0E7490',['S5','S6','S12','G5','G7','E10']],
                  ['King IV','👑',C.red,['G1','G2','G3','G5','G6','G9']],
                  ['TCFD','🏦',C.orange,['E2','E4','G1','G4','G11']],
                  ['B Corp','🏆','#065F46',['S3','S6','S7','G5','E7']],
                ] as [string,string,string,string[]][]).map(([std,icon,col,req])=>{
                  const met = req.filter(id=>responses[id]===true||responses[id]).length;
                  const total = req.length;
                  const pct = Math.round(met/total*100);
                  const barCol = pct>=80?C.green:pct>=50?C.yellow:C.red;
                  return (
                    <div key={std} style={{ background:C.card2, border:'1px solid '+barCol+'25', borderRadius:10, padding:'12px 14px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                        <span style={{ fontSize:15 }}>{icon}</span>
                        <span style={{ fontSize:10, padding:'2px 6px', background:barCol+'15', color:barCol, borderRadius:4, fontFamily:'JetBrains Mono, monospace', fontWeight:700 }}>{pct}%</span>
                      </div>
                      <div style={{ fontSize:11, fontWeight:700, color:col, marginBottom:4 }}>{std}</div>
                      <div style={{ fontSize:9, color:C.muted }}>{met}/{total} {lang==='fr'?'atteints':'met'}</div>
                      <div style={{ height:3, background:C.border, borderRadius:2, marginTop:6 }}>
                        <div style={{ width:pct+'%', height:'100%', background:barCol, borderRadius:2 }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ padding:'24px 32px', display:'flex', gap:24, alignItems:'center' }}>
              <div style={{ background:'white', padding:12, borderRadius:12, flexShrink:0 }}>
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <rect width="100" height="100" fill="white"/>
                  <rect x="2" y="2" width="26" height="26" fill="black" rx="2"/><rect x="4" y="4" width="22" height="22" fill="white"/><rect x="6" y="6" width="18" height="18" fill="black" rx="1"/>
                  <rect x="72" y="2" width="26" height="26" fill="black" rx="2"/><rect x="74" y="4" width="22" height="22" fill="white"/><rect x="76" y="6" width="18" height="18" fill="black" rx="1"/>
                  <rect x="2" y="72" width="26" height="26" fill="black" rx="2"/><rect x="4" y="74" width="22" height="22" fill="white"/><rect x="6" y="76" width="18" height="18" fill="black" rx="1"/>
                  <rect x="34" y="2" width="4" height="4" fill="black"/><rect x="42" y="2" width="4" height="4" fill="black"/><rect x="50" y="2" width="4" height="4" fill="black"/><rect x="62" y="2" width="4" height="4" fill="black"/>
                  <rect x="34" y="10" width="4" height="4" fill="black"/><rect x="46" y="10" width="4" height="4" fill="black"/><rect x="54" y="10" width="4" height="4" fill="black"/>
                  <rect x="34" y="18" width="4" height="4" fill="black"/><rect x="42" y="18" width="4" height="4" fill="black"/><rect x="50" y="18" width="4" height="4" fill="black"/>
                  <rect x="2" y="34" width="4" height="4" fill="black"/><rect x="14" y="34" width="4" height="4" fill="black"/><rect x="26" y="34" width="4" height="4" fill="black"/><rect x="38" y="34" width="4" height="4" fill="black"/><rect x="50" y="34" width="4" height="4" fill="black"/><rect x="62" y="34" width="4" height="4" fill="black"/><rect x="74" y="34" width="4" height="4" fill="black"/><rect x="86" y="34" width="4" height="4" fill="black"/><rect x="94" y="34" width="4" height="4" fill="black"/>
                  <rect x="6" y="42" width="4" height="4" fill="black"/><rect x="18" y="42" width="4" height="4" fill="black"/><rect x="34" y="42" width="4" height="4" fill="black"/><rect x="50" y="42" width="4" height="4" fill="black"/><rect x="66" y="42" width="4" height="4" fill="black"/><rect x="82" y="42" width="4" height="4" fill="black"/>
                  <rect x="2" y="50" width="4" height="4" fill="black"/><rect x="14" y="50" width="4" height="4" fill="black"/><rect x="30" y="50" width="4" height="4" fill="black"/><rect x="46" y="50" width="4" height="4" fill="black"/><rect x="62" y="50" width="4" height="4" fill="black"/><rect x="78" y="50" width="4" height="4" fill="black"/><rect x="90" y="50" width="4" height="4" fill="black"/>
                  <rect x="34" y="72" width="4" height="4" fill="black"/><rect x="46" y="72" width="4" height="4" fill="black"/><rect x="62" y="72" width="4" height="4" fill="black"/><rect x="78" y="72" width="4" height="4" fill="black"/><rect x="90" y="72" width="4" height="4" fill="black"/>
                  <rect x="38" y="80" width="4" height="4" fill="black"/><rect x="54" y="80" width="4" height="4" fill="black"/><rect x="70" y="80" width="4" height="4" fill="black"/><rect x="86" y="80" width="4" height="4" fill="black"/>
                  <rect x="34" y="88" width="4" height="4" fill="black"/><rect x="50" y="88" width="4" height="4" fill="black"/><rect x="66" y="88" width="4" height="4" fill="black"/><rect x="82" y="88" width="4" height="4" fill="black"/>
                  <rect x="42" y="42" width="16" height="16" fill="white" rx="2"/>
                  <text x="50" y="53" textAnchor="middle" fontSize="10" fill="#00FF94" fontWeight="bold">⬡</text>
                </svg>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:9, color:C.green, fontFamily:'JetBrains Mono, monospace', marginBottom:8, letterSpacing:'0.1em' }}>
                  {lang==='fr'?'🔗 VÉRIFIER CE PASSEPORT':'🔗 VERIFY THIS PASSPORT'}
                </div>
                <div style={{ fontSize:13, color:C.text, fontFamily:'JetBrains Mono, monospace', marginBottom:6, wordBreak:'break-all' }}>
                  pangea-carbon.com/verify/{current.id}
                </div>
                <div style={{ display:'flex', gap:8, marginTop:12, flexWrap:'wrap' }}>
                  <button onClick={()=>{navigator.clipboard?.writeText('https://pangea-carbon.com/verify/'+current.id);}}
                    style={{ background:'rgba(0,255,148,0.08)', border:'1px solid rgba(0,255,148,0.25)', borderRadius:8, color:C.green, padding:'8px 16px', cursor:'pointer', fontSize:12, fontWeight:700 }}>
                    🔗 {lang==='fr'?'Copier le lien':'Copy verify link'}
                  </button>
                  <button onClick={()=>window.print()}
                    style={{ background:'transparent', border:'1px solid '+C.border, borderRadius:8, color:C.muted, padding:'8px 16px', cursor:'pointer', fontSize:12 }}>
                    🖨️ {lang==='fr'?'Imprimer':'Print'}
                  </button>
                  <button onClick={()=>setTab('reports')}
                    style={{ background:'rgba(167,139,250,0.08)', border:'1px solid rgba(167,139,250,0.25)', borderRadius:8, color:C.purple, padding:'8px 16px', cursor:'pointer', fontSize:12, fontWeight:700 }}>
                    📥 {lang==='fr'?'Télécharger PDF →':'Download PDF →'}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ padding:'16px 32px', background:'rgba(0,255,148,0.03)', borderTop:'1px solid '+C.border, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace' }}>PANGEA CARBON Africa · ESG Intelligence Platform</div>
              <div style={{ fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace' }}>ID: {current.id}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
