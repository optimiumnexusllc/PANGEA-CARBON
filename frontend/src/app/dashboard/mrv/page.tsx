'use client';
import { useLang } from '@/lib/lang-context';
import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, ComposedChart, Area, ReferenceLine,
} from 'recharts';

// Facteurs d'émission réels (UNFCCC/IEA 2024)
// Facteurs d'émission réseaux africains — IEA/UNFCCC/Verra 2024
const COUNTRIES = [
  // AFRIQUE DE L'OUEST
  { code:'CI', name:"Côte d'Ivoire",      ef:0.547, currency:'XOF', flag:'🇨🇮', region:'Ouest' },
  { code:'GH', name:'Ghana',              ef:0.342, currency:'GHS', flag:'🇬🇭', region:'Ouest' },
  { code:'NG', name:'Nigeria',            ef:0.430, currency:'NGN', flag:'🇳🇬', region:'Ouest' },
  { code:'SN', name:'Sénégal',            ef:0.643, currency:'XOF', flag:'🇸🇳', region:'Ouest' },
  { code:'ML', name:'Mali',               ef:0.598, currency:'XOF', flag:'🇲🇱', region:'Ouest' },
  { code:'BF', name:'Burkina Faso',       ef:0.674, currency:'XOF', flag:'🇧🇫', region:'Ouest' },
  { code:'TG', name:'Togo',               ef:0.571, currency:'XOF', flag:'🇹🇬', region:'Ouest' },
  { code:'BJ', name:'Bénin',              ef:0.519, currency:'XOF', flag:'🇧🇯', region:'Ouest' },
  { code:'NE', name:'Niger',              ef:0.712, currency:'XOF', flag:'🇳🇪', region:'Ouest' },
  { code:'GN', name:'Guinée',             ef:0.296, currency:'GNF', flag:'🇬🇳', region:'Ouest' },
  { code:'GM', name:'Gambie',             ef:0.672, currency:'GMD', flag:'🇬🇲', region:'Ouest' },
  { code:'GW', name:'Guinée-Bissau',      ef:0.641, currency:'XOF', flag:'🇬🇼', region:'Ouest' },
  { code:'SL', name:'Sierra Leone',       ef:0.263, currency:'SLL', flag:'🇸🇱', region:'Ouest' },
  { code:'LR', name:'Liberia',            ef:0.352, currency:'LRD', flag:'🇱🇷', region:'Ouest' },
  { code:'MR', name:'Mauritanie',         ef:0.558, currency:'MRU', flag:'🇲🇷', region:'Ouest' },
  { code:'CV', name:'Cap-Vert',           ef:0.614, currency:'CVE', flag:'🇨🇻', region:'Ouest' },
  // AFRIQUE CENTRALE
  { code:'CM', name:'Cameroun',           ef:0.209, currency:'XAF', flag:'🇨🇲', region:'Centrale' },
  { code:'CD', name:'RD Congo',           ef:0.030, currency:'CDF', flag:'🇨🇩', region:'Centrale' },
  { code:'CG', name:'Congo',              ef:0.281, currency:'XAF', flag:'🇨🇬', region:'Centrale' },
  { code:'GA', name:'Gabon',              ef:0.342, currency:'XAF', flag:'🇬🇦', region:'Centrale' },
  { code:'GQ', name:'Guinée équatoriale', ef:0.527, currency:'XAF', flag:'🇬🇶', region:'Centrale' },
  { code:'CF', name:'Centrafrique',       ef:0.187, currency:'XAF', flag:'🇨🇫', region:'Centrale' },
  { code:'TD', name:'Tchad',              ef:0.624, currency:'XAF', flag:'🇹🇩', region:'Centrale' },
  // AFRIQUE DE L'EST
  { code:'KE', name:'Kenya',              ef:0.251, currency:'KES', flag:'🇰🇪', region:'Est' },
  { code:'TZ', name:'Tanzanie',           ef:0.320, currency:'TZS', flag:'🇹🇿', region:'Est' },
  { code:'ET', name:'Éthiopie',           ef:0.101, currency:'ETB', flag:'🇪🇹', region:'Est' },
  { code:'RW', name:'Rwanda',             ef:0.329, currency:'RWF', flag:'🇷🇼', region:'Est' },
  { code:'UG', name:'Ouganda',            ef:0.191, currency:'UGX', flag:'🇺🇬', region:'Est' },
  { code:'MZ', name:'Mozambique',         ef:0.119, currency:'MZN', flag:'🇲🇿', region:'Est' },
  { code:'MG', name:'Madagascar',         ef:0.517, currency:'MGA', flag:'🇲🇬', region:'Est' },
  { code:'ZW', name:'Zimbabwe',           ef:0.537, currency:'ZWL', flag:'🇿🇼', region:'Est' },
  { code:'MW', name:'Malawi',             ef:0.278, currency:'MWK', flag:'🇲🇼', region:'Est' },
  { code:'BI', name:'Burundi',            ef:0.182, currency:'BIF', flag:'🇧🇮', region:'Est' },
  { code:'SO', name:'Somalie',            ef:0.663, currency:'SOS', flag:'🇸🇴', region:'Est' },
  { code:'DJ', name:'Djibouti',           ef:0.577, currency:'DJF', flag:'🇩🇯', region:'Est' },
  { code:'ER', name:'Érythrée',           ef:0.728, currency:'ERN', flag:'🇪🇷', region:'Est' },
  { code:'SS', name:'Soudan du Sud',      ef:0.643, currency:'SSP', flag:'🇸🇸', region:'Est' },
  { code:'SD', name:'Soudan',             ef:0.352, currency:'SDG', flag:'🇸🇩', region:'Est' },
  { code:'SC', name:'Seychelles',         ef:0.621, currency:'SCR', flag:'🇸🇨', region:'Est' },
  { code:'MU', name:'Maurice',            ef:0.619, currency:'MUR', flag:'🇲🇺', region:'Est' },
  { code:'KM', name:'Comores',            ef:0.712, currency:'KMF', flag:'🇰🇲', region:'Est' },
  // AFRIQUE AUSTRALE
  { code:'ZA', name:'Afrique du Sud',     ef:0.797, currency:'ZAR', flag:'🇿🇦', region:'Australe' },
  { code:'ZM', name:'Zambie',             ef:0.284, currency:'ZMW', flag:'🇿🇲', region:'Australe' },
  { code:'NA', name:'Namibie',            ef:0.348, currency:'NAD', flag:'🇳🇦', region:'Australe' },
  { code:'BW', name:'Botswana',           ef:1.027, currency:'BWP', flag:'🇧🇼', region:'Australe' },
  { code:'SZ', name:'Eswatini',           ef:0.129, currency:'SZL', flag:'🇸🇿', region:'Australe' },
  { code:'LS', name:'Lesotho',            ef:0.021, currency:'LSL', flag:'🇱🇸', region:'Australe' },
  { code:'AO', name:'Angola',             ef:0.350, currency:'AOA', flag:'🇦🇴', region:'Australe' },
  // AFRIQUE DU NORD
  { code:'MA', name:'Maroc',              ef:0.631, currency:'MAD', flag:'🇲🇦', region:'Nord' },
  { code:'EG', name:'Égypte',             ef:0.527, currency:'EGP', flag:'🇪🇬', region:'Nord' },
  { code:'DZ', name:'Algérie',            ef:0.562, currency:'DZD', flag:'🇩🇿', region:'Nord' },
  { code:'TN', name:'Tunisie',            ef:0.490, currency:'TND', flag:'🇹🇳', region:'Nord' },
  { code:'LY', name:'Libye',              ef:0.643, currency:'LYD', flag:'🇱🇾', region:'Nord' },
];

