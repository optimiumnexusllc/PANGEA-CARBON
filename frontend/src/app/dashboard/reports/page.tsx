'use client';
import { PlanBanner } from '@/components/PlanGate';
import { useLang } from '@/lib/lang-context';
import { useEffect, useState, useCallback } from 'react';
import { fetchAuthJson } from '@/lib/fetch-auth';

const C = {
  bg:'#080B0F', card:'#0D1117', card2:'#0A1628', border:'#1E2D3D',
  green:'#00FF94', red:'#F87171', yellow:'#FCD34D', blue:'#38BDF8',
  purple:'#A78BFA', orange:'#F97316', muted:'#4A6278', text:'#E8EFF6', text2:'#8FA3B8',
};
const COUNTRY_FLAGS = {
  CI:'🇨🇮',KE:'🇰🇪',NG:'🇳🇬',GH:'🇬🇭',SN:'🇸🇳',TZ:'🇹🇿',CM:'🇨🇲',ET:'🇪🇹',
  ZA:'🇿🇦',MA:'🇲🇦',EG:'🇪🇬',BF:'🇧🇫',ML:'🇲🇱',RW:'🇷🇼',UG:'🇺🇬',MZ:'🇲🇿',
  ZM:'🇿🇲',BJ:'🇧🇯',TG:'🇹🇬',NE:'🇳🇪',
};
const TYPE_ICON = { SOLAR:'☀️',WIND:'💨',HYDRO:'💧',BIOMASS:'🌱',HYBRID:'⚡',OTHER:'🔋' };
function fmtN(n) { return n!=null?Number(n).toLocaleString('fr-FR',{maximumFractionDigits:2}):'—'; }
function fmtUSD(n) { return n!=null?'$'+Number(n).toLocaleString('en-US',{maximumFractionDigits:0}):'—'; }

const ALL_STANDARDS = [
  { id:'VERRA_VCS',    name:'Verra VCS',       method:'ACM0002 v19.0',    color:C.green,  icon:'🌿', price:11.04, registry:'Verra Registry',             url:'https://verra.org/programs/verified-carbon-standard/', creditUnit:'VCU' },
  { id:'GOLD_STANDARD',name:'Gold Standard',   method:'CDM LCB + GS4GG',  color:C.yellow, icon:'⭐', price:18.50, registry:'Gold Standard Registry',      url:'https://www.goldstandard.org', creditUnit:'GSCER' },
  { id:'ARTICLE6',     name:'Article 6 Paris', method:'ITMO + A6.4ER',    color:C.blue,   icon:'🌐', price:25.00, registry:'UNFCCC A6.4 Registry',        url:'https://unfccc.int/topics/carbon-markets', creditUnit:'ITMO' },
  { id:'CDM',          name:'CDM Legacy',      method:'UNFCCC CDM',        color:C.purple, icon:'📋', price:3.50,  registry:'UNFCCC CDM Registry',         url:'https://cdm.unfccc.int', creditUnit:'CER' },
  { id:'ACR',          name:'ACR',             method:'ACR RE v1.0',       color:C.red,    icon:'🔴', price:10.00, registry:'ACR — Winrock International',  url:'https://acrcarbon.org', creditUnit:'ERT' },
  { id:'CAR',          name:'CAR',             method:'CAR RE method',     color:'#059669',icon:'🟢', price:9.50,  registry:'Climate Action Reserve',      url:'https://www.climateactionreserve.org', creditUnit:'CRT' },
  { id:'CORSIA',       name:'CORSIA',          method:'ICAO methodology',  color:C.purple, icon:'✈️', price:15.00, registry:'ICAO CORSIA Central Registry', url:'https://www.icao.int/environmental-protection/CORSIA', creditUnit:'CEU' },
  { id:'VCMI',         name:'VCMI/CCP',        method:'ICVCM CCP v2.0',    color:C.blue,   icon:'🏆', price:20.00, registry:'ICVCM-approved registry',     url:'https://icvcm.org', creditUnit:'CCP' },
  { id:'PLAN_VIVO',    name:'Plan Vivo',       method:'Plan Vivo community',color:'#65A30D',icon:'🌳', price:14.00, registry:'Plan Vivo Registry',          url:'https://www.planvivo.org', creditUnit:'PVC' },
];

const STD_FEATURES = (L) => ({
  VERRA_VCS:    ['ACM0002 v19.0 renewable','Double counting check','Additionality test','SDG co-benefits','Buffer pool 10–20%'],
  GOLD_STANDARD:['Social+environmental safeguards','Quantified SDG Impact','Stakeholder consultation','VVB site visit','Maximum transparency'],
  ARTICLE6:     ['Corresponding adjustments','National NDC registries','Bilateral agreements','Sovereign guarantee','PANGEA CARBON certified'],
  CDM:          ['CER→VCMI conversion','Legacy projects only','UNFCCC registry','Historical baseline','Transition pathway'],
  ACR:          ['Rigorous additionality','Permanence requirements','ACR-approved methodologies','US market compatible','Winrock oversight'],
  CAR:          ['Protocol-based approach','Conservative crediting','US & international','Third-party verification','Transparent reporting'],
  CORSIA:       ['ICAO eligible units','Aviation offset scheme','2021 baseline','CORSIA-eligible VCUs','Airline compliance'],
  VCMI:         ['Core Carbon Principles','Integrity-aligned label','High-quality screen','ICVCM approved','Integrity Council'],
  PLAN_VIVO:    ['Community-based projects','Smallholder focus','SDG outcomes','Long-term agreements','Livelihood benefits'],
});

