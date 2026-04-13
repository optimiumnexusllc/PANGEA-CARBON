'use client';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL;
const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken')}` });
const fmt = (n: number) => n?.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) ?? '0';

const ACTION_COLOR: Record<string, string> = {
  CREATE_USER: '#00FF94', UPDATE_USER: '#38BDF8', DEACTIVATE_USER: '#F87171',
  CREATE_ORG: '#A78BFA', UPDATE_ORG: '#38BDF8', UPDATE_SETTING: '#FCD34D',
  UPDATE_FEATURE: '#F0A500', CREATE_API_KEY: '#00FF94', SUBSCRIPTION_ACTIVATED: '#00FF94',
};

export default function AdminOverviewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/admin/overview`, { headers: headers() })
      .then(r => r.json()).then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
    <div style={{ width: 28, height: 28, border: '2px solid rgba(248,113,113,0.2)', borderTopColor: '#F87171', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>;

  const s = data?.stats || {};

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, color: '#F87171', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>SUPER ADMIN · SYSTÈME</div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: '#E8EFF6', margin: 0 }}>Vue Système</h1>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Utilisateurs actifs', value: `${s.activeUsers} / ${s.totalUsers}`, color: '#00FF94', icon: '👤' },
          { label: 'Organisations', value: s.totalOrgs, color: '#38BDF8', icon: '🏢' },
          { label: 'Projets MRV', value: s.totalProjects, color: '#A78BFA', icon: '⚡' },
          { label: 'Crédits tCO₂e total', value: fmt(s.totalCarbonCredits), color: '#00FF94', icon: '🌍' },
          { label: 'Revenus carbone USD', value: '$' + fmt(s.totalRevenueUSD), color: '#FCD34D', icon: '💰' },
          { label: 'Lectures production', value: fmt(s.totalReadings), color: '#38BDF8', icon: '📊' },
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
          <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 12 }}>UTILISATEURS PAR RÔLE</div>
          {(data?.usersByRole || []).map((r: any) => (
            <div key={r.role} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(30,45,61,0.5)' }}>
              <span style={{ fontSize: 12, color: '#8FA3B8' }}>{r.role}</span>
              <span style={{ fontSize: 12, color: '#E8EFF6', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{r.count}</span>
            </div>
          ))}
        </div>

        {/* Orgs by Plan */}
        <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 12 }}>ORGS PAR PLAN</div>
          {(data?.orgsByPlan || []).map((r: any) => (
            <div key={r.plan} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(30,45,61,0.5)' }}>
              <span style={{ fontSize: 12, color: '#8FA3B8' }}>{r.plan}</span>
              <span style={{ fontSize: 12, color: '#FCD34D', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{r.count}</span>
            </div>
          ))}
        </div>

        {/* Projects by Status */}
        <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 12 }}>PROJETS PAR STATUT</div>
          {(data?.projectsByStatus || []).map((r: any) => (
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
          <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>ACTIVITÉ RÉCENTE</div>
          <a href="/dashboard/admin/audit" style={{ fontSize: 11, color: '#38BDF8', textDecoration: 'none' }}>Voir tout →</a>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(data?.recentAudit || []).map((log: any) => (
            <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px', background: '#121920', borderRadius: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: ACTION_COLOR[log.action] || '#4A6278', flexShrink: 0 }}/>
              <span style={{ fontSize: 11, color: '#E8EFF6', fontFamily: 'JetBrains Mono, monospace', minWidth: 180 }}>{log.action}</span>
              <span style={{ fontSize: 11, color: '#4A6278', flex: 1 }}>{log.entity} · {log.entityId?.slice(-8)}</span>
              <span style={{ fontSize: 11, color: '#38BDF8' }}>{log.user?.name || 'System'}</span>
              <span style={{ fontSize: 10, color: '#2A3F55', fontFamily: 'JetBrains Mono, monospace' }}>{new Date(log.createdAt).toLocaleString('fr-FR')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
