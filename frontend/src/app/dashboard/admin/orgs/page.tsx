'use client';
import { fetchAuth } from '@/lib/fetch-auth';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL;
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('accessToken') : ''}` });
const PLAN_COLOR: Record<string, string> = { FREE: '#4A6278', TRIAL: '#FCD34D', STARTER: '#38BDF8', PRO: '#00FF94', ENTERPRISE: '#A78BFA', CUSTOM: '#F87171' };
const STATUS_COLOR: Record<string, string> = { ACTIVE: '#00FF94', TRIAL: '#FCD34D', SUSPENDED: '#F87171', CHURNED: '#4A6278' };

export default function AdminOrgsPage() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editOrg, setEditOrg] = useState<any>(null);
  const [deleteOrg, setDeleteOrg] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', plan: 'TRIAL', country: '', billingEmail: '', maxProjects: 5, maxMW: 100, maxUsers: 3 });
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetchAuth(`/admin/orgs`)
      .then(r => r.json()).then(d => { setOrgs(d.orgs || []); setTotal(d.total || 0); })
      .catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const updatePlan = async (id: string, plan: string) => {
    await fetchAuth(`/admin/orgs/${id}`, { method: 'PATCH', body: JSON.stringify({ plan  }) });
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    await fetchAuth(`/admin/orgs/${id}`, { method: 'PATCH', body: JSON.stringify({ status  }) });
    load();
  };

  const createOrg = async () => {
    setSaving(true);
    try {
      const res = await fetchAuth(`/admin/orgs`, { method: 'POST', body: JSON.stringify(form)  });
      if (!res.ok) { const e = await res.json(); alert(e.error); return; }
      setCreating(false);
      setForm({ name: '', plan: 'TRIAL', country: '', billingEmail: '', maxProjects: 5, maxMW: 100, maxUsers: 3 });
      load();
    } finally { setSaving(false); }
  };

  const flash = (text: string, ok = true) => { setMsg({text, ok}); setTimeout(() => setMsg(null), 4000); };

  const saveOrg = async () => {
    setSaving(true);
    try {
      const res = await fetchAuth('/admin/orgs/' + editOrg.id + '/full', { method: 'PUT', body: JSON.stringify(editOrg) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setOrgs((prev: any[]) => prev.map((o: any) => o.id === editOrg.id ? { ...o, ...d } : o));
      setEditOrg(null);
      flash('Organisation mise a jour');
    } catch (e: any) { flash(e.message, false); }
    finally { setSaving(false); }
  };

  const deleteOrgFn = async () => {
    setDeleting(true);
    try {
      const res = await fetchAuth('/admin/orgs/' + deleteOrg.id + '?force=true', { method: 'DELETE' });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setOrgs((prev: any[]) => prev.filter((o: any) => o.id !== deleteOrg.id));
      setDeleteOrg(null);
      flash('Organisation supprimee');
    } catch (e: any) { flash(e.message, false); }
    finally { setDeleting(false); }
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 10, color: '#F87171', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>ADMIN · MULTI-TENANT · {total} ORGS</div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: '#E8EFF6', margin: 0 }}>Organisations</h1>
        </div>
        <button onClick={() => setCreating(true)} style={{ background: '#00FF94', color: '#080B0F', border: 'none', borderRadius: 7, padding: '8px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          + Nouvelle organisation
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
        {loading ? <div style={{ color: '#4A6278' }}>Chargement...</div> :
          orgs.map((org: any) => (
            <div key={org.id} style={{ background: '#0D1117', border: `1px solid ${PLAN_COLOR[org.plan] || '#1E2D3D'}20`, borderRadius: 10, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#E8EFF6' }}>{org.name}</div>
                  <div style={{ fontSize: 11, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>{org.slug}</div>
                </div>
                <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 5, fontFamily: 'JetBrains Mono, monospace',
                  background: `${STATUS_COLOR[org.status]}15`, color: STATUS_COLOR[org.status], border: `1px solid ${STATUS_COLOR[org.status]}30`, height: 'fit-content' }}>
                  {org.status}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                {[['Projets', org._count?.projects, org.maxProjects],['Users', org._count?.users, org.maxUsers],['MW max', org.maxMW, null]].map(([label, val, max]) => (
                  <div key={String(label)} style={{ background: '#121920', borderRadius: 6, padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#4A6278', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#E8EFF6' }}>{String(val)}{max ? `/${max}` : ''}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <select value={org.plan} onChange={e => updatePlan(org.id, e.target.value)}
                  style={{ flex: 1, background: `${PLAN_COLOR[org.plan]}15`, border: `1px solid ${PLAN_COLOR[org.plan]}30`, borderRadius: 5, color: PLAN_COLOR[org.plan], padding: '5px 8px', fontSize: 12, cursor: 'pointer' }}>
                  {['FREE','TRIAL','STARTER','PRO','ENTERPRISE','CUSTOM'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select value={org.status} onChange={e => updateStatus(org.id, e.target.value)}
                  style={{ flex: 1, background: '#121920', border: '1px solid #1E2D3D', borderRadius: 5, color: '#8FA3B8', padding: '5px 8px', fontSize: 12, cursor: 'pointer' }}>
                  {['ACTIVE','TRIAL','SUSPENDED','CHURNED'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {org.trialEndsAt && (
                <div style={{ marginTop: 8, fontSize: 10, color: '#FCD34D', fontFamily: 'JetBrains Mono, monospace' }}>
                  Trial expire: {new Date(org.trialEndsAt).toLocaleDateString('fr-FR')}
                </div>
              )}
            </div>
          ))
        }
      </div>

      {/* Create modal */}
      {creating && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#121920', border: '1px solid #1E2D3D', borderRadius: 12, padding: 28, width: 460 }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, color: '#E8EFF6', marginTop: 0, marginBottom: 20 }}>Créer une organisation</h2>
            {[['Nom', 'name', 'text'], ['Pays', 'country', 'text'], ['Email facturation', 'billingEmail', 'email']].map(([label, key, type]) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>{label}</label>
                <input type={type} value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{ width: '100%', background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 6, color: '#E8EFF6', padding: '8px 12px', fontSize: 13, boxSizing: 'border-box', outline: 'none' }}/>
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
              {[['Max projets', 'maxProjects'], ['Max MW', 'maxMW'], ['Max users', 'maxUsers']].map(([label, key]) => (
                <div key={key}>
                  <label style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>{label}</label>
                  <input type="number" value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: parseInt(e.target.value) }))}
                    style={{ width: '100%', background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 6, color: '#E8EFF6', padding: '8px 12px', fontSize: 13, boxSizing: 'border-box', outline: 'none' }}/>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setCreating(false)} style={{ flex: 1, background: 'transparent', border: '1px solid #1E2D3D', borderRadius: 7, color: '#4A6278', padding: '9px', cursor: 'pointer' }}>Annuler</button>
              <button onClick={createOrg} disabled={saving} style={{ flex: 1, background: '#00FF94', color: '#080B0F', border: 'none', borderRadius: 7, padding: '9px', fontWeight: 700, cursor: 'pointer' }}>
                {saving ? '...' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {msg && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: msg.ok ? 'rgba(0,255,148,0.15)' : 'rgba(248,113,113,0.15)', border: '1px solid', borderColor: msg.ok ? 'rgba(0,255,148,0.4)' : 'rgba(248,113,113,0.4)', borderRadius: 10, padding: '12px 20px', color: msg.ok ? '#00FF94' : '#F87171', fontSize: 13, fontWeight: 600, zIndex: 9999 }}>
          {msg.text}
        </div>
      )}
      {deleteOrg && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#121920', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 14, padding: 28, maxWidth: 420, width: '90%' }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, color: '#F87171', marginBottom: 10 }}>Supprimer cette organisation ?</h2>
            <p style={{ fontSize: 13, color: '#8FA3B8', marginBottom: 16 }}>
              <strong style={{ color: '#E8EFF6' }}>{deleteOrg && deleteOrg.name}</strong> sera supprimee. Les utilisateurs seront conserves.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setDeleteOrg(null)} style={{ flex: 1, background: 'transparent', border: '1px solid #1E2D3D', borderRadius: 8, color: '#4A6278', padding: 10, cursor: 'pointer' }}>Annuler</button>
              <button onClick={deleteOrgFn} disabled={deleting} style={{ flex: 1, background: '#F87171', color: '#080B0F', border: 'none', borderRadius: 8, padding: 10, fontWeight: 700, cursor: 'pointer' }}>
                {deleting ? '...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
      {editOrg && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#121920', border: '1px solid #1E2D3D', borderRadius: 14, padding: 28, maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, color: '#E8EFF6', margin: 0 }}>Modifier l organisation</h2>
              <button onClick={() => setEditOrg(null)} style={{ background: 'none', border: 'none', color: '#4A6278', cursor: 'pointer', fontSize: 18 }}>x</button>
            </div>
            {[{ label: 'Nom', key: 'name' }, { label: 'Domaine', key: 'domain' }].map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 4 }}>{f.label.toUpperCase()}</label>
                <input value={editOrg[f.key] || ''} onChange={e => setEditOrg((o: any) => ({ ...o, [f.key]: e.target.value }))}
                  style={{ width: '100%', background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '8px 12px', fontSize: 13, outline: 'none' }}/>
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
              {[{ label: 'Max projets', key: 'maxProjects' }, { label: 'Max MW', key: 'maxMW' }, { label: 'Max users', key: 'maxUsers' }].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 4 }}>{f.label.toUpperCase()}</label>
                  <input type="number" value={editOrg[f.key] || ''} onChange={e => setEditOrg((o: any) => ({ ...o, [f.key]: e.target.value }))}
                    style={{ width: '100%', background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '8px 10px', fontSize: 13, outline: 'none' }}/>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
              <div>
                <label style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 4 }}>PLAN</label>
                <select value={editOrg.plan || 'FREE'} onChange={e => setEditOrg((o: any) => ({ ...o, plan: e.target.value }))} style={{ width: '100%', background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '8px 10px', fontSize: 13 }}>
                  {['FREE','TRIAL','STARTER','PRO','ENTERPRISE','CUSTOM'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 4 }}>STATUT</label>
                <select value={editOrg.status || 'ACTIVE'} onChange={e => setEditOrg((o: any) => ({ ...o, status: e.target.value }))} style={{ width: '100%', background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '8px 10px', fontSize: 13 }}>
                  {['ACTIVE','SUSPENDED','TRIAL','CHURNED'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setEditOrg(null)} style={{ flex: 1, background: 'transparent', border: '1px solid #1E2D3D', borderRadius: 8, color: '#4A6278', padding: 10, cursor: 'pointer' }}>Annuler</button>
              <button onClick={saveOrg} disabled={saving} style={{ flex: 1, background: '#00FF94', color: '#080B0F', border: 'none', borderRadius: 8, padding: 10, fontWeight: 700, cursor: 'pointer' }}>
                {saving ? '...' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
