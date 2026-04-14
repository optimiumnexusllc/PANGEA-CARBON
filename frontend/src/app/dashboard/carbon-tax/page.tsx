'use client';
import { useState, useMemo } from 'react';
import { useLang } from '@/lib/lang-context';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, ComposedChart, Area
} from 'recharts';

// ─── DONNÉES RÉELLES 2024-2030 ─────────────────────────────────────────────
const CARBON_REGIMES = {
  EU_ETS: {
    label: 'EU ETS (Europe)', flag: '🇪🇺', currency: 'EUR',
    current: 63.5,       // €/tCO2 mars 2026 (ICE)
    trajectory: [63.5, 71, 80, 92, 105, 122, 140], // 2024-2030 (BNEF projection)
    threshold: 100,      // Seuil psychologique marché
    type: 'CAP_TRADE', sectors: ['Energy','Industry','Aviation','Shipping'],
    source: 'ICE ECX Futures + BNEF 2026',
    scope: 'Compliance — 45% EU GHG',
  },
  CBAM: {
    label: 'CBAM (Border Adjustment)', flag: '🛂', currency: 'EUR',
    current: 63.5,       // Lié au prix EU ETS
    trajectory: [0, 15.9, 31.75, 47.6, 63.5, 73, 84], // Phase-in 2024→2030
    threshold: 50,
    type: 'BORDER_TAX', sectors: ['Steel','Cement','Aluminium','Fertilizers','Electricity','Hydrogen'],
    source: 'Règlement UE 2023/956 — Annexe I',
    scope: 'Importations UE — Full in 2034',
    phasein: true,
  },
  CHINA_ETS: {
    label: 'China National ETS', flag: '🇨🇳', currency: 'CNY',
    current: 98,         // CNY/tCO2 (≈$13.5 USD) fév 2026
    trajectory: [98, 115, 140, 175, 220, 280, 350],
    threshold: 200,
    type: 'CAP_TRADE', sectors: ['Power'],
    source: 'Shanghai Environment Exchange 2026',
    scope: '~8.7B tCO2/year — world largest',
  },
  UK_ETS: {
    label: 'UK ETS', flag: '🇬🇧', currency: 'GBP',
    current: 37,         // £/tCO2 (découplé post-Brexit)
    trajectory: [37, 42, 52, 65, 80, 98, 118],
    threshold: 70,
    type: 'CAP_TRADE', sectors: ['Energy','Industry','Aviation'],
    source: 'ICE UK Carbon Allowance 2026',
    scope: 'UK — ~160M tCO2/year',
  },
  CANADA_CARBON: {
    label: 'Canada Carbon Levy', flag: '🇨🇦', currency: 'CAD',
    current: 80,         // CAD/tCO2 = ~$59 USD (2024)
    trajectory: [80, 95, 110, 125, 140, 155, 170],
    threshold: 130,
    type: 'CARBON_TAX', sectors: ['Fuels','Industry'],
    source: 'Environment & Climate Change Canada 2026',
    scope: 'Federal backstop price',
  },
  SINGAPORE_CTT: {
    label: 'Singapore Carbon Tax', flag: '🇸🇬', currency: 'SGD',
    current: 25,         // SGD/tCO2 = ~$18.5 USD (2024)
    trajectory: [25, 45, 45, 80, 80, 80, 80],
    threshold: 50,
    type: 'CARBON_TAX', sectors: ['Industry (>25kt)'],
    source: 'IRAS Singapore — CETA 2022',
    scope: 'Asia premier — $50-80 SGD 2026-2030',
  },
};

const AFRICAN_EXPORT_MARKETS = [
  { code: 'EU', label: 'Union Européenne', flag: '🇪🇺', cbamRisk: 'HIGH', sectors: ['Steel','Cement','Aluminium'], tradePct: 28 },
  { code: 'UK', label: 'Royaume-Uni', flag: '🇬🇧', cbamRisk: 'MEDIUM', sectors: ['Metals','Energy'], tradePct: 8 },
  { code: 'US', label: 'États-Unis', flag: '🇺🇸', cbamRisk: 'EMERGING', sectors: ['Minerals','Agriculture'], tradePct: 19 },
  { code: 'CN', label: 'Chine', flag: '🇨🇳', cbamRisk: 'LOW', sectors: ['Raw materials'], tradePct: 22 },
];