const STANDARDS = [
  { id:'VERRA_VCS',    label:'Verra VCS',       price:7.85,  color:'#00FF94' },
  { id:'GOLD_STANDARD',label:'Gold Standard',   price:14.20, color:'#FCD34D' },
  { id:'ARTICLE6',     label:'Article 6 ITMO',  price:45.00, color:'#38BDF8' },
  { id:'CORSIA',       label:'CORSIA',           price:12.30, color:'#F87171' },
];

const PROJECT_TYPES = [
  { id:'SOLAR',   label:'Solar PV',   icon:'☀️', cfMin:0.18, cfMax:0.30, methodPremium:1.0 },
  { id:'WIND',    label:'Wind',       icon:'💨', cfMin:0.25, cfMax:0.45, methodPremium:1.0 },
  { id:'HYDRO',   label:'Hydro',      icon:'💧', cfMin:0.35, cfMax:0.55, methodPremium:1.05 },
  { id:'BIOMASS', label:'Biomass',    icon:'🌿', cfMin:0.55, cfMax:0.80, methodPremium:0.85 },
  { id:'REDD',    label:'REDD+',      icon:'🌳', cfMin:1.0,  cfMax:1.0,  methodPremium:1.2 },
];

const fmtN = (n, d=0) => (n||0).toLocaleString('en-US', { minimumFractionDigits:d, maximumFractionDigits:d });
const fmtUSD = (n) => '$' + fmtN(n);
const fmtM = (n) => n >= 1e6 ? "$"+((n/1e6).toFixed(2))+"M" : n >= 1e3 ? "$"+((n/1e3).toFixed(1))+"K" : fmtUSD(n);

