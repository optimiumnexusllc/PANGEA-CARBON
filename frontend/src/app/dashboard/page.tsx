'use client';
import { useEffect, useState } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { api } from '@/lib/api';

const fmt = (n: number, dec = 0) => n ? n.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : '—';
const fmtUSD = (n: number) => n ? '$' + fmt(n, 0) : '—';

const TYPE_COLORS: Record<string, string> = {
  SOLAR: '#FCD34D', WIND: '#38BDF8', HYDRO: '#00FF94', BIOMASS: '#F87171', HYBRID: '#A78BFA'
};
const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  DRAFT:     { label: 'Brouillon',   cls: 'badge-ghost' },
  ACTIVE:    { label: 'Actif',       cls: 'badge-sky' },
  MONITORING:{ label: 'Monitoring',  cls: 'badge-amber' },
  VERIFIED:  { label: 'Vérifié',     cls: 'badge-acid' },
  CREDITED:  { label: 'Crédité',     cls: 'badge-acid' },
};

function KPICard({ label, value, sub, accent = false, icon }: any) {
  return (
    <div className="stat-card animate-slide-up">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-mono uppercase tracking-widest" style={{ color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>
          {label}
        </span>
        {icon && <span style={{ color: accent ? '#00FF94' : '#2A3F55' }}>{icon}</span>}
      </div>
      <div className={`text-2xl font-semibold mb-1 ${accent ? 'text-acid' : ''}`}
        style={{ fontFamily: 'Syne, sans-serif', color: accent ? '#00FF94' : '#E8EFF6' }}>
        {value}
      </div>
      {sub && <div className="text-xs" style={{ color: '#4A6278' }}>{sub}</div>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card" style={{ padding: '10px 14px', border: '1px solid #2A3F55' }}>
      <div className="text-xs mb-1" style={{ color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="text-sm font-semibold" style={{ color: p.color }}>
          {fmt(p.value, 1)} {p.name}
        </div>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.stats(), api.leaderboard()])
      .then(([s, l]) => { setStats(s); setLeaderboard(l); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mb-3"
          style={{ borderColor: 'rgba(0,255,148,0.3)', borderTopColor: 'transparent' }} />
        <div className="text-xs" style={{ color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>
          CHARGEMENT DES DONNÉES MRV...
        </div>
      </div>
    </div>
  );

  const ov = stats?.overview || {};
  const timeline = stats?.timeline || [];
  const byType = stats?.projectsByType || [];
  const byStatus = stats?.projectsByStatus || [];

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00FF94' }} />
            <span className="text-xs font-mono" style={{ color: '#00FF94', fontFamily: 'JetBrains Mono, monospace' }}>
              SYSTÈME ACTIF · ACM0002
            </span>
          </div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: 'Syne, sans-serif' }}>
            Carbon Intelligence
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#4A6278' }}>
            Vue en temps réel de votre portefeuille MRV · Afrique
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/dashboard/projects" className="btn-primary">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Nouveau projet
          </a>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <KPICard
          label="Crédits Carbone Nets"
          value={fmt(ov.totalCarbonCredits) + ' tCO₂e'}
          sub="Verra ACM0002 certifiables"
          accent={true}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm0 0v20M2 12h20"/></svg>}
        />
        <KPICard
          label="Revenus Carbone Estimés"
          value={fmtUSD(ov.totalRevenueUSD)}
          sub="Prix moyen $12/tCO₂e"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6"/></svg>}
        />
        <KPICard
          label="Production Totale"
          value={fmt(ov.totalEnergyMWh) + ' MWh'}
          sub={fmt(ov.totalInstalledMW, 1) + ' MW installés'}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>}
        />
        <KPICard
          label="Projets MRV"
          value={ov.totalProjects?.toString() || '0'}
          sub={ov.totalReadings + ' lectures enregistrées'}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>}
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: '2fr 1fr' }}>
        {/* Timeline chart */}
        <div className="card" style={{ padding: '20px' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs font-mono mb-0.5" style={{ color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>PRODUCTION ÉNERGÉTIQUE</div>
              <div className="text-sm font-medium">Timeline 12 mois · MWh</div>
            </div>
            <span className="badge badge-acid">LIVE</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={timeline} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00FF94" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#00FF94" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="period" tick={{ fill: '#4A6278', fontSize: 10 }} tickFormatter={v => new Date(v).toLocaleDateString('fr-FR', { month: 'short' })}/>
              <YAxis tick={{ fill: '#4A6278', fontSize: 10 }}/>
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="energyMWh" name="MWh" stroke="#00FF94" strokeWidth={2} fill="url(#areaGrad)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Type donut */}
        <div className="card" style={{ padding: '20px' }}>
          <div className="text-xs font-mono mb-0.5" style={{ color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>PAR TYPE DE PROJET</div>
          <div className="text-sm font-medium mb-4">Répartition du parc</div>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={byType} dataKey="_count" nameKey="type" cx="50%" cy="50%" innerRadius={40} outerRadius={65}>
                {byType.map((entry: any, i: number) => (
                  <Cell key={i} fill={TYPE_COLORS[entry.type] || '#4A6278'}/>
                ))}
              </Pie>
              <Tooltip formatter={(v: any, n: any) => [v + ' projets', n]}/>
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-2">
            {byType.map((e: any) => (
              <div key={e.type} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: TYPE_COLORS[e.type] || '#4A6278' }}/>
                <span className="text-xs" style={{ color: '#8FA3B8' }}>{e.type} ({e._count})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="card" style={{ padding: '20px' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs font-mono mb-0.5" style={{ color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>TOP PROJETS</div>
            <div className="text-sm font-medium">Classement par crédits carbone générés</div>
          </div>
          <a href="/dashboard/projects" className="btn-ghost" style={{ fontSize: '12px', padding: '5px 12px' }}>
            Voir tous →
          </a>
        </div>
        {leaderboard.length === 0 ? (
          <div className="text-center py-8" style={{ color: '#4A6278' }}>
            <div className="text-3xl mb-2">📊</div>
            <div className="text-sm">Aucune donnée MRV calculée</div>
            <div className="text-xs mt-1">Ajoutez des lectures de production pour générer des crédits</div>
          </div>
        ) : (
          <table className="table-dark">
            <thead>
              <tr>
                <th>#</th><th>Projet</th><th>Pays</th><th>Type</th>
                <th style={{ textAlign: 'right' }}>MW</th>
                <th style={{ textAlign: 'right' }}>Crédits tCO₂e</th>
                <th style={{ textAlign: 'right' }}>Revenus USD</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((p: any, i: number) => (
                <tr key={p.projectId} style={{ cursor: 'pointer' }}
                  onClick={() => window.location.href = `/dashboard/projects/${p.projectId}`}>
                  <td><span className="font-mono text-xs" style={{ color: '#4A6278' }}>#{i + 1}</span></td>
                  <td><span style={{ color: '#E8EFF6', fontWeight: 500 }}>{p.projectName}</span></td>
                  <td><span className="badge badge-ghost">{p.countryCode}</span></td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: TYPE_COLORS[p.type] || '#4A6278' }}/>
                      <span className="text-xs">{p.type}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' }}>{p.installedMW}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#00FF94', fontWeight: 600 }}>
                    {fmt(p.carbonCredits)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#38BDF8' }}>
                    {fmtUSD(p.revenueUSD)}
                  </td>
                  <td><span className="badge badge-acid">{p.year}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
