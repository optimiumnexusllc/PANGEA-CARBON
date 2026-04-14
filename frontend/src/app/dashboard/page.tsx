'use client';
import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '@/lib/api';
import { apiExt } from '@/lib/api';
import { useLang } from '@/lib/lang-context';

const fmt = (n, d = 0) => (n ?? 0).toLocaleString('en-US', { maximumFractionDigits: d });
const fmtM = (n) => n >= 1000000 ? `$${(n/1000000).toFixed(1)}M` : n >= 1000 ? `$${(n/1000).toFixed(0)}K` : `$${fmt(n)}`;

const SEVERITY_STYLE = {
  critical: { bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.25)', color: '#F87171', icon: '🚨' },
  warning:  { bg: 'rgba(252,211,77,0.08)',  border: 'rgba(252,211,77,0.25)',  color: '#FCD34D', icon: '⚠️' },
  success:  { bg: 'rgba(0,255,148,0.08)',   border: 'rgba(0,255,148,0.25)',   color: '#00FF94', icon: '🎉' },
  info:     { bg: 'rgba(56,189,248,0.08)',  border: 'rgba(56,189,248,0.25)',  color: '#38BDF8', icon: 'ℹ️' },
};

function TT({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#121920', border: '1px solid #1E2D3D', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: '#4A6278', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => <div key={i} style={{ color: p.color || '#E8EFF6' }}>{fmt(p.value)}</div>)}
    </div>
  );
}

