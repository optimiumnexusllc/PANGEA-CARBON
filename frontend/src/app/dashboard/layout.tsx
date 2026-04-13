'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FeatureFlagsProvider, useFeatureFlags } from '@/lib/features';

const STATIC_NAV = [
  { href: '/dashboard',           label: "Vue d'ensemble",  icon: 'M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 3h2v2h-2zm0 4h2v2h-2zm4-4h2v6h-2z', feature: null },
  { href: '/dashboard/projects',  label: 'Projets',         icon: 'M3 3h18v4H3zm0 6h11v12H3zm13 6h6v6h-6z',                                      feature: null },
  { href: '/dashboard/map',       label: 'Carte Afrique',   icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7', feature: 'africa_map' },
  { href: '/dashboard/upload',    label: 'Import CSV',      icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',             feature: 'bulk_import' },
  { href: '/dashboard/mrv',       label: 'Calculateur MRV', icon: 'M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18', feature: 'mrv_calculator' },
  { href: '/dashboard/assistant', label: 'Assistant IA',    icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z', feature: 'ai_assistant' },
  { href: '/dashboard/reports',   label: 'Rapports PDF',    icon: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8m8 4H8m2-8H8', feature: 'pdf_reports' },
  { href: '/dashboard/api-keys',  label: 'API & Équipements',icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z', feature: null },
  { href: '/dashboard/settings',  label: 'Paramètres',      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', feature: null },
];

function SidebarContent({ user, logout }: { user: any; logout: () => void }) {
  const pathname = usePathname();
  const flags = useFeatureFlags();
  const visibleNav = STATIC_NAV.filter(item => item.feature === null || flags[item.feature] === true);

  return (
    <>
      <div className="p-5 border-b" style={{ borderColor: '#1E2D3D' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(0,255,148,0.15)', border: '1px solid rgba(0,255,148,0.3)' }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" stroke="#00FF94" strokeWidth="1.5"/>
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold" style={{ fontFamily: 'Syne, sans-serif' }}>PANGEA CARBON</div>
            <div className="text-xs" style={{ color: '#4A6278' }}>Africa Platform</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-3" style={{ overflowY: 'auto' }}>
        {visibleNav.map(item => (
          <Link key={item.href} href={item.href}
            className={`nav-item ${pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href)) ? 'active' : ''}`}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d={item.icon}/>
            </svg>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t" style={{ borderColor: '#1E2D3D' }}>
        {user && (
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
              style={{ background: 'rgba(0,255,148,0.15)', color: '#00FF94', border: '1px solid rgba(0,255,148,0.2)' }}>
              {user.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium truncate" style={{ color: '#E8EFF6' }}>{user.name}</div>
              <div className="text-xs truncate" style={{ color: '#4A6278' }}>{user.role}</div>
            </div>
          </div>
        )}
        {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && (
          <a href="/dashboard/admin"
            style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', marginBottom:6, borderRadius:6,
              background: pathname.startsWith('/dashboard/admin') ? 'rgba(248,113,113,0.08)' : 'transparent',
              color:'#F87171', fontSize:12, textDecoration:'none',
              border: pathname.startsWith('/dashboard/admin') ? '1px solid rgba(248,113,113,0.2)' : '1px solid transparent' }}>
            🛡️ Admin Console
          </a>
        )}
        <button onClick={logout} className="btn-ghost w-full text-xs justify-center" style={{ padding:'6px 12px' }}>
          Déconnexion
        </button>
      </div>
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (!u || !localStorage.getItem('accessToken')) { router.push('/auth/login'); return; }
    setUser(JSON.parse(u));
  }, []);

  const logout = () => { localStorage.clear(); router.push('/auth/login'); };

  return (
    <FeatureFlagsProvider>
      <div className="flex min-h-screen">
        <div className="scan-line" />
        <aside className="sidebar" style={{ position:'sticky', top:0, height:'100vh', overflow:'hidden', display:'flex', flexDirection:'column' }}>
          <SidebarContent user={user} logout={logout} />
        </aside>
        <main className="main-content">{children}</main>
      </div>
    </FeatureFlagsProvider>
  );
}
