'use client';
import { useLang } from '@/lib/lang-context';
import { fetchAuthJson, fetchAuth } from '@/lib/fetch-auth';
import { useEffect, useState, useCallback } from 'react';

const ROLES = ['SUPER_ADMIN','ADMIN','ANALYST','AUDITOR','CLIENT','VIEWER'];
const PLANS = ['TRIAL','STARTER','GROWTH','ENTERPRISE'];
const PLAN_COLOR = { TRIAL:'#4A6278', STARTER:'#38BDF8', GROWTH:'#A78BFA', ENTERPRISE:'#FCD34D' };
const PLAN_LIMITS = {
  TRIAL:      { maxProjects:5,  maxUsers:3,  maxMW:100,   price:'Free' },
  STARTER:    { maxProjects:10, maxUsers:5,  maxMW:500,   price:'$299/mo' },
  GROWTH:     { maxProjects:50, maxUsers:20, maxMW:5000,  price:'$799/mo' },
  ENTERPRISE: { maxProjects:999,maxUsers:999,maxMW:99999, price:'Custom' },
};
const ROLE_C = { SUPER_ADMIN:'#F87171',ADMIN:'#FCD34D',ANALYST:'#00FF94',AUDITOR:'#38BDF8',CLIENT:'#A78BFA',VIEWER:'#4A6278' };

const inp = { width:'100%', background:'#0D1117', border:'1px solid #1E2D3D', borderRadius:7, color:'#E8EFF6', padding:'9px 12px', fontSize:13, boxSizing:'border-box' as const, outline:'none' };

