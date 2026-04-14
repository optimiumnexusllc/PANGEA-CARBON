'use client';
import { useLang } from '@/lib/lang-context';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const TYPE_COLORS: Record<string, string> = {
  SOLAR: '#FCD34D', WIND: '#38BDF8', HYDRO: '#00FF94', BIOMASS: '#F87171', HYBRID: '#A78BFA'
};
const TYPE_ICONS: Record<string, string> = {
  SOLAR: '☀️', WIND: '💨', HYDRO: '💧', BIOMASS: '🌿', HYBRID: '⚡'
};
const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'badge-ghost', ACTIVE: 'badge-sky', MONITORING: 'badge-amber',
  VERIFIED: 'badge-acid', CREDITED: 'badge-acid', ARCHIVED: 'badge-ghost'
};
const STATUS_FR: Record<string, string> = {
  DRAFT: {t('dash_draft')}, ACTIVE: {t('dash_active')}, MONITORING: 'Monitoring',
  VERIFIED: 'Vérifié', CREDITED: 'Crédité', ARCHIVED: 'Archivé'
};

const fmt = (n: number, d = 0) => n?.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }) ?? '—';

export default function ProjectsPage() {
  const { t } = useLang();
  const [projects, setProjects] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [view, setView] = useState<'grid' | 'table'>('table');
  const [editProject, setEditProject] = useState<any>(null);
  const [deleteProject, setDeleteProject] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionMsg, setActionMsg] = useState<{text:string;ok:boolean}|null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterType) params.type = filterType;
      if (filterStatus) params.status = filterStatus;
      const data = await api.getProjects(params);
      setProjects(data.projects || []);
      setTotal(data.total || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filterType, filterStatus]);

  const flash = (text: string, ok = true) => { setActionMsg({text, ok}); setTimeout(() => setActionMsg(null), 4000); };

  const deleteProj = async () => {
    if (!deleteProject) return;
    setDeleting(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/projects/' + deleteProject.id, {
        method: 'DELETE', headers: { Authorization: 'Bearer ' + token }
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      setProjects(prev => prev.filter(p => p.id !== deleteProject.id));
      setDeleteProject(null);
      flash('Projet supprime: ' + deleteProject.name);
    } catch (e: any) { flash(e.message, false); }
    finally { setDeleting(false); }
  };

  const saveEdit = async () => {
    if (!editProject) return;
    setSaving(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/projects/' + editProject.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ name: editProject.name, type: editProject.type, status: editProject.status, description: editProject.description, installedMW: parseFloat(editProject.installedMW), latitude: editProject.latitude ? parseFloat(editProject.latitude) : null, longitude: editProject.longitude ? parseFloat(editProject.longitude) : null })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      setProjects(prev => prev.map(p => p.id === editProject.id ? { ...p, ...editProject } : p));
      setEditProject(null);
      flash('Projet mis a jour');
    } catch (e: any) { flash(e.message, false); }
    finally { setSaving(false); }
  };

  const filtered = projects.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.country.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs font-mono mb-1" style={{ color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>
            PORTEFEUILLE · {total} PROJETS
          </div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: 'Syne, sans-serif' }}>Projets MRV</h1>
        </div>
        <a href="/dashboard/projects/new" className="btn-primary">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          {t('proj_new')}
        </a>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1" style={{ minWidth: 200 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#4A6278' }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input className="input-dark" style={{ paddingLeft: 36 }}
            placeholder="Rechercher un projet, pays..."
            value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <select className="input-dark" style={{ width: 'auto' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">Tous les types</option>
          {['SOLAR','WIND','HYDRO','BIOMASS','HYBRID'].map(t => (
            <option key={t} value={t}>{TYPE_ICONS[t]} {t}</option>
          ))}
        </select>
        <select className="input-dark" style={{ width: 'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_FR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div className="flex gap-1" style={{ border: '1px solid #1E2D3D', borderRadius: 7, padding: 2 }}>
          {(['table', 'grid'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{ padding: '5px 10px', borderRadius: 5, background: view === v ? 'rgba(0,255,148,0.1)' : 'transparent',
                color: view === v ? '#00FF94' : '#4A6278', border: 'none', cursor: 'pointer' }}>
              {v === 'table' ? '≡' : '⊞'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div style={{ width: 28, height: 28, border: '2px solid rgba(0,255,148,0.2)', borderTopColor: '#00FF94', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <div style={{ fontSize: 40, marginBottom: 12 }}>🌍</div>
          <div className="text-sm font-medium mb-2">Aucun projet MRV</div>
          <div className="text-xs mb-4" style={{ color: '#4A6278' }}>Créez votre premier projet pour commencer à générer des crédits carbone</div>
          <a href="/dashboard/projects/new" className="btn-primary" style={{ display: 'inline-flex' }}>Créer un projet →</a>
        </div>
      ) : view === 'table' ? (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="table-dark">
            <thead><tr>
              <th>Projet</th><th>Pays</th><th>Type</th><th>MW Installés</th>
              <th>Crédits tCO₂e</th><th>Revenus USD</th><th>Statut</th><th></th>
            </tr></thead>
            <tbody>
              {filtered.map((p: any) => {
                const mrv = p.mrvRecords?.[0];
                return (
                  <tr key={p.id} style={{ cursor: 'pointer' }}
                    onClick={() => window.location.href = `/dashboard/projects/${p.id}`}>
                    <td>
                      <div style={{ color: '#E8EFF6', fontWeight: 500 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>
                        {p._count?.readings || 0} lectures · {p._count?.reports || 0} rapports
                      </div>
                    </td>
                    <td><span className="badge badge-ghost">{p.countryCode}</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: TYPE_COLORS[p.type] || '#4A6278' }}/>
                        <span style={{ fontSize: 12 }}>{p.type}</span>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>{fmt(p.installedMW, 1)}</td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#00FF94', fontWeight: 600 }}>
                      {mrv ? fmt(mrv.netCarbonCredits) : '—'}
                    </td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#38BDF8' }}>
                      {mrv ? '$' + fmt(mrv.revenueUSD) : '—'}
                    </td>
                    <td><span className={`badge ${STATUS_BADGE[p.status] || 'badge-ghost'}`}>{STATUS_FR[p.status]}</span></td>
                    <td>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4A6278" strokeWidth="2">
                        <path d="M9 18l6-6-6-6"/>
                      </svg>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {filtered.map((p: any) => {
            const mrv = p.mrvRecords?.[0];
            return (
              <div key={p.id} className="card animate-slide-up" style={{ padding: 20, cursor: 'pointer' }}
                onClick={() => window.location.href = `/dashboard/projects/${p.id}`}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                      background: `${TYPE_COLORS[p.type]}15`, border: `1px solid ${TYPE_COLORS[p.type]}30` }}>
                      {TYPE_ICONS[p.type]}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#E8EFF6' }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: '#4A6278' }}>{p.country}</div>
                    </div>
                  </div>
                  <span className={`badge ${STATUS_BADGE[p.status]}`}>{STATUS_FR[p.status]}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ background: '#0D1117', borderRadius: 7, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>CAPACITÉ</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#E8EFF6' }}>{p.installedMW} <span style={{ fontSize: 11, color: '#4A6278' }}>MW</span></div>
                  </div>
                  <div style={{ background: '#0D1117', borderRadius: 7, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>CRÉDITS</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#00FF94' }}>{mrv ? fmt(mrv.netCarbonCredits) : '—'} <span style={{ fontSize: 11, color: '#00CC77' }}>tCO₂e</span></div>
                  </div>
                </div>
                {mrv && (
                  <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(56,189,248,0.05)', borderRadius: 7, border: '1px solid rgba(56,189,248,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#4A6278' }}>Revenus estimés {mrv.year}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#38BDF8', fontFamily: 'JetBrains Mono, monospace' }}>${fmt(mrv.revenueUSD)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

      {actionMsg && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: actionMsg.ok ? 'rgba(0,255,148,0.15)' : 'rgba(248,113,113,0.15)', border: '1px solid', borderColor: actionMsg.ok ? 'rgba(0,255,148,0.4)' : 'rgba(248,113,113,0.4)', borderRadius: 10, padding: '12px 20px', color: actionMsg.ok ? '#00FF94' : '#F87171', fontSize: 13, fontWeight: 600, zIndex: 9999 }}>
          {actionMsg.text}
        </div>
      )}
      {deleteProject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#121920', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 14, padding: 32, maxWidth: 440, width: '90%' }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, color: '#F87171', marginBottom: 10 }}>Supprimer ce projet ?</h2>
            <p style={{ fontSize: 13, color: '#8FA3B8', lineHeight: 1.7, marginBottom: 8 }}>Vous allez supprimer <strong style={{ color: '#E8EFF6' }}>{deleteProject.name}</strong>.</p>
            <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8, padding: 12, marginBottom: 20, fontSize: 12, color: '#F87171' }}>
              Action irreversible — toutes les donnees MRV et credits associes seront supprimes.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteProject(null)} style={{ flex: 1, background: 'transparent', border: '1px solid #1E2D3D', borderRadius: 8, color: '#4A6278', padding: 10, cursor: 'pointer' }}>Annuler</button>
              <button onClick={deleteProj} disabled={deleting} style={{ flex: 1, background: '#F87171', color: '#080B0F', border: 'none', borderRadius: 8, padding: 10, fontWeight: 700, cursor: 'pointer' }}>
                {deleting ? '...' : {t('proj_delete')}}
              </button>
            </div>
          </div>
        </div>
      )}
      {editProject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#121920', border: '1px solid #1E2D3D', borderRadius: 14, padding: 28, maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, color: '#E8EFF6', margin: 0 }}>Modifier le projet</h2>
              <button onClick={() => setEditProject(null)} style={{ background: 'none', border: 'none', color: '#4A6278', cursor: 'pointer', fontSize: 20 }}>x</button>
            </div>
            {[{ label: 'Nom', key: 'name', type: 'text' }, { label: 'MW installe', key: 'installedMW', type: 'number' }, { label: 'Description', key: 'description', type: 'text' }, { label: 'Latitude', key: 'latitude', type: 'number' }, { label: 'Longitude', key: 'longitude', type: 'number' }].map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 4 }}>{f.label.toUpperCase()}</label>
                <input type={f.type} value={editProject[f.key] || ''} onChange={e => setEditProject((p: any) => ({ ...p, [f.key]: e.target.value }))}
                  style={{ width: '100%', background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '9px 12px', fontSize: 13, outline: 'none' }}/>
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 4 }}>TYPE</label>
                <select value={editProject.type} onChange={e => setEditProject((p: any) => ({ ...p, type: e.target.value }))} style={{ width: '100%', background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '9px 12px', fontSize: 13 }}>
                  {['SOLAR','WIND','HYDRO','BIOMASS','HYBRID'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 4 }}>STATUT</label>
                <select value={editProject.status} onChange={e => setEditProject((p: any) => ({ ...p, status: e.target.value }))} style={{ width: '100%', background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '9px 12px', fontSize: 13 }}>
                  {['DRAFT','ACTIVE','MONITORING','VERIFIED','CREDITED','ARCHIVED'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setEditProject(null)} style={{ flex: 1, background: 'transparent', border: '1px solid #1E2D3D', borderRadius: 8, color: '#4A6278', padding: 10, cursor: 'pointer' }}>Annuler</button>
              <button onClick={saveEdit} disabled={saving} style={{ flex: 1, background: '#00FF94', color: '#080B0F', border: 'none', borderRadius: 8, padding: 10, fontWeight: 700, cursor: 'pointer' }}>
                {saving ? '...' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}
}
