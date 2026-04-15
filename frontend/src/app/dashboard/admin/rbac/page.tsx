'use client';
import { useEffect, useState, useCallback } from 'react';
import { fetchAuthJson } from '@/lib/fetch-auth';
import { useLang } from '@/lib/lang-context';

const C = {
  bg:'#080B0F', card:'#0D1117', card2:'#0A1628', border:'#1E2D3D',
  green:'#00FF94', red:'#F87171', yellow:'#FCD34D', blue:'#38BDF8',
  purple:'#A78BFA', orange:'#F97316', muted:'#4A6278', text:'#E8EFF6', text2:'#8FA3B8',
};

const ROLE_META: Record<string,{label:string;color:string;icon:string;desc:string}> = {
  SUPER_ADMIN: { label:'Super Admin',  color:'#F87171', icon:'⚡', descEn:'Full access — PANGEA team only', descFr:'Accès total — équipe PANGEA uniquement' },
  ADMIN:       { label:'Admin',        color:'#FCD34D', icon:'🛡', descEn:'Restricted admin console', descFr:'Console admin restreinte' },
  ORG_OWNER:   { label:'Org Owner',    color:'#00FF94', icon:'👑', descEn:'Account owner — all business features', descFr:'Propriétaire de compte — toutes les fonctionnalités' },
  ANALYST:     { label:'Analyst',      color:'#38BDF8', icon:'📊', descEn:'Standard collaborator', descFr:'Collaborateur standard' },
  AUDITOR:     { label:'Auditor',      color:'#A78BFA', icon:'🔍', descEn:'Audit access only', descFr:'Accès audit uniquement' },
  CLIENT:      { label:'Client',       color:'#8FA3B8', icon:'🏢', descEn:'External buyer', descFr:'Acheteur externe' },
  VIEWER:      { label:'Viewer',       color:'#4A6278', icon:'👁', descEn:'Read-only access', descFr:'Lecture seule' },
};

const MODULE_META: Record<string,{label:string;icon:string;color:string}> = {
  projects:    { label:'Projects',     icon:'📁', color:'#38BDF8' },
  pipeline:    { label:'Pipeline',     icon:'🔄', color:'#00FF94' },
  ghg_audit:   { label:'GHG Audit',   icon:'📋', color:'#A78BFA' },
  marketplace: { label:'Marketplace', icon:'🏪', color:'#FCD34D' },
  seller:      { label:'Seller',       icon:'💰', color:'#00FF94' },
  buyer:       { label:'Buyer/Demand', icon:'🏢', color:'#F97316' },
  reports:     { label:'Reports',      icon:'📄', color:'#38BDF8' },
  api_keys:    { label:'API Keys',     icon:'🔑', color:'#A78BFA' },
  mrv:         { label:'MRV',          icon:'📡', color:'#00FF94' },
  baseline:    { label:'Baseline',     icon:'📐', color:'#FCD34D' },
  carbon_desk: { label:'Carbon Desk', icon:'📡', color:'#F97316' },
  users:       { label:'Users',        icon:'👥', color:'#F87171' },
  orgs:        { label:'Orgs',         icon:'🏛', color:'#F87171' },
  billing:     { label:'Billing',      icon:'💳', color:'#F87171' },
  features:    { label:'Features',     icon:'⚙️', color:'#F87171' },
  super:       { label:'Super',        icon:'⚡', color:'#F87171' },
  esg:         { label:'ESG Engine',   icon:'⬡', color:'#60A5FA' },
  carbon_tax:  { label:'Carbon Tax',   icon:'📊', color:'#F97316' },
  email_comp:  { label:'Email Composer',icon:'✉️', color:'#A78BFA' },
};

const GROUP_COLORS = ['#00FF94','#38BDF8','#A78BFA','#FCD34D','#F97316','#F87171','#8FA3B8'];