const COMPLIANCE_STANDARDS = [
  { id: 'CSRD', label: 'CSRD', full: 'Corporate Sustainability Reporting Directive',
    flag: '🇪🇺', deadline: '2025', scope: '>250 employees in EU', mandatory: true,
    penaltyMax: '10M€ ou 5% CA', requires: ['Scope 1','Scope 2','Scope 3 (partiel)','TCFD'] },
  { id: 'CSDDD', label: 'CS3D', full: 'Corporate Sustainability Due Diligence Directive',
    flag: '🇪🇺', deadline: '2027', scope: '>1000 employees + >€450M CA', mandatory: true,
    penaltyMax: '5% CA mondial', requires: ['Supply chain audit','Climate plan 1.5°C'] },
  { id: 'SEC_CLIMATE', label: 'SEC Climate', full: 'SEC Climate Disclosure Rules (USA)',
    flag: '🇺🇸', deadline: '2026', scope: 'All US listed + foreign private issuers', mandatory: true,
    penaltyMax: 'SEC enforcement', requires: ['Scope 1','Scope 2','GHG verification','TCFD'] },
  { id: 'IFRS_S2', label: 'IFRS S2', full: 'ISSB Climate Standard',
    flag: '🌍', deadline: '2025+', scope: 'Voluntary → mandatory in 30+ countries', mandatory: false,
    penaltyMax: 'Investisseur / accès capital', requires: ['Climate risks','GHG Scope 1/2/3','Scenario analysis'] },
];

// Taux de change approximatifs pour affichage USD
const FX = { EUR: 1.09, CNY: 0.138, GBP: 1.27, CAD: 0.74, SGD: 0.74 };

const fmt  = (n) => Math.round(n || 0).toLocaleString('en-US');
const fmtUSD = (n) => '$' + fmt(n);
const fmtM = (n) => n >= 1e6 ? `$${(n/1e6).toFixed(1)}M` : fmtUSD(n);

const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

