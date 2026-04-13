'use client';
import { fetchAuth } from '@/lib/fetch-auth';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL;
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken')}` });
const PLAN_COLOR: Record<string, string> = { FREE: '#4A6278', TRIAL: '#FCD34D', STARTER: '#38BDF8', PRO: '#00FF94', ENTERPRISE: '#A78BFA', CUSTOM: '#F87171' };
const STATUS_COLOR: Record<string, string> = { ACTIVE: '#00FF94', TRIAL: '#FCD34D', SUSPENDED: '#F87171', CHURNED: '#4A6278' };

export default function AdminOrgsPage() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
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
    </div>
  );
}