export default function DashboardPage() {
  const { t, lang } = useLang();
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const u = localStorage.getItem('user');
      if (u) setUser(JSON.parse(u));
    } catch(_e) {}

    Promise.all([
      api.stats(),
      api.leaderboard(),
      apiExt.getAlerts().catch(() => ({ alerts: [] })),
      apiExt.getPortfolioAnalytics().catch(() => null),
    ]).then(([s, l, a, an]) => {
      setStats(s);
      setLeaderboard(l?.leaderboard || []);
      setAlerts(a?.alerts?.slice(0, 5) || []);
      setAnalytics(an);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const s = stats?.portfolio;
  const timeData = stats?.monthly || [];

  // Locale for date based on language
  const dateLocale = lang === 'fr' ? 'en-US' : 'en-US';
  const dateOptions = { weekday: 'long' as const, year: 'numeric' as const, month: 'long' as const, day: 'numeric' as const };
  const greeting = lang === 'fr' ? 'Bonjour' : 'Hello';

  const kpis = [
    { label: lang === 'fr' ? 'Total carbon credits' : 'Total Carbon Credits', value: s ? `${fmt(s.totalCarbonCredits)} tCO₂e` : '—', color: '#00FF94', sub: `${s?.projectCount || 0} ${lang === 'fr' ? 'projets' : 'projects'}`, icon: '🌍' },
    { label: lang === 'fr' ? 'Revenus carbone' : 'Carbon Revenue', value: s ? fmtM(s.totalRevenueUSD) : '—', color: '#FCD34D', sub: `$12/tCO₂e avg.`, icon: '💰' },
    { label: lang === 'fr' ? 'Production totale' : 'Total Production', value: s ? `${fmt(s.totalEnergyMWh)} MWh` : '—', color: '#38BDF8', sub: lang === 'fr' ? 'Toutes années' : 'All years', icon: '⚡' },
    { label: lang === 'fr' ? 'Article 6 Potential' : 'Article 6 Potential', value: s ? fmtM(s.totalCarbonCredits * 45) : '—', color: '#A78BFA', sub: '×3.75 vs Verra', icon: '🏛️' },
  ];

  const scoreItems = [
    { label: 'MRV Engine', score: 92, color: '#00FF94' },
    { label: 'Data Quality', score: analytics?.dataQuality?.completeness || 70, color: '#38BDF8' },
    { label: lang === 'fr' ? 'Optimisation' : 'Optimization', score: 45, color: '#FCD34D', note: lang === 'fr' ? 'Voir recommandations' : 'See recommendations' },
    { label: 'Multi-standard', score: 30, color: '#A78BFA', note: lang === 'fr' ? 'Article 6 potentiel' : 'Article 6 potential' },
  ];

  const quickActions = [
    { href: '/dashboard/projects/new', icon: '➕', label: lang === 'fr' ? 'New project' : 'New project', color: '#00FF94' },
    { href: '/dashboard/upload',       icon: '📥', label: lang === 'fr' ? 'Import CSV' : 'Import CSV',    color: '#38BDF8' },
    { href: '/dashboard/optimization', icon: '⚙️', label: lang === 'fr' ? 'Optimiser MRV' : 'Optimize MRV', color: '#FCD34D' },
    { href: '/dashboard/marketplace',  icon: '🏪', label: 'Marketplace',                                     color: '#A78BFA' },
    { href: '/dashboard/assistant',    icon: '🤖', label: 'AI Assistant',                                    color: '#EF9F27' },
    { href: '/dashboard/registry',     icon: '⛓️', label: lang === 'fr' ? 'Émettre crédits' : 'Issue credits', color: '#00FF94' },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>
          {new Date().toLocaleDateString(dateLocale, dateOptions)}
        </div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: '#E8EFF6', margin: 0 }}>
          {greeting}, {(user as any)?.name?.split(' ')[0] || 'User'} 👋
        </h1>
        <p style={{ fontSize: 13, color: '#4A6278', marginTop: 4 }}>
          {lang === 'fr' ? 'Votre portfolio carbone africain' : 'Your African carbon portfolio'} · PANGEA CARBON Intelligence Platform
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background: '#0D1117', border: `1px solid ${k.color}18`, borderRadius: 12, padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 12, right: 14, fontSize: 22, opacity: 0.4 }}>{k.icon}</div>
            <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8 }}>{k.label.toUpperCase()}</div>
            <div style={{ fontSize: 'clamp(18px,2.5vw,26px)', fontWeight: 800, color: k.color, fontFamily: 'Syne, sans-serif', lineHeight: 1.1 }}>
              {loading ? <div style={{ width: 80, height: 28, background: '#1E2D3D', borderRadius: 4, animation: 'pulse 1.5s infinite' }}/> : k.value}
            </div>
            <div style={{ fontSize: 11, color: '#2A3F55', marginTop: 4 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Chart */}
        <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 2 }}>
                {lang === 'fr' ? 'CRÉDITS CARBONE · TENDANCE MENSUELLE' : 'CARBON CREDITS · MONTHLY TREND'}
              </div>
              <div style={{ fontSize: 13, color: '#E8EFF6', fontWeight: 500 }}>
                {lang === 'fr' ? 'Production MWh par mois' : 'Monthly MWh production'}
              </div>
            </div>
            <a href="/dashboard/projection" style={{ fontSize: 12, color: '#A78BFA', textDecoration: 'none', background: 'rgba(167,139,250,0.1)', padding: '4px 10px', borderRadius: 6 }}>
              📈 {lang === 'fr' ? '10-Year Forecast →' : '10-year forecast →'}
            </a>
          </div>
          {timeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={timeData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="gradMWh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00FF94" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#00FF94" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fill: '#4A6278', fontSize: 10 }}/>
                <YAxis tick={{ fill: '#4A6278', fontSize: 10 }}/>
                <Tooltip content={<TT active={undefined} payload={undefined} label={undefined}/>}/>
                <Area dataKey="energyMWh" stroke="#00FF94" fill="url(#gradMWh)" strokeWidth={2} dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#4A6278' }}>
              <div style={{ fontSize: 32 }}>📊</div>
              <div style={{ fontSize: 13 }}>
                {lang === 'fr' ? 'Insufficient data · Importez des lectures' : 'No data · Import readings first'}
              </div>
              <a href="/dashboard/upload" style={{ fontSize: 12, color: '#00FF94', textDecoration: 'none', background: 'rgba(0,255,148,0.08)', padding: '6px 14px', borderRadius: 7, border: '1px solid rgba(0,255,148,0.2)' }}>
                {lang === 'fr' ? 'Import des données →' : 'Import data →'}
              </a>
            </div>
          )}
        </div>

        {/* Alerts */}
        <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>
              {lang === 'fr' ? 'ALERTES RÉCENTES' : 'RECENT ALERTS'}
            </div>
            {alerts.filter(a => a.severity === 'critical' || a.severity === 'warning').length > 0 && (
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#F87171', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {alerts.filter(a => a.severity === 'critical' || a.severity === 'warning').length}
              </div>
            )}
          </div>
          {alerts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(alerts as any[]).map((alert) => {
                const sty = SEVERITY_STYLE[alert.severity] || SEVERITY_STYLE.info;
                return (
                  <div key={alert.id} style={{ padding: '10px 12px', background: sty.bg, border: `1px solid ${sty.border}`, borderRadius: 8, fontSize: 12, color: sty.color }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                      <span style={{ flexShrink: 0 }}>{sty.icon}</span>
                      <span style={{ color: '#8FA3B8', lineHeight: 1.5 }}>{alert.message}</span>
                    </div>
                    <div style={{ fontSize: 10, color: '#2A3F55', marginTop: 4 }}>
                      {new Date(alert.createdAt).toLocaleDateString(dateLocale)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '20px 0', textAlign: 'center', color: '#4A6278' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 12 }}>
                {lang === 'fr' ? 'Aucune alerte · Tous les projets sont dans les normes' : 'No alerts · All projects within norms'}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Leaderboard */}
        <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', background: '#121920', borderBottom: '1px solid #1E2D3D', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>
              {lang === 'fr' ? 'TOP PROJETS · CRÉDITS CARBONE' : 'TOP PROJECTS · CARBON CREDITS'}
            </div>
            <a href="/dashboard/benchmark" style={{ fontSize: 11, color: '#FCD34D', textDecoration: 'none' }}>
              {lang === 'fr' ? 'Benchmark →' : 'Benchmark →'}
            </a>
          </div>
          {(leaderboard as any[]).length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {(leaderboard as any[]).slice(0, 5).map((p, i) => (
                  <tr key={p.projectId} style={{ borderBottom: '1px solid rgba(30,45,61,0.4)', cursor: 'pointer' }}
                    onClick={() => window.location.href = `/dashboard/projects/${p.projectId}`}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(30,45,61,0.3)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '10px 14px', width: 36 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: i === 0 ? 'rgba(252,211,77,0.2)' : '#121920', color: i === 0 ? '#FCD34D' : '#4A6278', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{i+1}</div>
                    </td>
                    <td style={{ padding: '10px 4px' }}>
                      <div style={{ fontSize: 13, color: '#E8EFF6', fontWeight: 500 }}>{p.name}</div>
                      <div style={{ fontSize: 10, color: '#4A6278' }}>{p.countryCode} · {p.type}</div>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#00FF94', fontFamily: 'JetBrains Mono, monospace' }}>{fmt(p.netCarbonCredits)}</div>
                      <div style={{ fontSize: 10, color: '#4A6278' }}>tCO₂e</div>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <div style={{ fontSize: 13, color: '#FCD34D', fontFamily: 'JetBrains Mono, monospace' }}>${fmt(p.revenueUSD)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '28px', textAlign: 'center', color: '#4A6278', fontSize: 13 }}>
              {lang === 'fr' ? 'No projects avec données MRV' : 'No projects with MRV data yet'}
            </div>
          )}
        </div>

        {/* Score + Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Portfolio score */}
          <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 18 }}>
            <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 12 }}>
              {lang === 'fr' ? 'SCORE PORTFOLIO · PALANTIR INTELLIGENCE' : 'PORTFOLIO SCORE · PALANTIR INTELLIGENCE'}
            </div>
            {scoreItems.map(item => (
              <div key={item.label} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                  <span style={{ color: '#8FA3B8' }}>{item.label}</span>
                  <span style={{ color: item.color, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>{item.score}/100</span>
                </div>
                <div style={{ height: 6, background: '#121920', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${item.score}%`, height: '100%', background: item.color, borderRadius: 3, transition: 'width 1s ease' }}/>
                </div>
                {item.note && <div style={{ fontSize: 10, color: '#2A3F55', marginTop: 2 }}>{item.note}</div>}
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 12 }}>
              {lang === 'fr' ? 'ACTIONS RAPIDES' : 'QUICK ACTIONS'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {quickActions.map(action => (
                <a key={action.href} href={action.href}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: '#121920', borderRadius: 8, border: '1px solid #1E2D3D', textDecoration: 'none', transition: 'all 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = `${action.color}40`)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '#1E2D3D')}>
                  <span style={{ fontSize: 15 }}>{action.icon}</span>
                  <span style={{ fontSize: 11, color: '#8FA3B8', fontWeight: 500 }}>{action.label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}
