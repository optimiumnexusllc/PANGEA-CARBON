'use client';
import { useEffect, useState, useCallback } from 'react';
import { fetchAuthJson } from '@/lib/fetch-auth';
import { useLang } from '@/lib/lang-context';
import Link from 'next/link';

const C = { bg:'#080B0F', card:'#0D1117', card2:'#121920', border:'#1E2D3D', green:'#00FF94', blue:'#38BDF8', purple:'#A78BFA', yellow:'#FCD34D', red:'#F87171', muted:'#4A6278', text:'#E8EFF6', text2:'#8FA3B8' };

export default function GHGAuditPage() {
  const { lang } = useLang();
  const L = (en, fr) => lang === 'fr' ? fr : en;
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projects, setProjects] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ projectId:'', year: new Date().getFullYear(), standard:'GHG_PROTOCOL' });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, p] = await Promise.all([
        fetchAuthJson('/ghg/audits').catch(() => ({ audits:[] })),
        fetchAuthJson('/projects').catch(() => ({ projects:[] })),
      ]);
      setAudits(a.audits || []);
      setProjects(p.projects || []);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createAudit = async () => {
    if (!form.projectId) return;
    setCreating(true);
    try {
      await fetchAuthJson('/ghg/audits', { method:'POST', body: JSON.stringify(form) });
      setShowNew(false);
      load();
    } catch(e) { setError(e.message); }
    finally { setCreating(false); }
  };

  const STANDARDS = ['GHG_PROTOCOL','ISO_14064','BILAN_CARBONE','CDP','TCFD'];

  return (
    <div style={{ padding:24, maxWidth:1200, margin:'0 auto' }}>
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:9, color:C.purple, fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.14em', marginBottom:4 }}>
          GHG PROTOCOL · ISO 14064 · SCOPE 1/2/3
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <h1 style={{ fontFamily:'Syne, sans-serif', fontSize:24, fontWeight:800, color:C.text, margin:0 }}>
            {L('GHG Audit Engine','Moteur Audit GHG')}
          </h1>
          <button onClick={() => setShowNew(true)}
            style={{ background:C.purple, color:C.bg, border:'none', borderRadius:9, padding:'10px 20px', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'Syne, sans-serif' }}>
            + {L('New Audit','Nouvel Audit')}
          </button>
        </div>
        <p style={{ fontSize:13, color:C.muted, marginTop:8 }}>
          {L('GHG Protocol · ISO 14064 · Bilan Carbone · CDP · TCFD — Scope 1, 2 & 3',
             'GHG Protocol · ISO 14064 · Bilan Carbone · CDP · TCFD — Scope 1, 2 et 3')}
        </p>
      </div>

      {error && (
        <div style={{ background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.25)', borderRadius:10, padding:'12px 16px', marginBottom:20, color:C.red, fontSize:13 }}>
          {error}
        </div>
      )}

      {showNew && (
        <div onClick={e=>{ if(e.target===e.currentTarget) setShowNew(false); }}
          style={{ position:'fixed', inset:0, background:'rgba(8,11,15,0.85)', backdropFilter:'blur(12px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
          <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:16, padding:28, width:460, maxWidth:'90vw' }}>
            <div style={{ height:3, background:'linear-gradient(90deg,'+C.purple+' 0%,transparent 100%)', borderRadius:3, marginBottom:20 }}/>
            <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:18, fontWeight:800, color:C.text, margin:'0 0 20px' }}>
              {L('New GHG Audit','Nouvel Audit GHG')}
            </h2>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <div style={{ fontSize:11, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>{L('PROJECT','PROJET')}</div>
                <select value={form.projectId} onChange={e=>setForm({...form,projectId:e.target.value})}
                  style={{ width:'100%', background:C.card2, border:'1px solid '+C.border, borderRadius:8, color:C.text, padding:'9px 12px', fontSize:13 }}>
                  <option value="">{L('Select a project','Sélectionner un projet')}</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize:11, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>{L('AUDIT YEAR','ANNEE')}</div>
                <input type="number" value={form.year} onChange={e=>setForm({...form,year:parseInt(e.target.value)})}
                  style={{ width:'100%', background:C.card2, border:'1px solid '+C.border, borderRadius:8, color:C.text, padding:'9px 12px', fontSize:13, boxSizing:'border-box' }}/>
              </div>
              <div>
                <div style={{ fontSize:11, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>{L('STANDARD','NORME')}</div>
                <select value={form.standard} onChange={e=>setForm({...form,standard:e.target.value})}
                  style={{ width:'100%', background:C.card2, border:'1px solid '+C.border, borderRadius:8, color:C.text, padding:'9px 12px', fontSize:13 }}>
                  {STANDARDS.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:'flex', gap:10, marginTop:20 }}>
              <button onClick={createAudit} disabled={creating || !form.projectId}
                style={{ flex:1, background:C.purple, color:C.bg, border:'none', borderRadius:9, padding:'11px 0', fontWeight:700, fontSize:13, cursor:'pointer', opacity: creating || !form.projectId ? 0.6 : 1 }}>
                {creating ? L('Creating...','Création...') : L('Create Audit','Créer')}
              </button>
              <button onClick={()=>setShowNew(false)}
                style={{ flex:1, background:'transparent', border:'1px solid '+C.border, borderRadius:9, color:C.muted, padding:'11px 0', cursor:'pointer', fontSize:13 }}>
                {L('Cancel','Annuler')}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:C.muted, fontFamily:'JetBrains Mono, monospace', fontSize:13 }}>
          {L('Loading audits...','Chargement des audits...')}
        </div>
      ) : audits.length === 0 ? (
        <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:14, padding:48, textAlign:'center' }}>
          <div style={{ fontSize:36, marginBottom:16 }}>📋</div>
          <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:8 }}>
            {L('No GHG audits yet','Aucun audit GHG')}
          </div>
          <p style={{ fontSize:13, color:C.muted, marginBottom:20 }}>
            {L('Create your first GHG audit to start tracking Scope 1, 2 & 3 emissions.',
               'Créez votre premier audit GHG pour suivre vos émissions Scope 1, 2 et 3.')}
          </p>
          <button onClick={() => setShowNew(true)}
            style={{ background:C.purple, color:C.bg, border:'none', borderRadius:9, padding:'11px 24px', fontWeight:700, fontSize:13, cursor:'pointer' }}>
            + {L('Create First Audit','Créer le premier audit')}
          </button>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {audits.map(audit => (
            <div key={audit.id} style={{ background:C.card, border:'1px solid '+C.border, borderRadius:12, padding:'16px 20px', display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
              <div style={{ flex:1, minWidth:200 }}>
                <div style={{ fontSize:9, color:C.purple, fontFamily:'JetBrains Mono, monospace', marginBottom:4 }}>
                  {audit.standard?.replace(/_/g,' ')} · {audit.year}
                </div>
                <div style={{ fontSize:14, fontWeight:700, color:C.text }}>
                  {audit.project?.name || L('Project','Projet')}
                </div>
                <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>
                  {audit.status} · {audit._count?.entries || 0} {L('entries','entrées')}
                </div>
              </div>
              <div style={{ display:'flex', gap:16 }}>
                {['scope1','scope2','scope3'].map(scope => (
                  <div key={scope} style={{ textAlign:'center' }}>
                    <div style={{ fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace' }}>{scope.toUpperCase()}</div>
                    <div style={{ fontSize:14, fontWeight:700, color:scope==='scope1'?C.red:scope==='scope2'?C.yellow:C.blue }}>
                      {audit[scope] ? Math.round(audit[scope]).toLocaleString() : '—'}
                    </div>
                    <div style={{ fontSize:9, color:C.muted }}>tCO₂e</div>
                  </div>
                ))}
              </div>
              <Link href={'/dashboard/ghg-audit/'+audit.id}
                style={{ background:'rgba(167,139,250,0.1)', border:'1px solid rgba(167,139,250,0.25)', color:C.purple, borderRadius:8, padding:'8px 16px', fontSize:12, fontWeight:600, textDecoration:'none', whiteSpace:'nowrap' }}>
                {L('View','Voir')} →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