export default function CarbonTaxPage() {
  const { lang } = useLang();
  const L = (en, fr) => lang === 'fr' ? fr : en;

  // ─── Paramètres entreprise ──────────────────────────────────────────────
  const [emissions, setEmissions] = useState(50000);      // tCO2e/an
  const [reductionPct, setReductionPct] = useState(30);   // % réduction d'ici 2030
  const [sector, setSector] = useState('Steel');
  const [exportToEU, setExportToEU] = useState(true);
  const [euExportValue, setEuExportValue] = useState(5000000); // USD
  const [euExportProduct, setEuExportProduct] = useState('Steel');
  const [country, setCountry] = useState('CI');           // Pays siège
  const [activeRegime, setActiveRegime] = useState('EU_ETS');
  const [tab, setTab] = useState('tax'); // tax | cbam | compliance | optimize

  const regime = CARBON_REGIMES[activeRegime];

  // ─── Calculs prédictifs ─────────────────────────────────────────────────
  const taxData = useMemo(() => {
    return YEARS.map((yr, i) => {
      const reduction = (reductionPct / 100) * (i / 6);
      const remainingEmissions = emissions * (1 - reduction);
      const priceLocal = regime.trajectory[i] || regime.trajectory[regime.trajectory.length - 1];
      const priceUSD = priceLocal * (FX[regime.currency] || 1);
      const taxExposure = remainingEmissions * priceUSD;
      const taxWithCredits = taxExposure * 0.6; // acheter des crédits = réduire de 40%
      const savings = taxExposure - taxWithCredits;
      return {
        year: yr.toString(),
        price: parseFloat(priceUSD.toFixed(2)),
        priceLocal: parseFloat(priceLocal.toFixed(2)),
        emissions: Math.round(remainingEmissions),
        taxExposure: Math.round(taxExposure),
        taxWithCredits: Math.round(taxWithCredits),
        savings: Math.round(savings),
        cumulativeSavings: 0, // calculé après
      };
    }).map((d, i, arr) => ({
      ...d,
      cumulativeSavings: arr.slice(0, i + 1).reduce((s, x) => s + x.savings, 0),
    }));
  }, [emissions, reductionPct, activeRegime, regime]);

  const totalExposure2030 = taxData.reduce((s, d) => s + d.taxExposure, 0);
  const savingsWithCredits = taxData.reduce((s, d) => s + d.savings, 0);
  const currentYearTax = taxData[2]?.taxExposure || 0; // 2026
  const peakPrice = Math.max(...taxData.map(d => d.price));

  // CBAM exposure pour exportations UE
  const cbamData = useMemo(() => {
    const euEtsTrajectory = CARBON_REGIMES.EU_ETS.trajectory;
    const cbamPhaseIn = [0.025, 0.05, 0.1, 0.25, 0.5, 0.75, 1.0]; // 2024→2030
    return YEARS.map((yr, i) => {
      const euPrice = euEtsTrajectory[i] * FX.EUR;
      const phasein = cbamPhaseIn[i];
      // CBAM = (embedded carbon intensity * export value) * EU price * phase-in
      const carbonIntensity = euExportProduct === 'Steel' ? 1.85 : euExportProduct === 'Cement' ? 0.83 : 1.2;
      const tonnesEmbedded = (euExportValue / 500) * carbonIntensity; // estimation
      const cbamBill = tonnesEmbedded * euPrice * phasein;
      return {
        year: yr.toString(),
        cbamBill: Math.round(cbamBill),
        euPrice: parseFloat(euPrice.toFixed(2)),
        phasein: Math.round(phasein * 100),
        mitigation: Math.round(cbamBill * 0.55), // avec VCUs africains
      };
    });
  }, [euExportValue, euExportProduct]);

  const totalCbam2030 = cbamData.reduce((s, d) => s + d.cbamBill, 0);

  // Arbitrage géographique
  const geoArbitrage = useMemo(() => {
    return Object.entries(CARBON_REGIMES).map(([key, r]) => {
      const priceUSD = r.trajectory[2] * (FX[r.currency] || 1); // 2026
      const price2030 = r.trajectory[6] * (FX[r.currency] || 1);
      return {
        key, label: r.label, flag: r.flag,
        price2026: parseFloat(priceUSD.toFixed(1)),
        price2030: parseFloat(price2030.toFixed(1)),
        growth: Math.round(((price2030 - priceUSD) / priceUSD) * 100),
        exposure2026: Math.round(emissions * priceUSD),
      };
    }).sort((a, b) => b.price2030 - a.price2030);
  }, [emissions]);

  const S = (obj) => Object.assign({}, obj);
  const inp = { background: '#121920', border: '1px solid #1E2D3D', borderRadius: 8, color: '#E8EFF6', padding: '8px 12px', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' as const };
  const slider = { width: '100%', accentColor: '#00FF94' };

  const tabs = [
    { id: 'tax',        label: L('Tax Simulator','Simulateur fiscal') },
    { id: 'cbam',       label: 'CBAM Exposure' },
    { id: 'compliance', label: 'Compliance' },
    { id: 'optimize',   label: L('Optimize','Optimiser') },
  ];

  const TooltipContent = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
        <div style={{ color: '#4A6278', marginBottom: 6, fontFamily: 'monospace' }}>{label}</div>
        {payload.map((p: any, i: number) => (
          <div key={i} style={{ color: p.color || '#E8EFF6', marginBottom: 2 }}>
            {p.name}: {typeof p.value === 'number' && p.value > 1000 ? fmtM(p.value) : p.value}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ padding: 20, maxWidth: 1400, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 9, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.12em', marginBottom: 4 }}>
          CARBON TAX INTELLIGENCE ENGINE · EU ETS · CBAM · CSRD · CHINA ETS
        </div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: '#E8EFF6', margin: '0 0 6px' }}>
          {L('Carbon Tax Intelligence Engine','Moteur d\'Intelligence Fiscale Carbone')}
        </h1>
        <p style={{ fontSize: 13, color: '#4A6278', margin: 0, maxWidth: 700 }}>
          {L('Predict your carbon tax exposure 2024–2030. Simulate CBAM impact on EU exports. Optimize across 6 regulatory regimes.',
             'Prédisez votre exposition fiscale carbone 2024–2030. Simulez l\'impact CBAM sur vos exports UE. Optimisez sur 6 régimes réglementaires.')}
        </p>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
        {[
          { label: L('Tax Exposure 2026','Exposition 2026'), v: fmtM(currentYearTax), c: '#F87171', sub: `${regime.label}` },
          { label: L('Total 2024-2030','Total 2024-2030'),   v: fmtM(totalExposure2030), c: '#FCD34D', sub: `${fmt(emissions)} tCO₂e/yr` },
          { label: L('Savings with VCUs','Économies via VCUs'), v: fmtM(savingsWithCredits), c: '#00FF94', sub: 'African carbon credits' },
          { label: L('Peak price 2030','Prix pic 2030'),     v: `$${peakPrice.toFixed(0)}/t`, c: '#A78BFA', sub: `${regime.label}` },
        ].map(k => (
          <div key={k.label} style={{ background: '#0D1117', border: `1px solid ${k.c}20`, borderRadius: 12, padding: '13px 15px' }}>
            <div style={{ fontSize: 9, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 5 }}>{k.label.toUpperCase()}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: k.c, fontFamily: 'Syne, sans-serif' }}>{k.v}</div>
            <div style={{ fontSize: 10, color: '#2A3F55', marginTop: 3 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Layout: Controls left + Charts right */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, marginBottom: 18 }}>

        {/* Controls panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 9, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 14 }}>COMPANY PROFILE</div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 5 }}>ANNUAL EMISSIONS (tCO₂e)</div>
              <input type="range" min="1000" max="500000" step="1000" value={emissions}
                onChange={e => setEmissions(parseInt(e.target.value))} style={slider}/>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#E8EFF6', fontFamily: 'monospace', marginTop: 3 }}>
                <span>1K</span>
                <span style={{ color: '#00FF94', fontWeight: 700 }}>{(emissions/1000).toFixed(0)}K tCO₂e</span>
                <span>500K</span>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 5 }}>REDUCTION TARGET 2030</div>
              <input type="range" min="0" max="80" step="5" value={reductionPct}
                onChange={e => setReductionPct(parseInt(e.target.value))} style={slider}/>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#E8EFF6', fontFamily: 'monospace', marginTop: 3 }}>
                <span>0%</span>
                <span style={{ color: reductionPct >= 30 ? '#00FF94' : '#FCD34D', fontWeight: 700 }}>{reductionPct}%</span>
                <span>80%</span>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 5 }}>REGULATORY REGIME</div>
              <select value={activeRegime} onChange={e => setActiveRegime(e.target.value)} style={inp}>
                {Object.entries(CARBON_REGIMES).map(([k, r]) => (
                  <option key={k} value={k}>{r.flag} {r.label}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 5 }}>EU EXPORT VALUE (USD)</div>
              <input type="range" min="0" max="50000000" step="500000" value={euExportValue}
                onChange={e => setEuExportValue(parseInt(e.target.value))} style={slider}/>
              <div style={{ fontSize: 11, color: exportToEU ? '#E8EFF6' : '#4A6278', fontFamily: 'monospace', textAlign: 'center', marginTop: 3 }}>
                {fmtM(euExportValue)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 5 }}>CBAM PRODUCT</div>
              <select value={euExportProduct} onChange={e => setEuExportProduct(e.target.value)} style={inp}>
                {['Steel','Cement','Aluminium','Fertilizers','Electricity','Hydrogen'].map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Regime info */}
          <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 9, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 10 }}>REGIME DETAILS</div>
            <div style={{ fontSize: 14, marginBottom: 4 }}>{regime.flag} <span style={{ fontWeight: 600, color: '#E8EFF6' }}>{regime.label}</span></div>
            <div style={{ fontSize: 11, color: '#4A6278', marginBottom: 8 }}>{regime.scope}</div>
            <div style={{ fontSize: 11, color: '#2A3F55', fontFamily: 'monospace', marginBottom: 8 }}>Source: {regime.source}</div>
            {regime.sectors && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {regime.sectors.map(s => (
                  <span key={s} style={{ fontSize: 10, background: 'rgba(0,255,148,0.08)', color: '#00FF94', border: '1px solid rgba(0,255,148,0.2)', borderRadius: 4, padding: '2px 6px', fontFamily: 'monospace' }}>{s}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Charts panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 9, padding: 4, width: 'fit-content' }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ padding: '7px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: tab === t.id ? 700 : 400, background: tab === t.id ? '#00FF94' : 'transparent', color: tab === t.id ? '#080B0F' : '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* TAB: Tax Simulator */}
          {tab === 'tax' && (
            <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>
                  CARBON TAX EXPOSURE 2024-2030 · {regime.label} · {regime.currency}/tCO₂
                </div>
                <div style={{ fontSize: 11, color: '#00FF94', fontFamily: 'monospace' }}>
                  {L('vs. offset with VCUs','vs. compensation VCUs')}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={taxData}>
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#4A6278' }}/>
                  <YAxis tickFormatter={v => fmtM(v)} tick={{ fontSize: 10, fill: '#4A6278' }} width={70}/>
                  <Tooltip content={<TooltipContent />}/>
                  <Bar dataKey="taxExposure" name="Tax exposure" fill="rgba(248,113,113,0.6)" radius={[3,3,0,0]}/>
                  <Bar dataKey="taxWithCredits" name="After VCU offset" fill="rgba(0,255,148,0.5)" radius={[3,3,0,0]}/>
                  <Line dataKey="savings" name="Savings" stroke="#A78BFA" dot={false} strokeWidth={2}/>
                </ComposedChart>
              </ResponsiveContainer>
              {/* Price trajectory */}
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 9, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>
                  {regime.label} PRICE TRAJECTORY ({regime.currency}/tCO₂)
                </div>
                <ResponsiveContainer width="100%" height={90}>
                  <LineChart data={taxData}>
                    <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#4A6278' }}/>
                    <YAxis tick={{ fontSize: 10, fill: '#4A6278' }} width={40}/>
                    <Tooltip content={<TooltipContent />}/>
                    <ReferenceLine y={regime.threshold * (FX[regime.currency] || 1)} stroke="#F87171" strokeDasharray="4 2" label={{ value: 'Seuil', fill: '#F87171', fontSize: 10 }}/>
                    <Line dataKey="price" name={`${regime.currency}/tCO₂`} stroke="#FCD34D" dot={true} strokeWidth={2}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* TAB: CBAM */}
          {tab === 'cbam' && (
            <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 18 }}>
              <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>
                CBAM (CARBON BORDER ADJUSTMENT MECHANISM) — IMPACT SUR EXPORTS UE
              </div>
              <div style={{ fontSize: 12, color: '#8FA3B8', marginBottom: 14 }}>
                {L('Règlement (UE) 2023/956 — Phase-in 2026→100% en 2034. Produits: acier, ciment, aluminium, engrais, électricité, hydrogène.',
                   'Règlement (UE) 2023/956 — Phase-in 2026→100% en 2034. Produits: acier, ciment, aluminium, engrais, électricité, hydrogène.')}
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={cbamData}>
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#4A6278' }}/>
                  <YAxis yAxisId="left" tickFormatter={v => fmtM(v)} tick={{ fontSize: 10, fill: '#4A6278' }} width={70}/>
                  <YAxis yAxisId="right" orientation="right" tickFormatter={v => v + '%'} tick={{ fontSize: 10, fill: '#4A6278' }} width={40}/>
                  <Tooltip content={<TooltipContent />}/>
                  <Bar yAxisId="left" dataKey="cbamBill" name="CBAM bill" fill="rgba(248,113,113,0.5)" radius={[3,3,0,0]}/>
                  <Bar yAxisId="left" dataKey="mitigation" name="With African VCUs" fill="rgba(0,255,148,0.4)" radius={[3,3,0,0]}/>
                  <Line yAxisId="right" dataKey="phasein" name="Phase-in %" stroke="#FCD34D" dot={false} strokeWidth={2}/>
                </ComposedChart>
              </ResponsiveContainer>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 14 }}>
                {[
                  { label: 'Total CBAM 2024-2030', v: fmtM(totalCbam2030), c: '#F87171' },
                  { label: 'With VCU mitigation', v: fmtM(totalCbam2030 * 0.45), c: '#00FF94' },
                  { label: 'Net saving', v: fmtM(totalCbam2030 * 0.55), c: '#A78BFA' },
                ].map(k => (
                  <div key={k.label} style={{ background: '#121920', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: '#4A6278', fontFamily: 'monospace', marginBottom: 4 }}>{k.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: k.c }}>{k.v}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 8, fontSize: 12, color: '#8FA3B8' }}>
                <span style={{ color: '#38BDF8', fontWeight: 600 }}>Note CBAM: </span>
                {L('Les exportateurs africains peuvent réduire leur facture CBAM en présentant des certificats de carbone VCUs/ITMOs certifiés prouvant des émissions incorporées inférieures à la référence UE.',
                   'Les exportateurs africains peuvent réduire leur facture CBAM en présentant des certificats de carbone VCUs/ITMOs certifiés prouvant des émissions incorporées inférieures à la référence UE.')}
              </div>
            </div>
          )}

          {/* TAB: Compliance */}
          {tab === 'compliance' && (
            <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 18 }}>
              <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 16 }}>
                REGULATORY COMPLIANCE DASHBOARD · CSRD · CS3D · SEC · IFRS S2
              </div>
              {COMPLIANCE_STANDARDS.map(std => {
                const risk = std.mandatory ? (new Date().getFullYear() >= parseInt(std.deadline) ? 'OVERDUE' : 'UPCOMING') : 'VOLUNTARY';
                const rc = risk === 'OVERDUE' ? '#F87171' : risk === 'UPCOMING' ? '#FCD34D' : '#4A6278';
                return (
                  <div key={std.id} style={{ padding: '14px 0', borderBottom: '1px solid rgba(30,45,61,0.4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 9, background: rc + '20', color: rc, border: `1px solid ${rc}40`, borderRadius: 4, padding: '2px 7px', fontFamily: 'monospace' }}>{risk}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#E8EFF6' }}>{std.flag} {std.label}</span>
                        <span style={{ fontSize: 11, color: '#4A6278' }}>— {std.full}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#4A6278', fontFamily: 'monospace' }}>
                        Deadline: <span style={{ color: rc }}>{std.deadline}</span>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12 }}>
                      <div>
                        <div style={{ color: '#4A6278', fontSize: 10, marginBottom: 2 }}>SCOPE</div>
                        <div style={{ color: '#8FA3B8' }}>{std.scope}</div>
                      </div>
                      <div>
                        <div style={{ color: '#4A6278', fontSize: 10, marginBottom: 2 }}>PENALTY</div>
                        <div style={{ color: '#F87171' }}>{std.penaltyMax}</div>
                      </div>
                      <div>
                        <div style={{ color: '#4A6278', fontSize: 10, marginBottom: 2 }}>REQUIRES</div>
                        <div style={{ color: '#8FA3B8', fontSize: 11 }}>{std.requires.join(' · ')}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB: Optimize */}
          {tab === 'optimize' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Geo arbitrage */}
              <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 18 }}>
                <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 14 }}>
                  GEO-ARBITRAGE — PRIX CARBONE PAR RÉGIME 2026 vs 2030 (USD/tCO₂)
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={geoArbitrage} layout="vertical">
                    <XAxis type="number" tickFormatter={v => '$' + v} tick={{ fontSize: 10, fill: '#4A6278' }}/>
                    <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: '#4A6278' }} width={130}/>
                    <Tooltip content={<TooltipContent />}/>
                    <Bar dataKey="price2026" name="2026 price" fill="rgba(56,189,248,0.5)" radius={[0,3,3,0]}/>
                    <Bar dataKey="price2030" name="2030 price" fill="rgba(248,113,113,0.5)" radius={[0,3,3,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Optimization strategies */}
              <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 18 }}>
                <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 14 }}>
                  OPTIMIZATION STRATEGIES — IMPACT ESTIMÉ
                </div>
                {[
                  { label: L('Buy African VCUs now (lock in $7-14/t)','Acheter VCUs africains maintenant ($7-14/t)'),
                    saving: Math.round(savingsWithCredits * 0.4), icon: '🌍', tag: 'HIGH ROI', tagC: '#00FF94' },
                  { label: L('Accelerate 30% emission reduction','Accélérer réduction 30% émissions'), 
                    saving: Math.round(totalExposure2030 * 0.25), icon: '⚡', tag: 'CAPEX', tagC: '#FCD34D' },
                  { label: L('CBAM certification (reduce EU duty)','Certification CBAM (réduire droits UE)'),
                    saving: Math.round(totalCbam2030 * 0.55), icon: '🛂', tag: 'EXPORT', tagC: '#38BDF8' },
                  { label: L('Article 6 ITMO allocation (Africa)','Allocation ITMO Article 6 (Afrique)'),
                    saving: Math.round(currentYearTax * 0.35), icon: '🏛️', tag: 'PREMIUM', tagC: '#A78BFA' },
                ].map((s, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 3 ? '1px solid rgba(30,45,61,0.3)' : 'none' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 18 }}>{s.icon}</span>
                      <div>
                        <div style={{ fontSize: 12, color: '#E8EFF6' }}>{s.label}</div>
                        <span style={{ fontSize: 9, background: s.tagC + '15', color: s.tagC, border: `1px solid ${s.tagC}30`, borderRadius: 3, padding: '1px 6px', fontFamily: 'monospace' }}>{s.tag}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#00FF94', fontFamily: 'monospace' }}>{fmtM(s.saving)}</div>
                      <div style={{ fontSize: 10, color: '#4A6278' }}>estimated saving</div>
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 14, padding: '12px 14px', background: 'rgba(0,255,148,0.06)', border: '1px solid rgba(0,255,148,0.2)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 12, color: '#8FA3B8' }}>
                    {L('Total optimization potential 2024-2030','Potentiel total d\'optimisation 2024-2030')}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#00FF94', fontFamily: 'Syne, sans-serif' }}>
                    {fmtM(savingsWithCredits + totalCbam2030 * 0.55)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Market comparison + disclaimer */}
      <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 11, color: '#2A3F55', fontFamily: 'JetBrains Mono, monospace' }}>
          Sources: ICE ECX · Shanghai Environment Exchange · Canada ECCC · BNEF Carbon Price Outlook 2026 · Règlement (UE) 2023/956 CBAM
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <a href="/dashboard/ghg-audit" style={{ fontSize: 11, color: '#00FF94', textDecoration: 'none', padding: '5px 12px', border: '1px solid rgba(0,255,148,0.3)', borderRadius: 6 }}>
            {L('Run GHG Audit →','Lancer GHG Audit →')}
          </a>
          <a href="/dashboard/marketplace" style={{ fontSize: 11, color: '#38BDF8', textDecoration: 'none', padding: '5px 12px', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 6 }}>
            {L('Buy VCUs →','Acheter VCUs →')}
          </a>
        </div>
      </div>

    </div>
  );
}
