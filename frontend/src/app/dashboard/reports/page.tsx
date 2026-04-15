'use client';
import { useLang } from '@/lib/lang-context';
import { useEffect, useState, useCallback } from 'react';
import { fetchAuthJson, fetchAuth } from '@/lib/fetch-auth';

const C = {
  bg:'#080B0F', card:'#0D1117', card2:'#0A1628', border:'#1E2D3D',
  green:'#00FF94', red:'#F87171', yellow:'#FCD34D', blue:'#38BDF8',
  purple:'#A78BFA', orange:'#F97316', muted:'#4A6278', text:'#E8EFF6', text2:'#8FA3B8',
};

const COUNTRY_FLAGS = {
  CI:'🇨🇮', KE:'🇰🇪', NG:'🇳🇬', GH:'🇬🇭', SN:'🇸🇳', TZ:'🇹🇿', CM:'🇨🇲',
  ET:'🇪🇹', ZA:'🇿🇦', MA:'🇲🇦', EG:'🇪🇬', BF:'🇧🇫', ML:'🇲🇱', RW:'🇷🇼',
  UG:'🇺🇬', MZ:'🇲🇿', ZM:'🇿🇲', BJ:'🇧🇯', TG:'🇹🇬', NE:'🇳🇪',
};
const TYPE_ICON = { SOLAR:'☀️', WIND:'💨', HYDRO:'💧', BIOMASS:'🌱', HYBRID:'⚡', OTHER:'🔋' };

function fmtN(n) { return n != null ? Number(n).toLocaleString('fr-FR',{maximumFractionDigits:2}) : '—'; }
function fmtUSD(n) { return n != null ? '$'+Number(n).toLocaleString('en-US',{maximumFractionDigits:0}) : '—'; }

const STANDARDS_DEF = (L) => [
  {
    id:'VERRA_VCS', name:'Verra VCS', method:'ACM0002 v19.0',
    color:C.green, icon:'🌿', supported:true,
    desc:L('Voluntary Carbon Standard — world\'s largest registry (200M+ credits)','Voluntary Carbon Standard — plus grande registry mondiale (200M+ crédits)'),
    features:[
      L('ACM0002 renewable energy methodology','Méthodologie ACM0002 renewable energy'),
      L('Double counting check','Double counting check'),
      L('Additionality test','Additionality test'),
      L('SDG co-benefits','Co-benefits SDG'),
      L('Buffer pool 10–20%','Buffer pool 10–20%'),
    ],
    url:'https://verra.org/programs/verified-carbon-standard/',
    docLabel:L('Official Verra VCS documentation →','Documentation officielle Verra VCS →'),
    priceRange:'$8–15/t', delay:L('6–12 months','6–12 mois'), volume:'200M+',
  },
  {
    id:'GOLD_STANDARD', name:'Gold Standard', method:'CDM LCB + GS4GG',
    color:C.yellow, icon:'⭐', supported:true,
    desc:L('Gold Standard for the Global Goals — premium quality label','Gold Standard for the Global Goals — label qualité premium'),
    features:[
      L('Social + environmental safeguards','Safeguards social + environnemental'),
      L('Quantified SDG Impact','SDG Impact quantifié'),
      L('Stakeholder consultation','Stakeholder consultation'),
      L('VVB site visit','Site visit VVB'),
      L('Maximum transparency','Transparence maximale'),
    ],
    url:'https://www.goldstandard.org',
    docLabel:L('Official Gold Standard documentation →','Documentation officielle Gold Standard →'),
    priceRange:'$15–25/t', delay:L('8–18 months','8–18 mois'), volume:'50M+',
  },
  {
    id:'ARTICLE6', name:'Article 6 Paris', method:'ITMO + A6.4ER',
    color:C.blue, icon:'🌐', supported:false,
    desc:L('Sovereign carbon markets — bilateral ITMO transfers','Marchés carbone souverains — transferts bilatéraux (ITMOs)'),
    features:[
      L('Corresponding adjustments','Corresponding adjustments'),
      L('National NDC registries','National registries NDC'),
      L('Bilateral agreements','Bilatéral agreements'),
      L('Sovereign guarantee','Sovereign guarantee'),
      L('Coming Q4 2025','Coming Q4 2025'),
    ],
    url:'https://unfccc.int/topics/carbon-markets',
    docLabel:L('UNFCCC Article 6 documentation →','Documentation officielle UNFCCC Article 6 →'),
    priceRange:'$20–50/t', delay:L('12–24 months','12–24 mois'), volume:L('Emerging','Émergent'),
  },
  {
    id:'CDM', name:'CDM Legacy', method:'UNFCCC CDM',
    color:C.muted, icon:'📋', supported:false,
    desc:L('Clean Development Mechanism — legacy CER credits','Clean Development Mechanism — crédits legacy CERs'),
    features:[
      L('CER → VCMI conversion','CER conversion VCMI'),
      L('Legacy projects only','Legacy projects only'),
      L('UNFCCC registry','UNFCCC registry'),
      L('Historical baseline','Historical baseline'),
      L('Transition pathway','Transition pathway'),
    ],
    url:'https://cdm.unfccc.int',
    docLabel:L('UNFCCC CDM documentation →','Documentation officielle UNFCCC CDM →'),
    priceRange:'$1–5/t', delay:L('Variable','Variable'), volume:L('Declining','Décroissant'),
  },
];