export default function AdminUsersPage() {
  const { lang } = useLang();
  const L = (en, fr) => lang === 'fr' ? fr : en;

  const [users, setUsers]       = useState([]);
  const [total, setTotal]       = useState(0);
  const [search, setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [toast, setToast]       = useState(null);

  // Modals
  const [editUser, setEditUser] = useState(null);   // user object being edited
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving]     = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [newUser, setNewUser]   = useState({ name:'', email:'', password:'', role:'ANALYST' });
  const [creating, setCreating] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const toast$ = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const q = new URLSearchParams({ limit:'100', page:'1', ...(search&&{search}), ...(roleFilter&&{role:roleFilter}) });
      const data = await fetchAuthJson(`/admin/users?${q}`);
      setUsers(data.users || []);
      setTotal(data.total || data.users?.length || 0);
    } catch(e) { setError(e.message); setUsers([]); }
    finally { setLoading(false); }
  }, [search, roleFilter]);

  useEffect(() => { load(); }, [load]);

  const openEdit = (u) => {
    setEditUser(u);
    setEditForm({
      name: u.name,
      role: u.role,
      isActive: u.isActive,
      billingPlan: u.organization?.plan || 'TRIAL',
      organizationId: u.organizationId || '',
    });
  };

  const saveEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      const updated = await fetchAuthJson(`/admin/users/${editUser.id}`, {
        method:'PATCH', body:JSON.stringify(editForm)
      });
      setUsers(prev => prev.map(u => u.id === editUser.id ? { ...u, ...updated } : u));
      setEditUser(null);
      toast$('User updated!');
    } catch(e) { toast$(e.message,'error'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (u) => {
    try {
      await fetchAuthJson(`/admin/users/${u.id}`, { method:'PATCH', body:JSON.stringify({ isActive:!u.isActive }) });
      setUsers(prev => prev.map(x => x.id===u.id ? {...x, isActive:!u.isActive} : x));
      toast$(u.isActive ? 'User disabled' : 'User activated');
    } catch(e) { toast$(e.message,'error'); }
  };

  const changeRole = async (u, role) => {
    try {
      await fetchAuthJson(`/admin/users/${u.id}`, { method:'PATCH', body:JSON.stringify({ role }) });
      setUsers(prev => prev.map(x => x.id===u.id ? {...x, role} : x));
    } catch(e) { toast$(e.message,'error'); }
  };

  const deleteUserFn = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      await fetchAuthJson(`/admin/users/${deleteModal.id}`, { method:'DELETE' });
      setUsers(prev => prev.filter(u => u.id !== deleteModal.id));
      setTotal(prev => prev - 1);
      setDeleteModal(null);
      toast$('User deactivated');
    } catch(e) { toast$(e.message,'error'); }
    finally { setDeleting(false); }
  };

  const hardDelete = async () => {
    if (!deleteModal) return;
    if (!confirm(`PERMANENTLY delete ${deleteModal.name}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await fetchAuthJson(`/admin/users/${deleteModal.id}?hard=true`, { method:'DELETE' });
      setUsers(prev => prev.filter(u => u.id !== deleteModal.id));
      setTotal(prev => prev - 1);
      setDeleteModal(null);
      toast$('User permanently deleted');
    } catch(e) { toast$(e.message,'error'); }
    finally { setDeleting(false); }
  };

  const createUser = async () => {
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password.trim()) {
      toast$('All fields required','error'); return;
    }
    setCreating(true);
    try {
      const created = await fetchAuthJson('/admin/users', { method:'POST', body:JSON.stringify(newUser) });
      setUsers(prev => [{ ...created, isActive:true, emailVerified:true, loginCount:0, organization:null, _count:{projects:0} }, ...prev]);
      setTotal(prev => prev+1);
      setNewUser({ name:'', email:'', password:'', role:'ANALYST' });
      setCreateModal(false);
      toast$(`User ${created.name} created!`);
    } catch(e) { toast$(e.message||'Error','error'); }
    finally { setCreating(false); }
  };

  return (
    <div style={{ padding:24, maxWidth:1300, margin:'0 auto' }}>

      {toast && (
        <div style={{ position:'fixed', top:20, right:20, zIndex:9999, background:toast.type==='error'?'#F87171':'#00FF94', color:'#080B0F', padding:'12px 20px', borderRadius:10, fontWeight:700, fontSize:13, boxShadow:'0 4px 20px rgba(0,0,0,0.4)' }}>
          {toast.type==='error'?'❌ ':'✅ '}{toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:22, flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontSize:9, color:'#F87171', fontFamily:'JetBrains Mono, monospace', marginBottom:4 }}>
            ADMIN · {total} USER{total!==1?'S':''}
          </div>
          <h1 style={{ fontFamily:'Syne, sans-serif', fontSize:22, fontWeight:700, color:'#E8EFF6', margin:0 }}>
            {L('User Management','Gestion utilisateurs')}
          </h1>
        </div>
        <button onClick={() => { setCreateModal(true); setNewUser({ name:'', email:'', password:'', role:'ANALYST' }); }}
          style={{ background:'#00FF94', color:'#080B0F', border:'none', borderRadius:8, padding:'9px 18px', fontWeight:700, fontSize:13, cursor:'pointer' }}>
          + {L('New user','Nouvel utilisateur')}
        </button>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email..."
          style={{ flex:1, minWidth:200, background:'#0D1117', border:'1px solid #1E2D3D', borderRadius:7, color:'#E8EFF6', padding:'9px 12px', fontSize:13, outline:'none' }}/>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          style={{ background:'#0D1117', border:'1px solid #1E2D3D', borderRadius:7, color:'#E8EFF6', padding:'9px 12px', fontSize:13, cursor:'pointer' }}>
          <option value="">All roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <button onClick={load} style={{ background:'transparent', border:'1px solid #1E2D3D', borderRadius:7, color:'#4A6278', padding:'9px 14px', cursor:'pointer', fontSize:12 }}>↻</button>
      </div>

      {error && (
        <div style={{ background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.2)', borderRadius:8, padding:'10px 14px', marginBottom:14, fontSize:13, color:'#F87171', display:'flex', justifyContent:'space-between' }}>
          <span>⚠ {error}</span>
          <button onClick={load} style={{ background:'transparent', border:'none', color:'#F87171', cursor:'pointer', fontSize:12 }}>Retry</button>
        </div>
      )}

      {/* Table */}
      <div style={{ background:'#0D1117', border:'1px solid #1E2D3D', borderRadius:12, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'#121920' }}>
              {['User','Email','Role','Organization','Plan','Projects','Last login','Status','Actions'].map(col => (
                <th key={col} style={{ padding:'10px 12px', textAlign:'left', fontSize:9, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', textTransform:'uppercase' as const, borderBottom:'1px solid #1E2D3D', whiteSpace:'nowrap' }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding:40, textAlign:'center', color:'#4A6278' }}>⟳ Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={9} style={{ padding:40, textAlign:'center', color:'#4A6278', fontSize:13 }}>
                {search || roleFilter ? 'No results' : 'No users'}
              </td></tr>
            ) : (users as any[]).map(u => (
              <tr key={u.id}
                style={{ borderBottom:'1px solid rgba(30,45,61,0.4)' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(30,45,61,0.3)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                {/* User */}
                <td style={{ padding:'10px 12px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:30, height:30, borderRadius:'50%', background:`${ROLE_C[u.role]}18`, border:`1px solid ${ROLE_C[u.role]}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:ROLE_C[u.role], flexShrink:0 }}>
                      {u.name?.[0]?.toUpperCase()||'?'}
                    </div>
                    <div>
                      <div style={{ fontSize:13, color:'#E8EFF6', fontWeight:500 }}>{u.name}</div>
                      {u.emailVerified && <div style={{ fontSize:9, color:'#00FF94', fontFamily:'JetBrains Mono, monospace' }}>✓ verified</div>}
                    </div>
                  </div>
                </td>
                {/* Email */}
                <td style={{ padding:'10px 12px', fontSize:12, color:'#8FA3B8', fontFamily:'JetBrains Mono, monospace', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.email}</td>
                {/* Role */}
                <td style={{ padding:'10px 12px' }}>
                  <select value={u.role} onChange={e => changeRole(u, e.target.value)}
                    style={{ background:`${ROLE_C[u.role]}10`, border:`1px solid ${ROLE_C[u.role]}30`, borderRadius:5, color:ROLE_C[u.role], padding:'4px 7px', fontSize:11, cursor:'pointer', fontFamily:'JetBrains Mono, monospace', outline:'none' }}>
                    {ROLES.map(r => <option key={r} value={r} style={{ background:'#121920', color:'#E8EFF6' }}>{r}</option>)}
                  </select>
                </td>
                {/* Org */}
                <td style={{ padding:'10px 12px', fontSize:11, color:'#4A6278' }}>
                  {u.organization?.name || <span style={{ color:'#2A3F55' }}>—</span>}
                </td>
                {/* Plan */}
                <td style={{ padding:'10px 12px' }}>
                  <span style={{ fontSize:9, padding:'3px 8px', borderRadius:4, fontFamily:'JetBrains Mono, monospace',
                    background: `${PLAN_COLOR[u.organization?.plan]||'#4A6278'}15`,
                    color: PLAN_COLOR[u.organization?.plan] || '#4A6278',
                    border: `1px solid ${PLAN_COLOR[u.organization?.plan]||'#4A6278'}30` }}>
                    {u.organization?.plan || 'NO ORG'}
                  </span>
                </td>
                {/* Projects */}
                <td style={{ padding:'10px 12px', fontSize:12, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', textAlign:'center' }}>
                  {u._count?.projects || 0}
                </td>
                {/* Last login */}
                <td style={{ padding:'10px 12px', fontSize:11, color:'#4A6278', whiteSpace:'nowrap' }}>
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : <span style={{ color:'#2A3F55' }}>Never</span>}
                </td>
                {/* Status */}
                <td style={{ padding:'10px 12px' }}>
                  <span style={{ fontSize:10, padding:'3px 8px', borderRadius:4, fontFamily:'JetBrains Mono, monospace',
                    background: u.isActive ? 'rgba(0,255,148,0.08)' : 'rgba(248,113,113,0.08)',
                    color: u.isActive ? '#00FF94' : '#F87171',
                    border: `1px solid ${u.isActive?'rgba(0,255,148,0.2)':'rgba(248,113,113,0.2)'}` }}>
                    {u.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </td>
                {/* Actions */}
                <td style={{ padding:'10px 12px' }}>
                  <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                    <button onClick={() => openEdit(u)}
                      style={{ fontSize:11, background:'rgba(56,189,248,0.08)', border:'1px solid rgba(56,189,248,0.25)', borderRadius:5, color:'#38BDF8', padding:'4px 9px', cursor:'pointer' }}>
                      ✎ Edit
                    </button>
                    <button onClick={() => toggleActive(u)}
                      style={{ fontSize:11, background:'transparent', border:'1px solid #1E2D3D', borderRadius:5, color:u.isActive?'#F87171':'#00FF94', padding:'4px 9px', cursor:'pointer' }}>
                      {u.isActive ? '⊘ Disable' : '✓ Enable'}
                    </button>
                    <button onClick={() => setDeleteModal(u)}
                      style={{ fontSize:11, background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.25)', borderRadius:5, color:'#F87171', padding:'4px 9px', cursor:'pointer' }}>
                      🗑
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── EDIT USER MODAL ──────────────────────────────────────────────── */}
      {editUser && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.82)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}>
          <div style={{ background:'#121920', border:'1px solid #1E2D3D', borderRadius:14, padding:28, width:'100%', maxWidth:520, boxShadow:'0 24px 60px rgba(0,0,0,0.5)', maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div>
                <div style={{ fontSize:9, color:'#38BDF8', fontFamily:'JetBrains Mono, monospace', marginBottom:4 }}>EDIT USER</div>
                <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:18, color:'#E8EFF6', margin:0 }}>{editUser.name}</h2>
                <div style={{ fontSize:12, color:'#4A6278', marginTop:2 }}>{editUser.email}</div>
              </div>
              <button onClick={() => setEditUser(null)} style={{ background:'transparent', border:'none', color:'#4A6278', cursor:'pointer', fontSize:20 }}>✕</button>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {/* Name */}
              <div>
                <div style={{ fontSize:10, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:5 }}>FULL NAME</div>
                <input value={editForm.name||''} onChange={e => setEditForm(f => ({ ...f, name:e.target.value }))} style={inp}/>
              </div>

              {/* Role */}
              <div>
                <div style={{ fontSize:10, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:5 }}>ROLE</div>
                <select value={editForm.role||'ANALYST'} onChange={e => setEditForm(f => ({ ...f, role:e.target.value }))}
                  style={{ ...inp, cursor:'pointer' }}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {/* Status */}
              <div>
                <div style={{ fontSize:10, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:8 }}>ACCOUNT STATUS</div>
                <div style={{ display:'flex', gap:8 }}>
                  {[true, false].map(val => (
                    <button key={String(val)} onClick={() => setEditForm(f => ({ ...f, isActive:val }))}
                      style={{ flex:1, padding:'9px', borderRadius:7, border:`1px solid ${editForm.isActive===val?(val?'#00FF94':'#F87171'):'#1E2D3D'}`, background:editForm.isActive===val?(val?'rgba(0,255,148,0.08)':'rgba(248,113,113,0.08)'):'transparent', cursor:'pointer', fontSize:12, color:editForm.isActive===val?(val?'#00FF94':'#F87171'):'#4A6278' }}>
                      {val ? '✓ Active' : '⊘ Disabled'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Billing Plan */}
              {editUser.organizationId && (
                <div>
                  <div style={{ fontSize:10, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:8 }}>
                    BILLING PLAN
                    {editUser.organization?.name && <span style={{ color:'#2A3F55', marginLeft:8 }}>({editUser.organization.name})</span>}
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
                    {PLANS.map(plan => {
                      const limits = PLAN_LIMITS[plan];
                      const isSelected = editForm.billingPlan === plan;
                      const col = PLAN_COLOR[plan];
                      return (
                        <button key={plan} onClick={() => setEditForm(f => ({ ...f, billingPlan:plan }))}
                          style={{ padding:'10px 12px', borderRadius:8, border:`1px solid ${isSelected?col:'#1E2D3D'}`, background:isSelected?`${col}10`:'transparent', cursor:'pointer', textAlign:'left' }}>
                          <div style={{ fontSize:12, fontWeight:700, color:isSelected?col:'#E8EFF6', marginBottom:3 }}>{plan}</div>
                          <div style={{ fontSize:10, color:'#4A6278' }}>{limits.price}</div>
                          <div style={{ fontSize:9, color:'#2A3F55', marginTop:3 }}>
                            {limits.maxProjects}p · {limits.maxUsers}u · {limits.maxMW >= 99999 ? '∞' : limits.maxMW}MW
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ marginTop:8, padding:'8px 10px', background:'rgba(252,211,77,0.06)', border:'1px solid rgba(252,211,77,0.15)', borderRadius:7, fontSize:11, color:'#FCD34D' }}>
                    ⚠ {L('Changes apply to the entire organization','Les changements s\'appliquent à toute l\'organisation')}: {editUser.organization?.name}
                  </div>
                </div>
              )}

              {!editUser.organizationId && (
                <div style={{ padding:'10px 14px', background:'rgba(248,113,113,0.06)', border:'1px solid rgba(248,113,113,0.15)', borderRadius:8, fontSize:12, color:'#F87171' }}>
                  ⚠ {L('User has no organization — assign one to manage billing','Utilisateur sans organisation — assignez-en une pour gérer la facturation')}
                </div>
              )}
            </div>

            <div style={{ display:'flex', gap:10, marginTop:22 }}>
              <button onClick={() => setEditUser(null)}
                style={{ flex:1, background:'transparent', border:'1px solid #1E2D3D', borderRadius:8, color:'#4A6278', padding:12, cursor:'pointer' }}>
                {L('Cancel','Annuler')}
              </button>
              <button onClick={saveEdit} disabled={saving}
                style={{ flex:2, background:saving?'#1E2D3D':'#00FF94', color:saving?'#4A6278':'#080B0F', border:'none', borderRadius:8, padding:12, fontWeight:700, cursor:saving?'wait':'pointer', fontSize:13, fontFamily:'Syne, sans-serif' }}>
                {saving ? '⟳ Saving...' : `✓ ${L('Save changes','Enregistrer')}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE USER MODAL ────────────────────────────────────────────── */}
      {createModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.82)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}>
          <div style={{ background:'#121920', border:'1px solid #1E2D3D', borderRadius:14, padding:28, width:'100%', maxWidth:420 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
              <div>
                <div style={{ fontSize:9, color:'#00FF94', fontFamily:'JetBrains Mono, monospace', marginBottom:4 }}>NEW USER</div>
                <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:18, color:'#E8EFF6', margin:0 }}>Create user</h2>
              </div>
              <button onClick={() => setCreateModal(false)} style={{ background:'transparent', border:'none', color:'#4A6278', cursor:'pointer', fontSize:20 }}>✕</button>
            </div>
            <div style={{ background:'rgba(0,255,148,0.05)', border:'1px solid rgba(0,255,148,0.1)', borderRadius:7, padding:'8px 12px', marginBottom:18, fontSize:12, color:'#4A6278' }}>
              ℹ User created <span style={{ color:'#00FF94' }}>immediately active</span> — no email verification required.
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div>
                <div style={{ fontSize:10, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:5 }}>FULL NAME *</div>
                <input value={newUser.name} onChange={e => setNewUser(u => ({ ...u, name:e.target.value }))} placeholder="Aminata Diallo" autoFocus style={inp}/>
              </div>
              <div>
                <div style={{ fontSize:10, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:5 }}>EMAIL *</div>
                <input type="email" value={newUser.email} onChange={e => setNewUser(u => ({ ...u, email:e.target.value }))} placeholder="aminata@org.com" style={inp}/>
              </div>
              <div>
                <div style={{ fontSize:10, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:5 }}>PASSWORD *</div>
                <input type="password" value={newUser.password} onChange={e => setNewUser(u => ({ ...u, password:e.target.value }))} placeholder="8+ characters" style={inp}/>
              </div>
              <div>
                <div style={{ fontSize:10, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:5 }}>ROLE</div>
                <select value={newUser.role} onChange={e => setNewUser(u => ({ ...u, role:e.target.value }))}
                  style={{ ...inp, cursor:'pointer' }}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:'flex', gap:8, marginTop:20 }}>
              <button onClick={() => setCreateModal(false)}
                style={{ flex:1, background:'transparent', border:'1px solid #1E2D3D', borderRadius:8, color:'#4A6278', padding:11, cursor:'pointer' }}>
                Cancel
              </button>
              <button onClick={createUser} disabled={creating}
                style={{ flex:2, background:creating?'#1E2D3D':'#00FF94', color:creating?'#4A6278':'#080B0F', border:'none', borderRadius:8, padding:11, fontWeight:700, cursor:creating?'wait':'pointer', fontFamily:'Syne, sans-serif' }}>
                {creating ? '⟳ Creating...' : '✓ Create user'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE MODAL ─────────────────────────────────────────────────── */}
      {deleteModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#121920', border:'1px solid rgba(248,113,113,0.35)', borderRadius:16, padding:28, maxWidth:420, width:'90%' }}>
            <div style={{ width:52, height:52, borderRadius:'50%', background:'rgba(248,113,113,0.1)', border:'2px solid rgba(248,113,113,0.3)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:22 }}>
              🗑
            </div>
            <div style={{ fontSize:9, color:'#F87171', fontFamily:'JetBrains Mono, monospace', textAlign:'center', marginBottom:8 }}>USER MANAGEMENT</div>
            <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:17, color:'#E8EFF6', textAlign:'center', marginBottom:6 }}>
              Disable or delete?
            </h2>
            <p style={{ fontSize:13, color:'#8FA3B8', textAlign:'center', lineHeight:1.7, marginBottom:20 }}>
              <strong style={{ color:'#E8EFF6' }}>{deleteModal.name}</strong> ({deleteModal.email})
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <button onClick={deleteUserFn} disabled={deleting}
                style={{ background:'rgba(248,113,113,0.12)', border:'1px solid rgba(248,113,113,0.3)', borderRadius:8, color:'#F87171', padding:'11px', fontWeight:700, cursor:'pointer', fontSize:13 }}>
                {deleting ? '⟳' : '⊘ Disable account (reversible)'}
              </button>
              <button onClick={hardDelete} disabled={deleting}
                style={{ background:'#F87171', border:'none', borderRadius:8, color:'#fff', padding:'11px', fontWeight:700, cursor:'pointer', fontSize:13 }}>
                {deleting ? '⟳' : '🗑 Permanently delete (irreversible)'}
              </button>
              <button onClick={() => setDeleteModal(null)}
                style={{ background:'transparent', border:'1px solid #1E2D3D', borderRadius:8, color:'#4A6278', padding:'11px', cursor:'pointer' }}>
                {L('Cancel','Annuler')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
