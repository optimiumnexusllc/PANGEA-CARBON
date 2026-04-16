'use client';
import { useLang } from '@/lib/lang-context';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const C = {
  bg:'#080B0F', topbar:'#07090D', sidebar:'#0A0F14', border:'#1E2D3D',
  red:'#F87171', green:'#00FF94', blue:'#38BDF8', purple:'#A78BFA',
  yellow:'#FCD34D', orange:'#F97316', muted:'#4A6278', text:'#E8EFF6', text2:'#8FA3B8',
};

const ADMIN_NAV = [
  { href:'/dashboard/admin',           labelEn:'System Overview',    labelFr:'Vue système',        icon:'⬡',  color:C.red },
  { href:'/dashboard/admin/users',     labelEn:'Users',              labelFr:'Utilisateurs',       icon:'👤', color:C.blue },
  { href:'/dashboard/admin/orgs',      labelEn:'Organizations',      labelFr:'Organisations',      icon:'🏢', color:C.purple },
  { href:'/dashboard/admin/email',     labelEn:'Email & Notif.',     labelFr:'Email & Notif.',     icon:'📧', color:C.blue },
  { href:'/dashboard/admin/features',  labelEn:'Feature Flags',      labelFr:'Feature Flags',      icon:'⚑',  color:C.orange },
  { href:'/dashboard/admin/settings',  labelEn:'Secrets & Config',   labelFr:'Secrets & Config',   icon:'🔐', color:C.yellow },
  { href:'/dashboard/admin/rbac',      labelEn:'Roles & Permissions',labelFr:'Rôles & Permissions',icon:'🛡', color:C.red },
  { href:'/dashboard/admin/audit',     labelEn:'Audit Trail',        labelFr:'Journal d\'audit',   icon:'📋', color:C.purple },
  { href:'/dashboard/admin/billing',   labelEn:'Revenue',            labelFr:'Revenus',            icon:'💰', color:C.yellow },
];

export default function AdminLayout({ children }) {
  const { lang } = useLang();
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (!u) { router.push('/auth/login'); return; }
    const parsed = JSON.parse(u);
    if (!['SUPER_ADMIN','ADMIN'].includes(parsed.role)) { router.push('/dashboard'); return; }
    setUser(parsed);
  }, []);

  return (
    <div style={{ display:'flex', minHeight:'100vh', flexDirection:'column' }}>

      {/* Top bar */}
      <div style={{ background:C.topbar, borderBottom:'1px solid rgba(248,113,113,0.25)', padding:'0 20px', display:'flex', alignItems:'center', justifyContent:'space-between', height:46, flexShrink:0, position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:C.red, animation:'pulse 2s infinite' }}/>
            <span style={{ fontSize:10, color:C.red, fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.14em', fontWeight:700 }}>SUPER ADMIN</span>
          </div>
          <div style={{ width:1, height:20, background:C.border }}/>
          <span style={{ fontSize:10, color:C.muted, fontFamily:'JetBrains Mono, monospace' }}>PANGEA CARBON · {lang==='fr'?'CONSOLE D\'ADMINISTRATION':'ADMINISTRATION CONSOLE'} · {lang==='fr'?'ACCÈS RESTREINT':'RESTRICTED ACCESS'}</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {user&&(
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 10px', background:'rgba(248,113,113,0.06)', border:'1px solid rgba(248,113,113,0.2)', borderRadius:6 }}>
              <div style={{ width:22, height:22, borderRadius:'50%', background:'rgba(248,113,113,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:C.red, fontWeight:800 }}>
                {(user.name||'?')[0].toUpperCase()}
              </div>
              <span style={{ fontSize:11, color:C.text2, fontFamily:'JetBrains Mono, monospace' }}>{user.name}</span>
              <span style={{ fontSize:9, color:C.red, fontFamily:'JetBrains Mono, monospace', background:'rgba(248,113,113,0.1)', padding:'1px 6px', borderRadius:3 }}>{user.role}</span>
            </div>
          )}
          <a href="/dashboard" style={{ fontSize:11, color:C.muted, textDecoration:'none', border:'1px solid '+C.border, borderRadius:6, padding:'4px 10px', display:'flex', alignItems:'center', gap:5 }}
            onMouseEnter={e=>{ e.currentTarget.style.borderColor=C.blue; e.currentTarget.style.color=C.blue; }}
            onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.border; e.currentTarget.style.color=C.muted; }}>
            ← {lang==='fr'?'Dashboard':'Dashboard'}
          </a>
        </div>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4})}</style>
      </div>

      <div style={{ display:'flex', flex:1 }}>
        {/* Sidebar */}
        <aside style={{ width:210, background:C.sidebar, borderRight:'1px solid '+C.border, padding:'16px 10px', flexShrink:0, overflowY:'auto' }}>
          <div style={{ fontSize:8, color:C.muted, fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.15em', marginBottom:14, paddingLeft:8 }}>
            {lang==='fr'?'NAVIGATION ADMIN':'ADMIN NAVIGATION'}
          </div>
          {ADMIN_NAV.map(item => {
            const active = pathname === item.href || (item.href !== '/dashboard/admin' && pathname.startsWith(item.href));
            const label = lang==='fr' ? item.labelFr : item.labelEn;
            const col = item.color;
            return (
              <Link key={item.href} href={item.href}
                style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 10px', borderRadius:8, margin:'2px 0',
                  background:active?col+'12':'transparent',
                  color:active?col:C.muted,
                  textDecoration:'none', fontSize:12, fontWeight:active?700:400,
                  border:active?'1px solid '+col+'30':'1px solid transparent',
                  transition:'all 0.15s', position:'relative' }}>
                <span style={{ fontSize:15, flexShrink:0 }}>{item.icon}</span>
                <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{label}</span>
                {active&&<div style={{ position:'absolute', right:0, top:'20%', bottom:'20%', width:2, borderRadius:2, background:col }}/>}
              </Link>
            );
          })}

          {/* Email status indicator */}
          <div style={{ marginTop:20, padding:'10px 10px', background:'rgba(56,189,248,0.04)', border:'1px solid rgba(56,189,248,0.12)', borderRadius:8 }}>
            <div style={{ fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>
              {lang==='fr'?'SERVEUR EMAIL':'EMAIL SERVER'}
            </div>
            <div style={{ fontSize:10, color:C.blue, fontWeight:700, marginBottom:2 }}>smtp.hostinger.com</div>
            <div style={{ fontSize:9, color:C.muted }}>Port 465 · SSL</div>
          </div>
        </aside>

        {/* Content */}
        <main style={{ flex:1, overflow:'auto', background:C.bg }}>
          {children}
        </main>
      </div>
    </div>
  );
}