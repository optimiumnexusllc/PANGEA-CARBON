'use client';
import { useLang } from '@/lib/lang-context';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { api } from '@/lib/api';

const fmt = (n: number, d = 0) => n?.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) ?? '—';
const STATUS_BADGE = { DRAFT: 'badge-ghost', ACTIVE: 'badge-sky', MONITORING: 'badge-amber', VERIFIED: 'badge-acid', CREDITED: 'badge-acid' };
const STATUS_FR = { DRAFT: 'Draft', ACTIVE: 'Active', MONITORING: 'Monitoring', VERIFIED: 'Verified', CREDITED: 'Credited' };

const Tooltip_ = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card" style={{ padding: '8px 12px', border: '1px solid #2A3F55', fontSize: 12 }}>
      <div style={{ color: '#4A6278', marginBottom: 4 }}>{label}</div>
      {payload.map((p: any, i: number) => <div key={i} style={{ color: p.color, fontWeight: 600 }}>{fmt(p.value, 1)} {p.name}</div>)}
    </div>
  );
};

export default function ProjectDetailPage() {
  const { t } = useLang();
  const { id } = useParams();
  const [project, setProject] = useState<any>(null);
  const [mrv, setMrv] = useState<any>(null);
  const [projection, setProjection] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'readings' | 'mrv' | 'projection'>('overview');
  const [addReading, setAddReading] = useState(false);
  const [readingForm, setReadingForm] = useState({ periodStart: '', periodEnd: '', energyMWh: '', availabilityPct: '', notes: '' });
  const [savingReading, setSavingReading] = useState(false);
  const year = new Date().getFullYear();

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.getProject(String(id)),
      api.getMRV(String(id), year).catch(() => null),
      api.getProjection(String(id), 10).catch(() => null),
    ]).then(([p, m, pr]) => { setProject(p); setMrv(m); setProjection(pr); })
    .finally(() => setLoading(false));
  }, [id]);

  const submitReading = async () => {
    setSavingReading(true);
    try {
      await api.addReading(String(id), { ...readingForm, energyMWh: parseFloat(readingForm.energyMWh) });
      setAddReading(false);
      setReadingForm({ periodStart: '', periodEnd: '', energyMWh: '', availabilityPct: '', notes: '' });
      const [p, m] = await Promise.all([api.getProject(String(id)), api.getMRV(String(id), year).catch(() => null)]);
      setProject(p); setMrv(m);
    } catch(e) { alert(e.message); }
    setSavingReading(false);
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><div style={{ width: 28, height: 28, border: '2px solid rgba(0,255,148,0.2)', borderTopColor: '#00FF94', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;
  if (!project) return <div className="p-6 text-center" style={{ color: '#4A6278' }}>Project introuvable</div>;

  const readings = project.readings || [];
  const chartData = readings.map((r: any) => ({
    period: new Date(r.periodStart).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    MWh: r.energyMWh,
    dispo: r.availabilityPct,
  })).reverse();

  const projData = projection?.projections || [];

  const TABS = [
    { id: 'overview', label: 'Vue d\'ensemble' },
    { id: 'readings', label: `Données (${readings.length})` },
    { id: 'mrv', label: 'Résultats MRV' },
    { id: 'projection', label: '10-Year Forecast' },
  ];

  return (
    <div className="p-6 max-w-[1300px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <a href="/dashboard/projects" style={{ fontSize: 12, color: '#4A6278', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>← Projects</a>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1 className="text-2xl font-semibold" style={{ fontFamily: 'Syne, sans-serif' }}>{project.name}</h1>
              <span className={`badge ${STATUS_BADGE[project.status] || 'badge-ghost'}`}>{STATUS_FR[project.status]}</span>
            </div>
            <div style={{ fontSize: 13, color: '#4A6278' }}>
              {project.type} · {project.country} · {project.installedMW} MW · {project.standard}
            </div>
          </div>
          <button onClick={() => setAddReading(true)} className="btn-primary">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Ajouter données
          </button>
        </div>
      </div>

      {/* KPI Row */}
      {mrv && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Production totale', value: fmt(mrv.projectMetrics?.totalMWh) + ' MWh', color: '#38BDF8' },
            { label: 'Crédits carbone nets', value: fmt(mrv.emissions?.netCarbonCredits) + ' tCO₂e', color: '#00FF94' },
            { label: 'Revenus estimés', value: '$' + fmt(mrv.financials?.netRevenueUSD), color: '#FCD34D' },
            { label: 'Capacity factor', value: fmt(mrv.projectMetrics?.capacityFactorPct, 1) + '%', color: '#A78BFA' },
          ].map(kpi => (
            <div key={kpi.label} className="stat-card">
              <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', marginBottom: 6 }}>{kpi.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: kpi.color, fontFamily: 'Syne, sans-serif' }}>{kpi.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, borderBottom: '1px solid #1E2D3D', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)}
            style={{ padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13,
              color: activeTab === t.id ? '#00FF94' : '#4A6278',
              borderBottom: activeTab === t.id ? '2px solid #00FF94' : '2px solid transparent',
              marginBottom: -1 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 14 }}>PRODUCTION MENSUELLE · MWh</div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00FF94" stopOpacity={0.2}/><stop offset="95%" stopColor="#00FF94" stopOpacity={0}/></linearGradient></defs>
                  <XAxis dataKey="period" tick={{ fill: '#4A6278', fontSize: 10 }}/>
                  <YAxis tick={{ fill: '#4A6278', fontSize: 10 }}/>
                  <Tooltip content={<Tooltip_ />}/>
                  <Area type="monotone" dataKey="MWh" stroke="#00FF94" strokeWidth={2} fill="url(#g)"/>
                </AreaChart>
              </ResponsiveContainer>
            ) : <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4A6278', fontSize: 13 }}>No data — ajoutez des lectures de production</div>}
          </div>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 14 }}>DÉTAILS PROJET</div>
            {[
              ['Country', project.country], ['Code', project.countryCode],
              ['MW installés', project.installedMW], ['Grid EF', project.baselineEF + ' tCO₂/MWh'],
              ['Standard', project.standard], ['Démarrage', new Date(project.startDate).toLocaleDateString('en-US')],
              ['Lectures', project._count?.readings || 0], ['Rapports', project._count?.reports || 0],
            ].map(([k, v]) => (
              <div key={String(k)} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(30,45,61,0.5)' }}>
                <span style={{ fontSize: 11, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>{k}</span>
                <span style={{ fontSize: 12, color: '#E8EFF6' }}>{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'readings' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          {readings.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#4A6278' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
              <div style={{ fontSize: 14, marginBottom: 4 }}>No data de production</div>
              <div style={{ fontSize: 12 }}>Click "Ajouter données" pour saisir votre première lecture</div>
            </div>
          ) : (
            <table className="table-dark">
              <thead><tr><th>Période début</th><th>Période fin</th><th>Production MWh</th><th>Availability %</th><th>Source</th><th>Scores</th></tr></thead>
              <tbody>
                {readings.map((r: any) => (
                  <tr key={r.id}>
                    <td>{new Date(r.periodStart).toLocaleDateString('en-US')}</td>
                    <td>{new Date(r.periodEnd).toLocaleDateString('en-US')}</td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', color: '#00FF94', fontWeight: 600 }}>{fmt(r.energyMWh, 1)}</td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace' }}>{r.availabilityPct ? fmt(r.availabilityPct, 1) + '%' : '—'}</td>
                    <td><span className="badge badge-ghost">{r.source}</span></td>
                    <td style={{ fontSize: 11 }}>{r.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'mrv' && mrv && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            { title: 'RÉDUCTIONS D\'ÉMISSIONS', items: [
              ['Brutes', fmt(mrv.emissions?.grossReductions) + ' tCO₂e', '#E8EFF6'],
              ['Leakage deduction (3%)', '- ' + fmt(mrv.emissions?.leakageDeduction) + ' tCO₂e', '#F87171'],
              ['Uncertainty deduction (5%)', '- ' + fmt(mrv.emissions?.uncertaintyDeduction) + ' tCO₂e', '#F87171'],
              ['CRÉDITS NETS', fmt(mrv.emissions?.netCarbonCredits) + ' tCO₂e', '#00FF94'],
            ]},
            { title: 'REVENUS CARBONE', items: [
              ['Prix marché', '$' + mrv.financials?.marketPriceUSD + '/tCO₂e', '#E8EFF6'],
              ['Gross revenue', '$' + fmt(mrv.financials?.grossRevenueUSD), '#38BDF8'],
              ['Verification costs (8%)', '- $' + fmt(mrv.financials?.transactionCostsUSD), '#F87171'],
              ['REVENUS NETS', '$' + fmt(mrv.financials?.netRevenueUSD), '#FCD34D'],
            ]},
          ].map(section => (
            <div key={section.title} className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 16 }}>{section.title}</div>
              {section.items.map(([k, v, c], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0',
                  borderBottom: i < section.items.length - 1 ? '1px solid rgba(30,45,61,0.5)' : 'none',
                  borderTop: i === section.items.length - 1 ? '1px solid rgba(30,45,61,0.8)' : 'none',
                  marginTop: i === section.items.length - 1 ? 4 : 0 }}>
                  <span style={{ fontSize: 12, color: i === section.items.length - 1 ? '#E8EFF6' : '#8FA3B8', fontWeight: i === section.items.length - 1 ? 600 : 400 }}>{k}</span>
                  <span style={{ fontSize: 13, color: c, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
          ))}
          <div className="card" style={{ padding: 20, gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 14 }}>ÉQUIVALENTS ENVIRONNEMENTAUX</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {[
                ['🚗', 'Voitures retirées', fmt(mrv.equivalents?.carsOffRoad)],
                ['🌳', 'Arbres équivalents', fmt(mrv.equivalents?.treesPlanted)],
                ['🏠', 'Households electrified', fmt(mrv.equivalents?.homesElectrified)],
              ].map(([icon, label, val]) => (
                <div key={String(label)} style={{ textAlign: 'center', padding: '16px', background: '#0D1117', borderRadius: 8 }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#E8EFF6', fontFamily: 'Syne, sans-serif' }}>{val}</div>
                  <div style={{ fontSize: 11, color: '#4A6278', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'projection' && projData.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 14 }}>CARBON REVENUE PROJECTION · 10 YEARS</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={projData}>
                <XAxis dataKey="year" tick={{ fill: '#4A6278', fontSize: 10 }} tickFormatter={v => 'An ' + v}/>
                <YAxis tick={{ fill: '#4A6278', fontSize: 10 }} tickFormatter={v => '$' + (v/1000).toFixed(0) + 'k'}/>
                <Tooltip content={<Tooltip_ />}/>
                <Bar dataKey="revenueUSD" name="USD" fill="#00FF94" fillOpacity={0.7} radius={[3, 3, 0, 0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              ['Total crédits 10 ans', fmt(projection.totalCredits) + ' tCO₂e', '#00FF94'],
              ['Total revenus 10 ans', '$' + fmt(projection.totalRevenue), '#FCD34D'],
              ['Revenu moyen/an', '$' + fmt(projection.totalRevenue / 10), '#38BDF8'],
            ].map(([l, v, c]) => (
              <div key={String(l)} className="stat-card">
                <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>{l}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: c, fontFamily: 'Syne, sans-serif' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Reading Modal */}
      {addReading && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card animate-slide-up" style={{ padding: 28, width: '100%', maxWidth: 480, margin: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 600 }}>Ajouter une lecture</div>
              <button onClick={() => setAddReading(false)} style={{ background: 'none', border: 'none', color: '#4A6278', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                ['Début de période', 'periodStart', 'date'],
                ['Fin de période', 'periodEnd', 'date'],
                ['Production (MWh)', 'energyMWh', 'number'],
                ['Availability (%)', 'availabilityPct', 'number'],
              ].map(([label, key, type]) => (
                <div key={key}>
                  <label style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>{label}</label>
                  <input className="input-dark" type={type} step={type === 'number' ? '0.01' : undefined}
                    value={(readingForm as any)[key]} onChange={e => setReadingForm(f => ({ ...f, [key]: e.target.value }))}/>
                </div>
              ))}
              <div>
                <label style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>Scores</label>
                <input className="input-dark" placeholder="Optionnel" value={readingForm.notes} onChange={e => setReadingForm(f => ({ ...f, notes: e.target.value }))}/>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button className="btn-ghost" onClick={() => setAddReading(false)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn-primary" onClick={submitReading} disabled={savingReading} style={{ flex: 1, justifyContent: 'center' }}>
                {savingReading ? 'Sauvegarde...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