const inp = { background:C.card2, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, padding:'10px 14px', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box' as const };

export default function RBACPage() {
  const { lang } = useLang();
  const L = (en: string, fr: string) => lang === 'fr' ? fr : en;
  const [tab, setTab] = useState<'matrix'|'groups'|'users'|'audit'>('matrix');
  const [matrix, setMatrix] = useState<any>({});
  const [allPerms, setAllPerms] = useState<any>({});
  const [roles, setRoles] = useState<string[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userPerms, setUserPerms] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{msg:string;type:string}|null>(null);

  // Group form
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editGroup, setEditGroup] = useState<any>(null);
  const [groupForm, setGroupForm] = useState({ name:'', description:'', color:'#00FF94', icon:'👥', permissions:[] as string[], priority:0 });

  // Add member
  const [addingMember, setAddingMember] = useState<string|null>(null);
  const [memberUserId, setMemberUserId] = useState('');

  const showToast = (msg:string, type='success') => {
    setToast({msg,type}); setTimeout(()=>setToast(null),4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, g, u] = await Promise.all([
        fetchAuthJson('/rbac/matrix'),
        fetchAuthJson('/rbac/groups'),
        fetchAuthJson('/admin/users?limit=200&page=1').catch(()=>({users:[]})),
      ]);
      setMatrix(m.matrix || {});
      setAllPerms(m.allPermissions || {});
      setRoles(m.roles || []);
      setGroups(g.groups || []);
      setUsers(u.users || []);
    } catch(e:any) { showToast(e.message,'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ load(); },[load]);

  const loadUserPerms = async (userId:string) => {
    try {
      const data = await fetchAuthJson('/rbac/users/'+userId+'/permissions');
      setUserPerms(data);
    } catch(e:any) { showToast(e.message,'error'); }
  };

  const togglePermission = async (role:string, mod:string, perm:string) => {
    const full = `${mod}.${perm}`;
    const current = matrix[role] || [];
    const granted = !current.includes(full);
    try {
      await fetchAuthJson('/rbac/matrix', {
        method:'PATCH',
        body: JSON.stringify({ role, permission: full, granted, reason:'Manual toggle' })
      });
      setMatrix((prev:any) => {
        const perms = [...(prev[role]||[])];
        if (granted) perms.push(full);
        else { const i = perms.indexOf(full); if(i>=0) perms.splice(i,1); }
        return { ...prev, [role]: perms };
      });
      showToast(`${granted?'✓ Accordé':'✗ Révoqué'}: ${role} → ${full}`);
    } catch(e:any) { showToast(e.message,'error'); }
  };

  const saveGroup = async () => {
    try {
      if (editGroup) {
        await fetchAuthJson('/rbac/groups/'+editGroup.id, { method:'PUT', body: JSON.stringify(groupForm) });
      } else {
        await fetchAuthJson('/rbac/groups', { method:'POST', body: JSON.stringify(groupForm) });
      }
      showToast(editGroup ? 'Groupe mis à jour' : 'Groupe créé !');
      setShowGroupForm(false); setEditGroup(null);
      setGroupForm({ name:'', description:'', color:'#00FF94', icon:'👥', permissions:[], priority:0 });
      await load();
    } catch(e:any) { showToast(e.message,'error'); }
  };

  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState<string|null>(null);

  const deleteGroup = async (id:string) => {
    setConfirmDeleteGroup(id);
  };

  const executeDeleteGroup = async () => {
    if (!confirmDeleteGroup) return;
    const id = confirmDeleteGroup;
    setConfirmDeleteGroup(null);
    try {
      await fetchAuthJson('/rbac/groups/'+id, { method:'DELETE' });
      showToast('Groupe supprimé'); await load();
    } catch(e:any) { showToast(e.message,'error'); }
  };

  const addMember = async (groupId:string) => {
    if (!memberUserId) return;
    try {
      await fetchAuthJson('/rbac/groups/'+groupId+'/members', { method:'POST', body: JSON.stringify({ userId: memberUserId }) });
      showToast('Membre ajouté !'); setAddingMember(null); setMemberUserId(''); await load();
    } catch(e:any) { showToast(e.message,'error'); }
  };

  const removeMember = async (groupId:string, userId:string) => {
    try {
      await fetchAuthJson('/rbac/groups/'+groupId+'/members/'+userId, { method:'DELETE' });
      showToast('Membre retiré'); await load();
    } catch(e:any) { showToast(e.message,'error'); }
  };

  const toggleGroupPerm = (perm:string) => {
    const curr = groupForm.permissions;
    const next = curr.includes(perm) ? curr.filter(p=>p!==perm) : [...curr, perm];
    setGroupForm(f=>({...f, permissions:next}));
  };

  if (loading) return <div style={{padding:40, textAlign:'center', color:C.muted, fontFamily:'JetBrains Mono, monospace', fontSize:11}}>◌ LOADING RBAC ENGINE...</div>;

  return (
    <div style={{padding:24, maxWidth:1600, margin:'0 auto'}}>

      {/* Toast */}
      {toast && (
        <div style={{position:'fixed',top:20,right:20,zIndex:99999,maxWidth:420}}>
          <div style={{background:toast.type==='error'?'rgba(248,113,113,0.1)':'rgba(0,255,148,0.08)', border:`1px solid ${toast.type==='error'?'rgba(248,113,113,0.35)':'rgba(0,255,148,0.3)'}`, borderRadius:12, padding:'14px 18px', display:'flex', alignItems:'center', gap:12, backdropFilter:'blur(20px)', boxShadow:'0 8px 32px rgba(0,0,0,0.5)', position:'relative', overflow:'hidden'}}>
            <div style={{position:'absolute',left:0,top:0,bottom:0,width:3,background:toast.type==='error'?C.red:C.green}}/>
            <div style={{width:22,height:22,borderRadius:'50%',background:toast.type==='error'?'rgba(248,113,113,0.15)':'rgba(0,255,148,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:toast.type==='error'?C.red:C.green,fontWeight:800,marginLeft:8}}>{toast.type==='error'?'✗':'✓'}</div>
            <span style={{fontSize:13,color:C.text,flex:1}}>{toast.msg}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{marginBottom:28}}>
        <div style={{fontSize:9,color:C.red,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.15em',marginBottom:8}}>PANGEA CARBON · RBAC ENGINE v2.0</div>
        <h1 style={{fontFamily:'Syne, sans-serif',fontSize:26,fontWeight:800,color:C.text,margin:0,marginBottom:6}}>Gestion des Rôles & Permissions</h1>
        <p style={{fontSize:13,color:C.muted,margin:0}}>Matrice RBAC complète — Définissez qui peut faire quoi sur PANGEA CARBON</p>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:2,marginBottom:24,borderBottom:`1px solid ${C.border}`}}>
        {([
          ['matrix','Matrice Permissions','🗂'],
          ['groups','Groupes','👥'],
          ['users','Permissions Users','👤'],
          ['audit','Audit Log','📋'],
        ] as [string,string,string][]).map(([id,label,icon])=>(
          <button key={id} onClick={()=>setTab(id as any)}
            style={{padding:'11px 20px',border:'none',cursor:'pointer',fontSize:12,fontWeight:600,fontFamily:'JetBrains Mono, monospace',borderBottom:`2px solid ${tab===id?C.red:'transparent'}`,background:'transparent',color:tab===id?C.red:C.muted,transition:'all .15s'}}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* ── MATRICE ──────────────────────────────────────────────────────── */}
      {tab === 'matrix' && (
        <div>
          <div style={{fontSize:11,color:C.muted,marginBottom:16,lineHeight:1.7}}>
            {L('⚡ Click a cell to grant/revoke a permission. Changes are persisted to DB and effective immediately.','⚡ Cliquez sur une cellule pour accorder/révoquer une permission. Les changements sont persistés en DB et pris en compte immédiatement.')}<br/>
            <span style={{color:C.yellow}}>⚠ SUPER_ADMIN a toujours accès à tout — non modifiable.</span>
          </div>

          {/* Légende rôles */}
          <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:20}}>
            {roles.map(role => {
              const m = ROLE_META[role];
              return (
                <div key={role} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 12px',background:`${m?.color||C.muted}10`,border:`1px solid ${m?.color||C.muted}30`,borderRadius:8}}>
                  <span style={{fontSize:14}}>{m?.icon}</span>
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:m?.color||C.muted,fontFamily:'JetBrains Mono, monospace'}}>{m?.label||role}</div>
                    <div style={{fontSize:9,color:C.muted}}>{m?.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Matrice */}
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
              <thead>
                <tr>
                  <th style={{padding:'10px 14px',textAlign:'left',fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',borderBottom:`1px solid ${C.border}`,background:C.card,position:'sticky',left:0,zIndex:10,minWidth:180}}>MODULE · PERMISSION</th>
                  {roles.map(role => {
                    const m = ROLE_META[role];
                    return (
                      <th key={role} style={{padding:'10px 14px',textAlign:'center',fontSize:9,color:m?.color||C.muted,fontFamily:'JetBrains Mono, monospace',borderBottom:`1px solid ${C.border}`,background:C.card,minWidth:90,whiteSpace:'nowrap'}}>
                        <div style={{fontSize:16,marginBottom:4}}>{m?.icon}</div>
                        {m?.label||role}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {Object.entries(allPerms).map(([mod, perms]) => {
                  const mm = MODULE_META[mod];
                  return (perms as string[]).map((perm, pi) => {
                    const full = `${mod}.${perm}`;
                    return (
                      <tr key={full} style={{background: pi===0 ? `${mm?.color||C.muted}05` : 'transparent', borderBottom:`1px solid ${C.border}22`}}>
                        <td style={{padding:'8px 14px',position:'sticky',left:0,background: pi===0 ? `${mm?.color||C.muted}08` : C.card, zIndex:5, borderBottom:`1px solid ${C.border}30`}}>
                          {pi===0 && <div style={{fontSize:10,fontWeight:700,color:mm?.color||C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:2}}>{mm?.icon} {mm?.label||mod}</div>}
                          <div style={{fontSize:11,color:C.text2,paddingLeft: pi>0?14:0,fontFamily:'JetBrains Mono, monospace'}}>{perm}</div>
                        </td>
                        {roles.map(role => {
                          const hasPerm = (matrix[role]||[]).includes('*') || (matrix[role]||[]).includes(full);
                          const isSuperAdmin = role === 'SUPER_ADMIN';
                          return (
                            <td key={role} style={{padding:'8px',textAlign:'center',cursor:isSuperAdmin?'default':'pointer',transition:'background .1s'}}
                              onClick={() => !isSuperAdmin && togglePermission(role, mod, perm)}>
                              <div style={{
                                width:28, height:28, borderRadius:8, margin:'0 auto',
                                display:'flex', alignItems:'center', justifyContent:'center',
                                background: hasPerm ? `${ROLE_META[role]?.color||C.green}20` : `rgba(255,255,255,0.03)`,
                                border: `1px solid ${hasPerm ? (ROLE_META[role]?.color||C.green)+'40' : C.border}`,
                                color: hasPerm ? (ROLE_META[role]?.color||C.green) : C.border,
                                fontSize:14, fontWeight:800,
                                transition:'all .15s',
                              }}>
                                {hasPerm ? '✓' : isSuperAdmin ? '∞' : '·'}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── GROUPES ──────────────────────────────────────────────────────── */}
      {tab === 'groups' && (
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
            <div style={{fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace'}}>{groups.length} GROUPES</div>
            <button onClick={()=>{setShowGroupForm(true);setEditGroup(null);setGroupForm({name:'',description:'',color:'#00FF94',icon:'👥',permissions:[],priority:0});}}
              style={{background:'rgba(0,255,148,0.1)',border:'1px solid rgba(0,255,148,0.3)',borderRadius:9,color:C.green,padding:'9px 18px',cursor:'pointer',fontSize:12,fontWeight:700}}>
              + Nouveau groupe
            </button>
          </div>

          {/* Group Form Modal */}
          {showGroupForm && (
            <div onClick={e=>{if(e.target===e.currentTarget){setShowGroupForm(false);setEditGroup(null);}}} style={{position:'fixed',inset:0,background:'rgba(8,11,15,0.88)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10000,backdropFilter:'blur(10px)'}}>
              <div style={{background:C.card,border:`1px solid rgba(0,255,148,0.25)`,borderRadius:16,padding:28,maxWidth:600,width:'90%',maxHeight:'90vh',overflowY:'auto'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
                  <h2 style={{fontFamily:'Syne, sans-serif',fontSize:18,fontWeight:800,color:C.green,margin:0}}>{editGroup ? 'Modifier le groupe' : 'Nouveau groupe'}</h2>
                  <button onClick={()=>{setShowGroupForm(false);setEditGroup(null);}} style={{background:'transparent',border:`1px solid ${C.border}`,borderRadius:8,color:C.muted,cursor:'pointer',width:30,height:30,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
                </div>

                <div style={{display:'flex',flexDirection:'column',gap:14}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                    <div>
                      <div style={{fontSize:10,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:6}}>NOM DU GROUPE *</div>
                      <input style={inp} placeholder="Ex: Pipeline Managers" value={groupForm.name} onChange={e=>setGroupForm(f=>({...f,name:e.target.value}))} autoFocus/>
                    </div>
                    <div>
                      <div style={{fontSize:10,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:6}}>ICÔNE</div>
                      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                        {['👥','⚡','🎯','🏢','📊','🔑','🛡','💰','📋','🔍','🌿','⚙️'].map(icon=>(
                          <button key={icon} onClick={()=>setGroupForm(f=>({...f,icon}))}
                            style={{width:34,height:34,borderRadius:8,border:`1px solid ${groupForm.icon===icon?C.green:C.border}`,background:groupForm.icon===icon?'rgba(0,255,148,0.1)':C.card2,cursor:'pointer',fontSize:16}}>
                            {icon}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div style={{fontSize:10,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:6}}>DESCRIPTION</div>
                    <input style={inp} placeholder="Description du groupe et de son rôle" value={groupForm.description} onChange={e=>setGroupForm(f=>({...f,description:e.target.value}))}/>
                  </div>

                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                    <div>
                      <div style={{fontSize:10,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:6}}>COULEUR</div>
                      <div style={{display:'flex',gap:6}}>
                        {GROUP_COLORS.map(color=>(
                          <button key={color} onClick={()=>setGroupForm(f=>({...f,color}))}
                            style={{width:28,height:28,borderRadius:'50%',background:color,border:`2px solid ${groupForm.color===color?'white':'transparent'}`,cursor:'pointer'}}/>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div style={{fontSize:10,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:6}}>PRIORITÉ (0-100)</div>
                      <input style={inp} type="number" min="0" max="100" placeholder="0" value={groupForm.priority} onChange={e=>setGroupForm(f=>({...f,priority:parseInt(e.target.value)||0}))}/>
                    </div>
                  </div>

                  {/* Permission picker */}
                  <div>
                    <div style={{fontSize:10,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:10}}>
                      PERMISSIONS DU GROUPE — {groupForm.permissions.length} sélectionnées
                      <span style={{color:C.muted,marginLeft:8,fontSize:9}}>Préfixe - pour révoquer (ex: -pipeline.cancel)</span>
                    </div>
                    <div style={{maxHeight:300,overflowY:'auto',display:'flex',flexDirection:'column',gap:8}}>
                      {Object.entries(allPerms).map(([mod,perms])=>{
                        const mm=MODULE_META[mod];
                        return (
                          <div key={mod} style={{background:C.card2,borderRadius:10,padding:12,border:`1px solid ${C.border}`}}>
                            <div style={{fontSize:10,color:mm?.color||C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:8,fontWeight:700}}>
                              {mm?.icon} {mm?.label||mod}
                            </div>
                            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                              {(perms as string[]).map(perm=>{
                                const full=`${mod}.${perm}`;
                                const sel=groupForm.permissions.includes(full);
                                return (
                                  <button key={perm} onClick={()=>toggleGroupPerm(full)}
                                    style={{padding:'4px 10px',borderRadius:6,border:`1px solid ${sel?(mm?.color||C.green)+'50':C.border}`,background:sel?`${mm?.color||C.green}15`:C.card,color:sel?(mm?.color||C.green):C.muted,cursor:'pointer',fontSize:10,fontFamily:'JetBrains Mono, monospace',transition:'all .15s'}}>
                                    {sel?'✓ ':''}{perm}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{display:'flex',gap:10,marginTop:8}}>
                    <button onClick={()=>{setShowGroupForm(false);setEditGroup(null);}} style={{flex:1,background:'transparent',border:`1px solid ${C.border}`,borderRadius:9,color:C.muted,padding:11,cursor:'pointer',fontSize:13}}>Annuler</button>
                    <button onClick={saveGroup} style={{flex:2,background:'rgba(0,255,148,0.12)',border:'1px solid rgba(0,255,148,0.35)',borderRadius:9,color:C.green,padding:11,fontWeight:800,cursor:'pointer',fontSize:13,fontFamily:'Syne, sans-serif'}}>
                      💾 {editGroup?'Mettre à jour':'Créer le groupe'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Groups list */}
          {groups.length === 0 ? (
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:48,textAlign:'center'}}>
              <div style={{fontSize:40,marginBottom:16}}>👥</div>
              <div style={{fontSize:15,color:C.text,fontWeight:700,marginBottom:8}}>Aucun groupe créé</div>
              <div style={{fontSize:13,color:C.muted}}>Créez des groupes pour organiser les permissions par équipe ou projet.</div>
            </div>
          ) : groups.map(group => {
            const perms = (() => { try { return JSON.parse(group.permissions||'[]'); } catch(e) { return []; } })();
            return (
              <div key={group.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:20,marginBottom:12,borderLeft:`3px solid ${group.color||C.green}`}}>
                <div style={{display:'flex',alignItems:'flex-start',gap:16}}>
                  <div style={{width:44,height:44,borderRadius:12,background:`${group.color||C.green}15`,border:`1px solid ${group.color||C.green}30`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>
                    {group.icon||'👥'}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
                      <div style={{fontSize:15,fontWeight:700,color:C.text}}>{group.name}</div>
                      {group.isSystem && <span style={{fontSize:9,padding:'2px 7px',background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.3)',borderRadius:4,color:C.red,fontFamily:'JetBrains Mono, monospace'}}>SYSTÈME</span>}
                      <span style={{fontSize:9,padding:'2px 7px',background:`${group.color||C.green}10`,border:`1px solid ${group.color||C.green}30`,borderRadius:4,color:group.color||C.green,fontFamily:'JetBrains Mono, monospace'}}>{group.members?.length||0} MEMBRES</span>
                      {group.priority > 0 && <span style={{fontSize:9,padding:'2px 7px',background:'rgba(56,189,248,0.1)',borderRadius:4,color:C.blue,fontFamily:'JetBrains Mono, monospace'}}>PRIORITÉ {group.priority}</span>}
                    </div>
                    {group.description && <div style={{fontSize:12,color:C.muted,marginBottom:8}}>{group.description}</div>}
                    
                    {/* Permissions badges */}
                    {perms.length > 0 && (
                      <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:12}}>
                        {perms.slice(0,12).map((p:string)=>(
                          <span key={p} style={{fontSize:9,padding:'2px 8px',background:`${group.color||C.green}10`,border:`1px solid ${group.color||C.green}20`,borderRadius:4,color:group.color||C.green,fontFamily:'JetBrains Mono, monospace'}}>
                            {p}
                          </span>
                        ))}
                        {perms.length > 12 && <span style={{fontSize:9,color:C.muted}}>+{perms.length-12}</span>}
                      </div>
                    )}

                    {/* Members */}
                    <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                      {(group.members||[]).slice(0,6).map((m:any)=>(
                        <div key={m.id} style={{display:'flex',alignItems:'center',gap:6,padding:'4px 10px',background:C.card2,borderRadius:20,border:`1px solid ${C.border}`}}>
                          <div style={{width:18,height:18,borderRadius:'50%',background:'rgba(0,255,148,0.15)',color:C.green,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700}}>{m.user?.name?.[0]?.toUpperCase()}</div>
                          <span style={{fontSize:10,color:C.text2}}>{m.user?.name}</span>
                          <button onClick={()=>removeMember(group.id, m.user?.id)} style={{background:'transparent',border:'none',color:C.muted,cursor:'pointer',fontSize:12,lineHeight:1,padding:0}}>✕</button>
                        </div>
                      ))}
                      {group.members?.length > 6 && <span style={{fontSize:10,color:C.muted}}>+{group.members.length-6}</span>}
                      <button onClick={()=>setAddingMember(addingMember===group.id?null:group.id)}
                        style={{background:'transparent',border:`1px dashed ${C.border}`,borderRadius:20,color:C.muted,cursor:'pointer',fontSize:10,padding:'4px 10px'}}>
                        + Ajouter membre
                      </button>
                    </div>

                    {/* Add member input */}
                    {addingMember === group.id && (
                      <div style={{display:'flex',gap:8,marginTop:10}}>
                        <select style={{...inp,flex:1}} value={memberUserId} onChange={e=>setMemberUserId(e.target.value)}>
                          <option value="">Sélectionner un utilisateur</option>
                          {users.filter(u=>!(group.members||[]).find((m:any)=>m.user?.id===u.id)).map((u:any)=>(
                            <option key={u.id} value={u.id}>{u.name} — {u.email} ({u.role})</option>
                          ))}
                        </select>
                        <button onClick={()=>addMember(group.id)} style={{background:'rgba(0,255,148,0.1)',border:'1px solid rgba(0,255,148,0.3)',borderRadius:8,color:C.green,padding:'10px 16px',cursor:'pointer',fontSize:12,fontWeight:700,whiteSpace:'nowrap'}}>Ajouter</button>
                        <button onClick={()=>{setAddingMember(null);setMemberUserId('');}} style={{background:'transparent',border:`1px solid ${C.border}`,borderRadius:8,color:C.muted,padding:'10px',cursor:'pointer',fontSize:12}}>✕</button>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{display:'flex',gap:6,flexShrink:0}}>
                    <button onClick={()=>{setEditGroup(group);setGroupForm({name:group.name,description:group.description||'',color:group.color||'#00FF94',icon:group.icon||'👥',permissions:perms,priority:group.priority||0});setShowGroupForm(true);}}
                      style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:8,color:C.text2,cursor:'pointer',padding:'8px 14px',fontSize:12}}>✏ Modifier</button>
                    {!group.isSystem && (
                      <button onClick={()=>deleteGroup(group.id)} style={{background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.25)',borderRadius:8,color:C.red,cursor:'pointer',padding:'8px 14px',fontSize:12}}>🗑</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── PERMISSIONS USERS ────────────────────────────────────────────── */}
      {tab === 'users' && (
        <div style={{display:'grid',gridTemplateColumns:'300px 1fr',gap:20}}>
          {/* User list */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:16,height:'fit-content'}}>
            <div style={{fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:12}}>UTILISATEURS</div>
            {users.map((u:any)=>{
              const m=ROLE_META[u.role];
              return (
                <div key={u.id} onClick={()=>{setSelectedUser(u);loadUserPerms(u.id);}}
                  style={{display:'flex',alignItems:'center',gap:10,padding:'10px',borderRadius:10,cursor:'pointer',marginBottom:4,background:selectedUser?.id===u.id?`${m?.color||C.green}10`:C.card2,border:`1px solid ${selectedUser?.id===u.id?(m?.color||C.green)+'30':C.border}`,transition:'all .15s'}}>
                  <div style={{width:28,height:28,borderRadius:'50%',background:`${m?.color||C.green}20`,border:`1px solid ${m?.color||C.green}30`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:m?.color||C.green,flexShrink:0}}>
                    {u.name?.[0]?.toUpperCase()}
                  </div>
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:600,color:C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.name}</div>
                    <div style={{fontSize:9,color:m?.color||C.muted,fontFamily:'JetBrains Mono, monospace'}}>{m?.label||u.role}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* User permissions detail */}
          <div>
            {!selectedUser ? (
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:48,textAlign:'center'}}>
                <div style={{fontSize:36,marginBottom:16}}>👤</div>
                <div style={{fontSize:14,color:C.muted}}>Sélectionnez un utilisateur pour voir ses permissions effectives</div>
              </div>
            ) : (
              <div>
                <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:20,marginBottom:16}}>
                  <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:16}}>
                    <div style={{width:44,height:44,borderRadius:12,background:`${ROLE_META[selectedUser.role]?.color||C.green}20`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>
                      {ROLE_META[selectedUser.role]?.icon}
                    </div>
                    <div>
                      <div style={{fontSize:16,fontWeight:700,color:C.text}}>{selectedUser.name}</div>
                      <div style={{fontSize:11,color:C.muted}}>{selectedUser.email}</div>
                      <div style={{fontSize:10,color:ROLE_META[selectedUser.role]?.color,fontFamily:'JetBrains Mono, monospace',marginTop:2}}>{ROLE_META[selectedUser.role]?.label}</div>
                    </div>
                  </div>

                  {userPerms && (
                    <>
                      {/* Groupes */}
                      {userPerms.groups?.length > 0 && (
                        <div style={{marginBottom:16}}>
                          <div style={{fontSize:10,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:8}}>GROUPES</div>
                          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                            {userPerms.groups.map((g:any)=>(
                              <span key={g.id} style={{fontSize:11,padding:'4px 10px',background:`${g.color||C.green}15`,border:`1px solid ${g.color||C.green}30`,borderRadius:8,color:g.color||C.green}}>
                                {g.name} ({(g.permissions||[]).length} perms)
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Overrides */}
                      {userPerms.userOverrides?.length > 0 && (
                        <div style={{marginBottom:16}}>
                          <div style={{fontSize:10,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:8}}>OVERRIDES PERSONNELS</div>
                          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                            {userPerms.userOverrides.map((o:any)=>(
                              <span key={o.id} style={{fontSize:10,padding:'3px 8px',background:o.granted?'rgba(0,255,148,0.1)':'rgba(248,113,113,0.1)',border:`1px solid ${o.granted?'rgba(0,255,148,0.3)':'rgba(248,113,113,0.3)'}`,borderRadius:6,color:o.granted?C.green:C.red,fontFamily:'JetBrains Mono, monospace'}}>
                                {o.granted?'✓':'-'} {o.permission}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Effective permissions */}
                      <div>
                        <div style={{fontSize:10,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:8}}>
                          PERMISSIONS EFFECTIVES — {userPerms.effectivePermissions?.length||0} total
                        </div>
                        <div style={{maxHeight:300,overflowY:'auto',display:'flex',flexDirection:'column',gap:6}}>
                          {Object.entries(allPerms).map(([mod,perms])=>{
                            const mm=MODULE_META[mod];
                            const modPerms=(perms as string[]).filter(p=>userPerms.effectivePermissions?.includes('*')||(userPerms.effectivePermissions||[]).includes(`${mod}.${p}`));
                            if(modPerms.length===0) return null;
                            return (
                              <div key={mod} style={{padding:'8px 12px',background:C.card2,borderRadius:8,display:'flex',gap:12,alignItems:'center'}}>
                                <span style={{fontSize:14,flexShrink:0}}>{mm?.icon}</span>
                                <div style={{flex:1}}>
                                  <div style={{fontSize:10,color:mm?.color||C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:4}}>{mm?.label||mod}</div>
                                  <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                                    {modPerms.map(p=>(
                                      <span key={p} style={{fontSize:9,padding:'2px 6px',background:`${mm?.color||C.green}10`,borderRadius:4,color:mm?.color||C.green,fontFamily:'JetBrains Mono, monospace'}}>{p}</span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── AUDIT LOG ────────────────────────────────────────────────────── */}
      {tab === 'audit' && (
        <div>
          <div style={{fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:16}}>RBAC AUDIT LOG — dernières 100 opérations</div>
          {auditLogs.length === 0 ? (
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:32,textAlign:'center',color:C.muted,fontSize:13}}>
              Aucune modification RBAC enregistrée
              <br/><button onClick={async()=>{const d=await fetchAuthJson('/rbac/audit');setAuditLogs(d.logs||[]);}} style={{marginTop:12,background:'rgba(0,255,148,0.1)',border:'1px solid rgba(0,255,148,0.3)',borderRadius:8,color:C.green,padding:'8px 16px',cursor:'pointer',fontSize:12}}>Charger les logs</button>
            </div>
          ) : (
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{background:'rgba(0,255,148,0.03)'}}>
                    {['DATE','ACTION','ENTITÉ','DÉTAILS','PAR'].map(h=>(
                      <th key={h} style={{padding:'12px 16px',textAlign:'left',fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',borderBottom:`1px solid ${C.border}`}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log:any)=>(
                    <tr key={log.id} style={{borderBottom:`1px solid ${C.card}`}}>
                      <td style={{padding:'10px 16px',fontSize:11,color:C.muted,fontFamily:'JetBrains Mono, monospace',whiteSpace:'nowrap'}}>{new Date(log.createdAt).toLocaleString()}</td>
                      <td style={{padding:'10px 16px'}}><span style={{fontSize:10,padding:'3px 8px',background:'rgba(248,113,113,0.1)',color:C.red,borderRadius:4,fontFamily:'JetBrains Mono, monospace'}}>{log.action}</span></td>
                      <td style={{padding:'10px 16px',fontSize:11,color:C.text}}>{log.entity}</td>
                      <td style={{padding:'10px 16px',fontSize:11,color:C.text2,maxWidth:300,overflow:'hidden',textOverflow:'ellipsis'}}>{JSON.stringify(log.after||{})}</td>
                      <td style={{padding:'10px 16px',fontSize:11,color:C.muted}}>{log.user?.name||'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modale PANGEA — Suppression groupe RBAC */}
      {confirmDeleteGroup && (
        <div onClick={e => { if (e.target === e.currentTarget) setConfirmDeleteGroup(null); }}
          style={{ position:'fixed', inset:0, background:'rgba(8,11,15,0.88)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10002, padding:16 }}>
          <div style={{ background:'#0D1117', border:`1px solid rgba(248,113,113,0.35)`, borderRadius:16, padding:28, maxWidth:440, width:'100%', boxShadow:'0 24px 80px rgba(0,0,0,0.7)' }}>
            <div style={{ display:'flex', gap:14, alignItems:'center', marginBottom:16 }}>
              <div style={{ width:48, height:48, borderRadius:12, background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>👥</div>
              <div>
                <div style={{ fontSize:9, color:'#F87171', fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.12em', marginBottom:4 }}>RBAC · SUPPRESSION GROUPE</div>
                <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:17, fontWeight:800, color:'#F87171', margin:0 }}>Supprimer ce groupe ?</h2>
              </div>
            </div>
            <div style={{ height:1, background:'linear-gradient(90deg,rgba(248,113,113,0.25) 0%,transparent 100%)', marginBottom:18 }}/>
            <p style={{ fontSize:13, color:'#8FA3B8', marginBottom:20, lineHeight:1.7 }}>
              Le groupe et toutes ses assignations seront supprimés. Les utilisateurs membres retrouveront uniquement les permissions de leur rôle de base.
            </p>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setConfirmDeleteGroup(null)} style={{ flex:1, background:'transparent', border:'1px solid #1E2D3D', borderRadius:9, color:'#4A6278', padding:12, cursor:'pointer', fontSize:13 }}>Annuler</button>
              <button onClick={executeDeleteGroup}
                style={{ flex:1, background:'rgba(248,113,113,0.12)', border:'1px solid rgba(248,113,113,0.4)', borderRadius:9, color:'#F87171', padding:12, fontWeight:800, cursor:'pointer', fontSize:13, fontFamily:'Syne, sans-serif' }}>
                🗑 Supprimer le groupe
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