export default function MRVCalculatorPage() {
  const { lang } = useLang();
  const L = (en, fr) => lang === 'fr' ? fr : en;

  const [mw, setMw]           = useState(10);
  const [cf, setCf]           = useState(25);
  const [countryCode, setCountryCode] = useState('CI');
  const [standard, setStandard]       = useState('VERRA_VCS');
  const [projectType, setProjectType] = useState('SOLAR');
  const [years, setYears]     = useState(10);
  const [priceEsc, setPriceEsc]       = useState(5);   // % escalation/an
  const [tab, setTab]         = useState('calc');

  const country = COUNTRIES.find(c => c.code === countryCode) || COUNTRIES[0];
  const std     = STANDARDS.find(s => s.id === standard) || STANDARDS[0];
  const ptype   = PROJECT_TYPES.find(p => p.id === projectType) || PROJECT_TYPES[0];

  // ── ACM0002 Calculations ─────────────────────────────────────────────────
  const calc = useMemo(() => {
    const annualMWh        = mw * 8760 * (cf / 100);              // MWh produits/an
    const grossReductions  = annualMWh * country.ef;               // tCO2e brutes
    const leakage          = grossReductions * 0.03;               // 3% ACM0002
    const uncertainty      = grossReductions * 0.05;               // 5% ACM0002
    const netCredits       = grossReductions - leakage - uncertainty; // VCUs nets
    const grossRev         = netCredits * std.price;
    const verificationCost = grossRev * 0.08;                      // 8% frais VVB
    const netRev           = grossRev - verificationCost;
    const pricePerCredit   = std.price;
    const carbonIntensity  = grossReductions / annualMWh * 1000;   // gCO2/kWh

    // Projection pluriannuelle
    const projection = Array.from({ length: years }, (_, i) => {
      const yr  = new Date().getFullYear() + i;
      const p   = std.price * Math.pow(1 + priceEsc/100, i);
      const rev = netCredits * p * 0.92;
      const cumulative = Array.from({ length: i+1 }, (_, j) =>
        netCredits * std.price * Math.pow(1+priceEsc/100, j) * 0.92
      ).reduce((a,b) => a+b, 0);
      return {
        year: String(yr), credits: Math.round(netCredits),
        revenue: Math.round(rev), price: parseFloat(p.toFixed(2)),
        cumulative: Math.round(cumulative),
      };
    });

    const totalRevenue = projection.reduce((s,d) => s + d.revenue, 0);
    const totalCredits = projection.reduce((s,d) => s + d.credits, 0);
    const roi = netRev > 0 ? (totalRevenue / (mw * 800000) * 100) : 0; // 800K$/MW install

    return {
      annualMWh, grossReductions, leakage, uncertainty, netCredits,
      grossRev, verificationCost, netRev, carbonIntensity,
      projection, totalRevenue, totalCredits, roi: Math.round(roi),
    };
  }, [mw, cf, country, std, years, priceEsc]);

  const tabs = [
    { id:'calc',  label:'Calculator' },
    { id:'detail',label:'ACM0002 Detail' },
    { id:'compare',label:'Standard Compare' },
    { id:'sensitivity',label:'Sensitivity' },
  ];

  const sld = { width:'100%', accentColor:'#00FF94' };
  const inp = { background:'#121920', border:'1px solid #1E2D3D', borderRadius:8, color:'#E8EFF6', padding:'8px 12px', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box' };

  const Tip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background:'#0D1117', border:'1px solid #1E2D3D', borderRadius:8, padding:'10px 14px', fontSize:12 }}>
        <div style={{ color:'#4A6278', marginBottom:6, fontFamily:'monospace' }}>{label}</div>
        {payload.map((p: any, i: number) => (
          <div key={i} style={{ color:p.color||'#E8EFF6', marginBottom:2 }}>
            {p.name}: {typeof p.value === 'number' && p.value > 1000 ? fmtM(p.value) : fmtN(p.value)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ padding:20, maxWidth:1300, margin:'0 auto' }}>

      <div style={{ marginBottom:18 }}>
        <div style={{ fontSize:9, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.12em', marginBottom:4 }}>
          TOOL · VERRA ACM0002 v22.0 · {country.flag} {country.code} · {std.label}
        </div>
        <h1 style={{ fontFamily:'Syne, sans-serif', fontSize:22, fontWeight:800, color:'#E8EFF6', margin:'0 0 4px' }}>
          {L('Interactive MRV Calculator','Calculateur MRV Interactif')}
        </h1>
        <p style={{ fontSize:13, color:'#4A6278', margin:0 }}>
          {L('Real-time carbon credit simulation · Verra ACM0002 · African grid emission factors (IEA 2024)',
             'Simulation crédits carbone temps réel · Verra ACM0002 · Facteurs réseau africains (IEA 2024)')}
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:16 }}>
        {[
          { label:'Annual MWh',        v: fmtN(calc.annualMWh),    c:'#4A6278', u:'MWh' },
          { label:'Net VCUs/year',     v: fmtN(calc.netCredits),   c:'#00FF94', u:'tCO₂e' },
          { label:'Annual Revenue',    v: fmtM(calc.netRev),       c:'#FCD34D', u:'' },
          { label:`${years}yr Revenue`,v: fmtM(calc.totalRevenue), c:'#A78BFA', u:'' },
          { label:'Lifetime VCUs',     v: fmtN(calc.totalCredits), c:'#38BDF8', u:'tCO₂e' },
        ].map(k => (
          <div key={k.label} style={{ background:'#0D1117', border:'1px solid '+(k.c) + '25', borderRadius:10, padding:'12px 14px' }}>
            <div style={{ fontSize:9, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:4 }}>{k.label.toUpperCase()}</div>
            <div style={{ fontSize:18, fontWeight:800, color:k.c, fontFamily:'Syne, sans-serif' }}>{k.v}</div>
            {k.u && <div style={{ fontSize:10, color:'#2A3F55', marginTop:2 }}>{k.u}</div>}
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'260px 1fr', gap:16 }}>
        {/* Controls */}
        <div style={{ background:'#0D1117', border:'1px solid #1E2D3D', borderRadius:12, padding:16, height:'fit-content' }}>
          <div style={{ fontSize:9, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:14 }}>PROJECT PARAMETERS</div>

          {/* Project type */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:10, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>PROJECT TYPE</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5 }}>
              {PROJECT_TYPES.map(pt => (
                <button key={pt.id} onClick={() => { setProjectType(pt.id); setCf(Math.round((pt.cfMin+pt.cfMax)/2*100)); }}
                  style={{ padding:'7px 5px', borderRadius:7, border:'1px solid '+(projectType===pt.id?'#00FF94':'#1E2D3D'), background:projectType===pt.id?'rgba(0,255,148,0.08)':'transparent', cursor:'pointer', fontSize:11, color:projectType===pt.id?'#00FF94':'#4A6278', textAlign:'center' }}>
                  {pt.icon} {pt.label}
                </button>
              ))}
            </div>
          </div>

          {/* MW */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:10, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:5 }}>INSTALLED CAPACITY (MW)</div>
            <input type="range" min="0.5" max="500" step="0.5" value={mw} onChange={e => setMw(parseFloat(e.target.value))} style={sld}/>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#E8EFF6', fontFamily:'monospace', marginTop:3 }}>
              <span>0.5</span><span style={{ color:'#00FF94', fontWeight:700 }}>{mw} MW</span><span>500</span>
            </div>
          </div>

          {/* CF */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:10, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:5 }}>CAPACITY FACTOR (%)</div>
            <input type="range" min="10" max="90" step="1" value={cf} onChange={e => setCf(parseInt(e.target.value))} style={sld}/>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#E8EFF6', fontFamily:'monospace', marginTop:3 }}>
              <span>10</span><span style={{ color:'#00FF94', fontWeight:700 }}>{cf}%</span><span>90</span>
            </div>
          </div>

          {/* Country */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:10, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:5 }}>GRID EMISSION FACTOR</div>
            <select value={countryCode} onChange={e => setCountryCode(e.target.value)} style={inp}>
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{c.flag} {c.name} — {c.ef} tCO₂/MWh</option>
              ))}
            </select>
          </div>

          {/* Standard */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:10, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:5 }}>CARBON STANDARD</div>
            <select value={standard} onChange={e => setStandard(e.target.value)} style={inp}>
              {STANDARDS.map(s => (
                <option key={s.id} value={s.id}>{s.label} — ${s.price}/t</option>
              ))}
            </select>
          </div>

          {/* Horizon */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:10, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:5 }}>PROJECTION HORIZON (YEARS)</div>
            <input type="range" min="1" max="30" step="1" value={years} onChange={e => setYears(parseInt(e.target.value))} style={sld}/>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#E8EFF6', fontFamily:'monospace', marginTop:3 }}>
              <span>1</span><span style={{ color:'#00FF94', fontWeight:700 }}>{years} ans</span><span>30</span>
            </div>
          </div>

          {/* Price escalation */}
          <div>
            <div style={{ fontSize:10, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:5 }}>PRICE ESCALATION (%/yr)</div>
            <input type="range" min="0" max="20" step="1" value={priceEsc} onChange={e => setPriceEsc(parseInt(e.target.value))} style={sld}/>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#E8EFF6', fontFamily:'monospace', marginTop:3 }}>
              <span>0</span><span style={{ color:'#FCD34D', fontWeight:700 }}>{priceEsc}%/yr</span><span>20</span>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {/* Tabs */}
          <div style={{ display:'flex', gap:4, background:'#0D1117', border:'1px solid #1E2D3D', borderRadius:9, padding:4, width:'fit-content' }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ padding:'7px 14px', borderRadius:6, border:'none', cursor:'pointer', fontSize:12, fontWeight:tab===t.id?700:400, background:tab===t.id?std.color:'transparent', color:tab===t.id?'#080B0F':'#4A6278', fontFamily:'JetBrains Mono, monospace' }}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'calc' && (<>
            {/* Revenue + Credits chart */}
            <div style={{ background:'#0D1117', border:'1px solid #1E2D3D', borderRadius:12, padding:18 }}>
              <div style={{ fontSize:10, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:14 }}>
                {years}-YEAR PROJECTION — REVENUE & CREDITS · {std.label} · {country.flag} {country.name}
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={calc.projection}>
                  <XAxis dataKey="year" tick={{ fontSize:11, fill:'#4A6278' }}/>
                  <YAxis yAxisId="left" tickFormatter={v => fmtM(v)} tick={{ fontSize:10, fill:'#4A6278' }} width={70}/>
                  <YAxis yAxisId="right" orientation="right" tickFormatter={v => fmtN(v)} tick={{ fontSize:10, fill:'#4A6278' }} width={60}/>
                  <Tooltip content={<Tip />}/>
                  <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill={std.color + '60'} radius={[3,3,0,0]}/>
                  <Line yAxisId="left" dataKey="cumulative" name="Cumulative" stroke={std.color} dot={false} strokeWidth={2}/>
                  <Line yAxisId="right" dataKey="credits" name="VCUs" stroke="#4A6278" dot={false} strokeDasharray="4 2"/>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            {/* Price trajectory */}
            <div style={{ background:'#0D1117', border:'1px solid #1E2D3D', borderRadius:12, padding:18 }}>
              <div style={{ fontSize:10, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:10 }}>
                CARBON PRICE TRAJECTORY ($/tCO₂e · {priceEsc}%/yr escalation)
              </div>
              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={calc.projection}>
                  <XAxis dataKey="year" tick={{ fontSize:10, fill:'#4A6278' }}/>
                  <YAxis tickFormatter={v => '$'+v} tick={{ fontSize:10, fill:'#4A6278' }} width={50}/>
                  <Tooltip content={<Tip />}/>
                  <Line dataKey="price" name="Price" stroke={std.color} dot={false} strokeWidth={2}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>)}

          {tab === 'detail' && (
            <div style={{ background:'#0D1117', border:'1px solid #1E2D3D', borderRadius:12, padding:20 }}>
              <div style={{ fontSize:10, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:16 }}>
                DETAILED ACM0002 CALCULATION · CONSOLIDATED METHODOLOGY v22.0
              </div>
              {[
                { label:'Grid Emission Factor (EF_grid)', v:`${country.ef} tCO₂/MWh`, note:`IEA 2024 — ${country.name), color:'#4A6278' },
                { label:'Annual Energy Generation (EG_RE)', v:`${fmtN(calc.annualMWh)} MWh`, note:`${mw}MW × 8760h × ${cf}% CF`, color:'#38BDF8' },
                { label:'Gross Emission Reductions', v:`${fmtN(calc.grossReductions)} tCO₂e`, note:'EG_RE × EF_grid (ACM0002 §3.1)', color:'#FCD34D' },
                { label:'Leakage Deduction (3%)', v:`-${fmtN(calc.leakage)} tCO₂e`, note:'ACM0002 §4.2 — displacement effects', color:'#F87171' },
                { label:'Uncertainty Deduction (5%)', v:`-${fmtN(calc.uncertainty)} tCO₂e`, note:'ACM0002 §8.1 — measurement uncertainty', color:'#F87171' },
                { label:'NET CARBON CREDITS (VCUs)', v:`${fmtN(calc.netCredits)} tCO₂e`, note:'Eligible for issuance', color:'#00FF94', bold:true },
                { label:'Reference Price', v:`$${std.price}/t`, note:`${std.label} — CBL Q1 2026`, color:'#FCD34D' },
                { label:'Gross Revenue', v:fmtM(calc.grossRev), note:'NetCredits × price', color:'#E8EFF6' },
                { label:'VVB Verification Cost (8%)', v:`-${fmtM(calc.verificationCost)), note:'Bureau Veritas / SGS / DNV', color:'#F87171' },
                { label:'NET ANNUAL REVENUE', v:fmtM(calc.netRev), note:'After verification fees', color:'#00FF94', bold:true },
                { label:'Carbon Intensity Avoided', v:`${fmtN(calc.carbonIntensity)} gCO₂/kWh`, note:`vs ${country.name} grid`, color:'#A78BFA' },
              ].map((row, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom:'1px solid rgba(30,45,61,0.35)' }}>
                  <div>
                    <div style={{ fontSize:13, color:row.bold ? '#E8EFF6' : '#8FA3B8', fontWeight:row.bold ? 700 : 400 }}>{row.label}</div>
                    <div style={{ fontSize:10, color:'#2A3F55', fontFamily:'monospace', marginTop:1 }}>{row.note}</div>
                  </div>
                  <div style={{ fontSize:row.bold ? 16 : 13, fontWeight:row.bold ? 800 : 400, color:row.color, fontFamily:'JetBrains Mono, monospace', textAlign:'right', minWidth:120 }}>{row.v}</div>
                </div>
              ))}
            </div>
          )}

          {tab === 'compare' && (
            <div style={{ background:'#0D1117', border:'1px solid #1E2D3D', borderRadius:12, padding:20 }}>
              <div style={{ fontSize:10, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:16 }}>
                STANDARD COMPARISON — {mw}MW · {country.flag} {country.name} · {cf}% CF
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={STANDARDS.map(s => {
                  const rev = calc.netCredits * s.price * 0.92;
                  return { name:s.label, annual:Math.round(rev), lifetime:Math.round(rev*years), price:s.price, color:s.color };
                })}>
                  <XAxis dataKey="name" tick={{ fontSize:11, fill:'#4A6278' }}/>
                  <YAxis tickFormatter={v => fmtM(v)} tick={{ fontSize:10, fill:'#4A6278' }} width={70}/>
                  <Tooltip content={<Tip />}/>
                  <Bar dataKey="annual" name="Annual revenue" fill="#00FF94" opacity={0.7} radius={[3,3,0,0]}/>
                  <Bar dataKey="lifetime" name={`${years}yr revenue`} fill="#38BDF8" opacity={0.5} radius={[3,3,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginTop:14 }}>
                {STANDARDS.map(s => {
                  const annualRev = calc.netCredits * s.price * 0.92;
                  return (
                    <div key={s.id} style={{ background:'#121920', borderRadius:9, padding:'12px 14px', border:'1px solid '+(s.color) + '25' }}>
                      <div style={{ fontSize:11, color:s.color, marginBottom:4 }}>{s.label}</div>
                      <div style={{ fontSize:17, fontWeight:700, color:'#E8EFF6', fontFamily:'Syne, sans-serif' }}>{fmtM(annualRev)}</div>
                      <div style={{ fontSize:10, color:'#4A6278', marginTop:2 }}>/year · ${s.price}/t</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'sensitivity' && (
            <div style={{ background:'#0D1117', border:'1px solid #1E2D3D', borderRadius:12, padding:20 }}>
              <div style={{ fontSize:10, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:14 }}>
                SENSITIVITY — CF 15→35% vs PRICE $5→$50/t
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={[15,18,20,22,25,28,30,35].map(cf2 => {
                  const mwh = mw * 8760 * (cf2/100);
                  const net = mwh * country.ef * 0.92;
                  return {
                    cf: cf2 + '%',
                    low5: Math.round(net * 5 * 0.92),
                    base: Math.round(net * std.price * 0.92),
                    high50: Math.round(net * 50 * 0.92),
                  };
                })}>
                  <XAxis dataKey="cf" tick={{ fontSize:11, fill:'#4A6278' }}/>
                  <YAxis tickFormatter={v => fmtM(v)} tick={{ fontSize:10, fill:'#4A6278' }} width={70}/>
                  <Tooltip content={<Tip />}/>
                  <Line dataKey="low5" name="$5/t" stroke="#F87171" dot={false} strokeDasharray="4 2"/>
                  <Line dataKey="base" name={std.price + '/t (current)' stroke={std.color} dot={false} strokeWidth={2}/>
                  <Line dataKey="high50" name="$50/t" stroke="#A78BFA" dot={false} strokeDasharray="4 2"/>
                </LineChart>
              </ResponsiveContainer>
              <div style={{ marginTop:14, padding:'10px 14px', background:'rgba(0,255,148,0.06)', border:'1px solid rgba(0,255,148,0.15)', borderRadius:8, fontSize:12, color:'#8FA3B8' }}>
                <span style={{ color:'#00FF94', fontWeight:600 }}>Key insight: </span>
                {L(`At $${std.price}/t current price and ${cf}% CF, your ${mw}MW project generates ${fmtN(calc.netCredits)} VCUs/year worth ${fmtM(calc.netRev)}. A price increase to $50/t would generate ${fmtM(calc.netCredits*50*0.92)} annually.`,
                   `Au prix actuel $${std.price}/t et CF ${cf}%, votre projet ${mw}MW génère ${fmtN(calc.netCredits)} VCUs/an valant ${fmtM(calc.netRev)}. À $50/t, le revenu serait ${fmtM(calc.netCredits*50*0.92)}/an.`)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer links */}
      <div style={{ marginTop:14, display:'flex', gap:8, justifyContent:'flex-end' }}>
        <a href="/dashboard/carbon-tax" style={{ fontSize:11, color:'#A78BFA', textDecoration:'none', padding:'5px 12px', border:'1px solid rgba(167,139,250,0.3)', borderRadius:6 }}>
          🧠 {L('Carbon Tax Simulator →','Simulateur Taxe Carbone →')}
        </a>
        <a href="/dashboard/pipeline" style={{ fontSize:11, color:'#00FF94', textDecoration:'none', padding:'5px 12px', border:'1px solid rgba(0,255,148,0.3)', borderRadius:6 }}>
          {L('Start Issuance Pipeline →','Démarrer Pipeline →')}
        </a>
      </div>

    </div>
  );
}