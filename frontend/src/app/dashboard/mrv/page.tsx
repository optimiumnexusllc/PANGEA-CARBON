'use client';
import { useLang } from '@/lib/lang-context';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { api } from '@/lib/api';

const COUNTRIES = [
  { code: 'CI', name: "Côte d'Ivoire", ef: 0.547 },
  { code: 'KE', name: 'Kenya', ef: 0.251 },
  { code: 'NG', name: 'Nigeria', ef: 0.430 },
  { code: 'GH', name: 'Ghana', ef: 0.342 },
  { code: 'SN', name: 'Sénégal', ef: 0.643 },
  { code: 'ZA', name: 'Afrique du Sud', ef: 0.797 },
  { code: 'MA', name: 'Maroc', ef: 0.631 },
  { code: 'TZ', name: 'Tanzanie', ef: 0.320 },
  { code: 'CM', name: 'Cameroun', ef: 0.209 },
  { code: 'ET', name: 'Éthiopie', ef: 0.101 },
  { code: 'RW', name: 'Rwanda', ef: 0.329 },
  { code: 'UG', name: 'Ouganda', ef: 0.191 },
];

const fmt = (n: number, d = 0) => n?.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) ?? '0';

export default function MRVCalculatorPage() {
  const { t, lang } = useLang();
  const L = (en, fr) => lang === 'fr' ? fr : en;
  const [mw, setMw] = useState(10);
  const [cf, setCf] = useState(85);
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [price, setPrice] = useState(12);
  const [years, setYears] = useState(10);
  const [priceEscalation, setPriceEscalation] = useState(3);

  const annualMWh = mw * 8760 * (cf / 100);
  const grossCredits = annualMWh * country.ef;
  const netCredits = grossCredits * 0.92; // 3% leakage + 5% uncertainty
  const grossRev = netCredits * price;
  const netRev = grossRev * 0.92; // 8% verification cost

  // 10-year projection
  const projData = Array.from({ length: years }, (_, i) => {
    const yr = i + 1;
    const p = price * Math.pow(1 + priceEscalation / 100, i);
    const credits = netCredits;
    return { year: 'An ' + yr, credits: parseFloat(credits.toFixed(0)), revenue: parseFloat((credits * p * 0.92).toFixed(0)) };
  });
  const totalRev = projData.reduce((s, d) => s + d.revenue, 0);
  const totalCredits = projData.reduce((s, d) => s + d.credits, 0);

  const Slider = ({ label, value, setValue, min, max, step = 1, unit = '', color = '#00FF94' }: any) => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <label style={{ fontSize: 11, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>{label}</label>
        <span style={{ fontSize: 13, color, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => setValue(Number(e.target.value))}
        style={{ width: '100%', accentColor: color, cursor: 'pointer' }}/>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#2A3F55', marginTop: 2 }}>
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  );

  const TooltipC = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="card" style={{ padding: '8px 12px', border: '1px solid #2A3F55', fontSize: 12 }}>
        <div style={{ color: '#4A6278', marginBottom: 4 }}>{label}</div>
        {payload.map((p, i) => <div key={i} style={{ color: p.color, fontWeight: 600 }}>{fmt(p.value)} {p.name === 'revenue' ? 'USD' : 'tCO₂e'}</div>)}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-[1300px] mx-auto">
      <div className="mb-6">
        <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>TOOL · VERRA ACM0002</div>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: 'Syne, sans-serif' }}>Interactive MRV Calculator</h1>
        <p style={{ fontSize: 13, color: '#4A6278', marginTop: 4 }}>Simulate your carbon credits in real time et revenus selon Verra ACM0002</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20, alignItems: 'start' }}>
        {/* Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 16 }}>L('PROJECT PARAMETERS', 'PARAMÈTRES DU PROJET')</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ fontSize: 11, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>L('Country', 'Pays')</label>
                <select className="input-dark" value={country.code} onChange={e => setCountry(COUNTRIES.find(c => c.code === e.target.value) || COUNTRIES[0])}>
                  {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name} — {c.ef} tCO₂/MWh</option>)}
                </select>
              </div>
              <Slider label="Installed capacity" value={mw} setValue={setMw} min={1} max={500} unit=" MW" color="#38BDF8"/>
              <Slider label="Capacity factor" value={cf} setValue={setCf} min={10} max={100} unit="%" color="#A78BFA"/>
              <Slider label="Carbon price" value={price} setValue={setPrice} min={5} max={50} unit=" $/t" color="#FCD34D"/>
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 16 }}>L('PROJECTION PARAMETERS', 'PARAMÈTRES PROJECTION')</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <Slider label="Horizon (years)" value={years} setValue={setYears} min={1} max={20} color="#00FF94"/>
              <Slider label="Carbon price escalation" value={priceEscalation} setValue={setPriceEscalation} min={0} max={10} unit="%" color="#F87171"/>
            </div>
          </div>

          {/* Méthodologie box */}
          <div style={{ background: 'rgba(0,255,148,0.04)', border: '1px solid rgba(0,255,148,0.12)', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 10, color: '#00CC77', fontFamily: 'JetBrains Mono, monospace', marginBottom: 10 }}>L('ACM0002 METHODOLOGY', 'MÉTHODOLOGIE ACM0002')</div>
            {[
              ['Grid EF', country.ef + ' tCO₂/MWh'],
              ['Leakage deduction', '3%'],
              ['Uncertainty deduction', '5%'],
              ['Verification costs', '8%'],
            ].map(([k, v]) => (
              <div key={String(k)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
                <span style={{ color: '#4A6278' }}>{k}</span>
                <span style={{ color: '#8FA3B8', fontFamily: 'JetBrains Mono, monospace' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* KPI Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { label: 'Annual production', value: fmt(annualMWh) + ' MWh', color: '#38BDF8' },
              { label: 'Net credits/year', value: fmt(netCredits) + ' tCO₂e', color: '#00FF94' },
              { label: 'Net revenue/year', value: '$' + fmt(netRev), color: '#FCD34D' },
              { label: `Total ${years} ans`, value: '$' + fmt(totalRev), color: '#A78BFA' },
            ].map(kpi => (
              <div key={kpi.label} className="stat-card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6, textTransform: 'uppercase' }}>{kpi.label}</div>
                <div style={{ fontSize: 19, fontWeight: 700, color: kpi.color, fontFamily: 'Syne, sans-serif' }}>{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 14 }}>PROJECTION REVENUS CARBONE · {years} ANS</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={projData}>
                <XAxis dataKey="year" tick={{ fill: '#4A6278', fontSize: 10 }}/>
                <YAxis tick={{ fill: '#4A6278', fontSize: 10 }} tickFormatter={v => '$' + (v/1000).toFixed(0) + 'k'}/>
                <Tooltip content={<TooltipC />}/>
                <Bar dataKey="revenue" name="revenue" fill="#00FF94" fillOpacity={0.7} radius={[3, 3, 0, 0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 14 }}>CUMULATIVE tCO₂e CREDITS</div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={projData.map((d, i) => ({ ...d, cumCredits: projData.slice(0, i + 1).reduce((s, x) => s + x.credits, 0) }))}>
                <XAxis dataKey="year" tick={{ fill: '#4A6278', fontSize: 10 }}/>
                <YAxis tick={{ fill: '#4A6278', fontSize: 10 }}/>
                <Tooltip content={<TooltipC />}/>
                <Line type="monotone" dataKey="cumCredits" name="credits" stroke="#38BDF8" strokeWidth={2} dot={false}/>
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Waterfall calcul détaillé */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 16 }}>DETAILED ACM0002 CALCULATION</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                ['Gross production', fmt(annualMWh, 1) + ' MWh', '#E8EFF6', false],
                ['× EF ' + country.code, country.ef + ' tCO₂/MWh', '#E8EFF6', false],
                ['Gross reductions', fmt(grossCredits) + ' tCO₂e', '#38BDF8', false],
                ['- Fuites (3%)', '- ' + fmt(grossCredits * 0.03) + ' tCO₂e', '#F87171', false],
                ['- Incertitude (5%)', '- ' + fmt(grossCredits * 0.05) + ' tCO₂e', '#F87171', false],
                ['= Net credits', fmt(netCredits) + ' tCO₂e', '#00FF94', true],
                ['× Prix', '$' + price + '/tCO₂e', '#E8EFF6', false],
                ['Gross revenue', '$' + fmt(grossRev), '#38BDF8', false],
                ['- Vérification (8%)', '- $' + fmt(grossRev * 0.08), '#F87171', false],
                ['= Net revenue/year', '$' + fmt(netRev), '#FCD34D', true],
              ].map(([k, v, c, bold], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 5,
                  background: bold ? 'rgba(0,255,148,0.05)' : 'transparent', border: bold ? '1px solid rgba(0,255,148,0.1)' : 'none' }}>
                  <span style={{ fontSize: 11, color: '#4A6278' }}>{k}</span>
                  <span style={{ fontSize: 12, color: c as string, fontFamily: 'JetBrains Mono, monospace', fontWeight: bold ? 700 : 400 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
