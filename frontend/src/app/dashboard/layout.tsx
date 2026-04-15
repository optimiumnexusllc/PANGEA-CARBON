'use client';
import Link from 'next/link';
import { useLang } from '@/lib/lang-context';
import LangToggle from '@/components/LangToggle';
import FloatingLangToggle from '@/components/FloatingLangToggle';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ToastProvider } from '@/components/ui/Toast';
import { FeatureFlagsProvider, useFeatureFlags, useUserContext, PLAN_METADATA } from '@/lib/features';

const MAIN_NAV = [
  { href: '/dashboard',           label: "Vue d'ensemble", labelKey: 'dash_overview',    icon: 'M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 3h2v2h-2zm0 4h2v2h-2zm4-4h2v6h-2z', feature: null },
  { href: '/dashboard/projects',  label: 'Projects', labelKey: 'dash_projects',           icon: 'M3 3h18v4H3zm0 6h11v12H3zm13 6h6v6h-6z', feature: null },
  { href: '/dashboard/map',       label: 'Africa Map', labelKey: 'dash_map',     icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7', feature: 'africa_map' },
  { href: '/dashboard/upload',    label: 'Import CSV', labelKey: 'dash_import',        icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12', feature: 'bulk_import' },
  { href: '/dashboard/mrv',       label: 'MRV Calculator', labelKey: 'dash_mrv',   icon: 'M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18', feature: 'mrv_calculator', plan: 'TRIAL' },
  { href: '/dashboard/assistant', label: 'AI Assistant', labelKey: 'dash_assistant',      icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z', feature: 'ai_assistant' },
  { href: '/dashboard/reports',   label: 'PDF Reports', labelKey: 'dash_reports',      icon: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8m8 4H8m2-8H8', feature: 'pdf_reports' },
  { href: '/dashboard/pipeline',   label: 'Credit Pipeline', labelKey: 'dash_pipeline', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', feature: null },
  { href: '/dashboard/carbon-tax', label: 'Carbon Tax Engine', labelKey: 'dash_carbontax', icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z', feature: null },
  { href: '/dashboard/ghg-audit',   label: 'GHG Audit',   labelKey: 'dash_ghg',         icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01', feature: null },
  { href: '/dashboard/marketplace', label: 'Marketplace', labelKey: 'dash_marketplace',       icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z', feature: 'carbon_marketplace', plan: 'STARTER' },
  { href: '/dashboard/seller', label: 'Seller Portal', labelKey: 'Seller Portal', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', feature: 'carbon_marketplace', adminOnly: false },
  { href: '/dashboard/carbon-desk', label: 'Carbon Desk', labelKey: 'Carbon Desk', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', feature: 'carbon_marketplace', adminOnly: false },
  { href: '/dashboard/certification', label: 'Certification Lab', labelKey: 'dash_certification', icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z', feature: null },
  { href: '/dashboard/emailcomposer', label: 'Email Composer', labelKey: 'dash_email', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', feature: 'email_composer', adminOnly: true },
  { href: '/dashboard/api-keys',   label: "API & Équipements", labelKey: 'dash_api', icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z', feature: null },
];

const ELITE_MODULES = [
  { href: '/dashboard/article6', label: 'Article 6 ITMO',    labelKey: 'mod_article6', icon: '🏛️', color: '#38BDF8', badge: '×3-5' },
  { href: '/dashboard/sdg',      label: 'Gold Standard SDG', labelKey: 'mod_sdg',      icon: '🌱', color: '#FCD34D', badge: '+$12/t' },
  { href: '/dashboard/dmrv',     label: 'dMRV Satellite',    labelKey: 'mod_dmrv',     icon: '🛰️', color: '#A78BFA', badge: 'LIVE' },
  { href: '/dashboard/corsia',   label: 'CORSIA Aviation',   labelKey: 'mod_corsia',   icon: '✈️', color: '#F87171', badge: '$22/t' },
  { href: '/dashboard/registry', label: 'Blockchain Registry',labelKey: 'mod_registry', icon: '⛓️', color: '#00FF94', badge: 'SHA256' },
  { href: '/dashboard/tokens',   label: 'Token Generator',   labelKey: 'mod_tokens',   icon: '🔐', color: '#00FF94' },
  { href: '/dashboard/baseline', label: 'AI Baseline',       labelKey: 'mod_baseline', icon: '🤖', color: '#EF9F27', badge: 'AI' },
];

const INTELLIGENCE_MODULES = [
  { href: '/dashboard/analytics',    label: 'Analytics',       labelKey: 'mod_analytics',  icon: '🔬', color: '#38BDF8', badge: 'Causal' },
  { href: '/dashboard/optimization', label: 'MRV Optimizer',   labelKey: 'mod_optim',      icon: '⚙️', color: '#00FF94', badge: 'ROI' },
  { href: '/dashboard/projection',   label: '10-Year Forecast',labelKey: 'mod_projection', icon: '📈', color: '#A78BFA', badge: 'Monte Carlo' },
  { href: '/dashboard/benchmark',    label: 'Africa Benchmark',labelKey: 'mod_benchmark',  icon: '🏆', color: '#FCD34D', badge: 'IRENA 2024' },
];

function SidebarContent({ user, logout }) {
  const { t, lang } = useLang();
  const L = (en, fr) => lang === 'fr' ? fr : en;
  const pathname = usePathname();
  const flags = useFeatureFlags();
  const userCtx = useUserContext();
  const isAdmin = ['SUPER_ADMIN','ADMIN'].includes(userCtx.role);
  const visibleNav = MAIN_NAV.filter(item => {
    if ((item as any).adminOnly && !isAdmin) return false;
    if (item.feature === null) return true;
    return flags[item.feature] === true;
  });
  const isElite = ELITE_MODULES.some(m => pathname.startsWith(m.href));
  const isStandards = pathname.startsWith('/dashboard/standards') || isElite;

  return (
    <>
      {/* Logo */}
      <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid #1E2D3D', flexShrink: 0 }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', cursor: 'pointer' }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: 'rgba(0,255,148,0.15)', border: '1px solid rgba(0,255,148,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" stroke="#00FF94" strokeWidth="1.5"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#E8EFF6', lineHeight: 1.1 }}>PANGEA CARBON</div>
            <div style={{ fontSize: 9, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>Africa Platform</div>
          </div>
        </Link>
      </div>

      {/* Main Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {visibleNav.map(item => (
          <Link key={item.href} href={item.href}
            className={`nav-item ${pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href) && !ELITE_MODULES.some(m => m.href === item.href)) ? 'active' : ''}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d={item.icon}/>
            </svg>
            {t(item.labelKey) || item.label}
          </Link>
        ))}

        {/* ─── ELITE MODULES ─────────────────── */}
        <div style={{ margin: '8px 8px 0', padding: '8px 6px 4px', borderTop: '1px solid #1E2D3D' }}>
          <Link href="/dashboard/standards"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 7, textDecoration: 'none', marginBottom: 4,
              background: isStandards ? 'rgba(56,189,248,0.08)' : 'transparent',
              border: isStandards ? '1px solid rgba(56,189,248,0.2)' : '1px solid transparent' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13 }}>⬡</span>
              <span style={{ fontSize: 11, color: isStandards ? '#38BDF8' : '#4A6278', fontWeight: isStandards ? 600 : 400 }}>{t('mod_carbon_hub') || 'Carbon Hub'}</span>
            </div>
            <span style={{ fontSize: 8, background: 'rgba(56,189,248,0.15)', color: '#38BDF8', borderRadius: 3, padding: '2px 5px', fontFamily: 'JetBrains Mono, monospace' }}>6 MODULES</span>
          </Link>

          {ELITE_MODULES.map(mod => (
            <Link key={mod.href} href={mod.href}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 8px 5px 16px', borderRadius: 6, textDecoration: 'none', marginBottom: 2, transition: 'all 0.15s',
                background: pathname.startsWith(mod.href) ? `${mod.color}10` : 'transparent',
                borderLeft: pathname.startsWith(mod.href) ? `2px solid ${mod.color}` : '2px solid transparent' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12 }}>{mod.icon}</span>
                <span style={{ fontSize: 11, color: pathname.startsWith(mod.href) ? mod.color : '#4A6278', fontWeight: pathname.startsWith(mod.href) ? 600 : 400 }}>
                  {t(mod.labelKey) || mod.label}
                </span>
              </div>
              <span style={{ fontSize: 8, background: `${mod.color}15`, color: mod.color, borderRadius: 3, padding: '1px 4px', fontFamily: 'JetBrains Mono, monospace' }}>{mod.badge}</span>
            </Link>
          ))}
        </div>

        {/* ─── INTELLIGENCE ─────────────────── */}
        <div style={{ margin: '6px 8px 0', padding: '8px 6px 4px', borderTop: '1px solid #1E2D3D' }}>
          <Link href="/dashboard/analytics"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 7, textDecoration: 'none', marginBottom: 4,
              background: ['/dashboard/analytics','/dashboard/optimization','/dashboard/projection','/dashboard/benchmark'].some(p => pathname.startsWith(p)) ? 'rgba(252,211,77,0.08)' : 'transparent',
              border: ['/dashboard/analytics','/dashboard/optimization','/dashboard/projection','/dashboard/benchmark'].some(p => pathname.startsWith(p)) ? '1px solid rgba(252,211,77,0.2)' : '1px solid transparent' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13 }}>📊</span>
              <span style={{ fontSize: 11, color: '#FCD34D', fontWeight: 600 }}>Intelligence</span>
            </div>
            <span style={{ fontSize: 8, background: 'rgba(252,211,77,0.15)', color: '#FCD34D', borderRadius: 3, padding: '2px 5px', fontFamily: 'JetBrains Mono, monospace' }}>4 MODULES</span>
          </Link>
          {INTELLIGENCE_MODULES.map(mod => (
            <Link key={mod.href} href={mod.href}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 8px 5px 16px', borderRadius: 6, textDecoration: 'none', marginBottom: 2, transition: 'all 0.15s',
                background: pathname.startsWith(mod.href) ? `${mod.color}10` : 'transparent',
                borderLeft: pathname.startsWith(mod.href) ? `2px solid ${mod.color}` : '2px solid transparent' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12 }}>{mod.icon}</span>
                <span style={{ fontSize: 11, color: pathname.startsWith(mod.href) ? mod.color : '#4A6278', fontWeight: pathname.startsWith(mod.href) ? 600 : 400 }}>
                  {t(mod.labelKey) || mod.label}
                </span>
              </div>
              <span style={{ fontSize: 8, background: `${mod.color}15`, color: mod.color, borderRadius: 3, padding: '1px 4px', fontFamily: 'JetBrains Mono, monospace' }}>{mod.badge}</span>
            </Link>
          ))}
        </div>

        {/* Settings */}
        <div style={{ padding: '4px 0' }}>
          <Link href="/dashboard/settings"
            className={`nav-item ${pathname === '/dashboard/settings' ? 'active' : ''}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            {t('dash_settings') || 'Settings'}
          </Link>
        </div>
      </nav>

      {/* User */}
      <div style={{ padding: '10px 10px 12px', borderTop: '1px solid #1E2D3D', flexShrink: 0 }}>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,255,148,0.15)', color: '#00FF94', border: '1px solid rgba(0,255,148,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
              {user.name?.[0]?.toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#E8EFF6', truncate: true, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
              <div style={{ fontSize: 9, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>{user.role}</div>
              <div style={{ fontSize: 8, color: userCtx.plan === 'TRIAL' ? '#FCD34D' : userCtx.plan === 'STARTER' ? '#38BDF8' : userCtx.plan === 'GROWTH' ? '#A78BFA' : '#FCD34D', fontFamily: 'JetBrains Mono, monospace', marginTop: 1 }}>
                {userCtx.plan || 'TRIAL'}
              </div>
            </div>
          </div>
        )}
        {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && (
          <Link href="/dashboard/admin"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', marginBottom: 5, borderRadius: 5,
              background: pathname.startsWith('/dashboard/admin') ? 'rgba(248,113,113,0.08)' : 'transparent',
              color: '#F87171', fontSize: 11, textDecoration: 'none',
              border: pathname.startsWith('/dashboard/admin') ? '1px solid rgba(248,113,113,0.2)' : '1px solid transparent' }}>
            🛡️ Admin Console
          </Link>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 8, padding: '8px 0', borderTop: '1px solid #1E2D3D', borderBottom: '1px solid #1E2D3D' }}>
          <span style={{ fontSize: 9, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em' }}>LANG</span>
          <LangToggle />
        </div>
        <button onClick={logout} style={{ width: '100%', background: 'transparent', border: '1px solid #1E2D3D', borderRadius: 5, color: '#4A6278', padding: '5px', cursor: 'pointer', fontSize: 11 }}>
          {t('dash_logout') || 'Logout'}
        </button>
      </div>
    </>
  );
}

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);

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
        <aside className="sidebar" style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <SidebarContent user={user} logout={logout} />
        </aside>
        <main className="main-content">{children}</main>
        <FloatingLangToggle />
      </div>
    </FeatureFlagsProvider>
  );
}
