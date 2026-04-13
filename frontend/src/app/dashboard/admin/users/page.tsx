'use client';
import { fetchAuth } from '@/lib/fetch-auth';
import { useEffect, useState, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL;
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('accessToken') : ''}` });

const ROLES = ['SUPER_ADMIN','ADMIN','ANALYST','AUDITOR','CLIENT','VIEWER'];
const ROLE_COLOR: Record<string, string> = {
  SUPER_ADMIN: '#F87171', ADMIN: '#FCD34D', ANALYST: '#00FF94',
  AUDITOR: '#38BDF8', CLIENT: '#A78BFA', VIEWER: '#4A6278'
};

const Label = ({ children }: any) => (
  <label style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
    {children}
  </label>
);

const Input = ({ type = 'text', value, onChange, placeholder, autoFocus }: any) => (
  <input type={type} value={value} onChange={onChange} placeholder={placeholder} autoFocus={autoFocus}
    style={{ width: '100%', background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '9px 12px', fontSize: 13, boxSizing: 'border-box' as const, outline: 'none', fontFamily: 'inherit' }}
    onFocus={e => e.target.style.borderColor = 'rgba(0,255,148,0.35)'}
    onBlur={e => e.target.style.borderColor = '#1E2D3D'}/>
);

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [creating, setCreating] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteUser, setDeleteUser] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'ANALYST' });

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const q = new URLSearchParams({
        ...(search && { search }),
        ...(roleFilter && { role: roleFilter }),
        limit: '100',
        page: '1',
      });
      const res = await fetchAuth(`/admin/users?${q}`);
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `Erreur ${res.status}`);
      }
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total || data.users?.length || 0);
    } catch (e: any) {
      setLoadError(e.message || 'Impossible de charger les utilisateurs');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => { load(); }, [load]);

  const updateUser = async (id: string, data: any) => {
    try {
      await fetchAuth(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data)  });
      // Mise à jour locale immédiate
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...data } : u));
    } catch (e: any) {
      alert('Erreur: ' + e.message);
    }
  };

  const deleteUserFn = async () => {
    if (!deleteUser) return;
    setDeleting(true);
    try {
      const res = await fetch(API + '/admin/users/' + deleteUser.id, { method: 'DELETE', headers: h() });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      setUsers(prev => prev.filter(u => u.id !== deleteUser.id));
      setTotal(prev => prev - 1);
      setDeleteUser(null);
    } catch (e: any) { alert('Erreur: ' + e.message); }
    finally { setDeleting(false); }
  };

  const createUser = async () => {
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password.trim()) {
      setSaveError('Tous les champs sont requis');
      return;
    }
    setSaving(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      const res = await fetchAuth(`/admin/users`, { method: 'POST', body: JSON.stringify(newUser),
       });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || `Erreur ${res.status}`);
        return;
      }
      // ✅ Ajout immédiat dans la liste (optimistic update)
      const createdUser = data.user || data;
      setUsers(prev => [{ ...createdUser, isActive: true, emailVerified: true, loginCount: 0, organization: null, _count: { projects: 0 } }, ...prev]);
      setTotal(prev => prev + 1);
      setSaveSuccess(`✓ Utilisateur ${newUser.name} créé avec succès`);

      // Reset le formulaire mais garder la modal ouverte 1s pour voir le succès
      setNewUser({ name: '', email: '', password: '', role: 'ANALYST' });
      setTimeout(() => {
        setCreating(false);
        setSaveSuccess('');
        // Re-fetch pour s'assurer de la synchro
        load();
      }, 1200);
    } catch (e: any) {
      setSaveError(e.message || 'Erreur réseau');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: '#F87171', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>
            ADMIN · {total} UTILISATEUR{total > 1 ? 'S' : ''}
          </div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: '#E8EFF6', margin: 0 }}>Gestion Utilisateurs</h1>
        </div>
        <button onClick={() => { setCreating(true); setSaveError(''); setSaveSuccess(''); }}
          style={{ background: '#00FF94', color: '#080B0F', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          + Nouvel utilisateur
        </button>
      </div>

      {/* Erreur chargement */}
      {loadError && (
        <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#F87171', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠️ {loadError}</span>
          <button onClick={load} style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 5, color: '#F87171', padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>
            Réessayer
          </button>
        </div>
      )}

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          style={{ flex: 1, minWidth: 200, background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '9px 12px', fontSize: 13, outline: 'none' }}
          placeholder="Rechercher par nom ou email..."
          value={search} onChange={e => setSearch(e.target.value)}/>
        <select
          style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '9px 12px', fontSize: 13, cursor: 'pointer' }}
          value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">Tous les rôles</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <button onClick={load} style={{ background: 'transparent', border: '1px solid #1E2D3D', borderRadius: 7, color: '#4A6278', padding: '9px 14px', cursor: 'pointer', fontSize: 12 }}>
          ↻ Actualiser
        </button>
      </div>

      {/* Table */}
      <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#121920' }}>
              {['Utilisateur', 'Email', 'Rôle', 'Organisation', 'Connexions', 'Dernière connexion', 'Statut', 'Actions'].map(col => (
                <th key={col} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' as const, borderBottom: '1px solid #1E2D3D', whiteSpace: 'nowrap' }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#4A6278' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 14, height: 14, border: '2px solid rgba(0,255,148,0.2)', borderTopColor: '#00FF94', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/>
                  Chargement...
                </div>
              </td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#4A6278', fontSize: 13 }}>
                {search || roleFilter ? 'Aucun résultat pour ces filtres' : 'Aucun utilisateur'}
              </td></tr>
            ) : users.map((u: any) => (
              <tr key={u.id} style={{ borderBottom: '1px solid rgba(30,45,61,0.4)', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(30,45,61,0.3)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: `${ROLE_COLOR[u.role]}18`, border: `1px solid ${ROLE_COLOR[u.role]}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: ROLE_COLOR[u.role], flexShrink: 0 }}>
                      {u.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, color: '#E8EFF6', fontWeight: 500 }}>{u.name}</div>
                      {u.emailVerified && <div style={{ fontSize: 9, color: '#00CC77', fontFamily: 'JetBrains Mono, monospace' }}>✓ email vérifié</div>}
                    </div>
                  </div>
                </td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: '#8FA3B8', fontFamily: 'JetBrains Mono, monospace', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</td>
                <td style={{ padding: '10px 14px' }}>
                  <select value={u.role}
                    onChange={e => updateUser(u.id, { role: e.target.value })}
                    style={{ background: `${ROLE_COLOR[u.role]}10`, border: `1px solid ${ROLE_COLOR[u.role]}30`, borderRadius: 5, color: ROLE_COLOR[u.role], padding: '4px 7px', fontSize: 11, cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace', outline: 'none' }}>
                    {ROLES.map(r => <option key={r} value={r} style={{ background: '#121920', color: '#E8EFF6' }}>{r}</option>)}
                  </select>
                </td>
                <td style={{ padding: '10px 14px', fontSize: 11, color: '#4A6278' }}>
                  {u.organization?.name || <span style={{ color: '#2A3F55' }}>—</span>}
                </td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', textAlign: 'center' }}>
                  {u.loginCount || 0}
                </td>
                <td style={{ padding: '10px 14px', fontSize: 11, color: '#4A6278', whiteSpace: 'nowrap' }}>
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('fr-FR') : <span style={{ color: '#2A3F55' }}>Jamais</span>}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap',
                    background: u.isActive ? 'rgba(0,255,148,0.08)' : 'rgba(248,113,113,0.08)',
                    color: u.isActive ? '#00FF94' : '#F87171',
                    border: `1px solid ${u.isActive ? 'rgba(0,255,148,0.2)' : 'rgba(248,113,113,0.2)'}` }}>
                    {u.isActive ? 'ACTIF' : 'INACTIF'}
                  </span>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button onClick={() => updateUser(u.id, { isActive: !u.isActive })}
                      style={{ fontSize: 11, background: 'transparent', border: '1px solid #1E2D3D', borderRadius: 5, color: u.isActive ? '#F87171' : '#00FF94', padding: '4px 9px', cursor: 'pointer' }}>
                      {u.isActive ? 'Desactiver' : 'Activer'}
                    </button>
                    <button onClick={() => setDeleteUser(u)}
                      style={{ fontSize: 11, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 5, color: '#F87171', padding: '4px 9px', cursor: 'pointer' }}>
                      Supprimer
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      {creating && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#121920', border: '1px solid #1E2D3D', borderRadius: 14, padding: 28, width: '100%', maxWidth: 420, boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, color: '#E8EFF6', margin: 0 }}>Nouvel utilisateur</h2>
              <button onClick={() => { setCreating(false); setSaveError(''); setSaveSuccess(''); }}
                style={{ background: 'transparent', border: 'none', color: '#4A6278', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ fontSize: 12, color: '#4A6278', background: 'rgba(0,255,148,0.05)', border: '1px solid rgba(0,255,148,0.1)', borderRadius: 7, padding: '8px 12px', marginBottom: 18 }}>
              ℹ️ Cet utilisateur est créé <strong style={{ color: '#00FF94' }}>directement actif</strong> sans vérification email requise.
            </div>

            {saveError && (
              <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 7, padding: '8px 12px', marginBottom: 14, fontSize: 13, color: '#F87171' }}>
                ✗ {saveError}
              </div>
            )}
            {saveSuccess && (
              <div style={{ background: 'rgba(0,255,148,0.1)', border: '1px solid rgba(0,255,148,0.2)', borderRadius: 7, padding: '8px 12px', marginBottom: 14, fontSize: 13, color: '#00FF94', display: 'flex', alignItems: 'center', gap: 6 }}>
                {saveSuccess}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><Label>Nom complet *</Label>
                <Input value={newUser.name} onChange={(e: any) => setNewUser(u => ({ ...u, name: e.target.value }))} placeholder="Aminata Diallo" autoFocus/>
              </div>
              <div><Label>Email *</Label>
                <Input type="email" value={newUser.email} onChange={(e: any) => setNewUser(u => ({ ...u, email: e.target.value }))} placeholder="aminata@organisation.com"/>
              </div>
              <div><Label>Mot de passe *</Label>
                <Input type="password" value={newUser.password} onChange={(e: any) => setNewUser(u => ({ ...u, password: e.target.value }))} placeholder="8 caractères minimum"/>
              </div>
              <div>
                <Label>Rôle</Label>
                <select value={newUser.role} onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))}
                  style={{ width: '100%', background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '9px 12px', fontSize: 13, cursor: 'pointer', outline: 'none' }}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 22 }}>
              <button onClick={() => { setCreating(false); setSaveError(''); setSaveSuccess(''); }}
                style={{ flex: 1, background: 'transparent', border: '1px solid #1E2D3D', borderRadius: 8, color: '#4A6278', padding: '10px', cursor: 'pointer', fontSize: 13 }}>
                Annuler
              </button>
              <button onClick={createUser} disabled={saving}
                style={{ flex: 1, background: saving ? '#1E2D3D' : '#00FF94', color: saving ? '#4A6278' : '#080B0F', border: 'none', borderRadius: 8, padding: '10px', fontWeight: 700, cursor: saving ? 'wait' : 'pointer', fontSize: 13, transition: 'all 0.15s' }}>
                {saving ? '⏳ Création...' : '✓ Créer l\'utilisateur'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>

      {deleteUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#121920', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 14, padding: 28, maxWidth: 420, width: '90%' }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, color: '#F87171', marginBottom: 8 }}>Supprimer cet utilisateur ?</h2>
            <p style={{ fontSize: 13, color: '#8FA3B8', lineHeight: 1.7, marginBottom: 16 }}>
              <strong style={{ color: '#E8EFF6' }}>{deleteUser && deleteUser.name}</strong> ({deleteUser && deleteUser.email}) sera supprime.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setDeleteUser(null)} style={{ flex: 1, background: 'transparent', border: '1px solid #1E2D3D', borderRadius: 8, color: '#4A6278', padding: 10, cursor: 'pointer' }}>Annuler</button>
              <button onClick={deleteUserFn} disabled={deleting} style={{ flex: 1, background: '#F87171', color: '#080B0F', border: 'none', borderRadius: 8, padding: 10, fontWeight: 700, cursor: 'pointer' }}>
                {deleting ? '...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
  );
}
