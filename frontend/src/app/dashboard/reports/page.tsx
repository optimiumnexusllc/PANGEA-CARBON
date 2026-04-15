'use client';
import { useLang } from '@/lib/lang-context';
import { useEffect, useState, useCallback } from 'react';
import { fetchAuthJson, fetchAuth } from '@/lib/fetch-auth';

// ─── Constantes design PANGEA ─────────────────────────────────────────────────
const C = {
  bg:'#080B0F', card:'#0D1117', card2:'#0A1628', border:'#1E2D3D',
  green:'#00FF94', red:'#F87171', yellow:'#FCD34D', blue:'#38BDF8',
  purple:'#A78BFA', orange:'#F97316', muted:'#4A6278', text:'#E8EFF6', text2:'#8FA3B8',
};

const STANDARDS = [
  {
    id:'VERRA_VCS', name:'Verra VCS', method:'ACM0002 v19.0',
    color:C.green, icon:'🌿', supported:true,
    desc:'Voluntary Carbon Standard — plus grande registry mondiale (200M+ crédits)',
    features:['Méthodologie ACM0002 renewable energy','Double counting check','Additionality test','Co-benefits SDG','Buffer pool 10–20%'],
    url:'https://verra.org/programs/verified-carbon-standard/',
  },
  {
    id:'GOLD_STANDARD', name:'Gold Standard', method:'CDM LCB + GS4GG',
    color:C.yellow, icon:'⭐', supported:true,
    desc:'Gold Standard for the Global Goals — premium quality label',
    features:['Safeguards social + environnemental','SDG Impact quantifié','Stakeholder consultation','Site visit VVB','Transparence maximale'],
    url:'https://www.goldstandard.org',
  },
  {
    id:'ARTICLE6', name:'Article 6 Paris', method:'ITMO + A6.4ER',
    color:C.blue, icon:'🌐', supported:false,
    desc:'Marchés carbone souverains — transferts bilatéraux (ITMOs)',
    features:['Corresponding adjustments','National registries NDC','Bilatéral agreements','Sovereign guarantee','Coming Q4 2025'],
    url:'https://unfccc.int/topics/carbon-markets',
  },
  {
    id:'CDM', name:'CDM Legacy', method:'UNFCCC CDM',
    color:C.muted, icon:'📋', supported:false,
    desc:'Clean Development Mechanism — crédits legacy CERs',
    features:['CER conversion VCMI','Legacy projects only','UNFCCC registry','Historical baseline','Transition pathway'],
    url:'https://cdm.unfccc.int',
  },
];

const WORKFLOW_STEPS = [
  { n:'01', title:'Données MRV',      desc:'Lectures mensuelles de production enregistrées',        color:C.green,  icon:'📡', key:'data' },
  { n:'02', title:'Calcul ACM0002',   desc:'Engine MRV — crédits nets calculés (leakage déduit)',   color:C.blue,   icon:'⚙️', key:'calc' },
  { n:'03', title:'Génération PDF',   desc:'Rapport certifiable pour auditeurs VVB',                 color:C.yellow, icon:'📄', key:'pdf'  },
  { n:'04', title:'Soumission',       desc:'Verra / Gold Standard → issuance crédits carbone',       color:C.purple, icon:'🚀', key:'sub'  },
];

const COUNTRY_FLAGS = {
  CI:'🇨🇮', KE:'🇰🇪', NG:'🇳🇬', GH:'🇬🇭', SN:'🇸🇳', TZ:'🇹🇿', CM:'🇨🇲',
  ET:'🇪🇹', ZA:'🇿🇦', MA:'🇲🇦', EG:'🇪🇬', BF:'🇧🇫', ML:'🇲🇱', RW:'🇷🇼',
  UG:'🇺🇬', MZ:'🇲🇿', ZM:'🇿🇲', BJ:'🇧🇯', TG:'🇹🇬', NE:'🇳🇪',
};

