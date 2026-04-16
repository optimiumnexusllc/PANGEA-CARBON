'use client';
import { useLang } from '@/lib/lang-context';
import { fetchAuth } from '@/lib/fetch-auth';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL;
const headers = () => ({ 'Content-Type': 'application/json', Authorization: "Bearer "+(typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '')+"" });
const fmt = (n) => n?.toLocaleString('en-US', { maximumFractionDigits: 0 }) ?? '0';

const ACTION_COLOR = {
  CREATE_USER: '#00FF94', UPDATE_USER: '#38BDF8', DEACTIVATE_USER: '#F87171',
  CREATE_ORG: '#A78BFA', UPDATE_ORG: '#38BDF8', UPDATE_SETTING: '#FCD34D',
  UPDATE_FEATURE: '#F0A500', CREATE_API_KEY: '#00FF94', SUBSCRIPTION_ACTIVATED: '#00FF94',
};

export default function AdminOverviewPage() {
  const { t, lang } = useLang();
  const L = (en, fr) => lang === 'fr' ? fr : en;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuth(`/admin/overview`)
      .then(r => r.json()).then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
    <div style={{ width: 28, height: 28, border: '2px solid rgba(248,113,113,0.2)', borderTopColor: '#F87171', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/>
    <style>{`@keyframes spin{to{transform:rotate(360deg)})}</style>
  </div>;

  const s = data?.stats || {};

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, color: '#F87171', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>SUPER ADMIN · SYSTEM</div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: '#E8EFF6', margin: 0 }}>L('System View', 'Vue système')</h1>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Users actifs', value: `${s.activeUsers} / ${s.totalUsers), color: '#00FF94', icon: '👤' },
          { label: 'Organizations', value: s.totalOrgs, color: '#38BDF8', icon: '🏢' },
          { label: 'MRV Projects', value: s.totalProjects, color: '#A78BFA', icon: '⚡' },
          { label: 'Credits tCO₂e total', value: fmt(s.totalCarbonCredits), color: '#00FF94', icon: '🌍' },
          { label: 'Carbon revenue USD', value: '$' + fmt(s.totalRevenueUSD), color: '#FCD34D', icon: '💰' },
          { label: 'Production readings', value: fmt(s.totalReadings), color: '#38BDF8', icon: '📊' },
        ].map(k => (
          <div key={k.label} style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 10, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>{k.label}</span>
              <span style={{ fontSize: 16 }}>{k.icon}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.color, fontFamily: 'Syne, sans-serif' }}>{String(k.value)}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Users by Role */}
        <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 12 }}>L('USERS BY ROLE', 'UTILISATEURS PAR RÔLE')</div>
          {(data?.usersByRole || []).map((r) => (
            <div key={r.role} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(30,45,61,0.5)' }}>
              <span style={{ fontSize: 12, color: '#8FA3B8' }}>{r.role}</span>
              <span style={{ fontSize: 12, color: '#E8EFF6', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{r.count}</span>
            </div>
          ))}
        </div>

        {/* Orgs by Plan */}
        <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 12 }}>L('ORGS BY PLAN', 'ORGS PAR PLAN')</div>
          {(data?.orgsByPlan || []).map((r) => (
            <div key={r.plan} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(30,45,61,0.5)' }}>
              <span style={{ fontSize: 12, color: '#8FA3B8' }}>{r.plan}</span>
              <span style={{ fontSize: 12, color: '#FCD34D', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{r.count}</span>
            </div>
          ))}
        </div>

        {/* Projects by Status */}
        <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 12 }}>L('PROJECTS BY STATUS', 'PROJETS PAR STATUT')</div>
          {(data?.projectsByStatus || []).map((r) => (
            <div key={r.status} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(30,45,61,0.5)' }}>
              <span style={{ fontSize: 12, color: '#8FA3B8' }}>{r.status}</span>
              <span style={{ fontSize: 12, color: '#00FF94', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{r.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Trail récent */}
      <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 10, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>L('RECENT ACTIVITY', 'ACTIVITÉ RÉCENTE')</div>
          <a href="/dashboard/admin/audit" style={{ fontSize: 11, color: '#38BDF8', textDecoration: 'none' }}>L('View all →', 'Voir tout →')</a>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(data?.recentAudit || []).map((log) => (
            <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px', background: '#121920', borderRadius: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: ACTION_COLOR[log.action] || '#4A6278', flexShrink: 0 }}/>
              <span style={{ fontSize: 11, color: '#E8EFF6', fontFamily: 'JetBrains Mono, monospace', minWidth: 180 }}>{log.action}</span>
              <span style={{ fontSize: 11, color: '#4A6278', flex: 1 }}>{log.entity} · {log.entityId?.slice(-8)}</span>
              <span style={{ fontSize: 11, color: '#38BDF8' }}>{log.user?.name || 'System'}</span>
              <span style={{ fontSize: 10, color: '#2A3F55', fontFamily: 'JetBrains Mono, monospace' }}>{new Date(log.createdAt).toLocaleString('en-US')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}