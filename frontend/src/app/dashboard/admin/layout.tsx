'use client';
import { useLang } from '@/lib/lang-context';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const ADMIN_NAV = [
  { href: '/dashboard/admin',          label: 'Vue système',     icon: '⬡' },
  { href: '/dashboard/admin/users',    label: 'Utilisateurs',    icon: '👤' },
  { href: '/dashboard/admin/orgs',     label: 'Organisations',   icon: '🏢' },
  { href: '/dashboard/admin/features', label: 'Feature Flags',   icon: '⚑' },
  { href: '/dashboard/admin/settings', label: 'Secrets & Config',icon: '🔐' },
  { href: '/dashboard/admin/audit',    label: 'Audit Trail',     icon: '📋' },
  { href: '/dashboard/admin/billing',  label: 'Revenue',         icon: '💰' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t, lang } = useLang();
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (!u) { router.push('/auth/login'); return; }
    const parsed = JSON.parse(u);
    if (!['SUPER_ADMIN', 'ADMIN'].includes(parsed.role)) {
      router.push('/dashboard');
      return;
    }
    setUser(parsed);
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      {/* Admin top bar */}
      <div style={{ background: '#0A0F14', borderBottom: '1px solid rgba(248,113,113,0.2)', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 44, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F87171', animation: 'pulse 2s infinite' }}/>
          <span style={{ fontSize: 11, color: '#F87171', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em' }}>SUPER ADMIN CONSOLE</span>
          <span style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>· PANGEA CARBON · ACCÈS RESTREINT</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: '#4A6278' }}>{user?.name} · {user?.role}</span>
          <a href="/dashboard" style={{ fontSize: 11, color: '#4A6278', textDecoration: 'none', border: '1px solid #1E2D3D', borderRadius: 5, padding: '3px 8px' }}>← Dashboard</a>
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      </div>

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Admin sidebar */}
        <aside style={{ width: 200, background: '#0A0F14', borderRight: '1px solid #1E2D3D', padding: '16px 8px', flexShrink: 0 }}>
          {ADMIN_NAV.map(item => {
            const active = pathname === item.href || (item.href !== '/dashboard/admin' && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, margin: '1px 0',
                  background: active ? 'rgba(248,113,113,0.08)' : 'transparent',
                  color: active ? '#F87171' : '#4A6278', textDecoration: 'none', fontSize: 13,
                  border: active ? '1px solid rgba(248,113,113,0.2)' : '1px solid transparent',
                  transition: 'all 0.15s' }}>
                <span style={{ fontSize: 14 }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </aside>

        {/* Admin content */}
        <main style={{ flex: 1, overflow: 'auto', background: '#080B0F' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