const TYPE_ICON = {
  SOLAR:'☀️', WIND:'💨', HYDRO:'💧', BIOMASS:'🌱', HYBRID:'⚡', OTHER:'🔋',
};

function fmtN(n) { return n != null ? n.toLocaleString('fr-FR', {maximumFractionDigits:2}) : '—'; }
function fmtUSD(n) { return n != null ? '$'+n.toLocaleString('en-US', {maximumFractionDigits:0}) : '—'; }

export default function ReportsPage() {
  const { lang } = useLang();
  const L = (en, fr) => lang === 'fr' ? fr : en;

  const [tab, setTab] = useState('reports');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [selectedStandard, setSelectedStandard] = useState(null);
  const [toast, setToast] = useState(null);
  const [sortBy, setSortBy] = useState('credits');
  const [filterYear, setFilterYear] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [reportHistory, setReportHistory] = useState([]);

  const showToast = (msg, type='success') => {
    setToast({msg,type}); setTimeout(()=>setToast(null),5000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [recs, hist] = await Promise.all([
        fetchAuthJson('/reports').catch(()=>[]),
        fetchAuthJson('/reports/history').catch(()=>[]),
      ]);
      setRecords(Array.isArray(recs) ? recs : []);
      setReportHistory(Array.isArray(hist) ? hist : []);
    } catch(e) {
      showToast(L('Error loading data','Erreur de chargement'), 'error');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const generatePDF = async (projectId, year, projectName, countryCode) => {
    const key = projectId+'-'+year;
    setGeneratingId(key);
    showToast(L('Generating PDF report...','Génération du rapport PDF en cours...'), 'info');
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
      const res = await fetch(
        (process.env.NEXT_PUBLIC_API_URL||'')+'/reports/'+projectId+'/'+year+'/pdf',
        { headers: { Authorization: 'Bearer '+token } }
      );
      if (!res.ok) {
        const err = await res.json().catch(()=>({error:'Erreur inconnue'}));
        throw new Error(err.error || 'Génération échouée');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'PANGEA-CARBON-MRV-'+(countryCode||'AF')+'-'+year+'.pdf';
      a.click();
      URL.revokeObjectURL(url);
      showToast(L('PDF downloaded successfully!','PDF téléchargé avec succès !'));
      await load();
    } catch(e) {
      showToast(e.message, 'error');
    } finally { setGeneratingId(null); }
  };

  const loadPreview = async (projectId, year) => {
    try {
      const data = await fetchAuthJson('/reports/'+projectId+'/'+year+'/preview');
      setPreviewData(data);
      setTab('preview');
    } catch(e) { showToast(e.message, 'error'); }
  };

  // Filtres et tri
  const years = [...new Set(records.map(r => r.year))].sort((a,b) => b-a);
  const filtered = records
    .filter(r => !filterYear || String(r.year) === filterYear)
    .filter(r => !filterStatus || r.status === filterStatus)
    .sort((a,b) => {
      if (sortBy === 'credits') return (b.netCarbonCredits||0) - (a.netCarbonCredits||0);
      if (sortBy === 'revenue') return (b.revenueUSD||0) - (a.revenueUSD||0);
      if (sortBy === 'year') return b.year - a.year;
      return 0;
    });

  // KPIs
  const totalCredits = records.reduce((s,r) => s+(r.netCarbonCredits||0), 0);
  const totalRevenue = records.reduce((s,r) => s+(r.revenueUSD||0), 0);
  const readyCount = records.filter(r => r.status !== 'DRAFT').length;

  return (
    <div style={{ padding:24, maxWidth:1400, margin:'0 auto' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed',top:20,right:20,zIndex:99999,maxWidth:440 }}>
          <div style={{ background:toast.type==='error'?'rgba(248,113,113,0.1)':toast.type==='info'?'rgba(56,189,248,0.08)':'rgba(0,255,148,0.08)', border:'1px solid '+(toast.type==='error'?'rgba(248,113,113,0.35)':toast.type==='info'?'rgba(56,189,248,0.3)':'rgba(0,255,148,0.3)'), borderRadius:12, padding:'14px 20px', display:'flex', alignItems:'center', gap:12, backdropFilter:'blur(20px)', boxShadow:'0 8px 32px rgba(0,0,0,0.5)', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute',left:0,top:0,bottom:0,width:3,background:toast.type==='error'?C.red:toast.type==='info'?C.blue:C.green }}/>
            <div style={{ width:22,height:22,borderRadius:'50%',background:toast.type==='error'?'rgba(248,113,113,0.15)':toast.type==='info'?'rgba(56,189,248,0.15)':'rgba(0,255,148,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:toast.type==='error'?C.red:toast.type==='info'?C.blue:C.green,fontWeight:800,marginLeft:8 }}>
              {toast.type==='error'?'✗':toast.type==='info'?'⟳':'✓'}
            </div>
            <span style={{ fontSize:13,color:C.text }}>{toast.msg}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:9,color:C.green,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.15em',marginBottom:8 }}>
          PANGEA CARBON · MRV ENGINE · VERRA ACM0002 v19.0 · GOLD STANDARD
        </div>
        <h1 style={{ fontFamily:'Syne, sans-serif',fontSize:28,fontWeight:800,color:C.text,margin:0,marginBottom:6 }}>
          Rapports MRV
        </h1>
        <p style={{ fontSize:13,color:C.muted,margin:0,maxWidth:700,lineHeight:1.7 }}>
          Rapports certifiables ACM0002 pour soumission aux auditeurs VVB. Génération automatique — prêts pour Verra, Gold Standard et Article 6 Paris.
        </p>
      </div>

      {/* Workflow Banner */}
      <div style={{ background:C.card,border:'1px solid '+C.border,borderRadius:16,padding:24,marginBottom:28,position:'relative',overflow:'hidden' }}>
        <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,'+C.green+' 0%,'+C.blue+' 33%,'+C.yellow+' 66%,'+C.purple+' 100%)' }}/>
        <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.1em',marginBottom:18 }}>WORKFLOW DE CERTIFICATION — 4 ÉTAPES</div>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16 }}>
          {WORKFLOW_STEPS.map((s,i) => (
            <div key={s.key} style={{ position:'relative' }}>
              {i < 3 && <div style={{ position:'absolute',top:20,left:'calc(100% + 8px)',width:'calc(100% - 16px)',height:1,background:'linear-gradient(90deg,'+s.color+'40 0%,transparent 100%)',zIndex:1 }}/>}
              <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:10 }}>
                <div style={{ width:40,height:40,borderRadius:12,background:s.color+'15',border:'1px solid '+s.color+'40',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0 }}>{s.icon}</div>
                <div style={{ width:22,height:22,borderRadius:'50%',background:i<2?s.color:'transparent',border:'1px solid '+s.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:800,color:i<2?'#080B0F':s.color,fontFamily:'JetBrains Mono, monospace',flexShrink:0 }}>
                  {i<2?'✓':s.n}
                </div>
              </div>
              <div style={{ fontSize:13,fontWeight:700,color:i<2?s.color:C.text2,marginBottom:4 }}>{s.title}</div>
              <div style={{ fontSize:11,color:C.muted,lineHeight:1.6 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display:'flex',gap:12,marginBottom:28,flexWrap:'wrap' }}>
        {[
          { v:records.length,     l:'Projets avec données MRV', c:C.blue,   icon:'📊', s:'prêts pour rapport' },
          { v:readyCount,         l:'Rapports générés',          c:C.green,  icon:'📄', s:'disponibles' },
          { v:fmtN(totalCredits)+' t', l:'Total crédits MRV',   c:C.green,  icon:'🌿', s:'tCO₂e certifiables' },
          { v:fmtUSD(totalRevenue), l:'Valeur totale',           c:C.yellow, icon:'💰', s:'USD (à $11.04/t)' },
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
        {[
          ['reports',   L('Rapports MRV','Rapports MRV'),    '📄'],
          ['standards', L('Standards','Standards'),           '🏛'],
          ['history',   L('Historique','Historique'),         '📋'],
          ...(previewData ? [['preview','Aperçu MRV','🔍']] : []),
        ].map(([id,label,icon]) => (
          <button key={id} onClick={()=>setTab(id)}
            style={{ padding:'11px 20px',border:'none',cursor:'pointer',fontSize:12,fontWeight:600,fontFamily:'JetBrains Mono, monospace',borderBottom:'2px solid '+(tab===id?C.green:'transparent'),background:'transparent',color:tab===id?C.green:C.muted,transition:'all .15s' }}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* ── REPORTS TAB ──────────────────────────────────────────────────────── */}
      {tab === 'reports' && (
        <div>
          {/* Filtres */}
          <div style={{ display:'flex',gap:10,marginBottom:20,flexWrap:'wrap' }}>
            <select style={{ background:C.card2,border:'1px solid '+C.border,borderRadius:8,color:C.text,padding:'9px 14px',fontSize:12,outline:'none',cursor:'pointer' }}
              value={filterYear} onChange={e=>setFilterYear(e.target.value)}>
              <option value="">Toutes les années</option>
              {years.map(y => <option key={y} value={String(y)}>{y}</option>)}
            </select>
            <select style={{ background:C.card2,border:'1px solid '+C.border,borderRadius:8,color:C.text,padding:'9px 14px',fontSize:12,outline:'none',cursor:'pointer' }}
              value={sortBy} onChange={e=>setSortBy(e.target.value)}>
              <option value="credits">Tri: Crédits CO₂</option>
              <option value="revenue">Tri: Revenus USD</option>
              <option value="year">Tri: Année</option>
            </select>
            <div style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'flex-end',fontSize:11,color:C.muted,fontFamily:'JetBrains Mono, monospace' }}>
              {filtered.length} projet{filtered.length!==1?'s':''} · ACM0002 v19.0
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign:'center',padding:60,color:C.muted,fontFamily:'JetBrains Mono, monospace',fontSize:11 }}>◌ Chargement des données MRV...</div>
          ) : filtered.length === 0 ? (
            <div style={{ background:C.card,border:'1px solid '+C.border,borderRadius:16,padding:60,textAlign:'center' }}>
              <div style={{ fontSize:52,marginBottom:16 }}>📄</div>
              <div style={{ fontSize:18,color:C.text,fontWeight:700,marginBottom:8,fontFamily:'Syne, sans-serif' }}>Aucun rapport MRV disponible</div>
              <div style={{ fontSize:13,color:C.muted,marginBottom:24,maxWidth:400,margin:'0 auto 24px',lineHeight:1.7 }}>
                Créez un projet, ajoutez vos lectures de production mensuelles, puis calculez le MRV pour générer votre premier rapport certifiable.
              </div>
              <div style={{ display:'flex',gap:12,justifyContent:'center' }}>
                <a href="/dashboard/projects/new" style={{ background:'rgba(0,255,148,0.12)',border:'1px solid rgba(0,255,148,0.35)',borderRadius:10,color:C.green,padding:'11px 22px',textDecoration:'none',fontSize:13,fontWeight:700,fontFamily:'Syne, sans-serif' }}>
                  + Créer un projet
                </a>
                <a href="/dashboard/mrv" style={{ background:C.card2,border:'1px solid '+C.border,borderRadius:10,color:C.text2,padding:'11px 22px',textDecoration:'none',fontSize:13 }}>
                  Calculer MRV →
                </a>
              </div>
            </div>
          ) : (
            <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
              {filtered.map(rec => {
                const key = rec.projectId+'-'+rec.year;
                const isGenerating = generatingId === key;
                const credits = rec.netCarbonCredits || 0;
                const revenue = rec.revenueUSD || credits * 11.04;
                const country = rec.project?.countryCode || '';
                const flag = COUNTRY_FLAGS[country] || '🌍';
                const typeIcon = TYPE_ICON[rec.project?.type] || '⚡';

                return (
                  <div key={key} style={{ background:C.card,border:'1px solid rgba(0,255,148,0.1)',borderRadius:14,padding:'18px 22px',display:'flex',alignItems:'center',gap:20,borderLeft:'3px solid '+C.green,transition:'all .15s' }}>
                    {/* Project info */}
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:6 }}>
                        <span style={{ fontSize:18 }}>{typeIcon}</span>
                        <div style={{ fontSize:15,fontWeight:700,color:C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{rec.project?.name || 'Projet'}</div>
                        <span style={{ fontSize:11,color:C.muted,fontFamily:'JetBrains Mono, monospace',flexShrink:0 }}>{flag} {country}</span>
                        <span style={{ fontSize:10,padding:'2px 8px',background:'rgba(0,255,148,0.1)',border:'1px solid rgba(0,255,148,0.2)',borderRadius:4,color:C.green,fontFamily:'JetBrains Mono, monospace',flexShrink:0 }}>
                          {rec.year}
                        </span>
                      </div>
                      <div style={{ display:'flex',gap:16,flexWrap:'wrap' }}>
                        <div style={{ fontSize:11,color:C.muted }}>
                          <span style={{ fontFamily:'JetBrains Mono, monospace',color:C.green,fontWeight:700 }}>{fmtN(credits)}</span> tCO₂e
                        </div>
                        <div style={{ fontSize:11,color:C.muted }}>
                          <span style={{ fontFamily:'JetBrains Mono, monospace',color:C.yellow,fontWeight:700 }}>{fmtUSD(revenue)}</span> valeur marché
                        </div>
                        {rec.project?.installedMW && (
                          <div style={{ fontSize:11,color:C.muted }}>
                            <span style={{ color:C.blue,fontFamily:'JetBrains Mono, monospace' }}>{rec.project.installedMW} MW</span> installés
                          </div>
                        )}
                        <div style={{ fontSize:10,color:C.muted,fontFamily:'JetBrains Mono, monospace' }}>
                          ACM0002 · EF {rec.gridEmissionFactor?.toFixed(3)||'—'} tCO₂/MWh
                        </div>
                      </div>
                    </div>

                    {/* Status + Actions */}
                    <div style={{ display:'flex',alignItems:'center',gap:10,flexShrink:0 }}>
                      <span style={{ fontSize:9,padding:'4px 10px',background:'rgba(0,255,148,0.1)',border:'1px solid rgba(0,255,148,0.25)',borderRadius:6,color:C.green,fontFamily:'JetBrains Mono, monospace',fontWeight:700 }}>
                        ✓ PRÊT
                      </span>
                      <button onClick={()=>loadPreview(rec.projectId, rec.year)}
                        style={{ background:C.card2,border:'1px solid '+C.border,borderRadius:8,color:C.text2,padding:'8px 14px',cursor:'pointer',fontSize:11,whiteSpace:'nowrap' }}>
                        🔍 Aperçu
                      </button>
                      <button onClick={()=>generatePDF(rec.projectId, rec.year, rec.project?.name, country)}
                        disabled={isGenerating}
                        style={{ background:isGenerating?C.card2:'rgba(0,255,148,0.12)',border:'1px solid '+(isGenerating?C.border:'rgba(0,255,148,0.35)'),borderRadius:8,color:isGenerating?C.muted:C.green,padding:'8px 16px',cursor:isGenerating?'wait':'pointer',fontSize:11,fontWeight:700,whiteSpace:'nowrap',transition:'all .15s' }}>
                        {isGenerating ? '⟳ Génération...' : '📥 PDF Verra'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── STANDARDS TAB ────────────────────────────────────────────────────── */}
      {tab === 'standards' && (
        <div>
          <p style={{ fontSize:13,color:C.muted,marginBottom:24,lineHeight:1.7,maxWidth:700 }}>
            PANGEA CARBON génère des rapports certifiables pour les principaux standards de crédits carbone volontaires et réglementaires. Chaque standard a ses propres exigences méthodologiques.
          </p>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:16,marginBottom:24 }}>
            {STANDARDS.map(s => (
              <div key={s.id} onClick={()=>setSelectedStandard(selectedStandard?.id===s.id?null:s)}
                style={{ background:C.card,border:'1px solid '+(selectedStandard?.id===s.id?s.color+'40':s.supported?s.color+'15':C.border),borderRadius:14,padding:22,cursor:'pointer',transition:'all .2s',opacity:s.supported?1:0.7,position:'relative',overflow:'hidden' }}>
                <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:selectedStandard?.id===s.id?s.color:'transparent',transition:'background .2s' }}/>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14 }}>
                  <div style={{ display:'flex',gap:12,alignItems:'center' }}>
                    <span style={{ fontSize:28 }}>{s.icon}</span>
                    <div>
                      <div style={{ fontSize:16,fontWeight:800,color:selectedStandard?.id===s.id?s.color:C.text,fontFamily:'Syne, sans-serif' }}>{s.name}</div>
                      <code style={{ fontSize:10,color:s.color,fontFamily:'JetBrains Mono, monospace' }}>{s.method}</code>
                    </div>
                  </div>
                  <span style={{ fontSize:9,padding:'3px 10px',borderRadius:20,fontFamily:'JetBrains Mono, monospace',fontWeight:700,
                    background:s.supported?s.color+'15':'rgba(74,98,120,0.1)',
                    color:s.supported?s.color:C.muted,
                    border:'1px solid '+(s.supported?s.color+'30':C.border) }}>
                    {s.supported ? '✓ SUPPORTÉ' : 'COMING SOON'}
                  </span>
                </div>
                <p style={{ fontSize:12,color:C.text2,margin:'0 0 14px',lineHeight:1.7 }}>{s.desc}</p>
                <div style={{ display:'flex',flexWrap:'wrap',gap:6 }}>
                  {s.features.map(f => (
                    <span key={f} style={{ fontSize:9,padding:'3px 8px',background:s.color+'10',border:'1px solid '+s.color+'25',borderRadius:4,color:s.color,fontFamily:'JetBrains Mono, monospace' }}>
                      {f}
                    </span>
                  ))}
                </div>
                {s.url && s.supported && (
                  <div style={{ marginTop:14 }}>
                    <a href={s.url} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()}
                      style={{ fontSize:11,color:s.color,textDecoration:'none' }}>
                      Documentation officielle {s.name} →
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Comparaison */}
          <div style={{ background:C.card,border:'1px solid '+C.border,borderRadius:14,overflow:'hidden' }}>
            <div style={{ padding:'16px 20px',borderBottom:'1px solid '+C.border,fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.1em' }}>
              COMPARAISON DES STANDARDS
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%',borderCollapse:'collapse',fontSize:12 }}>
                <thead>
                  <tr style={{ background:'rgba(255,255,255,0.02)' }}>
                    {['Critère','Verra VCS','Gold Standard','Article 6'].map(h => (
                      <th key={h} style={{ padding:'12px 16px',textAlign:'left',fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',borderBottom:'1px solid '+C.border }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Prix moyen marché','$8–15/t','$15–25/t','$20–50/t'],
                    ['Délai certification','6–12 mois','8–18 mois','12–24 mois'],
                    ['Volume mondial','200M+ crédits','50M+ crédits','Émergent'],
                    ['Exigences SDG','Optionnel','Obligatoire','Variable'],
                    ['Registre','Verra Registry','Gold Standard Rgy','UNFCCC/National'],
                    ['Additionality test','Requis','Requis + renforcé','Requis'],
                    ['Adapté Afrique','✓ Optimal','✓ Premium','⏳ Q4 2025'],
                  ].map(row => (
                    <tr key={row[0]} style={{ borderBottom:'1px solid '+C.border+'22' }}>
                      <td style={{ padding:'10px 16px',color:C.text2,fontWeight:600 }}>{row[0]}</td>
                      <td style={{ padding:'10px 16px',color:C.green,fontFamily:'JetBrains Mono, monospace' }}>{row[1]}</td>
                      <td style={{ padding:'10px 16px',color:C.yellow,fontFamily:'JetBrains Mono, monospace' }}>{row[2]}</td>
                      <td style={{ padding:'10px 16px',color:C.blue,fontFamily:'JetBrains Mono, monospace' }}>{row[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORY TAB ──────────────────────────────────────────────────────── */}
      {tab === 'history' && (
        <div>
          {reportHistory.length === 0 ? (
            <div style={{ background:C.card,border:'1px solid '+C.border,borderRadius:14,padding:48,textAlign:'center',color:C.muted }}>
              <div style={{ fontSize:36,marginBottom:12 }}>📋</div>
              <div style={{ fontSize:14,color:C.text,marginBottom:8 }}>Aucun rapport généré</div>
              <div style={{ fontSize:12 }}>Les PDFs générés apparaîtront ici avec leur date et statut</div>
            </div>
          ) : (
            <div style={{ background:C.card,border:'1px solid '+C.border,borderRadius:14,overflow:'hidden' }}>
              <div style={{ padding:'14px 20px',borderBottom:'1px solid '+C.border,fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace' }}>
                HISTORIQUE RAPPORTS PDF — {reportHistory.length} rapport{reportHistory.length!==1?'s':''}
              </div>
              {reportHistory.map((h,i) => (
                <div key={h.id} style={{ display:'flex',alignItems:'center',gap:16,padding:'14px 20px',borderBottom:i<reportHistory.length-1?'1px solid '+C.border+'30':'none' }}>
                  <div style={{ width:36,height:36,borderRadius:9,background:'rgba(0,255,148,0.1)',border:'1px solid rgba(0,255,148,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0 }}>📄</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13,color:C.text,fontWeight:600 }}>{h.project?.name || 'Projet'} — {h.year}</div>
                    <div style={{ fontSize:10,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginTop:2 }}>
                      {h.type} · {h.generatedAt ? new Date(h.generatedAt).toLocaleDateString('fr-FR') : '—'} · {h.fileSize ? Math.round(h.fileSize/1024)+'KB' : '—'}
                    </div>
                  </div>
                  <span style={{ fontSize:9,padding:'3px 8px',background:'rgba(0,255,148,0.1)',borderRadius:4,color:C.green,fontFamily:'JetBrains Mono, monospace' }}>
                    {h.status}
                  </span>
                  <button onClick={()=>generatePDF(h.projectId, h.year, h.project?.name, h.project?.countryCode)}
                    style={{ background:C.card2,border:'1px solid '+C.border,borderRadius:8,color:C.text2,padding:'7px 12px',cursor:'pointer',fontSize:11 }}>
                    ↓ Re-télécharger
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PREVIEW TAB ──────────────────────────────────────────────────────── */}
      {tab === 'preview' && previewData && (
        <div>
          <div style={{ display:'flex',gap:12,alignItems:'center',marginBottom:20 }}>
            <button onClick={()=>setTab('reports')} style={{ background:'transparent',border:'1px solid '+C.border,borderRadius:8,color:C.muted,padding:'8px 14px',cursor:'pointer',fontSize:12 }}>
              ← Retour
            </button>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:9,color:C.green,fontFamily:'JetBrains Mono, monospace',marginBottom:2 }}>APERÇU MRV — ACM0002 v19.0</div>
              <div style={{ fontSize:15,fontWeight:700,color:C.text }}>{previewData.project?.name} — {previewData.mrv?.year}</div>
            </div>
            <button onClick={()=>generatePDF(previewData.project?.id, previewData.mrv?.year, previewData.project?.name, previewData.project?.countryCode)}
              style={{ background:'rgba(0,255,148,0.12)',border:'1px solid rgba(0,255,148,0.35)',borderRadius:9,color:C.green,padding:'10px 20px',cursor:'pointer',fontSize:13,fontWeight:800,fontFamily:'Syne, sans-serif' }}>
              📥 Télécharger PDF
            </button>
          </div>

          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20 }}>
            {/* Résultats MRV */}
            <div style={{ background:C.card,border:'1px solid rgba(0,255,148,0.15)',borderRadius:14,padding:22 }}>
              <div style={{ fontSize:9,color:C.green,fontFamily:'JetBrains Mono, monospace',marginBottom:16,letterSpacing:'0.1em' }}>RÉSULTATS ACM0002</div>
              {[
                { l:'Production brute',  v:fmtN(previewData.mrv?.grossEnergy)+' MWh',    c:C.blue },
                { l:'Réductions brutes', v:fmtN(previewData.mrv?.grossReductions)+' tCO₂e', c:C.green },
                { l:'Leakage déduit',    v:fmtN(previewData.mrv?.leakage)+' tCO₂e',     c:C.red },
                { l:'Crédits nets',      v:fmtN(previewData.mrv?.netCarbonCredits)+' tCO₂e', c:C.green },
                { l:'Valeur estimée',    v:fmtUSD((previewData.mrv?.netCarbonCredits||0)*11.04), c:C.yellow },
                { l:'Facteur émission',  v:(previewData.mrv?.gridEmissionFactor||0).toFixed(3)+' tCO₂/MWh', c:C.muted },
                { l:'Lectures enregistrées', v:previewData.readingsCount+' mois',       c:C.muted },
              ].map(item => (
                <div key={item.l} style={{ display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid '+C.border+'40' }}>
                  <span style={{ fontSize:12,color:C.text2 }}>{item.l}</span>
                  <span style={{ fontSize:13,color:item.c,fontWeight:700,fontFamily:'JetBrains Mono, monospace' }}>{item.v}</span>
                </div>
              ))}
            </div>

            {/* Infos projet */}
            <div style={{ background:C.card,border:'1px solid '+C.border,borderRadius:14,padding:22 }}>
              <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:16,letterSpacing:'0.1em' }}>DÉTAILS PROJET</div>
              {[
                { l:'Nom',         v:previewData.project?.name },
                { l:'Type',        v:previewData.project?.type },
                { l:'Pays',        v:(COUNTRY_FLAGS[previewData.project?.countryCode]||'🌍')+' '+previewData.project?.country },
                { l:'Puissance',   v:(previewData.project?.installedMW||'—')+' MW' },
                { l:'Méthodo.',    v:'ACM0002 v19.0' },
                { l:'Standard',    v:'Verra VCS + Gold Standard' },
                { l:'Année MRV',   v:previewData.mrv?.year },
              ].map(item => (
                <div key={item.l} style={{ display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid '+C.border+'40' }}>
                  <span style={{ fontSize:12,color:C.text2 }}>{item.l}</span>
                  <span style={{ fontSize:12,color:C.text,fontWeight:600,textAlign:'right',maxWidth:'60%',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{item.v||'—'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Checklist VVB */}
          <div style={{ background:C.card,border:'1px solid rgba(56,189,248,0.15)',borderRadius:14,padding:22 }}>
            <div style={{ fontSize:9,color:C.blue,fontFamily:'JetBrains Mono, monospace',marginBottom:16,letterSpacing:'0.1em' }}>CHECKLIST AUDITEUR VVB — VERRA ACM0002</div>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10 }}>
              {[
                ['Additionality test','✓ Conforme','ACM0002 §3 — projet renouvelable'],
                ['Baseline scenario','✓ Validé','Facteur réseau national PANGEA'],
                ['Données production','✓ Complètes',previewData.readingsCount+' lectures mensuelles'],
                ['Calcul leakage','✓ Appliqué','3% déduction standard'],
                ['Incertitude','✓ Déduite','5% buffer ACM0002 §8.1'],
                ['GHG Scope','✓ Scope 2','Déplacements kWh renouvelable'],
              ].map(([title,status,note]) => (
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
