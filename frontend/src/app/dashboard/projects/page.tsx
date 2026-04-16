'use client';
import { UpgradeModal } from '@/components/PlanGate';
import { useLang } from '@/lib/lang-context';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';

const C = {
  bg:'#080B0F', card:'#0D1117', card2:'#121920', border:'#1E2D3D',
  green:'#00FF94', red:'#F87171', yellow:'#FCD34D', blue:'#38BDF8',
  purple:'#A78BFA', muted:'#4A6278', text:'#E8EFF6', text2:'#8FA3B8',
};
const TYPE_COLORS = { SOLAR:'#FCD34D', WIND:'#38BDF8', HYDRO:'#00FF94', BIOMASS:'#F87171', HYBRID:'#A78BFA' };
const TYPE_ICONS  = { SOLAR:'☀️', WIND:'💨', HYDRO:'💧', BIOMASS:'🌿', HYBRID:'⚡' };
const STATUS_COLOR = { DRAFT:C.muted, ACTIVE:C.green, MONITORING:C.yellow, VERIFIED:C.blue, CREDITED:C.green, ARCHIVED:C.muted };
const STATUS_LABEL = { DRAFT:{en:'Draft',fr:'Brouillon'}, ACTIVE:{en:'Active',fr:'Actif'}, MONITORING:{en:'Monitoring',fr:'Surveillance'}, VERIFIED:{en:'Verified',fr:'Vérifié'}, CREDITED:{en:'Credited',fr:'Crédité'}, ARCHIVED:{en:'Archived',fr:'Archivé'} };