export default function ReportsPage() {
  const { lang } = useLang();
  const L = (en, fr) => lang === 'fr' ? fr : en;
  const FEATURES = STD_FEATURES(L);

  const [tab, setTab] = useState('reports');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingKey, setGeneratingKey] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [selectedStandard, setSelectedStandard] = useState(null);
  const [toast, setToast] = useState(null);
  const [sortBy, setSortBy] = useState('credits');
  const [filterYear, setFilterYear] = useState('');
  const [reportHistory, setReportHistory] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedProject, setExpandedProject] = useState(null);

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),5000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [recs, hist] = await Promise.all([
        fetchAuthJson('/reports').catch(()=>[]),
        fetchAuthJson('/reports/history').catch(()=>[]),
      ]);
      setRecords(Array.isArray(recs)?recs:[]);
      setReportHistory(Array.isArray(hist)?hist:[]);
    } catch(e) { showToast('Error loading','error'); }
    finally { setLoading(false); }
  }, [lang]);

  useEffect(()=>{ load(); },[load]);

  const downloadPDF = async (projectId, year, countryCode, stdId, pdfLang) => {
    const key = projectId+'-'+year+'-'+stdId+'-'+pdfLang;
    setGeneratingKey(key);
    const std = ALL_STANDARDS.find(s=>s.id===stdId);
    showToast('Generating'+' '+std?.name+' ('+pdfLang.toUpperCase()+')...','info');
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
      const url = (process.env.NEXT_PUBLIC_API_URL||'')+'/reports/'+projectId+'/'+year+'/pdf?lang='+pdfLang+'&standard='+stdId;
      const res = await fetch(url, { headers:{ Authorization:'Bearer '+token } });
      if (!res.ok) { const e=await res.json().catch(()=>({error:'Error'})); throw new Error(e.error); }
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href=objUrl; a.download='PANGEA-'+stdId+'-MRV-'+(countryCode||'AF')+'-'+year+'-'+pdfLang.toUpperCase()+'.pdf'; a.click();
      URL.revokeObjectURL(objUrl);
      showToast('Downloaded!'+' '+std?.name+' ('+pdfLang.toUpperCase()+')');
      load();
    } catch(e) { showToast(e.message||'Error','error'); }
    finally { setGeneratingKey(null); }
  };

  const loadPreview = async (projectId, year) => {
    try { const d=await fetchAuthJson('/reports/'+projectId+'/'+year+'/preview'); setPreviewData(d); setTab('preview'); }
    catch(e) { showToast(e.message,'error'); }
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await fetchAuthJson('/reports/'+confirmDelete.id,{method:'DELETE'});
      showToast('Report deleted');
      setConfirmDelete(null); load();
    } catch(e) { showToast(e.message||'Error','error'); }
    finally { setDeleting(false); }
  };

  const years = [...new Set(records.map(r=>r.year))].sort((a,b)=>b-a);
  const filtered = records
    .filter(r=>!filterYear||String(r.year)===filterYear)
    .sort((a,b)=>sortBy==='credits'?(b.netCarbonCredits||0)-(a.netCarbonCredits||0):sortBy==='revenue'?(b.revenueUSD||0)-(a.revenueUSD||0):b.year-a.year);
  const totalCredits=records.reduce((s,r)=>s+(r.netCarbonCredits||0),0);
  const totalRevenue=records.reduce((s,r)=>s+(r.revenueUSD||r.netCarbonCredits*11.04||0),0);

  return (
    <div style={{ padding:24,maxWidth:1500,margin:'0 auto' }}>
      <PlanBanner featureKey="pdf_reports"/>

      {/* Toast */}
      {toast&&(
        <div style={{ position:'fixed',top:20,right:20,zIndex:99999,maxWidth:440 }}>
          <div style={{ background:toast.type==='error'?'rgba(248,113,113,0.1)':toast.type==='info'?'rgba(56,189,248,0.08)':'rgba(0,255,148,0.08)',border:'1px solid '+(toast.type==='error'?'rgba(248,113,113,0.35)':toast.type==='info'?'rgba(56,189,248,0.3)':'rgba(0,255,148,0.3)'),borderRadius:12,padding:'14px 20px',display:'flex',alignItems:'center',gap:12,backdropFilter:'blur(20px)',boxShadow:'0 8px 32px rgba(0,0,0,0.5)',position:'relative',overflow:'hidden' }}>
            <div style={{ position:'absolute',left:0,top:0,bottom:0,width:3,background:toast.type==='error'?C.red:toast.type==='info'?C.blue:C.green }}/>
            <span style={{ fontSize:13,color:C.text,marginLeft:8 }}>{toast.msg}</span>
          </div>
        </div>
      )}

      {/* Modale suppression */}
      {confirmDelete&&(
        <div onClick={e=>{if(e.target===e.currentTarget)setConfirmDelete(null);}} style={{ position:'fixed',inset:0,background:'rgba(8,11,15,0.88)',backdropFilter:'blur(10px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10001,padding:16 }}>
          <div style={{ background:C.card,border:'1px solid rgba(248,113,113,0.35)',borderRadius:16,padding:28,maxWidth:480,width:'100%',boxShadow:'0 24px 80px rgba(0,0,0,0.7)',position:'relative',overflow:'hidden' }}>
            <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,#F87171 0%,rgba(248,113,113,0.2) 100%)' }}/>
            <div style={{ display:'flex',gap:14,alignItems:'center',marginBottom:16 }}>
              <div style={{ width:48,height:48,borderRadius:12,background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0 }}>🗑</div>
              <div>
                <div style={{ fontSize:9,color:C.red,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.12em',marginBottom:4 }}>MRV REPORTS · {L('DELETE REPORT','SUPPRESSION RAPPORT')}</div>
                <h2 style={{ fontFamily:'Syne, sans-serif',fontSize:17,fontWeight:800,color:C.red,margin:0 }}>{L('Delete this report?','Supprimer ce rapport ?')}</h2>
              </div>
            </div>
            <div style={{ height:1,background:'linear-gradient(90deg,rgba(248,113,113,0.25) 0%,transparent 100%)',marginBottom:18 }}/>
            <div style={{ background:'rgba(248,113,113,0.05)',border:'1px solid rgba(248,113,113,0.15)',borderRadius:10,padding:'14px 16px',marginBottom:20 }}>
              <div style={{ fontSize:13,color:C.text,fontWeight:700,marginBottom:6 }}>{confirmDelete.project?.name||'Rapport'} — {confirmDelete.year}</div>
              <p style={{ fontSize:12,color:C.text2,margin:0,lineHeight:1.7 }}>{L('This generated PDF report will be permanently deleted from the database. The MRV calculation data will not be affected.','Ce rapport PDF généré sera définitivement supprimé de la base de données. Les données MRV calculées ne seront pas affectées.')}</p>
            </div>
            <div style={{ display:'flex',gap:10 }}>
              <button onClick={()=>setConfirmDelete(null)} style={{ flex:1,background:'transparent',border:'1px solid '+C.border,borderRadius:9,color:C.muted,padding:12,cursor:'pointer',fontSize:13 }}>{L('Cancel','Annuler')}</button>
              <button onClick={executeDelete} disabled={deleting} style={{ flex:1,background:deleting?C.card2:'rgba(248,113,113,0.12)',border:'1px solid rgba(248,113,113,0.4)',borderRadius:9,color:deleting?C.muted:C.red,padding:12,fontWeight:800,cursor:deleting?'wait':'pointer',fontSize:13,fontFamily:'Syne, sans-serif' }}>
                {deleting?'⟳ '+L('Deleting...','Suppression...'):'🗑 '+L('Delete permanently','Supprimer définitivement')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:9,color:C.green,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.15em',marginBottom:8 }}>PANGEA CARBON · MRV ENGINE · 9 STANDARDS · EN/FR</div>
        <h1 style={{ fontFamily:'Syne, sans-serif',fontSize:28,fontWeight:800,color:C.text,margin:0,marginBottom:6 }}>{L('MRV Reports','Rapports MRV')}</h1>
        <p style={{ fontSize:13,color:C.muted,margin:0,lineHeight:1.7,maxWidth:700 }}>
          {L('Generate certifiable ACM0002 reports for 9 international standards — automatically in English and French for each project.','Générez des rapports certifiables ACM0002 pour 9 standards internationaux — automatiquement en Anglais et Français pour chaque projet.')}
        </p>
      </div>

      {/* Workflow Banner */}
      <div style={{ background:C.card,border:'1px solid '+C.border,borderRadius:16,padding:24,marginBottom:24,position:'relative',overflow:'hidden' }}>
        <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,'+C.green+' 0%,'+C.blue+' 33%,'+C.yellow+' 66%,'+C.purple+' 100%)' }}/>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16 }}>
          {[
            {n:'01',title:L('MRV Data','Données MRV'),desc:L('Monthly readings recorded','Lectures mensuelles enregistrées'),color:C.green,icon:'📡',done:true},
            {n:'02',title:L('ACM0002 Calc','Calcul ACM0002'),desc:L('Net credits calculated','Crédits nets calculés'),color:C.blue,icon:'⚙️',done:true},
            {n:'03',title:L('PDF × 2 langs','PDF × 2 langues'),desc:L('EN + FR per standard','EN + FR par standard'),color:C.yellow,icon:'📄',done:false},
            {n:'04',title:L('Submission','Soumission'),desc:L('Verra / Gold Standard registry','Registry Verra / Gold Standard'),color:C.purple,icon:'🚀',done:false},
          ].map((s,i)=>(
            <div key={s.n} style={{ position:'relative' }}>
              {i<3&&<div style={{ position:'absolute',top:20,left:'calc(100% + 8px)',width:'calc(100% - 16px)',height:1,background:'linear-gradient(90deg,'+s.color+'40 0%,transparent 100%)',zIndex:1 }}/>}
              <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:8 }}>
                <div style={{ width:38,height:38,borderRadius:10,background:s.color+'15',border:'1px solid '+s.color+'40',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0 }}>{s.icon}</div>
                <div style={{ width:22,height:22,borderRadius:'50%',background:s.done?s.color:'transparent',border:'1px solid '+s.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:800,color:s.done?'#080B0F':s.color,fontFamily:'JetBrains Mono, monospace',flexShrink:0 }}>{s.done?'✓':s.n}</div>
              </div>
              <div style={{ fontSize:12,fontWeight:700,color:s.done?s.color:C.text2,marginBottom:3 }}>{s.title}</div>
              <div style={{ fontSize:10,color:C.muted,lineHeight:1.5 }}>{s.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop:18,padding:'10px 14px',background:'rgba(56,189,248,0.04)',border:'1px solid rgba(56,189,248,0.1)',borderRadius:8,fontSize:11,color:C.text2 }}>
          <span style={{ color:C.blue,fontFamily:'JetBrains Mono, monospace',fontSize:9 }}>ℹ </span>
          {L('For each project: click the standard, choose EN or FR → PDF downloaded instantly. Formula: Gross = Production(MWh)×EF_grid, Net = Gross − Leakage(3%) − Uncertainty(5%).','Pour chaque projet: cliquez le standard, choisissez EN ou FR → PDF téléchargé instantanément. Formule: Brut = Production(MWh)×EF_réseau, Net = Brut − Leakage(3%) − Incertitude(5%).')}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:'flex',gap:12,marginBottom:24,flexWrap:'wrap' }}>
        {[
          {v:records.length,     l:L('Projects with MRV','Projets MRV'),   c:C.blue,   icon:'📊'},
          {v:ALL_STANDARDS.length,l:L('Active standards','Standards actifs'), c:C.green, icon:'🏛'},
          {v:'EN + FR',          l:L('Languages','Langues'),               c:C.purple, icon:'🌐'},
          {v:fmtN(totalCredits)+' t',l:L('Total MRV credits','Total crédits'), c:C.green, icon:'🌿'},
          {v:fmtUSD(totalRevenue),l:L('Total value','Valeur totale'),      c:C.yellow, icon:'💰'},
        ].map(s=>(
          <div key={s.l} style={{ background:C.card,border:'1px solid '+s.c+'20',borderRadius:12,padding:'14px 18px',flex:1,minWidth:130,position:'relative',overflow:'hidden' }}>
            <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,'+s.c+' 0%,transparent 100%)' }}/>
            <div style={{ fontSize:18,fontWeight:800,color:s.c,fontFamily:'JetBrains Mono, monospace',lineHeight:1,marginTop:4 }}>{s.v}</div>
            <div style={{ fontSize:10,color:C.muted,marginTop:5 }}>{s.icon} {s.l}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex',gap:2,marginBottom:24,borderBottom:'1px solid '+C.border }}>
        {([
          ['reports','📄 '+L('Reports','Rapports'),C.green],
          ['standards','🏛 '+L('Standards','Standards'),C.blue],
          ['history','📋 '+L('History','Historique'),C.muted],
          ...(previewData?[['preview','🔍 '+L('Preview','Aperçu'),C.yellow]] as any:[]),
        ] as [string,string,string][]).map(([id,label,color])=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{ padding:'11px 20px',border:'none',cursor:'pointer',fontSize:12,fontWeight:600,fontFamily:'JetBrains Mono, monospace',borderBottom:'2px solid '+(tab===id?color:'transparent'),background:'transparent',color:tab===id?color:C.muted,transition:'all .15s' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── REPORTS ─────────────────────────────────────────────────────────── */}
      {tab==='reports'&&(
        <div>
          <div style={{ display:'flex',gap:10,marginBottom:20,alignItems:'center',flexWrap:'wrap' }}>
            <select style={{ background:C.card2,border:'1px solid '+C.border,borderRadius:8,color:C.text,padding:'9px 14px',fontSize:12,outline:'none',cursor:'pointer' }}
              value={filterYear} onChange={e=>setFilterYear(e.target.value)}>
              <option value="">{L('All years','Toutes les années')}</option>
              {years.map(y=><option key={y} value={String(y)}>{y}</option>)}
            </select>
            <select style={{ background:C.card2,border:'1px solid '+C.border,borderRadius:8,color:C.text,padding:'9px 14px',fontSize:12,outline:'none',cursor:'pointer' }}
              value={sortBy} onChange={e=>setSortBy(e.target.value)}>
              <option value="credits">{L('Sort: Credits','Tri: Crédits')}</option>
              <option value="revenue">{L('Sort: Revenue','Tri: Revenus')}</option>
              <option value="year">{L('Sort: Year','Tri: Année')}</option>
            </select>
            <div style={{ flex:1,fontSize:10,color:C.muted,fontFamily:'JetBrains Mono, monospace',textAlign:'right' }}>
              {filtered.length} {L('projects','projets')} · {ALL_STANDARDS.length} standards · EN/FR
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign:'center',padding:60,color:C.muted,fontFamily:'JetBrains Mono, monospace',fontSize:11 }}>◌ {L('Loading MRV data...','Chargement des données MRV...')}</div>
          ) : filtered.length===0 ? (
            <div style={{ background:C.card,border:'1px solid '+C.border,borderRadius:16,padding:60,textAlign:'center' }}>
              <div style={{ fontSize:52,marginBottom:16 }}>📄</div>
              <div style={{ fontSize:18,color:C.text,fontWeight:700,marginBottom:8,fontFamily:'Syne, sans-serif' }}>{L('No MRV reports available','Aucun rapport MRV disponible')}</div>
              <div style={{ fontSize:13,color:C.muted,marginBottom:24,maxWidth:480,margin:'0 auto 24px',lineHeight:1.7 }}>
                {L('Create a project, add monthly readings, then run MRV calculation to generate your first certifiable report in 9 standards × 2 languages.','Créez un projet, ajoutez des lectures mensuelles, puis calculez le MRV pour générer votre premier rapport certifiable en 9 standards × 2 langues.')}
              </div>
              <div style={{ display:'flex',gap:12,justifyContent:'center' }}>
                <a href="/dashboard/projects/new" style={{ background:'rgba(0,255,148,0.12)',border:'1px solid rgba(0,255,148,0.35)',borderRadius:10,color:C.green,padding:'11px 22px',textDecoration:'none',fontSize:13,fontWeight:700,fontFamily:'Syne, sans-serif' }}>+ {L('Create project','Créer un projet')}</a>
                <a href="/dashboard/mrv" style={{ background:C.card2,border:'1px solid '+C.border,borderRadius:10,color:C.text2,padding:'11px 22px',textDecoration:'none',fontSize:13 }}>{L('Calculate MRV →','Calculer MRV →')}</a>
              </div>
            </div>
          ) : filtered.map(rec=>{
            const country=rec.project?.countryCode||'';
            const flag=COUNTRY_FLAGS[country]||'🌍';
            const typeIcon=TYPE_ICON[rec.project?.type]||'⚡';
            const credits=rec.netCarbonCredits||0;
            const isExpanded=expandedProject===rec.projectId+'-'+rec.year;
            return (
              <div key={rec.projectId+'-'+rec.year} style={{ background:C.card,border:'1px solid rgba(0,255,148,0.1)',borderRadius:14,marginBottom:10,borderLeft:'3px solid '+C.green,overflow:'hidden' }}>
                {/* Project row */}
                <div style={{ padding:'16px 20px',display:'flex',alignItems:'center',gap:16 }}>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:5 }}>
                      <span style={{ fontSize:18 }}>{typeIcon}</span>
                      <div style={{ fontSize:14,fontWeight:700,color:C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{rec.project?.name||'Projet'}</div>
                      <span style={{ fontSize:10,color:C.muted,fontFamily:'JetBrains Mono, monospace',flexShrink:0 }}>{flag} {country}</span>
                      <span style={{ fontSize:9,padding:'2px 7px',background:'rgba(0,255,148,0.1)',border:'1px solid rgba(0,255,148,0.2)',borderRadius:4,color:C.green,fontFamily:'JetBrains Mono, monospace',flexShrink:0 }}>{rec.year}</span>
                    </div>
                    <div style={{ display:'flex',gap:14,flexWrap:'wrap' }}>
                      <span style={{ fontSize:11,color:C.muted }}><span style={{ color:C.green,fontWeight:700,fontFamily:'JetBrains Mono, monospace' }}>{fmtN(credits)}</span> tCO₂e</span>
                      <span style={{ fontSize:11,color:C.muted }}><span style={{ color:C.yellow,fontWeight:700,fontFamily:'JetBrains Mono, monospace' }}>{fmtUSD(rec.revenueUSD||credits*11.04)}</span></span>
                      {rec.project?.installedMW&&<span style={{ fontSize:10,color:C.muted,fontFamily:'JetBrains Mono, monospace' }}>{rec.project.installedMW} MW</span>}
                      <span style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace' }}>EF {(rec.gridEmissionFactor||0).toFixed(3)} tCO₂/MWh</span>
                    </div>
                  </div>
                  <div style={{ display:'flex',gap:8,flexShrink:0,alignItems:'center' }}>
                    <button onClick={()=>loadPreview(rec.projectId,rec.year)} style={{ background:C.card2,border:'1px solid '+C.border,borderRadius:8,color:C.text2,padding:'7px 12px',cursor:'pointer',fontSize:11 }}>🔍 {L('Preview','Aperçu')}</button>
                    <button onClick={()=>setExpandedProject(isExpanded?null:rec.projectId+'-'+rec.year)}
                      style={{ background:isExpanded?'rgba(0,255,148,0.12)':'rgba(56,189,248,0.1)',border:'1px solid '+(isExpanded?'rgba(0,255,148,0.3)':'rgba(56,189,248,0.25)'),borderRadius:8,color:isExpanded?C.green:C.blue,padding:'7px 14px',cursor:'pointer',fontSize:11,fontWeight:700 }}>
                      {isExpanded?'▲ '+L('Hide','Masquer'):'▼ '+L('Download × 9 standards','Télécharger × 9 standards')}
                    </button>
                    <button onClick={()=>setConfirmDelete(rec)} style={{ background:'rgba(248,113,113,0.06)',border:'1px solid rgba(248,113,113,0.15)',borderRadius:8,color:C.red,padding:'7px 10px',cursor:'pointer',fontSize:11 }}>🗑</button>
                  </div>
                </div>

                {/* Standards × 2 langues — expanded */}
                {isExpanded&&(
                  <div style={{ padding:'0 20px 20px' }}>
                    <div style={{ height:1,background:C.border,marginBottom:16 }}/>
                    <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:12,letterSpacing:'0.1em' }}>
                      {L('SELECT STANDARD + LANGUAGE — CLICK TO DOWNLOAD PDF','SÉLECTIONNER STANDARD + LANGUE — CLIQUER POUR TÉLÉCHARGER PDF')}
                    </div>
                    <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8 }}>
                      {ALL_STANDARDS.map(std=>{
                        const keyEN=rec.projectId+'-'+rec.year+'-'+std.id+'-en';
                        const keyFR=rec.projectId+'-'+rec.year+'-'+std.id+'-fr';
                        const isGenEN=generatingKey===keyEN;
                        const isGenFR=generatingKey===keyFR;
                        return (
                          <div key={std.id} style={{ background:C.card2,border:'1px solid '+std.color+'20',borderRadius:10,padding:'12px 14px' }}>
                            <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:8 }}>
                              <span style={{ fontSize:16 }}>{std.icon}</span>
                              <div style={{ flex:1,minWidth:0 }}>
                                <div style={{ fontSize:11,fontWeight:700,color:std.color,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{std.name}</div>
                                <div style={{ fontSize:8,color:C.muted,fontFamily:'JetBrains Mono, monospace' }}>{std.creditUnit} · ${std.price}/t</div>
                              </div>
                            </div>
                            <div style={{ display:'flex',gap:6 }}>
                              <button onClick={()=>downloadPDF(rec.projectId,rec.year,country,std.id,'en')} disabled={isGenEN}
                                style={{ flex:1,background:isGenEN?C.card:'rgba(56,189,248,0.08)',border:'1px solid rgba(56,189,248,0.2)',borderRadius:6,color:isGenEN?C.muted:C.blue,padding:'6px 0',cursor:isGenEN?'wait':'pointer',fontSize:10,fontWeight:700,transition:'all .15s' }}>
                                {isGenEN?'⟳':'📥'} EN
                              </button>
                              <button onClick={()=>downloadPDF(rec.projectId,rec.year,country,std.id,'fr')} disabled={isGenFR}
                                style={{ flex:1,background:isGenFR?C.card:'rgba(167,139,250,0.08)',border:'1px solid rgba(167,139,250,0.2)',borderRadius:6,color:isGenFR?C.muted:C.purple,padding:'6px 0',cursor:isGenFR?'wait':'pointer',fontSize:10,fontWeight:700,transition:'all .15s' }}>
                                {isGenFR?'⟳':'📥'} FR
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ marginTop:10,fontSize:10,color:C.muted,fontFamily:'JetBrains Mono, monospace' }}>
                      ⚡ {ALL_STANDARDS.length} standards × 2 langues = {ALL_STANDARDS.length*2} {L('PDF reports available per project','rapports PDF disponibles par projet')}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── STANDARDS ────────────────────────────────────────────────────────── */}
      {tab==='standards'&&(
        <div>
          <p style={{ fontSize:13,color:C.muted,marginBottom:20,lineHeight:1.7,maxWidth:700 }}>
            {L('All 9 standards are active — PANGEA CARBON generates certifiable PDFs in English and French for each.','Les 9 standards sont tous actifs — PANGEA CARBON génère des PDFs certifiables en Anglais et Français pour chacun.')}
          </p>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:24 }}>
            {ALL_STANDARDS.map(s=>{
              const feats=FEATURES[s.id]||[];
              const isSel=selectedStandard?.id===s.id;
              return (
                <div key={s.id} onClick={()=>setSelectedStandard(isSel?null:s)}
                  style={{ background:C.card,border:'1px solid '+(isSel?s.color+'50':s.color+'18'),borderRadius:12,padding:18,cursor:'pointer',transition:'all .2s',position:'relative',overflow:'hidden' }}>
                  <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:isSel?s.color:'transparent',transition:'background .2s' }}/>
                  <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10 }}>
                    <div style={{ display:'flex',gap:10,alignItems:'center' }}>
                      <span style={{ fontSize:22 }}>{s.icon}</span>
                      <div>
                        <div style={{ fontSize:13,fontWeight:800,color:isSel?s.color:C.text,fontFamily:'Syne, sans-serif' }}>{s.name}</div>
                        <code style={{ fontSize:9,color:s.color,fontFamily:'JetBrains Mono, monospace' }}>{s.method}</code>
                      </div>
                    </div>
                    <span style={{ fontSize:7,padding:'2px 6px',borderRadius:20,fontFamily:'JetBrains Mono, monospace',fontWeight:700,background:s.color+'15',color:s.color,border:'1px solid '+s.color+'30',flexShrink:0 }}>
                      ✓ {L('ACTIVE','ACTIF')}
                    </span>
                  </div>
                  <div style={{ display:'flex',flexWrap:'wrap',gap:4,marginBottom:10 }}>
                    {feats.map(f=><span key={f} style={{ fontSize:8,padding:'2px 6px',background:s.color+'10',border:'1px solid '+s.color+'20',borderRadius:3,color:s.color,fontFamily:'JetBrains Mono, monospace' }}>{f}</span>)}
                  </div>
                  <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                    <span style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace' }}>${s.price}/t · {s.creditUnit}</span>
                    {s.url&&<a href={s.url} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{ fontSize:9,color:s.color,textDecoration:'none' }}>{L('Docs →','Docs →')}</a>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Table comparative */}
          <div style={{ background:C.card,border:'1px solid '+C.border,borderRadius:14,overflow:'hidden' }}>
            <div style={{ padding:'14px 20px',borderBottom:'1px solid '+C.border,fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.1em' }}>
              {L('STANDARDS COMPARISON (ALL 9)','COMPARAISON DES STANDARDS (LES 9)')}
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%',borderCollapse:'collapse',fontSize:11 }}>
                <thead>
                  <tr style={{ background:'rgba(255,255,255,0.02)' }}>
                    {[L('Standard','Standard'),L('Price','Prix'),L('Credit unit','Unité crédit'),L('Registry','Registre'),L('Africa','Afrique'),L('Lang','Langue')].map(h=>(
                      <th key={h} style={{ padding:'10px 14px',textAlign:'left',fontSize:8,color:C.muted,fontFamily:'JetBrains Mono, monospace',borderBottom:'1px solid '+C.border,whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ALL_STANDARDS.map((s,i)=>(
                    <tr key={s.id} style={{ borderBottom:'1px solid '+C.border+'22',background:i%2===0?'transparent':'rgba(255,255,255,0.01)' }}>
                      <td style={{ padding:'10px 14px',color:s.color,fontWeight:700,display:'flex',alignItems:'center',gap:8,minWidth:140 }}>
                        <span>{s.icon}</span>{s.name}
                      </td>
                      <td style={{ padding:'10px 14px',color:C.text,fontFamily:'JetBrains Mono, monospace',fontSize:10 }}>${s.price}/t</td>
                      <td style={{ padding:'10px 14px',color:s.color,fontFamily:'JetBrains Mono, monospace',fontSize:10,fontWeight:700 }}>{s.creditUnit}</td>
                      <td style={{ padding:'10px 14px',color:C.text2,fontSize:10 }}>{s.registry}</td>
                      <td style={{ padding:'10px 14px',color:C.green,fontSize:10 }}>{['VERRA_VCS','GOLD_STANDARD','ACR','CAR'].includes(s.id)?'✓ Optimal':['ARTICLE6','CORSIA'].includes(s.id)?'✓ Premium':'✓ Active'}</td>
                      <td style={{ padding:'10px 14px' }}>
                        <div style={{ display:'flex',gap:4 }}>
                          <span style={{ fontSize:8,padding:'2px 6px',background:'rgba(56,189,248,0.1)',borderRadius:4,color:C.blue,fontFamily:'JetBrains Mono, monospace' }}>EN</span>
                          <span style={{ fontSize:8,padding:'2px 6px',background:'rgba(167,139,250,0.1)',borderRadius:4,color:C.purple,fontFamily:'JetBrains Mono, monospace' }}>FR</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORY ─────────────────────────────────────────────────────────── */}
      {tab==='history'&&(
        <div>
          {reportHistory.length===0?(
            <div style={{ background:C.card,border:'1px solid '+C.border,borderRadius:14,padding:48,textAlign:'center',color:C.muted }}>
              <div style={{ fontSize:36,marginBottom:12 }}>📋</div>
              <div style={{ fontSize:14,color:C.text,marginBottom:8 }}>{L('No reports generated','Aucun rapport généré')}</div>
              <div style={{ fontSize:12 }}>{L('Generated PDFs will appear here','Les PDFs générés apparaîtront ici')}</div>
            </div>
          ):(
            <div style={{ background:C.card,border:'1px solid '+C.border,borderRadius:14,overflow:'hidden' }}>
              <div style={{ padding:'14px 20px',borderBottom:'1px solid '+C.border,fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace' }}>
                {L('PDF HISTORY','HISTORIQUE PDF')} — {reportHistory.length} {L('reports','rapports')}
              </div>
              {reportHistory.map((h,i)=>{
                const parts=(h.type||'').split('_');
                const stdId=parts.slice(2,-1).join('_')||'VERRA_VCS';
                const pdfLang=(parts[parts.length-1]||'FR').toLowerCase();
                const std=ALL_STANDARDS.find(s=>s.id===stdId)||ALL_STANDARDS[0];
                return (
                  <div key={h.id} style={{ display:'flex',alignItems:'center',gap:14,padding:'12px 20px',borderBottom:i<reportHistory.length-1?'1px solid '+C.border+'30':'none' }}>
                    <div style={{ width:34,height:34,borderRadius:8,background:std.color+'15',border:'1px solid '+std.color+'30',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0 }}>{std.icon}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12,color:C.text,fontWeight:600 }}>{h.project?.name||'Projet'} — {h.year}</div>
                      <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginTop:2 }}>
                        {std.name} · {h.generatedAt?new Date(h.generatedAt).toLocaleDateString(lang==='fr'?'fr-FR':'en-US'):'—'} · {h.fileSize?Math.round(h.fileSize/1024)+'KB':'—'}
                      </div>
                    </div>
                    <div style={{ display:'flex',gap:6,alignItems:'center' }}>
                      <span style={{ fontSize:8,padding:'2px 6px',background:pdfLang==='en'?'rgba(56,189,248,0.1)':'rgba(167,139,250,0.1)',borderRadius:4,color:pdfLang==='en'?C.blue:C.purple,fontFamily:'JetBrains Mono, monospace' }}>{pdfLang.toUpperCase()}</span>
                      <span style={{ fontSize:8,padding:'3px 7px',background:'rgba(0,255,148,0.1)',borderRadius:4,color:C.green,fontFamily:'JetBrains Mono, monospace' }}>{h.status}</span>
                    </div>
                    <button onClick={()=>downloadPDF(h.projectId,h.year,h.project?.countryCode,stdId,pdfLang)}
                      style={{ background:C.card2,border:'1px solid '+C.border,borderRadius:8,color:C.text2,padding:'6px 12px',cursor:'pointer',fontSize:10 }}>
                      ↓ {L('Reload','Re-télécharger')}
                    </button>
                    <button onClick={()=>setConfirmDelete(h)}
                      style={{ background:'rgba(248,113,113,0.06)',border:'1px solid rgba(248,113,113,0.15)',borderRadius:8,color:C.red,padding:'6px 9px',cursor:'pointer',fontSize:10 }}>🗑</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── PREVIEW ─────────────────────────────────────────────────────────── */}
      {tab==='preview'&&previewData&&(
        <div>
          <div style={{ display:'flex',gap:12,alignItems:'center',marginBottom:20 }}>
            <button onClick={()=>setTab('reports')} style={{ background:'transparent',border:'1px solid '+C.border,borderRadius:8,color:C.muted,padding:'8px 14px',cursor:'pointer',fontSize:12 }}>← {L('Back','Retour')}</button>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:9,color:C.green,fontFamily:'JetBrains Mono, monospace',marginBottom:2 }}>{L('MRV PREVIEW — ACM0002 v19.0','APERÇU MRV — ACM0002 v19.0')}</div>
              <div style={{ fontSize:15,fontWeight:700,color:C.text }}>{previewData.project?.name} — {previewData.mrv?.year}</div>
            </div>
            <div style={{ display:'flex',gap:8 }}>
              <button onClick={()=>downloadPDF(previewData.project?.id,previewData.mrv?.year,previewData.project?.countryCode,'VERRA_VCS','en')}
                style={{ background:'rgba(56,189,248,0.1)',border:'1px solid rgba(56,189,248,0.3)',borderRadius:8,color:C.blue,padding:'9px 16px',cursor:'pointer',fontSize:12,fontWeight:700 }}>📥 Verra EN</button>
              <button onClick={()=>downloadPDF(previewData.project?.id,previewData.mrv?.year,previewData.project?.countryCode,'VERRA_VCS','fr')}
                style={{ background:'rgba(167,139,250,0.1)',border:'1px solid rgba(167,139,250,0.3)',borderRadius:8,color:C.purple,padding:'9px 16px',cursor:'pointer',fontSize:12,fontWeight:700 }}>📥 Verra FR</button>
            </div>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:20 }}>
            <div style={{ background:C.card,border:'1px solid rgba(0,255,148,0.15)',borderRadius:14,padding:22 }}>
              <div style={{ fontSize:9,color:C.green,fontFamily:'JetBrains Mono, monospace',marginBottom:14,letterSpacing:'0.1em' }}>ACM0002 RESULTS</div>
              {[
                {l:L('Gross production','Production brute'),v:fmtN(previewData.mrv?.grossEnergy)+' MWh',c:C.blue},
                {l:L('Gross reductions','Réductions brutes'),v:fmtN(previewData.mrv?.grossReductions)+' tCO₂e',c:C.green},
                {l:L('Leakage','Leakage'),v:fmtN(previewData.mrv?.leakage)+' tCO₂e',c:C.red},
                {l:L('Net credits','Crédits nets'),v:fmtN(previewData.mrv?.netCarbonCredits)+' tCO₂e',c:C.green},
                {l:L('Estimated value (Verra)','Valeur estimée (Verra)'),v:fmtUSD((previewData.mrv?.netCarbonCredits||0)*11.04),c:C.yellow},
                {l:L('Readings','Lectures'),v:previewData.readingsCount+' '+L('months','mois'),c:C.muted},
              ].map(item=>(
                <div key={item.l} style={{ display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid '+C.border+'40' }}>
                  <span style={{ fontSize:12,color:C.text2 }}>{item.l}</span>
                  <span style={{ fontSize:12,color:item.c,fontWeight:700,fontFamily:'JetBrains Mono, monospace' }}>{item.v}</span>
                </div>
              ))}
            </div>
            <div style={{ background:C.card,border:'1px solid '+C.border,borderRadius:14,padding:22 }}>
              <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:14,letterSpacing:'0.1em' }}>{L('DOWNLOAD MATRIX','MATRICE DE TÉLÉCHARGEMENT')}</div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:6 }}>
                {ALL_STANDARDS.map(std=>(
                  <div key={std.id} style={{ background:C.card2,border:'1px solid '+std.color+'15',borderRadius:8,padding:'8px 10px' }}>
                    <div style={{ fontSize:10,color:std.color,fontWeight:700,marginBottom:6 }}>{std.icon} {std.name}</div>
                    <div style={{ display:'flex',gap:4 }}>
                      <button onClick={()=>downloadPDF(previewData.project?.id,previewData.mrv?.year,previewData.project?.countryCode,std.id,'en')}
                        style={{ flex:1,background:'rgba(56,189,248,0.08)',border:'1px solid rgba(56,189,248,0.2)',borderRadius:5,color:C.blue,padding:'4px 0',cursor:'pointer',fontSize:9,fontWeight:700 }}>EN</button>
                      <button onClick={()=>downloadPDF(previewData.project?.id,previewData.mrv?.year,previewData.project?.countryCode,std.id,'fr')}
                        style={{ flex:1,background:'rgba(167,139,250,0.08)',border:'1px solid rgba(167,139,250,0.2)',borderRadius:5,color:C.purple,padding:'4px 0',cursor:'pointer',fontSize:9,fontWeight:700 }}>FR</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}