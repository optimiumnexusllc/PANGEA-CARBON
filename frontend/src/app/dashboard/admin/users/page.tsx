'use client';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL;
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken')}` });

const ROLES = ['SUPER_ADMIN','ADMIN','ANALYST','AUDITOR','CLIENT','VIEWER'];
const ROLE_COLOR: Record<string, string> = { SUPER_ADMIN: '#F87171', ADMIN: '#FCD34D', ANALYST: '#00FF94', AUDITOR: '#38BDF8', CLIENT: '#A78BFA', VIEWER: '#4A6278' };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const forceRefresh = () => setRefreshKey(k => k + 1);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'ANALYST' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    const q = new URLSearchParams({ ...(search && { search }), ...(roleFilter && { role: roleFilter }), limit: '50' });
    fetch(`${API}/admin/users?${q}`, { headers: h() })
      .then(r => r.json()).then(d => { setUsers(d.users || []); setTotal(d.total || 0); })
      .catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [search, roleFilter, refreshKey]);

  const updateUser = async (id: string, data: any) => {
    await fetch(`${API}/admin/users/${id}`, { method: 'PATCH', headers: h(), body: JSON.stringify(data) });
    forceRefresh();
  };

  const createUser = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/admin/users`, { method: 'POST', headers: h(), body: JSON.stringify(newUser) });
      if (!res.ok) { const e = await res.json(); alert(e.error); return; }
      setCreating(false);
      setNewUser({ name: '', email: '', password: '', role: 'ANALYST' });
      forceRefresh();
    } finally { setSaving(false); }
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 10, color: '#F87171', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>ADMIN · {total} UTILISATEURS</div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: '#E8EFF6', margin: 0 }}>Gestion Utilisateurs</h1>
        </div>
        <button onClick={() => setCreating(true)} style={{ background: '#00FF94', color: '#080B0F', border: 'none', borderRadius: 7, padding: '8px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          + Nouvel utilisateur
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input style={{ flex: 1, background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 6, color: '#E8EFF6', padding: '8px 12px', fontSize: 13, outline: 'none' }}
          placeholder="Rechercher par nom ou email..."
          value={search} onChange={e => setSearch(e.target.value)}/>
        <select style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 6, color: '#E8EFF6', padding: '8px 12px', fontSize: 13 }}
          value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">Tous les rôles</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#121920' }}>
              {['Nom', 'Email', 'Rôle', 'Organisation', 'Connexions', 'Dernière connexion', 'Statut', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', borderBottom: '1px solid #1E2D3D' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: '#4A6278' }}>Chargement...</td></tr>
            ) : users.map((u: any) => (
              <tr key={u.id} style={{ borderBottom: '1px solid rgba(30,45,61,0.4)' }}>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${ROLE_COLOR[u.role]}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: ROLE_COLOR[u.role] }}>
                      {u.name?.[0]?.toUpperCase()}
                    </div>
                    <span style={{ fontSize: 13, color: '#E8EFF6', fontWeight: 500 }}>{u.name}</span>
                  </div>
                </td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: '#8FA3B8', fontFamily: 'JetBrains Mono, monospace' }}>{u.email}</td>
                <td style={{ padding: '10px 14px' }}>
                  <select value={u.role} onChange={e => updateUser(u.id, { role: e.target.value })}
                    style={{ background: `${ROLE_COLOR[u.role]}10`, border: `1px solid ${ROLE_COLOR[u.role]}30`, borderRadius: 5, color: ROLE_COLOR[u.role], padding: '3px 6px', fontSize: 11, cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td style={{ padding: '10px 14px', fontSize: 11, color: '#4A6278' }}>{u.organization?.name || '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>{u.loginCount || 0}</td>
                <td style={{ padding: '10px 14px', fontSize: 11, color: '#4A6278' }}>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('fr-FR') : 'Jamais'}</td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ fontSize: 10, padding: '3px 7px', borderRadius: 4, fontFamily: 'JetBrains Mono, monospace',
                    background: u.isActive ? 'rgba(0,255,148,0.1)' : 'rgba(248,113,113,0.1)',
                    color: u.isActive ? '#00FF94' : '#F87171',
                    border: `1px solid ${u.isActive ? 'rgba(0,255,148,0.2)' : 'rgba(248,113,113,0.2)'}` }}>
                    {u.isActive ? 'ACTIF' : 'INACTIF'}
                  </span>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <button onClick={() => updateUser(u.id, { isActive: !u.isActive })}
                    style={{ fontSize: 11, background: 'transparent', border: '1px solid #1E2D3D', borderRadius: 5, color: '#4A6278', padding: '4px 8px', cursor: 'pointer' }}>
                    {u.isActive ? 'Désactiver' : 'Activer'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      {creating && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#121920', border: '1px solid #1E2D3D', borderRadius: 12, padding: 28, width: 420 }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, color: '#E8EFF6', marginTop: 0, marginBottom: 20 }}>Créer un utilisateur</h2>
            {[['Nom complet', 'name', 'text'], ['Email', 'email', 'email'], ['Mot de passe', 'password', 'password']].map(([label, key, type]) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>{label}</label>
                <input type={type} value={(newUser as any)[key]} onChange={e => setNewUser(u => ({ ...u, [key]: e.target.value }))}
                  style={{ width: '100%', background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 6, color: '#E8EFF6', padding: '8px 12px', fontSize: 13, boxSizing: 'border-box', outline: 'none' }}/>
              </div>
            ))}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>Rôle</label>
              <select value={newUser.role} onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))}
                style={{ width: '100%', background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 6, color: '#E8EFF6', padding: '8px 12px', fontSize: 13 }}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setCreating(false)} style={{ flex: 1, background: 'transparent', border: '1px solid #1E2D3D', borderRadius: 7, color: '#4A6278', padding: '9px', cursor: 'pointer' }}>Annuler</button>
              <button onClick={createUser} disabled={saving} style={{ flex: 1, background: '#00FF94', color: '#080B0F', border: 'none', borderRadius: 7, padding: '9px', fontWeight: 700, cursor: 'pointer' }}>
                {saving ? '...' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