const fmt = (n, d=0) => n?.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d}) ?? '—';
const inp = { background:C.card2, border:'1px solid '+C.border, borderRadius:8, color:C.text, padding:'10px 13px', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box' };

export default function ProjectsPage() {
  const { lang } = useLang();
  const L = (en, fr) => lang === 'fr' ? fr : en;

  const [projects, setProjects] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [view, setView] = useState('grid');
  const [editProject, setEditProject] = useState(null);
  const [deleteProject, setDeleteProject] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),4500); };

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterType) params.type = filterType;
      if (filterStatus) params.status = filterStatus;
      const data = await api.getProjects(params);
      setProjects(data.projects || []);
      setTotal(data.total || 0);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filterType, filterStatus]);

  const deleteProj = async () => {
    if (!deleteProject) return;
    setDeleting(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL||'')+'/projects/'+deleteProject.id, {
        method:'DELETE', headers:{ Authorization:'Bearer '+token }
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      setProjects(prev => prev.filter(p => p.id !== deleteProject.id));
      setDeleteProject(null);
      showToast((lang==='fr'?'Projet supprimé : ':'Project deleted: ')+deleteProject.name);
    } catch(e) { showToast(e.message||'Error','error'); }
    finally { setDeleting(false); }
  };

  const saveEdit = async () => {
    if (!editProject) return;
    setSaving(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL||'')+'/projects/'+editProject.id, {
        method:'PUT',
        headers:{ 'Content-Type':'application/json', Authorization:'Bearer '+token },
        body:JSON.stringify({ name:editProject.name, type:editProject.type, status:editProject.status, description:editProject.description, installedMW:parseFloat(editProject.installedMW)||0, latitude:editProject.latitude?parseFloat(editProject.latitude):null, longitude:editProject.longitude?parseFloat(editProject.longitude):null })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      setProjects(prev => prev.map(p => p.id === editProject.id ? {...p,...editProject} : p));
      setEditProject(null);
      showToast(lang==='fr'?'Projet mis à jour !':'Project updated!');
    } catch(e) { showToast(e.message||'Error','error'); }
    finally { setSaving(false); }
  };

  const filtered = projects.filter(p =>
    (!search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.country||'').toLowerCase().includes(search.toLowerCase())) &&
    (!filterType || p.type === filterType) &&
    (!filterStatus || p.status === filterStatus)
  );

  return (
    <div style={{ padding:24, maxWidth:1500, margin:'0 auto' }}>

      {/* ── TOAST PANGEA ─────────────────────────────────────────────── */}
      {toast && (
        <div style={{ position:'fixed',top:24,right:24,zIndex:99999,maxWidth:420,minWidth:280 }}>
          <div style={{ background:toast.type==='error'?'rgba(248,113,113,0.07)':'rgba(0,255,148,0.07)', border:'1px solid '+(toast.type==='error'?'rgba(248,113,113,0.35)':'rgba(0,255,148,0.3)'), borderRadius:14, padding:'14px 18px', display:'flex', alignItems:'center', gap:12, backdropFilter:'blur(20px)', boxShadow:'0 8px 40px rgba(0,0,0,0.6)', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute',left:0,top:0,bottom:0,width:3,borderRadius:'14px 0 0 14px',background:toast.type==='error'?C.red:C.green }}/>
            <div style={{ width:24,height:24,borderRadius:'50%',background:(toast.type==='error'?C.red:C.green)+'18',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:toast.type==='error'?C.red:C.green,fontWeight:800,marginLeft:6 }}>
              {toast.type==='error'?'✗':'✓'}
            </div>
            <span style={{ fontSize:13,color:C.text,flex:1 }}>{toast.msg}</span>
            <button onClick={()=>setToast(null)} style={{ background:'transparent',border:'none',color:C.muted,cursor:'pointer',fontSize:16 }}>×</button>
          </div>
        </div>
      )}

      {/* ── MODAL DELETE ─────────────────────────────────────────────── */}
      {deleteProject && (
        <div onClick={e=>{if(e.target===e.currentTarget)setDeleteProject(null);}}
          style={{ position:'fixed',inset:0,background:'rgba(8,11,15,0.9)',backdropFilter:'blur(12px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10001,padding:16 }}>
          <div style={{ background:C.card,border:'1px solid rgba(248,113,113,0.35)',borderRadius:18,padding:28,maxWidth:460,width:'100%',boxShadow:'0 32px 80px rgba(0,0,0,0.8)',position:'relative',overflow:'hidden' }}>
            <div style={{ position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,#F87171 0%,rgba(248,113,113,0.3) 70%,transparent 100%)' }}/>
            <div style={{ display:'flex',gap:14,alignItems:'center',marginBottom:16 }}>
              <div style={{ width:52,height:52,borderRadius:13,background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0 }}>🗑</div>
              <div>
                <div style={{ fontSize:9,color:C.red,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.13em',marginBottom:4 }}>PANGEA CARBON · MRV · {lang==='fr'?'SUPPRESSION':'DELETE'}</div>
                <h2 style={{ fontFamily:'Syne, sans-serif',fontSize:17,fontWeight:800,color:C.red,margin:0 }}>
                  {lang==='fr'?'Supprimer ce projet ?':'Delete this project?'}
                </h2>
              </div>
            </div>
            <div style={{ height:1,background:'linear-gradient(90deg,rgba(248,113,113,0.3) 0%,transparent 100%)',marginBottom:20 }}/>
            <div style={{ background:'rgba(248,113,113,0.05)',border:'1px solid rgba(248,113,113,0.15)',borderRadius:10,padding:'14px 16px',marginBottom:20 }}>
              <div style={{ fontSize:14,color:C.text,fontWeight:700,marginBottom:6 }}>{deleteProject.name}</div>
              <div style={{ fontSize:11,color:C.text2,fontFamily:'JetBrains Mono, monospace',marginBottom:8 }}>
                {TYPE_ICONS[deleteProject.type]} {deleteProject.type} · {deleteProject.installedMW} MW · {deleteProject.country}
              </div>
              <p style={{ fontSize:12,color:C.text2,margin:0,lineHeight:1.7 }}>
                {lang==='fr'
                  ?'Toutes les lectures MRV, crédits carbone et rapports associés seront définitivement supprimés. Cette action est irréversible.'
                  :'All MRV readings, carbon credits and reports will be permanently deleted. This action cannot be undone.'}
              </p>
            </div>
            <div style={{ display:'flex',gap:10 }}>
              <button onClick={()=>setDeleteProject(null)} style={{ flex:1,background:'transparent',border:'1px solid '+C.border,borderRadius:9,color:C.muted,padding:12,cursor:'pointer',fontSize:13 }}>
                {lang==='fr'?'Annuler':'Cancel'}
              </button>
              <button onClick={deleteProj} disabled={deleting} style={{ flex:1,background:'rgba(248,113,113,0.12)',border:'1px solid rgba(248,113,113,0.4)',borderRadius:9,color:C.red,padding:12,fontWeight:800,cursor:deleting?'wait':'pointer',fontSize:13,fontFamily:'Syne, sans-serif' }}>
                {deleting?'⟳ '+(lang==='fr'?'Suppression...':'Deleting...'):'🗑 '+(lang==='fr'?'Supprimer définitivement':'Delete permanently')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL EDIT ───────────────────────────────────────────────── */}
      {editProject && (
        <div onClick={e=>{if(e.target===e.currentTarget)setEditProject(null);}}
          style={{ position:'fixed',inset:0,background:'rgba(8,11,15,0.9)',backdropFilter:'blur(12px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10001,padding:20 }}>
          <div style={{ background:C.card,border:'1px solid rgba(0,255,148,0.25)',borderRadius:18,padding:28,maxWidth:560,width:'100%',maxHeight:'90vh',overflowY:'auto',boxShadow:'0 32px 80px rgba(0,0,0,0.8)',position:'relative' }}>
            <div style={{ position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,#00FF94 0%,rgba(0,255,148,0.3) 70%,transparent 100%)' }}/>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16 }}>
              <div style={{ display:'flex',gap:14,alignItems:'center' }}>
                <div style={{ width:48,height:48,borderRadius:12,background:'rgba(0,255,148,0.08)',border:'1px solid rgba(0,255,148,0.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22 }}>✏️</div>
                <div>
                  <div style={{ fontSize:9,color:C.green,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.13em',marginBottom:3 }}>PANGEA CARBON · MRV · {lang==='fr'?'MODIFIER':'EDIT'}</div>
                  <h2 style={{ fontFamily:'Syne, sans-serif',fontSize:17,fontWeight:800,color:C.text,margin:0 }}>{lang==='fr'?'Modifier le projet':'Edit project'}</h2>
                </div>
              </div>
              <button onClick={()=>setEditProject(null)} style={{ background:'transparent',border:'1px solid '+C.border,borderRadius:8,color:C.muted,cursor:'pointer',width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16 }}>✕</button>
            </div>
            <div style={{ height:1,background:'linear-gradient(90deg,rgba(0,255,148,0.25) 0%,transparent 100%)',marginBottom:20 }}/>
            <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
              {[
                { label:lang==='fr'?'Nom du projet *':'Project name *', key:'name', type:'text' },
                { label:'MW '+( lang==='fr'?'installés':'installed'), key:'installedMW', type:'number' },
                { label:'Description', key:'description', type:'text' },
                { label:'Latitude', key:'latitude', type:'number' },
                { label:'Longitude', key:'longitude', type:'number' },
              ].map(f=>(
                <div key={f.key}>
                  <label style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',display:'block',marginBottom:5 }}>{f.label.toUpperCase()}</label>
                  <input type={f.type} value={editProject[f.key]||''} onChange={e=>setEditProject(p=>({...p,[f.key]:e.target.value}))} style={inp}/>
                </div>
              ))}
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
                <div>
                  <label style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',display:'block',marginBottom:5 }}>TYPE</label>
                  <select value={editProject.type||'SOLAR'} onChange={e=>setEditProject(p=>({...p,type:e.target.value}))} style={inp}>
                    {['SOLAR','WIND','HYDRO','BIOMASS','HYBRID'].map(t=>(
                      <option key={t} value={t}>{TYPE_ICONS[t]} {t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',display:'block',marginBottom:5 }}>{lang==='fr'?'STATUT':'STATUS'}</label>
                  <select value={editProject.status||'DRAFT'} onChange={e=>setEditProject(p=>({...p,status:e.target.value}))} style={inp}>
                    {Object.entries(STATUS_LABEL).map(([k,v])=>(
                      <option key={k} value={k}>{lang==='fr'?v.fr:v.en}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div style={{ display:'flex',gap:10,marginTop:22 }}>
              <button onClick={()=>setEditProject(null)} style={{ flex:1,background:'transparent',border:'1px solid '+C.border,borderRadius:9,color:C.muted,padding:12,cursor:'pointer',fontSize:13 }}>
                {lang==='fr'?'Annuler':'Cancel'}
              </button>
              <button onClick={saveEdit} disabled={saving} style={{ flex:2,background:saving?C.card2:C.green,color:saving?C.muted:C.bg,border:'none',borderRadius:9,padding:12,fontWeight:800,cursor:saving?'wait':'pointer',fontSize:13,fontFamily:'Syne, sans-serif' }}>
                {saving?'⟳ '+(lang==='fr'?'Sauvegarde...':'Saving...'):'✓ '+(lang==='fr'?'Enregistrer les modifications':'Save changes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ───────────────────────────────────────────────────── */}
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24 }}>
        <div>
          <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.12em',marginBottom:6 }}>
            {lang==='fr'?'PORTEFEUILLE':'PORTFOLIO'} · {total} {lang==='fr'?'PROJETS':'PROJECTS'}
          </div>
          <h1 style={{ fontFamily:'Syne, sans-serif',fontSize:26,fontWeight:800,color:C.text,margin:0 }}>
            {lang==='fr'?'Projets MRV':'MRV Projects'}
          </h1>
        </div>
        <a href="/dashboard/projects/new" style={{ background:C.green,color:C.bg,border:'none',borderRadius:9,padding:'11px 22px',fontWeight:800,fontSize:13,textDecoration:'none',fontFamily:'Syne, sans-serif',display:'flex',alignItems:'center',gap:8 }}>
          + {lang==='fr'?'Nouveau projet':'New project'}
        </a>
      </div>

      {/* ── FILTERS ──────────────────────────────────────────────────── */}
      <div style={{ display:'flex',gap:10,marginBottom:20,flexWrap:'wrap' }}>
        <div style={{ flex:1,minWidth:220,position:'relative' }}>
          <span style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:C.muted,fontSize:13 }}>🔍</span>
          <input placeholder={lang==='fr'?'Rechercher projet, pays...':'Search project, country...'}
            value={search} onChange={e=>setSearch(e.target.value)}
            style={{ ...inp, paddingLeft:36 }}/>
        </div>
        <select value={filterType} onChange={e=>setFilterType(e.target.value)}
          style={{ ...inp, width:'auto', minWidth:130 }}>
          <option value="">{lang==='fr'?'Tous les types':'All types'}</option>
          {['SOLAR','WIND','HYDRO','BIOMASS','HYBRID'].map(t=>(
            <option key={t} value={t}>{TYPE_ICONS[t]} {t}</option>
          ))}
        </select>
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
          style={{ ...inp, width:'auto', minWidth:140 }}>
          <option value="">{lang==='fr'?'Tous les statuts':'All statuses'}</option>
          {Object.entries(STATUS_LABEL).map(([k,v])=>(
            <option key={k} value={k}>{lang==='fr'?v.fr:v.en}</option>
          ))}
        </select>
        <div style={{ display:'flex',gap:3,background:C.card,border:'1px solid '+C.border,borderRadius:9,padding:4 }}>
          {['grid','table'].map(v=>(
            <button key={v} onClick={()=>setView(v)}
              style={{ padding:'7px 12px',borderRadius:6,border:'none',cursor:'pointer',fontSize:13,background:view===v?'rgba(0,255,148,0.12)':'transparent',color:view===v?C.green:C.muted }}>
              {v==='grid'?'⊞':'≡'}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ──────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display:'flex',alignItems:'center',justifyContent:'center',padding:'80px 0',gap:12 }}>
          <div style={{ width:28,height:28,border:'2px solid rgba(0,255,148,0.2)',borderTopColor:C.green,borderRadius:'50%',animation:'spin 0.8s linear infinite' }}/>
          <style>{@keyframes spin{to{transform:rotate(360deg);})}</style>
          <span style={{ color:C.muted,fontSize:13,fontFamily:'JetBrains Mono, monospace' }}>
            {lang==='fr'?'Chargement...':'Loading...'}
          </span>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background:C.card,border:'1px solid '+C.border,borderRadius:16,padding:'64px 0',textAlign:'center' }}>
          <div style={{ fontSize:48,marginBottom:16 }}>🌍</div>
          <div style={{ fontSize:18,color:C.text,fontWeight:700,marginBottom:8,fontFamily:'Syne, sans-serif' }}>
            {lang==='fr'?'Aucun projet trouvé':'No projects found'}
          </div>
          <p style={{ fontSize:13,color:C.muted,marginBottom:20 }}>
            {lang==='fr'?'Créez votre premier projet MRV pour générer des crédits carbone.':'Create your first MRV project to generate carbon credits.'}
          </p>
          <a href="/dashboard/projects/new" style={{ background:C.green,color:C.bg,borderRadius:9,padding:'12px 28px',fontWeight:800,fontSize:13,textDecoration:'none',fontFamily:'Syne, sans-serif' }}>
            {lang==='fr'?'Créer un projet →':'Create project →'}
          </a>
        </div>
      ) : view === 'grid' ? (
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(310px,1fr))',gap:16 }}>
          {filtered.map(p => {
            const mrv = p.mrvRecords?.[0];
            const tc = TYPE_COLORS[p.type]||C.muted;
            const sc = STATUS_COLOR[p.status]||C.muted;
            const sl = STATUS_LABEL[p.status];
            return (
              <div key={p.id} style={{ background:C.card,border:'1px solid '+C.border,borderRadius:14,overflow:'hidden',position:'relative',transition:'border-color .15s' }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=tc+'40'}
                onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,'+tc+' 0%,transparent 60%)' }}/>

                {/* Card header */}
                <div style={{ padding:'16px 18px',display:'flex',justifyContent:'space-between',alignItems:'flex-start' }}>
                  <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                    <div style={{ width:38,height:38,borderRadius:9,background:tc+'15',border:'1px solid '+tc+'30',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0 }}>
                      {TYPE_ICONS[p.type]||'⚡'}
                    </div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:14,fontWeight:700,color:C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:160 }}>{p.name}</div>
                      <div style={{ fontSize:11,color:C.muted }}>{p.country} · {p.type}</div>
                    </div>
                  </div>
                  <span style={{ fontSize:9,color:sc,background:sc+'15',border:'1px solid '+sc+'30',borderRadius:5,padding:'3px 8px',fontFamily:'JetBrains Mono, monospace',flexShrink:0 }}>
                    {sl?(lang==='fr'?sl.fr:sl.en):p.status}
                  </span>
                </div>

                {/* KPIs */}
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,padding:'0 18px 14px' }}>
                  <div style={{ background:C.card2,borderRadius:8,padding:'10px 12px' }}>
                    <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:3 }}>{lang==='fr'?'CAPACITÉ':'CAPACITY'}</div>
                    <div style={{ fontSize:16,fontWeight:700,color:C.text }}>{p.installedMW} <span style={{ fontSize:11,color:C.muted }}>MW</span></div>
                  </div>
                  <div style={{ background:C.card2,borderRadius:8,padding:'10px 12px' }}>
                    <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:3 }}>CRÉDITS tCO₂e</div>
                    <div style={{ fontSize:16,fontWeight:700,color:C.green }}>{mrv ? fmt(mrv.netCarbonCredits) : '—'}</div>
                  </div>
                </div>

                {mrv && (
                  <div style={{ margin:'0 18px 14px',padding:'8px 12px',background:'rgba(56,189,248,0.05)',border:'1px solid rgba(56,189,248,0.12)',borderRadius:8,display:'flex',justifyContent:'space-between' }}>
                    <span style={{ fontSize:11,color:C.muted }}>{lang==='fr'?'Revenus estimés':'Estimated revenue'} {mrv.year}</span>
                    <span style={{ fontSize:13,fontWeight:700,color:C.blue,fontFamily:'JetBrains Mono, monospace' }}>${fmt(mrv.revenueUSD)</span>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display:'flex',gap:0,borderTop:'1px solid '+C.border }}>
                  <a href={'/dashboard/projects/'+p.id} style={{ flex:1,padding:'10px 0',textAlign:'center',fontSize:12,color:C.muted,textDecoration:'none',borderRight:'1px solid '+C.border }}
                    onMouseEnter={e=>{ e.currentTarget.style.color=C.blue; e.currentTarget.style.background='rgba(56,189,248,0.05)'; }}
                    onMouseLeave={e=>{ e.currentTarget.style.color=C.muted; e.currentTarget.style.background='transparent'; }}>
                    📊 {lang==='fr'?'Voir':'View'}
                  </a>
                  <button onClick={e=>{e.stopPropagation();setEditProject({...p});}}
                    style={{ flex:1,padding:'10px 0',background:'transparent',border:'none',borderRight:'1px solid '+C.border,fontSize:12,color:C.muted,cursor:'pointer' }}
                    onMouseEnter={e=>{ e.currentTarget.style.color=C.green; e.currentTarget.style.background='rgba(0,255,148,0.05)'; }}
                    onMouseLeave={e=>{ e.currentTarget.style.color=C.muted; e.currentTarget.style.background='transparent'; }}>
                    ✏️ {lang==='fr'?'Modifier':'Edit'}
                  </button>
                  <button onClick={e=>{e.stopPropagation();setDeleteProject(p);}}
                    style={{ flex:1,padding:'10px 0',background:'transparent',border:'none',fontSize:12,color:C.muted,cursor:'pointer' }}
                    onMouseEnter={e=>{ e.currentTarget.style.color=C.red; e.currentTarget.style.background='rgba(248,113,113,0.05)'; }}
                    onMouseLeave={e=>{ e.currentTarget.style.color=C.muted; e.currentTarget.style.background='transparent'; }}>
                    🗑 {lang==='fr'?'Supprimer':'Delete'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div style={{ background:C.card,border:'1px solid '+C.border,borderRadius:14,overflow:'hidden' }}>
          <table style={{ width:'100%',borderCollapse:'collapse',fontSize:12 }}>
            <thead>
              <tr style={{ background:'rgba(255,255,255,0.02)' }}>
                {[lang==='fr'?'Projet':'Project', lang==='fr'?'Pays':'Country', 'Type', 'MW', 'tCO₂e', 'Revenue USD', lang==='fr'?'Statut':'Status', ''].map(h=>(
                  <th key={h} style={{ padding:'11px 14px',textAlign:'left',fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',borderBottom:'1px solid '+C.border }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const mrv = p.mrvRecords?.[0];
                const tc = TYPE_COLORS[p.type]||C.muted;
                const sc = STATUS_COLOR[p.status]||C.muted;
                const sl = STATUS_LABEL[p.status];
                return (
                  <tr key={p.id} style={{ borderBottom:'1px solid '+C.border+'40' }}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(30,45,61,0.25)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'12px 14px' }}>
                      <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                        <span style={{ fontSize:16 }}>{TYPE_ICONS[p.type]||'⚡'}</span>
                        <div>
                          <div style={{ fontWeight:600,color:C.text,fontSize:13 }}>{p.name}</div>
                          <div style={{ fontSize:10,color:C.muted,fontFamily:'JetBrains Mono, monospace' }}>
                            {p._count?.readings||0} {lang==='fr'?'lectures':'readings'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:'12px 14px' }}>
                      <span style={{ fontSize:11,color:C.text2,background:C.card2,border:'1px solid '+C.border,borderRadius:4,padding:'2px 8px' }}>{p.country}</span>
                    </td>
                    <td style={{ padding:'12px 14px' }}>
                      <div style={{ display:'flex',alignItems:'center',gap:6 }}>
                        <div style={{ width:8,height:8,borderRadius:'50%',background:tc,flexShrink:0 }}/>
                        <span style={{ fontSize:11,color:C.text2 }}>{p.type}</span>
                      </div>
                    </td>
                    <td style={{ padding:'12px 14px',color:C.text2,fontFamily:'JetBrains Mono, monospace' }}>{p.installedMW}</td>
                    <td style={{ padding:'12px 14px',color:C.green,fontFamily:'JetBrains Mono, monospace',fontWeight:600 }}>
                      {mrv?fmt(mrv.netCarbonCredits):'—'}
                    </td>
                    <td style={{ padding:'12px 14px',color:C.blue,fontFamily:'JetBrains Mono, monospace' }}>
                      {mrv?'$'+fmt(mrv.revenueUSD):'—'}
                    </td>
                    <td style={{ padding:'12px 14px' }}>
                      <span style={{ fontSize:9,color:sc,background:sc+'15',border:'1px solid '+sc+'30',borderRadius:4,padding:'2px 8px',fontFamily:'JetBrains Mono, monospace' }}>
                        {sl?(lang==='fr'?sl.fr:sl.en):p.status}
                      </span>
                    </td>
                    <td style={{ padding:'12px 14px' }}>
                      <div style={{ display:'flex',gap:6 }}>
                        <a href={'/dashboard/projects/'+p.id}
                          style={{ background:'rgba(56,189,248,0.08)',border:'1px solid rgba(56,189,248,0.2)',borderRadius:6,color:C.blue,padding:'5px 10px',fontSize:11,textDecoration:'none',fontWeight:600 }}>
                          {lang==='fr'?'Voir':'View'}
                        </a>
                        <button onClick={()=>setEditProject({...p})}
                          style={{ background:'rgba(0,255,148,0.08)',border:'1px solid rgba(0,255,148,0.2)',borderRadius:6,color:C.green,padding:'5px 10px',fontSize:11,cursor:'pointer',fontWeight:600 }}>
                          ✏️
                        </button>
                        <button onClick={()=>setDeleteProject(p)}
                          style={{ background:'rgba(248,113,113,0.08)',border:'1px solid rgba(248,113,113,0.2)',borderRadius:6,color:C.red,padding:'5px 10px',fontSize:11,cursor:'pointer',fontWeight:600 }}>
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}