export default function ReportsPage() {
  const { lang } = useLang();
  const L = (en, fr) => lang === 'fr' ? fr : en;

  const STANDARDS = STANDARDS_DEF(L);

  const WORKFLOW_STEPS = [
    { n:'01', title:L('MRV Data','Données MRV'),     desc:L('Monthly production readings recorded','Lectures mensuelles enregistrées'), color:C.green,  icon:'📡', done:true },
    { n:'02', title:L('ACM0002 Calc.','Calcul ACM0002'), desc:L('Engine calculates net credits (leakage deducted)','Engine calcule les crédits nets (leakage déduit)'), color:C.blue, icon:'⚙️', done:true },
    { n:'03', title:L('PDF Generation','Génération PDF'),  desc:L('Certifiable report for VVB auditors','Rapport certifiable pour auditeurs VVB'), color:C.yellow, icon:'📄', done:false },
    { n:'04', title:L('Submission','Soumission'),     desc:L('Verra / Gold Standard → credit issuance','Verra / Gold Standard → issuance crédits'), color:C.purple, icon:'🚀', done:false },
  ];

  const [tab, setTab] = useState('reports');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [selectedStandard, setSelectedStandard] = useState(null);
  const [toast, setToast] = useState(null);
  const [sortBy, setSortBy] = useState('credits');
  const [filterYear, setFilterYear] = useState('');
  const [reportHistory, setReportHistory] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),5000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [recs, hist] = await Promise.all([
        fetchAuthJson('/reports').catch(()=>[]),
        fetchAuthJson('/reports/history').catch(()=>[]),
      ]);
      setRecords(Array.isArray(recs) ? recs : []);
      setReportHistory(Array.isArray(hist) ? hist : []);
    } catch(e) { showToast(L('Error loading data','Erreur de chargement'), 'error'); }
    finally { setLoading(false); }
  }, [lang]);

  useEffect(() => { load(); }, [load]);

  const generatePDF = async (projectId, year, projectName, countryCode) => {
    const key = projectId+'-'+year;
    setGeneratingId(key);
    showToast(L('Generating PDF report...','Génération du rapport PDF en cours...'), 'info');
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
      const res = await fetch(
        (process.env.NEXT_PUBLIC_API_URL||'')+'/reports/'+projectId+'/'+year+'/pdf',
        { headers: { Authorization:'Bearer '+token } }
      );
      if (!res.ok) { const e = await res.json().catch(()=>({error:'Error'})); throw new Error(e.error); }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'PANGEA-CARBON-MRV-'+(countryCode||'AF')+'-'+year+'.pdf'; a.click();
      URL.revokeObjectURL(url);
      showToast(L('PDF downloaded!','PDF téléchargé !'));
      await load();
    } catch(e) { showToast(e.message||'Error', 'error'); }
    finally { setGeneratingId(null); }
  };

  const loadPreview = async (projectId, year) => {
    try {
      const data = await fetchAuthJson('/reports/'+projectId+'/'+year+'/preview');
      setPreviewData(data); setTab('preview');
    } catch(e) { showToast(e.message||'Error', 'error'); }
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await fetchAuthJson('/reports/'+confirmDelete.id, { method:'DELETE' });
      showToast(L('Report deleted','Rapport supprimé'));
      setConfirmDelete(null);
      await load();
    } catch(e) { showToast(e.message||'Error','error'); }
    finally { setDeleting(false); }
  };

  const years = [...new Set(records.map(r => r.year))].sort((a,b)=>b-a);
  const filtered = records
    .filter(r => !filterYear || String(r.year)===filterYear)
    .sort((a,b)=>{
      if(sortBy==='credits') return (b.netCarbonCredits||0)-(a.netCarbonCredits||0);
      if(sortBy==='revenue') return (b.revenueUSD||0)-(a.revenueUSD||0);
      return b.year-a.year;
    });

  const totalCredits = records.reduce((s,r)=>s+(r.netCarbonCredits||0),0);
  const totalRevenue = records.reduce((s,r)=>s+(r.revenueUSD||r.netCarbonCredits*11.04||0),0);
  const generatedCount = reportHistory.length;

  const T = {
    tabReports: L('MRV Reports','Rapports MRV'),
    tabStandards: L('Standards','Standards'),
    tabHistory: L('History','Historique'),
    tabPreview: L('Preview','Aperçu'),
    noData: L('No MRV reports available','Aucun rapport MRV disponible'),
    noDataDesc: L('Create a project, add monthly production readings, then run the MRV calculation to generate your first certifiable report.','Créez un projet, ajoutez des lectures de production mensuelles, puis calculez le MRV pour générer votre premier rapport certifiable.'),
    btnCreate: L('Create a project','Créer un projet'),
    btnMRV: L('Calculate MRV →','Calculer MRV →'),
    btnPreview: L('Preview','Aperçu'),
    btnPDF: L('PDF Verra','PDF Verra'),
    btnDelete: L('Delete','Supprimer'),
    btnBack: L('Back','Retour'),
    btnDownload: L('Download PDF','Télécharger PDF'),
    ready: L('READY','PRÊT'),
    loading: L('Loading MRV data...','Chargement des données MRV...'),
    generating: L('Generating...','Génération...'),
    allYears: L('All years','Toutes les années'),
    sortCredits: L('Sort: Credits CO₂','Tri: Crédits CO₂'),
    sortRevenue: L('Sort: Revenue USD','Tri: Revenus USD'),
    sortYear: L('Sort: Year','Tri: Année'),
    deleteTitle: L('Delete this report?','Supprimer ce rapport ?'),
    deleteDesc: L('This generated PDF report will be permanently deleted from the database. The MRV data will not be affected.','Ce rapport PDF généré sera définitivement supprimé de la base de données. Les données MRV ne seront pas affectées.'),
    deleteBtn: L('Delete permanently','Supprimer définitivement'),
    cancelBtn: L('Cancel','Annuler'),
  };

  return (
    <div style={{ padding:24, maxWidth:1400, margin:'0 auto' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed',top:20,right:20,zIndex:99999,maxWidth:440 }}>
          <div style={{ background:toast.type==='error'?'rgba(248,113,113,0.1)':toast.type==='info'?'rgba(56,189,248,0.08)':'rgba(0,255,148,0.08)', border:'1px solid '+(toast.type==='error'?'rgba(248,113,113,0.35)':toast.type==='info'?'rgba(56,189,248,0.3)':'rgba(0,255,148,0.3)'), borderRadius:12, padding:'14px 20px', display:'flex', alignItems:'center', gap:12, backdropFilter:'blur(20px)', boxShadow:'0 8px 32px rgba(0,0,0,0.5)', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute',left:0,top:0,bottom:0,width:3,background:toast.type==='error'?C.red:toast.type==='info'?C.blue:C.green }}/>
            <span style={{ fontSize:13,color:C.text,marginLeft:8 }}>{toast.msg}</span>
          </div>
        </div>
      )}

      {/* Modale suppression rapport */}
      {confirmDelete && (
        <div onClick={e=>{if(e.target===e.currentTarget)setConfirmDelete(null);}}
          style={{ position:'fixed',inset:0,background:'rgba(8,11,15,0.88)',backdropFilter:'blur(10px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10001,padding:16 }}>
          <div style={{ background:C.card,border:'1px solid rgba(248,113,113,0.35)',borderRadius:16,padding:28,maxWidth:480,width:'100%',boxShadow:'0 24px 80px rgba(0,0,0,0.7)',position:'relative',overflow:'hidden' }}>
            <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,#F87171 0%,rgba(248,113,113,0.2) 100%)' }}/>
            <div style={{ display:'flex',gap:14,alignItems:'center',marginBottom:16 }}>
              <div style={{ width:48,height:48,borderRadius:12,background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0 }}>🗑</div>
              <div>
                <div style={{ fontSize:9,color:C.red,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.12em',marginBottom:4 }}>MRV REPORTS · {L('DELETE REPORT','SUPPRESSION RAPPORT')}</div>
                <h2 style={{ fontFamily:'Syne, sans-serif',fontSize:17,fontWeight:800,color:C.red,margin:0 }}>{T.deleteTitle}</h2>
              </div>
            </div>
            <div style={{ height:1,background:'linear-gradient(90deg,rgba(248,113,113,0.25) 0%,transparent 100%)',marginBottom:18 }}/>
            <div style={{ background:'rgba(248,113,113,0.05)',border:'1px solid rgba(248,113,113,0.15)',borderRadius:10,padding:'14px 16px',marginBottom:20 }}>
              <div style={{ fontSize:13,color:C.text,fontWeight:700,marginBottom:6 }}>
                {confirmDelete.project?.name || 'Rapport'} — {confirmDelete.year}
              </div>
              <p style={{ fontSize:12,color:C.text2,margin:0,lineHeight:1.7 }}>{T.deleteDesc}</p>
            </div>
            <div style={{ display:'flex',gap:10 }}>
              <button onClick={()=>setConfirmDelete(null)} style={{ flex:1,background:'transparent',border:'1px solid '+C.border,borderRadius:9,color:C.muted,padding:12,cursor:'pointer',fontSize:13 }}>{T.cancelBtn}</button>
              <button onClick={executeDelete} disabled={deleting}
                style={{ flex:1,background:deleting?C.card2:'rgba(248,113,113,0.12)',border:'1px solid rgba(248,113,113,0.4)',borderRadius:9,color:deleting?C.muted:C.red,padding:12,fontWeight:800,cursor:deleting?'wait':'pointer',fontSize:13,fontFamily:'Syne, sans-serif' }}>
                {deleting ? '⟳ '+L('Deleting...','Suppression...') : '🗑 '+T.deleteBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:9,color:C.green,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.15em',marginBottom:8 }}>
          PANGEA CARBON · MRV ENGINE · VERRA ACM0002 v19.0 · GOLD STANDARD
        </div>
        <h1 style={{ fontFamily:'Syne, sans-serif',fontSize:28,fontWeight:800,color:C.text,margin:0,marginBottom:6 }}>
          {L('MRV Reports','Rapports MRV')}
        </h1>
        <p style={{ fontSize:13,color:C.muted,margin:0,maxWidth:700,lineHeight:1.7 }}>
          {L('Certifiable ACM0002 reports for VVB auditor submission. Auto-generated — ready for Verra, Gold Standard and Article 6 Paris.','Rapports certifiables ACM0002 pour soumission aux auditeurs VVB. Génération automatique — prêts pour Verra, Gold Standard et Article 6 Paris.')}
        </p>
      </div>

      {/* Workflow Banner */}
      <div style={{ background:C.card,border:'1px solid '+C.border,borderRadius:16,padding:24,marginBottom:28,position:'relative',overflow:'hidden' }}>
        <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,'+C.green+' 0%,'+C.blue+' 33%,'+C.yellow+' 66%,'+C.purple+' 100%)' }}/>
        <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.1em',marginBottom:18 }}>
          {L('CERTIFICATION WORKFLOW — 4 STEPS','WORKFLOW DE CERTIFICATION — 4 ÉTAPES')}
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16 }}>
          {WORKFLOW_STEPS.map((s,i) => (
            <div key={s.key} style={{ position:'relative' }}>
              {i<3 && <div style={{ position:'absolute',top:20,left:'calc(100% + 8px)',width:'calc(100% - 16px)',height:1,background:'linear-gradient(90deg,'+s.color+'40 0%,transparent 100%)',zIndex:1 }}/>}
              <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:10 }}>
                <div style={{ width:40,height:40,borderRadius:12,background:s.color+'15',border:'1px solid '+s.color+'40',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0 }}>{s.icon}</div>
                <div style={{ width:22,height:22,borderRadius:'50%',background:s.done?s.color:'transparent',border:'1px solid '+s.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:800,color:s.done?'#080B0F':s.color,fontFamily:'JetBrains Mono, monospace',flexShrink:0 }}>
                  {s.done?'✓':s.n}
                </div>
              </div>
              <div style={{ fontSize:13,fontWeight:700,color:s.done?s.color:C.text2,marginBottom:4 }}>{s.title}</div>
              <div style={{ fontSize:11,color:C.muted,lineHeight:1.6 }}>{s.desc}</div>
            </div>
          ))}
        </div>
        {/* Workflow explanation */}
        <div style={{ marginTop:20,padding:'12px 16px',background:'rgba(56,189,248,0.04)',border:'1px solid rgba(56,189,248,0.1)',borderRadius:10,fontSize:11,color:C.text2,lineHeight:1.8 }}>
          <span style={{ color:C.blue,fontFamily:'JetBrains Mono, monospace',fontSize:9 }}>ℹ {L('HOW IT WORKS','COMMENT CA MARCHE')} — </span>
          {L('Reports are generated on demand: add monthly readings in Projects → run MRV calculation → click "PDF Verra". The PDF is built automatically using ACM0002 v19.0 formula: Gross reductions = Production(MWh) × EF_grid, Net credits = Gross – Leakage(3%) – Uncertainty(5%).','Les rapports sont générés à la demande : ajoutez des lectures dans Projets → lancez le calcul MRV → cliquez "PDF Verra". Le PDF est construit automatiquement selon la formule ACM0002 v19.0 : Réductions brutes = Production(MWh) × EF_réseau, Crédits nets = Brut – Leakage(3%) – Incertitude(5%).')}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:'flex',gap:12,marginBottom:28,flexWrap:'wrap' }}>
        {[
          { v:records.length,           l:L('Projects with MRV','Projets avec MRV'),   c:C.blue,   icon:'📊', s:L('ready for report','prêts pour rapport') },
          { v:generatedCount,           l:L('Reports generated','Rapports générés'),    c:C.green,  icon:'📄', s:L('available','disponibles') },
          { v:fmtN(totalCredits)+' t',  l:L('Total MRV credits','Total crédits MRV'),  c:C.green,  icon:'🌿', s:'tCO₂e certifiable' },
          { v:fmtUSD(totalRevenue),     l:L('Total value','Valeur totale'),             c:C.yellow, icon:'💰', s:'USD' },
        ].map(s => (
          <div key={s.l} style={{ background:C.card,border:'1px solid '+s.c+'20',borderRadius:14,padding:'16px 20px',flex:1,minWidth:160,position:'relative',overflow:'hidden' }}>
            <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,'+s.c+' 0%,transparent 100%)' }}/>
            <div style={{ fontSize:11,color:s.c,marginBottom:4 }}>{s.icon}</div>
            <div style={{ fontSize:22,fontWeight:800,color:s.c,fontFamily:'JetBrains Mono, monospace',lineHeight:1 }}>{s.v}</div>
            <div style={{ fontSize:11,color:C.text,fontWeight:600,marginTop:6 }}>{s.l}</div>
            <div style={{ fontSize:9,color:C.muted,marginTop:2,fontFamily:'JetBrains Mono, monospace' }}>{s.s}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex',gap:2,marginBottom:24,borderBottom:'1px solid '+C.border }}>
        {([
          ['reports',   '📄 '+T.tabReports,   C.green],
          ['standards', '🏛 '+T.tabStandards, C.blue],
          ['history',   '📋 '+T.tabHistory,   C.muted],
          ...(previewData?[['preview','🔍 '+T.tabPreview, C.yellow]]:[] as any),
        ] as [string,string,string][]).map(([id,label,color]) => (
          <button key={id} onClick={()=>setTab(id)}
            style={{ padding:'11px 20px',border:'none',cursor:'pointer',fontSize:12,fontWeight:600,fontFamily:'JetBrains Mono, monospace',borderBottom:'2px solid '+(tab===id?color:'transparent'),background:'transparent',color:tab===id?color:C.muted,transition:'all .15s' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── REPORTS ─────────────────────────────────────────────────────────── */}
      {tab === 'reports' && (
        <div>
          <div style={{ display:'flex',gap:10,marginBottom:20,flexWrap:'wrap',alignItems:'center' }}>
            <select style={{ background:C.card2,border:'1px solid '+C.border,borderRadius:8,color:C.text,padding:'9px 14px',fontSize:12,outline:'none',cursor:'pointer' }}
              value={filterYear} onChange={e=>setFilterYear(e.target.value)}>
              <option value="">{T.allYears}</option>
              {years.map(y=><option key={y} value={String(y)}>{y}</option>)}
            </select>
            <select style={{ background:C.card2,border:'1px solid '+C.border,borderRadius:8,color:C.text,padding:'9px 14px',fontSize:12,outline:'none',cursor:'pointer' }}
              value={sortBy} onChange={e=>setSortBy(e.target.value)}>
              <option value="credits">{T.sortCredits}</option>
              <option value="revenue">{T.sortRevenue}</option>
              <option value="year">{T.sortYear}</option>
            </select>
            <div style={{ flex:1,fontSize:11,color:C.muted,fontFamily:'JetBrains Mono, monospace',textAlign:'right' }}>
              {filtered.length} {L('project','projet')}{filtered.length!==1?'s':''} · ACM0002 v19.0
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign:'center',padding:60,color:C.muted,fontFamily:'JetBrains Mono, monospace',fontSize:11 }}>◌ {T.loading}</div>
          ) : filtered.length===0 ? (
            <div style={{ background:C.card,border:'1px solid '+C.border,borderRadius:16,padding:60,textAlign:'center' }}>
              <div style={{ fontSize:52,marginBottom:16 }}>📄</div>
              <div style={{ fontSize:18,color:C.text,fontWeight:700,marginBottom:8,fontFamily:'Syne, sans-serif' }}>{T.noData}</div>
              <div style={{ fontSize:13,color:C.muted,marginBottom:24,maxWidth:480,margin:'0 auto 24px',lineHeight:1.7 }}>{T.noDataDesc}</div>
              <div style={{ display:'flex',gap:12,justifyContent:'center' }}>
                <a href="/dashboard/projects/new" style={{ background:'rgba(0,255,148,0.12)',border:'1px solid rgba(0,255,148,0.35)',borderRadius:10,color:C.green,padding:'11px 22px',textDecoration:'none',fontSize:13,fontWeight:700,fontFamily:'Syne, sans-serif' }}>+ {T.btnCreate}</a>
                <a href="/dashboard/mrv" style={{ background:C.card2,border:'1px solid '+C.border,borderRadius:10,color:C.text2,padding:'11px 22px',textDecoration:'none',fontSize:13 }}>{T.btnMRV}</a>
              </div>
            </div>
          ) : (
            <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
              {filtered.map(rec => {
                const key = rec.projectId+'-'+rec.year;
                const isGen = generatingId===key;
                const credits = rec.netCarbonCredits||0;
                const revenue = rec.revenueUSD||credits*11.04;
                const country = rec.project?.countryCode||'';
                const flag = COUNTRY_FLAGS[country]||'🌍';
                const typeIcon = TYPE_ICON[rec.project?.type]||'⚡';
                return (
                  <div key={key} style={{ background:C.card,border:'1px solid rgba(0,255,148,0.1)',borderRadius:14,padding:'18px 22px',display:'flex',alignItems:'center',gap:20,borderLeft:'3px solid '+C.green }}>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:6 }}>
                        <span style={{ fontSize:18 }}>{typeIcon}</span>
                        <div style={{ fontSize:15,fontWeight:700,color:C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{rec.project?.name||'Projet'}</div>
                        <span style={{ fontSize:11,color:C.muted,fontFamily:'JetBrains Mono, monospace',flexShrink:0 }}>{flag} {country}</span>
                        <span style={{ fontSize:10,padding:'2px 8px',background:'rgba(0,255,148,0.1)',border:'1px solid rgba(0,255,148,0.2)',borderRadius:4,color:C.green,fontFamily:'JetBrains Mono, monospace',flexShrink:0 }}>{rec.year}</span>
                      </div>
                      <div style={{ display:'flex',gap:16,flexWrap:'wrap' }}>
                        <span style={{ fontSize:11,color:C.muted }}><span style={{ color:C.green,fontWeight:700,fontFamily:'JetBrains Mono, monospace' }}>{fmtN(credits)}</span> tCO₂e</span>
                        <span style={{ fontSize:11,color:C.muted }}><span style={{ color:C.yellow,fontWeight:700,fontFamily:'JetBrains Mono, monospace' }}>{fmtUSD(revenue)}</span> {L('market value','valeur marché')}</span>
                        {rec.project?.installedMW && <span style={{ fontSize:11,color:C.muted }}><span style={{ color:C.blue,fontFamily:'JetBrains Mono, monospace' }}>{rec.project.installedMW} MW</span></span>}
                        <span style={{ fontSize:10,color:C.muted,fontFamily:'JetBrains Mono, monospace' }}>ACM0002 · EF {(rec.gridEmissionFactor||0).toFixed(3)} tCO₂/MWh</span>
                      </div>
                    </div>
                    <div style={{ display:'flex',alignItems:'center',gap:8,flexShrink:0 }}>
                      <span style={{ fontSize:9,padding:'4px 10px',background:'rgba(0,255,148,0.1)',border:'1px solid rgba(0,255,148,0.25)',borderRadius:6,color:C.green,fontFamily:'JetBrains Mono, monospace',fontWeight:700 }}>✓ {T.ready}</span>
                      <button onClick={()=>loadPreview(rec.projectId,rec.year)} style={{ background:C.card2,border:'1px solid '+C.border,borderRadius:8,color:C.text2,padding:'8px 12px',cursor:'pointer',fontSize:11 }}>🔍 {T.btnPreview}</button>
                      <button onClick={()=>generatePDF(rec.projectId,rec.year,rec.project?.name,country)} disabled={isGen}
                        style={{ background:isGen?C.card2:'rgba(0,255,148,0.12)',border:'1px solid '+(isGen?C.border:'rgba(0,255,148,0.35)'),borderRadius:8,color:isGen?C.muted:C.green,padding:'8px 14px',cursor:isGen?'wait':'pointer',fontSize:11,fontWeight:700 }}>
                        {isGen?'⟳ '+T.generating:'📥 '+T.btnPDF}
                      </button>
                      <button onClick={()=>setConfirmDelete(rec)}
                        style={{ background:'rgba(248,113,113,0.06)',border:'1px solid rgba(248,113,113,0.15)',borderRadius:8,color:C.red,padding:'8px 12px',cursor:'pointer',fontSize:11 }}>
                        🗑 {T.btnDelete}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── STANDARDS ────────────────────────────────────────────────────────── */}
      {tab === 'standards' && (
        <div>
          <p style={{ fontSize:13,color:C.muted,marginBottom:24,lineHeight:1.7,maxWidth:700 }}>
            {L('PANGEA CARBON generates certifiable reports for major voluntary and regulatory carbon credit standards. Each standard has its own methodological requirements.','PANGEA CARBON génère des rapports certifiables pour les principaux standards de crédits carbone volontaires et réglementaires. Chaque standard a ses propres exigences méthodologiques.')}
          </p>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:16,marginBottom:24 }}>
            {STANDARDS.map(s => (
              <div key={s.id} onClick={()=>setSelectedStandard(selectedStandard?.id===s.id?null:s)}
                style={{ background:C.card,border:'1px solid '+(selectedStandard?.id===s.id?s.color+'40':s.supported?s.color+'15':C.border),borderRadius:14,padding:22,cursor:'pointer',transition:'all .2s',opacity:s.supported?1:0.8,position:'relative',overflow:'hidden' }}>
                <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:selectedStandard?.id===s.id?s.color:'transparent',transition:'background .2s' }}/>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14 }}>
                  <div style={{ display:'flex',gap:12,alignItems:'center' }}>
                    <span style={{ fontSize:28 }}>{s.icon}</span>
                    <div>
                      <div style={{ fontSize:16,fontWeight:800,color:selectedStandard?.id===s.id?s.color:C.text,fontFamily:'Syne, sans-serif' }}>{s.name}</div>
                      <code style={{ fontSize:10,color:s.color,fontFamily:'JetBrains Mono, monospace' }}>{s.method}</code>
                    </div>
                  </div>
                  <span style={{ fontSize:9,padding:'3px 10px',borderRadius:20,fontFamily:'JetBrains Mono, monospace',fontWeight:700, background:s.supported?s.color+'15':'rgba(74,98,120,0.1)', color:s.supported?s.color:C.muted, border:'1px solid '+(s.supported?s.color+'30':C.border) }}>
                    {s.supported?'✓ '+L('SUPPORTED','SUPPORTÉ'):L('COMING SOON','COMING SOON')}
                  </span>
                </div>
                <p style={{ fontSize:12,color:C.text2,margin:'0 0 14px',lineHeight:1.7 }}>{s.desc}</p>
                <div style={{ display:'flex',flexWrap:'wrap',gap:6,marginBottom:14 }}>
                  {s.features.map(f => (
                    <span key={f} style={{ fontSize:9,padding:'3px 8px',background:s.color+'10',border:'1px solid '+s.color+'25',borderRadius:4,color:s.color,fontFamily:'JetBrains Mono, monospace' }}>{f}</span>
                  ))}
                </div>
                {s.url && (
                  <a href={s.url} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()}
                    style={{ fontSize:11,color:s.color,textDecoration:'none',display:'inline-flex',alignItems:'center',gap:4 }}>
                    {s.docLabel}
                  </a>
                )}
              </div>
            ))}
          </div>

          {/* Comparative table */}
          <div style={{ background:C.card,border:'1px solid '+C.border,borderRadius:14,overflow:'hidden' }}>
            <div style={{ padding:'16px 20px',borderBottom:'1px solid '+C.border,fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.1em' }}>
              {L('STANDARDS COMPARISON','COMPARAISON DES STANDARDS')}
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%',borderCollapse:'collapse',fontSize:12 }}>
                <thead>
                  <tr style={{ background:'rgba(255,255,255,0.02)' }}>
                    {[L('Criteria','Critère'),'Verra VCS','Gold Standard','Article 6',L('CDM Legacy','CDM Legacy')].map(h=>(
                      <th key={h} style={{ padding:'12px 16px',textAlign:'left',fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',borderBottom:'1px solid '+C.border }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    [L('Market price','Prix marché'),'$8–15/t','$15–25/t','$20–50/t','$1–5/t'],
                    [L('Certification delay','Délai certification'),L('6–12 months','6–12 mois'),L('8–18 months','8–18 mois'),L('12–24 months','12–24 mois'),L('Variable','Variable')],
                    [L('Global volume','Volume mondial'),'200M+ crédits','50M+ crédits',L('Emerging','Émergent'),L('Declining','Décroissant')],
                    [L('SDG requirements','Exigences SDG'),L('Optional','Optionnel'),L('Mandatory','Obligatoire'),L('Variable','Variable'),L('N/A','N/A')],
                    [L('Registry','Registre'),'Verra Registry','GS Registry','UNFCCC/National','UNFCCC CDM'],
                    [L('Africa adapted','Adapté Afrique'),'✓ '+L('Optimal','Optimal'),'✓ '+L('Premium','Premium'),'⏳ Q4 2025','⚠ '+L('Legacy','Legacy')],
                    [L('PANGEA support','Support PANGEA'),'✅ '+L('Active','Actif'),'✅ '+L('Active','Actif'),'⏳ '+L('Coming','Bientôt'),'⏳ '+L('Coming','Bientôt')],
                  ].map(row=>(
                    <tr key={row[0]} style={{ borderBottom:'1px solid '+C.border+'22' }}>
                      <td style={{ padding:'10px 16px',color:C.text2,fontWeight:600 }}>{row[0]}</td>
                      <td style={{ padding:'10px 16px',color:C.green,fontFamily:'JetBrains Mono, monospace' }}>{row[1]}</td>
                      <td style={{ padding:'10px 16px',color:C.yellow,fontFamily:'JetBrains Mono, monospace' }}>{row[2]}</td>
                      <td style={{ padding:'10px 16px',color:C.blue,fontFamily:'JetBrains Mono, monospace' }}>{row[3]}</td>
                      <td style={{ padding:'10px 16px',color:C.muted,fontFamily:'JetBrains Mono, monospace' }}>{row[4]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORY ─────────────────────────────────────────────────────────── */}
      {tab === 'history' && (
        <div>
          {reportHistory.length===0 ? (
            <div style={{ background:C.card,border:'1px solid '+C.border,borderRadius:14,padding:48,textAlign:'center',color:C.muted }}>
              <div style={{ fontSize:36,marginBottom:12 }}>📋</div>
              <div style={{ fontSize:14,color:C.text,marginBottom:8 }}>{L('No reports generated','Aucun rapport généré')}</div>
              <div style={{ fontSize:12 }}>{L('Generated PDFs will appear here with their date and status','Les PDFs générés apparaîtront ici avec leur date et statut')}</div>
            </div>
          ) : (
            <div style={{ background:C.card,border:'1px solid '+C.border,borderRadius:14,overflow:'hidden' }}>
              <div style={{ padding:'14px 20px',borderBottom:'1px solid '+C.border,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace' }}>
                  {L('PDF HISTORY','HISTORIQUE PDF')} — {reportHistory.length} {L('report','rapport')}{reportHistory.length!==1?'s':''}
                </div>
              </div>
              {reportHistory.map((h,i)=>(
                <div key={h.id} style={{ display:'flex',alignItems:'center',gap:16,padding:'14px 20px',borderBottom:i<reportHistory.length-1?'1px solid '+C.border+'30':'none' }}>
                  <div style={{ width:36,height:36,borderRadius:9,background:'rgba(0,255,148,0.1)',border:'1px solid rgba(0,255,148,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0 }}>📄</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13,color:C.text,fontWeight:600 }}>{h.project?.name||'Projet'} — {h.year}</div>
                    <div style={{ fontSize:10,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginTop:2 }}>
                      {h.type} · {h.generatedAt?new Date(h.generatedAt).toLocaleDateString(lang==='fr'?'fr-FR':'en-US'):'—'} · {h.fileSize?Math.round(h.fileSize/1024)+'KB':'—'}
                    </div>
                  </div>
                  <span style={{ fontSize:9,padding:'3px 8px',background:'rgba(0,255,148,0.1)',borderRadius:4,color:C.green,fontFamily:'JetBrains Mono, monospace' }}>{h.status}</span>
                  <button onClick={()=>generatePDF(h.projectId,h.year,h.project?.name,h.project?.countryCode)}
                    style={{ background:C.card2,border:'1px solid '+C.border,borderRadius:8,color:C.text2,padding:'7px 12px',cursor:'pointer',fontSize:11 }}>
                    ↓ {L('Re-download','Re-télécharger')}
                  </button>
                  <button onClick={()=>setConfirmDelete(h)}
                    style={{ background:'rgba(248,113,113,0.06)',border:'1px solid rgba(248,113,113,0.15)',borderRadius:8,color:C.red,padding:'7px 10px',cursor:'pointer',fontSize:11 }}>
                    🗑
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PREVIEW ─────────────────────────────────────────────────────────── */}
      {tab==='preview' && previewData && (
        <div>
          <div style={{ display:'flex',gap:12,alignItems:'center',marginBottom:20 }}>
            <button onClick={()=>setTab('reports')} style={{ background:'transparent',border:'1px solid '+C.border,borderRadius:8,color:C.muted,padding:'8px 14px',cursor:'pointer',fontSize:12 }}>← {T.btnBack}</button>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:9,color:C.green,fontFamily:'JetBrains Mono, monospace',marginBottom:2 }}>{L('MRV PREVIEW — ACM0002 v19.0','APERÇU MRV — ACM0002 v19.0')}</div>
              <div style={{ fontSize:15,fontWeight:700,color:C.text }}>{previewData.project?.name} — {previewData.mrv?.year}</div>
            </div>
            <button onClick={()=>generatePDF(previewData.project?.id,previewData.mrv?.year,previewData.project?.name,previewData.project?.countryCode)}
              style={{ background:'rgba(0,255,148,0.12)',border:'1px solid rgba(0,255,148,0.35)',borderRadius:9,color:C.green,padding:'10px 20px',cursor:'pointer',fontSize:13,fontWeight:800,fontFamily:'Syne, sans-serif' }}>
              📥 {T.btnDownload}
            </button>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20 }}>
            <div style={{ background:C.card,border:'1px solid rgba(0,255,148,0.15)',borderRadius:14,padding:22 }}>
              <div style={{ fontSize:9,color:C.green,fontFamily:'JetBrains Mono, monospace',marginBottom:16,letterSpacing:'0.1em' }}>
                {L('ACM0002 RESULTS','RÉSULTATS ACM0002')}
              </div>
              {[
                { l:L('Gross production','Production brute'),    v:fmtN(previewData.mrv?.grossEnergy)+' MWh',             c:C.blue },
                { l:L('Gross reductions','Réductions brutes'),  v:fmtN(previewData.mrv?.grossReductions)+' tCO₂e',       c:C.green },
                { l:L('Leakage deducted','Leakage déduit'),     v:fmtN(previewData.mrv?.leakage)+' tCO₂e',              c:C.red },
                { l:L('Net credits','Crédits nets'),            v:fmtN(previewData.mrv?.netCarbonCredits)+' tCO₂e',     c:C.green },
                { l:L('Estimated value','Valeur estimée'),      v:fmtUSD((previewData.mrv?.netCarbonCredits||0)*11.04), c:C.yellow },
                { l:L('Grid emission factor','Facteur émission'),v:(previewData.mrv?.gridEmissionFactor||0).toFixed(3)+' tCO₂/MWh', c:C.muted },
                { l:L('Recorded readings','Lectures enregistrées'), v:previewData.readingsCount+' '+L('months','mois'), c:C.muted },
              ].map(item=>(
                <div key={item.l} style={{ display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid '+C.border+'40' }}>
                  <span style={{ fontSize:12,color:C.text2 }}>{item.l}</span>
                  <span style={{ fontSize:13,color:item.c,fontWeight:700,fontFamily:'JetBrains Mono, monospace' }}>{item.v}</span>
                </div>
              ))}
            </div>
            <div style={{ background:C.card,border:'1px solid '+C.border,borderRadius:14,padding:22 }}>
              <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:16,letterSpacing:'0.1em' }}>
                {L('PROJECT DETAILS','DÉTAILS PROJET')}
              </div>
              {[
                { l:L('Name','Nom'),       v:previewData.project?.name },
                { l:L('Type','Type'),      v:previewData.project?.type },
                { l:L('Country','Pays'),   v:(COUNTRY_FLAGS[previewData.project?.countryCode]||'🌍')+' '+previewData.project?.country },
                { l:L('Power','Puissance'),v:(previewData.project?.installedMW||'—')+' MW' },
                { l:L('Methodology','Méthodo.'), v:'ACM0002 v19.0' },
                { l:L('Standards','Standards'),  v:'Verra VCS + Gold Standard' },
                { l:L('MRV Year','Année MRV'),   v:previewData.mrv?.year },
              ].map(item=>(
                <div key={item.l} style={{ display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid '+C.border+'40' }}>
                  <span style={{ fontSize:12,color:C.text2 }}>{item.l}</span>
                  <span style={{ fontSize:12,color:C.text,fontWeight:600,textAlign:'right',maxWidth:'60%',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{item.v||'—'}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background:C.card,border:'1px solid rgba(56,189,248,0.15)',borderRadius:14,padding:22 }}>
            <div style={{ fontSize:9,color:C.blue,fontFamily:'JetBrains Mono, monospace',marginBottom:16,letterSpacing:'0.1em' }}>
              {L('VVB AUDITOR CHECKLIST — VERRA ACM0002','CHECKLIST AUDITEUR VVB — VERRA ACM0002')}
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10 }}>
              {[
                [L('Additionality test','Additionality test'),'✓ '+L('Compliant','Conforme'),L('ACM0002 §3 — renewable project','ACM0002 §3 — projet renouvelable')],
                [L('Baseline scenario','Baseline scenario'),'✓ '+L('Validated','Validé'),L('National grid factor PANGEA','Facteur réseau national PANGEA')],
                [L('Production data','Données production'),'✓ '+L('Complete','Complètes'),previewData.readingsCount+' '+L('monthly readings','lectures mensuelles')],
                [L('Leakage calculation','Calcul leakage'),'✓ '+L('Applied','Appliqué'),L('3% standard deduction','3% déduction standard')],
                [L('Uncertainty','Incertitude'),'✓ '+L('Deducted','Déduite'),L('5% buffer ACM0002 §8.1','5% buffer ACM0002 §8.1')],
                [L('GHG Scope','GHG Scope'),'✓ Scope 2',L('kWh renewable electricity displacement','Déplacements kWh renouvelable')],
              ].map(([title,status,note])=>(
                <div key={title} style={{ padding:'12px 14px',background:'rgba(56,189,248,0.04)',border:'1px solid rgba(56,189,248,0.1)',borderRadius:9 }}>
                  <div style={{ fontSize:12,fontWeight:700,color:C.text,marginBottom:4 }}>{title}</div>
                  <div style={{ fontSize:11,color:C.green,fontWeight:600,marginBottom:3 }}>{status}</div>
                  <div style={{ fontSize:10,color:C.muted }}>{note}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
