'use client';
import { useState, useMemo } from 'react';
import { useLang } from '@/lib/lang-context';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, ComposedChart, Area, AreaChart,
  RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts';

const C = {
  bg:'#080B0F', card:'#0D1117', card2:'#0A1628', border:'#1E2D3D',
  green:'#00FF94', red:'#F87171', yellow:'#FCD34D', blue:'#38BDF8',
  purple:'#A78BFA', orange:'#F97316', muted:'#4A6278', text:'#E8EFF6', text2:'#8FA3B8',
};

const YEARS = [2024,2025,2026,2027,2028,2029,2030];
const FX = { EUR:1.09, CNY:0.138, GBP:1.27, CAD:0.74, SGD:0.74, AUD:0.65, KRW:0.00075, JPY:0.0067, NZD:0.61, ZAR:0.055 };
const fmt = (n) => Math.round(n||0).toLocaleString('en-US');
const fmtM = (n) => n>=1e6?'$'+((n)/1e6).toFixed(1)+'M':n>=1e3?'$'+((n)/1e3).toFixed(0)+'K':'$'+Math.round(n||0);

const REGIMES = {
  EU_ETS:         { label:'EU ETS',              flag:'🇪🇺', cur:'EUR', color:C.blue,   current:65.2, traj:[63.5,67,71,80,92,105,122,140], th:100, type:'CAP_TRADE',    sectors:['Energy','Industry','Aviation','Shipping'],          source:'ICE ECX Futures · BNEF 2026',          scope:'Compliance — 45% EU GHG',        continent:'Europe' },
  CBAM:           { label:'CBAM EU',             flag:'🛂',  cur:'EUR', color:C.red,    current:32.0, traj:[0,15.9,31.75,47.6,63.5,73,84], th:50,  type:'BORDER_TAX',   sectors:['Steel','Cement','Aluminium','Fertilizers','H₂'],  source:'Règlement (UE) 2023/956 · CBAM',       scope:'Full phase-in 2034',            phasein:true, continent:'Europe' },
  UK_ETS:         { label:'UK ETS',              flag:'🇬🇧', cur:'GBP', color:'#9333ea', current:37,   traj:[37,40,45,52,65,80,98,118],    th:70,  type:'CAP_TRADE',    sectors:['Energy','Industry','Aviation'],                     source:'ICE UK Carbon Allowance 2026',         scope:'~160M tCO₂/year',               continent:'Europe' },
  CHINA_ETS:      { label:'China ETS',           flag:'🇨🇳', cur:'CNY', color:C.red,    current:98,   traj:[98,110,115,140,175,220,280,350],th:200, type:'CAP_TRADE',    sectors:['Power'],                                           source:'Shanghai Environment Exchange 2026',   scope:'~8.7Gt CO₂/year — largest',     continent:'Asia' },
  CANADA_CARBON:  { label:'Canada Carbon',       flag:'🇨🇦', cur:'CAD', color:'#dc2626', current:80,   traj:[80,95,110,125,140,155,170],    th:130, type:'CARBON_TAX',   sectors:['Fuels','Industry'],                                source:'Environment Canada 2026',              scope:'Federal backstop price',         continent:'Americas' },
  SINGAPORE_CTT:  { label:'Singapore CTT',       flag:'🇸🇬', cur:'SGD', color:C.orange, current:25,   traj:[25,45,45,80,80,80,80],         th:50,  type:'CARBON_TAX',   sectors:['Industry >25kt'],                                  source:'IRAS Singapore · CETA 2022',           scope:'$50-80 SGD 2026-2030',           continent:'Asia' },
  KOREA_ETS:      { label:'Korea ETS',           flag:'🇰🇷', cur:'KRW', color:'#06b6d4', current:8200, traj:[8200,9500,12000,15000,18000,22000,27000],th:15000,type:'CAP_TRADE',sectors:['Power','Industry'],              source:'Korea Environment Ministry 2026',      scope:'~600M tCO₂/year',               continent:'Asia' },
  AUSTRALIA_SAF:  { label:'Australia Safeguard', flag:'🇦🇺', cur:'AUD', color:'#f59e0b', current:33,   traj:[33,38,43,50,58,67,78],         th:55,  type:'BASELINE_CRED',sectors:['Heavy industry (>100kt)'],                         source:'Clean Energy Regulator 2026',          scope:'215 facilities nationally',      continent:'Oceania' },
  JAPAN_JCRED:    { label:'Japan J-Credits',     flag:'🇯🇵', cur:'JPY', color:'#ec4899', current:3500, traj:[3500,4200,5000,6200,7800,9500,11000],th:6000,type:'VOLUNTARY',sectors:['All sectors'],                         source:'Ministry of Economy Japan 2026',       scope:'Voluntary baseline scheme',      continent:'Asia' },
  SOUTHAFRICA_CT: { label:'South Africa Carbon', flag:'🇿🇦', cur:'ZAR', color:C.green,  current:159,  traj:[159,175,195,220,250,285,330],  th:220, type:'CARBON_TAX',   sectors:['Power','Transport','Industry'],                     source:'SARS South Africa 2026',               scope:'R159/tCO₂ Phase 2',              continent:'Africa' },
};

const CBAM_PRODUCTS = {
  Steel:       { intensity:1.85,  threshold:1.3,  tariff:0, penaltyUSD:85 },
  Cement:      { intensity:0.83,  threshold:0.6,  tariff:0, penaltyUSD:60 },
  Aluminium:   { intensity:6.70,  threshold:3.5,  tariff:0, penaltyUSD:160 },
  Fertilizers: { intensity:2.30,  threshold:1.8,  tariff:0, penaltyUSD:80 },
  Hydrogen:    { intensity:9.00,  threshold:5.0,  tariff:0, penaltyUSD:200 },
  Electricity: { intensity:0.50,  threshold:0.35, tariff:0, penaltyUSD:50 },
};

const COMPLIANCE_STANDARDS = [
  { id:'CSRD',       label:'CSRD',     full:'Corporate Sustainability Reporting Directive', flag:'🇪🇺', deadline:'2025',  scope:'>250 employees EU',      mandatory:true,  penalty:'10M€ ou 5% CA',      requires:['Scope 1','Scope 2','Scope 3','TCFD','Double materiality'], color:C.red },
  { id:'CSDDD',      label:'CS3D',     full:'Corporate Sustainability Due Diligence Dir.',  flag:'🇪🇺', deadline:'2027',  scope:'>1000 emp + €450M CA',   mandatory:true,  penalty:'5% CA mondial',      requires:['Supply chain audit','Climate plan 1.5°C','NDDPs'], color:C.red },
  { id:'SEC_CLIMATE',label:'SEC Rule', full:'SEC Climate-Related Disclosure Rules',         flag:'🇺🇸', deadline:'2026',  scope:'US listed + FPIs',       mandatory:true,  penalty:'SEC enforcement',    requires:['Scope 1','Scope 2','GHG audit','TCFD alignment'], color:C.orange },
  { id:'IFRS_S2',    label:'IFRS S2',  full:'ISSB Climate Standard',                        flag:'🌍',  deadline:'2025+', scope:'30+ countries voluntary', mandatory:false, penalty:'Capital access risk', requires:['Climate risks','GHG S1/S2/S3','Scenario analysis'], color:C.yellow },
  { id:'CBAM_CERT',  label:'CBAM Cert',full:'CBAM Certification & Embedded Carbon Decl.',  flag:'🇪🇺', deadline:'2026',  scope:'All EU exporters',       mandatory:true,  penalty:'€50/t + seizure',    requires:['Embedded carbon calc','Verifier certificate','Registry'], color:C.orange },
];

const SCENARIOS = {
  bear:   { label:'Bear 🐻',   labelFr:'Pessimiste 🐻', mult:1.35, color:C.red,    desc:'Accelerated transition — high political will', descFr:'Transition accélérée — forte volonté politique' },
  base:   { label:'Base 📊',   labelFr:'Base 📊',        mult:1.00, color:C.yellow, desc:'BNEF central projection 2026',                  descFr:'Projection centrale BNEF 2026' },
  bull:   { label:'Bull 📉',   labelFr:'Optimiste 📉',   mult:0.70, color:C.green,  desc:'Slow transition — political resistance',        descFr:'Transition lente — résistance politique' },
};

const AFRICAN_COUNTRIES = [
  { code:'CI', label:"Côte d'Ivoire",     cbamRisk:'MEDIUM', euTrade:32, key:'cocoa,oil,metals' },
  { code:'NG', label:'Nigeria',           cbamRisk:'HIGH',   euTrade:22, key:'LNG,oil,steel' },
  { code:'ZA', label:'South Africa',      cbamRisk:'HIGH',   euTrade:28, key:'steel,coal,aluminium' },
  { code:'KE', label:'Kenya',             cbamRisk:'LOW',    euTrade:18, key:'flowers,tea,coffee' },
  { code:'GH', label:'Ghana',             cbamRisk:'MEDIUM', euTrade:25, key:'gold,cocoa,oil' },
  { code:'MA', label:'Maroc',             cbamRisk:'HIGH',   euTrade:65, key:'phosphates,fertilizers' },
  { code:'CM', label:'Cameroun',          cbamRisk:'LOW',    euTrade:35, key:'cocoa,oil,timber' },
];

export default function CarbonTaxPage() {
  const { lang } = useLang();
  const L = (en, fr) => lang === 'fr' ? fr : en;

  const [emissions, setEmissions] = useState(50000);
  const [reductionPct, setReductionPct] = useState(30);
  const [euExportValue, setEuExportValue] = useState(5000000);
  const [euExportProduct, setEuExportProduct] = useState('Steel');
  const [activeRegime, setActiveRegime] = useState('EU_ETS');
  const [scenario, setScenario] = useState('base');
  const [tab, setTab] = useState('overview');
  const [selectedCountry, setSelectedCountry] = useState('CI');
  const [vcuPrice, setVcuPrice] = useState(11);

  const regime = REGIMES[activeRegime];
  const sc = SCENARIOS[scenario];
  const scMult = sc.mult;

  const taxData = useMemo(() => {
    return YEARS.map((yr, i) => {
      const red = (reductionPct/100)*(i/6);
      const ems = emissions*(1-red);
      const priceLoc = (regime.traj[i]||regime.traj[regime.traj.length-1])*scMult;
      const priceUSD = priceLoc*(FX[regime.cur]||1);
      const tax = ems*priceUSD;
      const afterVCU = tax-(ems*vcuPrice*0.4);
      const savings = tax-afterVCU;
      return {
        year:yr.toString(), price:+priceUSD.toFixed(1), priceLoc:+priceLoc.toFixed(1),
        emissions:Math.round(ems), taxExposure:Math.round(tax),
        taxWithCredits:Math.round(Math.max(0,afterVCU)), savings:Math.round(savings),
        bearTax:Math.round(ems*priceLoc*SCENARIOS.bear.mult*(FX[regime.cur]||1)),
        bullTax:Math.round(ems*priceLoc*SCENARIOS.bull.mult*(FX[regime.cur]||1)),
      };
    });
  }, [emissions,reductionPct,activeRegime,scenario,vcuPrice,regime,scMult]);

  const totalTax = taxData.reduce((s,d)=>s+d.taxExposure,0);
  const totalSavings = taxData.reduce((s,d)=>s+d.savings,0);
  const tax2026 = taxData[2]?.taxExposure||0;
  const peakPrice = Math.max(...taxData.map(d=>d.price));

  const cbamData = useMemo(() => {
    const prod = CBAM_PRODUCTS[euExportProduct]||CBAM_PRODUCTS.Steel;
    const phaseIn = [0.025,0.05,0.1,0.25,0.5,0.75,1.0];
    return YEARS.map((yr,i)=>{
      const euPrice = REGIMES.EU_ETS.traj[i]*FX.EUR*scMult;
      const pin = phaseIn[i];
      const tonnes = (euExportValue/500)*prod.intensity;
      const bill = tonnes*euPrice*pin;
      const withVCU = bill*(1-(vcuPrice/euPrice)*0.6);
      return {
        year:yr.toString(), cbamBill:Math.round(bill), withVCU:Math.round(Math.max(0,withVCU)),
        saving:Math.round(bill-Math.max(0,withVCU)), phasein:Math.round(pin*100),
        euPrice:+euPrice.toFixed(1),
      };
    });
  }, [euExportValue,euExportProduct,scenario,vcuPrice,scMult]);

  const totalCbam = cbamData.reduce((s,d)=>s+d.cbamBill,0);
  const totalCbamSaving = cbamData.reduce((s,d)=>s+d.saving,0);

  const geoData = useMemo(()=>
    Object.entries(REGIMES).map(([k,r])=>{
      const p26 = +(r.traj[2]*(FX[r.cur]||1)).toFixed(0);
      const p30 = +(r.traj[6]*(FX[r.cur]||1)).toFixed(0);
      return { key:k, label:r.label, flag:r.flag, p26, p30, growth:Math.round((p30-p26)/p26*100), color:r.color };
    }).sort((a,b)=>b.p30-a.p30)
  , []);

  const inp = { background:C.card2, border:'1px solid '+C.border, borderRadius:8, color:C.text, padding:'8px 12px', fontSize:12, outline:'none', width:'100%', boxSizing:'border-box' as const };
  const slider = { width:'100%', accentColor:C.green, cursor:'pointer' };

  const TT = ({ active, payload, label }: any) => {
    if (!active||!payload?.length) return null;
    return (
      <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:8, padding:'10px 14px', fontSize:11 }}>
        <div style={{ color:C.muted, marginBottom:6, fontFamily:'JetBrains Mono, monospace' }}>{label}</div>
        {payload.map((p: any, i: number) => (
          <div key={i} style={{ color:p.color||C.text, marginBottom:2 }}>
            {p.name}: {typeof p.value==='number'&&p.value>999?fmtM(p.value):p.value}
          </div>
        ))}
      </div>
    );
  };

  const TABS = [
    { id:'overview',    label:L('Overview','Vue ensemble'), icon:'📊' },
    { id:'tax',         label:L('Tax Simulator','Simulateur'), icon:'📈' },
    { id:'cbam',        label:'CBAM',                         icon:'🛂' },
    { id:'compliance',  label:'Compliance',                   icon:'⚖️' },
    { id:'optimize',    label:L('Optimize','Optimiser'),      icon:'🎯' },
    { id:'regimes',     label:L('Regimes','Régimes'),         icon:'🌍' },
  ];

  return (
    <div style={{ padding:20, maxWidth:1500, margin:'0 auto' }}>

      {/* Live ticker bar */}
      <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:10, padding:'8px 16px', marginBottom:16, display:'flex', gap:20, overflowX:'auto', alignItems:'center' }}>
        <div style={{ fontSize:8, color:C.muted, fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.15em', flexShrink:0, borderRight:'1px solid '+C.border, paddingRight:16 }}>
          LIVE PRICES
        </div>
        {Object.entries(REGIMES).slice(0,7).map(([k,r])=>{
          const pUSD = +(r.traj[2]*(FX[r.cur]||1)).toFixed(1);
          const prev = +(r.traj[1]*(FX[r.cur]||1)).toFixed(1);
          const up = pUSD >= prev;
          return (
            <button key={k} onClick={()=>setActiveRegime(k)}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:1, background:'transparent', border:'none', cursor:'pointer', flexShrink:0, padding:'2px 8px', borderRadius:6, borderBottom: activeRegime===k?'2px solid '+r.color:'2px solid transparent' }}>
              <span style={{ fontSize:11 }}>{r.flag}</span>
              <span style={{ fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace' }}>{r.cur}/t</span>
              <span style={{ fontSize:12, fontWeight:800, color:up?C.green:C.red, fontFamily:'JetBrains Mono, monospace' }}>${pUSD}</span>
              <span style={{ fontSize:8, color:up?C.green:C.red }}>{up?'▲':'▼'}</span>
            </button>
          );
        })}
        <div style={{ marginLeft:'auto', flexShrink:0, display:'flex', gap:4 }}>
          <div style={{ fontSize:8, color:C.muted, fontFamily:'JetBrains Mono, monospace' }}>SCENARIO:</div>
          {Object.entries(SCENARIOS).map(([k,s])=>(
            <button key={k} onClick={()=>setScenario(k)}
              style={{ fontSize:9, padding:'3px 8px', borderRadius:5, border:'1px solid '+(scenario===k?s.color:C.border), background:scenario===k?s.color+'15':'transparent', color:scenario===k?s.color:C.muted, cursor:'pointer', fontFamily:'JetBrains Mono, monospace' }}>
              {lang==='fr'?s.labelFr:s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Header */}
      <div style={{ marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
        <div>
          <div style={{ fontSize:9, color:C.blue, fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.14em', marginBottom:6 }}>
            CARBON TAX INTELLIGENCE ENGINE · EU ETS · CBAM · CSRD · CHINA ETS · 10 REGIMES
          </div>
          <h1 style={{ fontFamily:'Syne, sans-serif', fontSize:24, fontWeight:800, color:C.text, margin:'0 0 6px' }}>
            {L('Carbon Tax Intelligence Engine','Moteur d\'Intelligence Fiscale Carbone')}
          </h1>
          <p style={{ fontSize:13, color:C.muted, margin:0, maxWidth:700 }}>
            {L('Predict carbon tax exposure 2024–2030 across 10 global regimes. Simulate CBAM impact. Optimize with African VCUs.','Prédisez votre exposition carbone 2024–2030 sur 10 régimes mondiaux. Simulez l\'impact CBAM. Optimisez avec des VCUs africains.')}
          </p>
        </div>
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:4 }}>{L('ACTIVE SCENARIO','SCÉNARIO ACTIF')}</div>
          <div style={{ fontSize:13, fontWeight:700, color:sc.color, fontFamily:'Syne, sans-serif' }}>{lang==='fr'?sc.labelFr:sc.label}</div>
          <div style={{ fontSize:10, color:C.muted, maxWidth:200, textAlign:'right' }}>{lang==='fr'?sc.descFr:sc.desc}</div>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:20 }}>
        {[
          { l:L('Tax Exposure 2026','Exposition Taxe 2026'), v:fmtM(tax2026),         c:C.red,    icon:'⚠️', sub:regime.flag+' '+regime.label },
          { l:L('Total 2024–2030','Total 2024–2030'),        v:fmtM(totalTax),         c:C.yellow, icon:'📅', sub:fmt(emissions)+' tCO₂e/yr' },
          { l:L('Savings with VCUs','Économies via VCUs'),   v:fmtM(totalSavings),     c:C.green,  icon:'🌍', sub:'@ $'+vcuPrice+'/t African VCUs' },
          { l:L('CBAM 2024–2030','CBAM 2024–2030'),          v:fmtM(totalCbam),        c:C.orange, icon:'🛂', sub:euExportProduct+' exports' },
          { l:L('Peak Price 2030','Prix Pic 2030'),           v:'$'+peakPrice.toFixed(0)+'/t', c:C.purple, icon:'📈', sub:regime.label+' · '+scenario.toUpperCase() },
        ].map(k=>(
          <div key={k.l} style={{ background:C.card, border:'1px solid '+k.c+'22', borderRadius:12, padding:'14px 16px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg,'+k.c+' 0%,transparent 100%)' }}/>
            <div style={{ fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:4 }}>{k.icon} {k.l.toUpperCase()}</div>
            <div style={{ fontSize:20, fontWeight:800, color:k.c, fontFamily:'Syne, sans-serif', lineHeight:1 }}>{k.v}</div>
            <div style={{ fontSize:9, color:C.muted, marginTop:5, fontFamily:'JetBrains Mono, monospace' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Layout */}
      <div style={{ display:'grid', gridTemplateColumns:'260px 1fr', gap:16 }}>

        {/* Controls */}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:12, padding:16 }}>
            <div style={{ fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:14 }}>{L('COMPANY PROFILE','PROFIL ENTREPRISE')}</div>

            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>{L('ANNUAL EMISSIONS (tCO₂e)','ÉMISSIONS ANNUELLES (tCO₂e)')}</div>
              <input type="range" min="1000" max="500000" step="1000" value={emissions} onChange={e=>setEmissions(+e.target.value)} style={slider}/>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, marginTop:3 }}>
                <span style={{ color:C.muted }}>1K</span>
                <span style={{ color:C.green, fontWeight:700, fontFamily:'JetBrains Mono, monospace' }}>{(emissions/1000).toFixed(0)}K tCO₂e</span>
                <span style={{ color:C.muted }}>500K</span>
              </div>
            </div>

            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>{L('REDUCTION TARGET 2030','CIBLE RÉDUCTION 2030')}</div>
              <input type="range" min="0" max="80" step="5" value={reductionPct} onChange={e=>setReductionPct(+e.target.value)} style={slider}/>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, marginTop:3 }}>
                <span style={{ color:C.muted }}>0%</span>
                <span style={{ color:reductionPct>=30?C.green:C.yellow, fontWeight:700, fontFamily:'JetBrains Mono, monospace' }}>{reductionPct}%</span>
                <span style={{ color:C.muted }}>80%</span>
              </div>
              {reductionPct < 30 && <div style={{ fontSize:9, color:C.yellow, marginTop:3 }}>⚠ {L('Below Paris 1.5°C trajectory','Sous trajectoire Paris 1.5°C')}</div>}
              {reductionPct >= 50 && <div style={{ fontSize:9, color:C.green, marginTop:3 }}>✓ {L('Aligned with SBTi targets','Aligné avec objectifs SBTi')}</div>}
            </div>

            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>{L('REGULATORY REGIME','RÉGIME RÉGLEMENTAIRE')}</div>
              <select value={activeRegime} onChange={e=>setActiveRegime(e.target.value)} style={inp}>
                {Object.entries(REGIMES).map(([k,r])=>(
                  <option key={k} value={k}>{r.flag} {r.label}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>{L('EU EXPORT VALUE (USD)','VALEUR EXPORT UE (USD)')}</div>
              <input type="range" min="0" max="50000000" step="500000" value={euExportValue} onChange={e=>setEuExportValue(+e.target.value)} style={slider}/>
              <div style={{ textAlign:'center', fontSize:10, color:C.text, fontFamily:'JetBrains Mono, monospace', marginTop:3 }}>{fmtM(euExportValue)}</div>
            </div>

            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>CBAM {L('PRODUCT','PRODUIT')}</div>
              <select value={euExportProduct} onChange={e=>setEuExportProduct(e.target.value)} style={inp}>
                {Object.keys(CBAM_PRODUCTS).map(p=><option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <div style={{ fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>
                {L('VCU PRICE (African credits $)','PRIX VCU (crédits africains $)')}
              </div>
              <input type="range" min="5" max="25" step="1" value={vcuPrice} onChange={e=>setVcuPrice(+e.target.value)} style={slider}/>
              <div style={{ textAlign:'center', fontSize:10, color:C.green, fontFamily:'JetBrains Mono, monospace', marginTop:3 }}>${vcuPrice}/tCO₂e</div>
            </div>
          </div>

          {/* Regime card */}
          <div style={{ background:C.card, border:'1px solid '+regime.color+'30', borderRadius:12, padding:14, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:regime.color }}/>
            <div style={{ fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:10 }}>
              {L('REGIME DETAILS','DÉTAILS DU RÉGIME')}
            </div>
            <div style={{ fontSize:16, marginBottom:4 }}>{regime.flag} <span style={{ fontWeight:700, color:C.text }}>{regime.label}</span></div>
            <div style={{ fontSize:10, color:regime.color, fontFamily:'JetBrains Mono, monospace', marginBottom:4 }}>
              ${(regime.traj[2]*(FX[regime.cur]||1)).toFixed(1)}/tCO₂e (2026)
            </div>
            <div style={{ fontSize:10, color:C.muted, marginBottom:6, lineHeight:1.5 }}>{regime.scope}</div>
            <div style={{ fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:8 }}>{regime.source}</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
              {regime.sectors.map(s=>(
                <span key={s} style={{ fontSize:8, background:regime.color+'10', color:regime.color, border:'1px solid '+regime.color+'25', borderRadius:4, padding:'2px 6px', fontFamily:'JetBrains Mono, monospace' }}>{s}</span>
              ))}
            </div>
          </div>

          {/* African country card */}
          <div style={{ background:C.card, border:'1px solid rgba(0,255,148,0.15)', borderRadius:12, padding:14 }}>
            <div style={{ fontSize:9, color:C.green, fontFamily:'JetBrains Mono, monospace', marginBottom:10 }}>
              🌍 {L('AFRICAN CBAM RISK','RISQUE CBAM AFRICAIN')}
            </div>
            <select value={selectedCountry} onChange={e=>setSelectedCountry(e.target.value)} style={inp}>
              {AFRICAN_COUNTRIES.map(c=><option key={c.code} value={c.code}>{c.code} — {c.label}</option>)}
            </select>
            {(() => {
              const ctry = AFRICAN_COUNTRIES.find(c=>c.code===selectedCountry);
              if (!ctry) return null;
              const riskColor = ctry.cbamRisk==='HIGH'?C.red:ctry.cbamRisk==='MEDIUM'?C.yellow:C.green;
              return (
                <div style={{ marginTop:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontSize:11, color:C.text2 }}>CBAM {L('Risk','Risque')}</span>
                    <span style={{ fontSize:10, padding:'2px 8px', background:riskColor+'15', color:riskColor, borderRadius:4, fontFamily:'JetBrains Mono, monospace' }}>{ctry.cbamRisk}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontSize:11, color:C.text2 }}>{L('EU trade share','Part commerce UE')}</span>
                    <span style={{ fontSize:11, color:C.blue, fontFamily:'JetBrains Mono, monospace' }}>{ctry.euTrade}%</span>
                  </div>
                  <div style={{ fontSize:9, color:C.muted }}>{L('Key exposed sectors','Secteurs exposés')}: {ctry.key}</div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Right panel */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Tabs */}
          <div style={{ display:'flex', gap:2, borderBottom:'1px solid '+C.border, paddingBottom:0 }}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)}
                style={{ padding:'9px 16px', border:'none', cursor:'pointer', fontSize:11, fontWeight:600, fontFamily:'JetBrains Mono, monospace', borderBottom:'2px solid '+(tab===t.id?C.green:'transparent'), background:'transparent', color:tab===t.id?C.green:C.muted, transition:'all .15s' }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* ── OVERVIEW ──────────────────────────────────────────────────── */}
          {tab==='overview'&&(
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {/* Main exposure chart */}
              <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:12, padding:18 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
                  <div style={{ fontSize:10, color:C.muted, fontFamily:'JetBrains Mono, monospace' }}>
                    {L('TOTAL TAX EXPOSURE 2024–2030','EXPOSITION FISCALE TOTALE 2024–2030')} · {regime.label} · {regime.cur}/tCO₂
                  </div>
                  <div style={{ display:'flex', gap:12, fontSize:10 }}>
                    <span style={{ color:C.red }}>■ {L('Full exposure','Exposition totale')}</span>
                    <span style={{ color:C.green }}>■ {L('With VCUs','Avec VCUs')}</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={taxData}>
                    <XAxis dataKey="year" tick={{ fontSize:10, fill:C.muted }}/>
                    <YAxis tickFormatter={v=>fmtM(v)} tick={{ fontSize:10, fill:C.muted }} width={70}/>
                    <Tooltip content={<TT/>}/>
                    <Bar dataKey="taxExposure" name={L('Tax exposure','Exposition taxe')} fill="rgba(248,113,113,0.5)" radius={[3,3,0,0]}/>
                    <Bar dataKey="taxWithCredits" name={L('After VCU offset','Après compensation VCU')} fill="rgba(0,255,148,0.4)" radius={[3,3,0,0]}/>
                    <Line dataKey="savings" name={L('Savings','Économies')} stroke={C.purple} dot={false} strokeWidth={2}/>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* 2-column: price traj + risk table */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:12, padding:16 }}>
                  <div style={{ fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:10 }}>
                    {regime.label} {L('PRICE TRAJECTORY','TRAJECTOIRE DE PRIX')} ({regime.cur}/tCO₂)
                  </div>
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={taxData}>
                      <XAxis dataKey="year" tick={{ fontSize:9, fill:C.muted }}/>
                      <YAxis tick={{ fontSize:9, fill:C.muted }} width={35}/>
                      <Tooltip content={<TT/>}/>
                      <ReferenceLine y={regime.th*(FX[regime.cur]||1)*scMult} stroke={C.red} strokeDasharray="3 2" label={{ value:L('Threshold','Seuil'), fill:C.red, fontSize:8 }}/>
                      <Line dataKey="priceLoc" name={regime.cur+'/tCO₂'} stroke={C.yellow} dot={false} strokeWidth={2}/>
                    </LineChart>
                  </ResponsiveContainer>
                  {/* Scenario bands */}
                  <div style={{ display:'flex', gap:8, marginTop:8, flexWrap:'wrap' }}>
                    {Object.entries(SCENARIOS).map(([k,s])=>(
                      <button key={k} onClick={()=>setScenario(k)}
                        style={{ flex:1, padding:'5px 8px', borderRadius:6, border:'1px solid '+s.color+'40', background:scenario===k?s.color+'15':'transparent', color:scenario===k?s.color:C.muted, cursor:'pointer', fontSize:9, fontFamily:'JetBrains Mono, monospace' }}>
                        {lang==='fr'?s.labelFr:s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:12, padding:16 }}>
                  <div style={{ fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:10 }}>
                    {L('QUICK IMPACT TABLE 2026','TABLE IMPACT RAPIDE 2026')}
                  </div>
                  {[
                    { l:L('Current tax (no action)','Taxe actuelle (sans action)'), v:fmtM(tax2026),              c:C.red },
                    { l:L('With 30% reduction','Avec réduction 30%'),               v:fmtM(tax2026*0.7),           c:C.yellow },
                    { l:L('With African VCUs','Avec VCUs africains'),               v:fmtM(tax2026*(1-vcuPrice/peakPrice*0.4)), c:C.green },
                    { l:L('CBAM bill (exports)','Facture CBAM (exports)'),           v:fmtM(cbamData[2]?.cbamBill||0), c:C.orange },
                    { l:L('Total optimal scenario','Scénario optimal total'),        v:fmtM(tax2026*0.35),          c:C.purple },
                  ].map(row=>(
                    <div key={row.l} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid '+C.border+'30' }}>
                      <span style={{ fontSize:11, color:C.text2 }}>{row.l}</span>
                      <span style={{ fontSize:12, color:row.c, fontWeight:700, fontFamily:'JetBrains Mono, monospace' }}>{row.v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* African VCU opportunity */}
              <div style={{ background:'rgba(0,255,148,0.04)', border:'1px solid rgba(0,255,148,0.2)', borderRadius:12, padding:18 }}>
                <div style={{ fontSize:9, color:C.green, fontFamily:'JetBrains Mono, monospace', marginBottom:12 }}>
                  🌍 {L('AFRICAN VCU OPPORTUNITY WINDOW','FENÊTRE D\'OPPORTUNITÉ VCU AFRICAINS')}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
                  {[
                    { l:L('African VCU price','Prix VCU africain'), v:'$'+vcuPrice+'/t', c:C.green, icon:'🌱' },
                    { l:L('EU ETS price','Prix EU ETS'),            v:'$'+(REGIMES.EU_ETS.traj[2]*FX.EUR).toFixed(0)+'/t', c:C.blue,  icon:'🇪🇺' },
                    { l:L('Spread (arbitrage)','Spread (arbitrage)'), v:'$'+(REGIMES.EU_ETS.traj[2]*FX.EUR-vcuPrice).toFixed(0)+'/t', c:C.yellow, icon:'💰' },
                    { l:L('Total savings 2030','Économies totales 2030'), v:fmtM(totalSavings), c:C.purple, icon:'🏆' },
                  ].map(k=>(
                    <div key={k.l} style={{ textAlign:'center', padding:'10px', background:'rgba(0,0,0,0.2)', borderRadius:8 }}>
                      <div style={{ fontSize:16, marginBottom:4 }}>{k.icon}</div>
                      <div style={{ fontSize:14, fontWeight:800, color:k.c, fontFamily:'JetBrains Mono, monospace' }}>{k.v}</div>
                      <div style={{ fontSize:9, color:C.muted, marginTop:3 }}>{k.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── TAX SIMULATOR ─────────────────────────────────────────────── */}
          {tab==='tax'&&(
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:12, padding:18 }}>
                <div style={{ fontSize:10, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:14 }}>
                  {L('EXPOSURE vs. AFTER VCU OFFSET','EXPOSITION vs. APRÈS COMPENSATION VCU')} · {regime.label} · {L('SCENARIO','SCÉNARIO')}: {lang==='fr'?sc.labelFr:sc.label}
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={taxData}>
                    <XAxis dataKey="year" tick={{ fontSize:11, fill:C.muted }}/>
                    <YAxis tickFormatter={v=>fmtM(v)} tick={{ fontSize:10, fill:C.muted }} width={70}/>
                    <Tooltip content={<TT/>}/>
                    <Bar dataKey="taxExposure" name={L('Tax exposure','Exposition taxe')} fill="rgba(248,113,113,0.55)" radius={[3,3,0,0]}/>
                    <Bar dataKey="taxWithCredits" name={L('After VCU offset','Après VCU')} fill="rgba(0,255,148,0.45)" radius={[3,3,0,0]}/>
                    <Line dataKey="savings" name={L('Savings','Économies')} stroke={C.purple} dot={false} strokeWidth={2.5}/>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              {/* Detailed table */}
              <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:12, overflow:'hidden' }}>
                <div style={{ padding:'12px 18px', borderBottom:'1px solid '+C.border, fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace' }}>
                  {L('DETAILED ANNUAL BREAKDOWN','DÉTAIL ANNUEL')} · {regime.label} · USD
                </div>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                  <thead>
                    <tr style={{ background:'rgba(255,255,255,0.02)' }}>
                      {[L('Year','Année'),L('Emissions tCO₂','Émissions tCO₂'),L('Price USD/t','Prix USD/t'),L('Full Exposure','Exposition totale'),L('With VCUs','Avec VCUs'),L('Savings','Économies')].map(h=>(
                        <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:8, color:C.muted, fontFamily:'JetBrains Mono, monospace', borderBottom:'1px solid '+C.border }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {taxData.map((d,i)=>(
                      <tr key={d.year} style={{ borderBottom:'1px solid '+C.border+'22', background:i%2===0?'transparent':'rgba(255,255,255,0.01)' }}>
                        <td style={{ padding:'9px 14px', color:C.blue, fontFamily:'JetBrains Mono, monospace', fontWeight:700 }}>{d.year}</td>
                        <td style={{ padding:'9px 14px', color:C.text2, fontFamily:'JetBrains Mono, monospace' }}>{fmt(d.emissions)}</td>
                        <td style={{ padding:'9px 14px', color:C.yellow, fontFamily:'JetBrains Mono, monospace' }}>${d.price}</td>
                        <td style={{ padding:'9px 14px', color:C.red, fontFamily:'JetBrains Mono, monospace', fontWeight:600 }}>{fmtM(d.taxExposure)}</td>
                        <td style={{ padding:'9px 14px', color:C.green, fontFamily:'JetBrains Mono, monospace' }}>{fmtM(d.taxWithCredits)}</td>
                        <td style={{ padding:'9px 14px', color:C.purple, fontFamily:'JetBrains Mono, monospace', fontWeight:600 }}>{fmtM(d.savings)}</td>
                      </tr>
                    ))}
                    <tr style={{ background:'rgba(0,255,148,0.04)', borderTop:'2px solid rgba(0,255,148,0.2)' }}>
                      <td colSpan={3} style={{ padding:'10px 14px', color:C.green, fontWeight:700, fontSize:12 }}>TOTAL 2024–2030</td>
                      <td style={{ padding:'10px 14px', color:C.red, fontWeight:800, fontFamily:'JetBrains Mono, monospace' }}>{fmtM(totalTax)}</td>
                      <td style={{ padding:'10px 14px', color:C.green, fontWeight:800, fontFamily:'JetBrains Mono, monospace' }}>{fmtM(totalTax-totalSavings)}</td>
                      <td style={{ padding:'10px 14px', color:C.purple, fontWeight:800, fontFamily:'JetBrains Mono, monospace' }}>{fmtM(totalSavings)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── CBAM ──────────────────────────────────────────────────────── */}
          {tab==='cbam'&&(
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:12, padding:18 }}>
                <div style={{ fontSize:10, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>
                  CBAM — {L('CARBON BORDER ADJUSTMENT MECHANISM · EU REGULATION 2023/956','MÉCANISME D\'AJUSTEMENT CARBONE AUX FRONTIÈRES · RÈGL. UE 2023/956')}
                </div>
                <p style={{ fontSize:12, color:C.text2, margin:'0 0 14px', lineHeight:1.7 }}>
                  {L('African exporters to the EU must pay CBAM certificates for the carbon embedded in their products. Phase-in: 2.5% in 2024 → 100% in 2030 (full in 2034).','Les exportateurs africains vers l\'UE doivent acquérir des certificats CBAM pour le carbone incorporé dans leurs produits. Phase-in: 2.5% en 2024 → 100% en 2030 (total en 2034).')}
                </p>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={cbamData}>
                    <XAxis dataKey="year" tick={{ fontSize:11, fill:C.muted }}/>
                    <YAxis yAxisId="left" tickFormatter={v=>fmtM(v)} tick={{ fontSize:10, fill:C.muted }} width={70}/>
                    <YAxis yAxisId="right" orientation="right" tickFormatter={v=>v+'%'} tick={{ fontSize:10, fill:C.muted }} width={40}/>
                    <Tooltip content={<TT/>}/>
                    <Bar yAxisId="left" dataKey="cbamBill" name={L('CBAM bill','Facture CBAM')} fill="rgba(249,115,22,0.5)" radius={[3,3,0,0]}/>
                    <Bar yAxisId="left" dataKey="withVCU" name={L('With African VCUs','Avec VCUs africains')} fill="rgba(0,255,148,0.4)" radius={[3,3,0,0]}/>
                    <Line yAxisId="right" dataKey="phasein" name="Phase-in %" stroke={C.yellow} dot={false} strokeWidth={2}/>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* CBAM product matrix */}
              <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:12, overflow:'hidden' }}>
                <div style={{ padding:'12px 18px', borderBottom:'1px solid '+C.border, fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace' }}>
                  {L('CBAM PRODUCT CARBON INTENSITY (tCO₂/t product)','INTENSITÉ CARBONE CBAM PAR PRODUIT (tCO₂/t produit)')}
                </div>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                  <thead>
                    <tr style={{ background:'rgba(255,255,255,0.02)' }}>
                      {[L('Product','Produit'),L('Carbon intensity','Intensité carbone'),L('EU benchmark','Référence UE'),L('CBAM per tonne','CBAM par tonne'),L('Risk','Risque')].map(h=>(
                        <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:8, color:C.muted, fontFamily:'JetBrains Mono, monospace', borderBottom:'1px solid '+C.border }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(CBAM_PRODUCTS).map(([prod,data],i)=>{
                      const cbamPerT = (data.intensity-data.threshold)*REGIMES.EU_ETS.traj[2]*FX.EUR;
                      const risk = data.intensity > 3 ? 'HIGH' : data.intensity > 1 ? 'MEDIUM' : 'LOW';
                      const rc = risk==='HIGH'?C.red:risk==='MEDIUM'?C.yellow:C.green;
                      const isSel = euExportProduct===prod;
                      return (
                        <tr key={prod} onClick={()=>setEuExportProduct(prod)} style={{ borderBottom:'1px solid '+C.border+'22', cursor:'pointer', background:isSel?'rgba(56,189,248,0.04)':'transparent' }}>
                          <td style={{ padding:'9px 14px', color:isSel?C.blue:C.text, fontWeight:isSel?700:400 }}>{prod}</td>
                          <td style={{ padding:'9px 14px', color:C.text2, fontFamily:'JetBrains Mono, monospace' }}>{data.intensity} tCO₂/t</td>
                          <td style={{ padding:'9px 14px', color:C.muted, fontFamily:'JetBrains Mono, monospace' }}>{data.threshold} tCO₂/t</td>
                          <td style={{ padding:'9px 14px', color:rc, fontFamily:'JetBrains Mono, monospace', fontWeight:600 }}>${cbamPerT.toFixed(0)}/t</td>
                          <td style={{ padding:'9px 14px' }}>
                            <span style={{ fontSize:9, padding:'2px 7px', background:rc+'15', color:rc, borderRadius:4, fontFamily:'JetBrains Mono, monospace' }}>{risk}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                {[
                  { l:L('Total CBAM 2024-2030','Total CBAM 2024-2030'), v:fmtM(totalCbam),        c:C.orange },
                  { l:L('With VCU mitigation','Avec VCUs africains'),    v:fmtM(totalCbam-totalCbamSaving), c:C.green },
                  { l:L('Net savings','Économies nettes'),                v:fmtM(totalCbamSaving),  c:C.purple },
                ].map(k=>(
                  <div key={k.l} style={{ background:C.card, border:'1px solid '+k.c+'20', borderRadius:10, padding:'14px 16px', textAlign:'center' }}>
                    <div style={{ fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>{k.l.toUpperCase()}</div>
                    <div style={{ fontSize:18, fontWeight:800, color:k.c, fontFamily:'JetBrains Mono, monospace' }}>{k.v}</div>
                  </div>
                ))}
              </div>

              <div style={{ padding:'14px 18px', background:'rgba(56,189,248,0.06)', border:'1px solid rgba(56,189,248,0.2)', borderRadius:10, fontSize:12, color:C.text2 }}>
                <span style={{ color:C.blue, fontWeight:700 }}>{L('Strategic insight: ','Insight stratégique : ')}</span>
                {L('African exporters can reduce their CBAM bill by presenting certified VCU/ITMO certificates proving embedded emissions below the EU benchmark. This is the key PANGEA CARBON opportunity for African industry.','Les exportateurs africains peuvent réduire leur facture CBAM en présentant des certificats VCU/ITMO certifiés prouvant des émissions incorporées inférieures à la référence UE. C\'est l\'opportunité clé PANGEA CARBON pour l\'industrie africaine.')}
              </div>
            </div>
          )}

          {/* ── COMPLIANCE ────────────────────────────────────────────────── */}
          {tab==='compliance'&&(
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:12, padding:18 }}>
                <div style={{ fontSize:10, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:16 }}>
                  {L('REGULATORY COMPLIANCE DASHBOARD · CSRD · CS3D · SEC · IFRS S2 · CBAM','TABLEAU CONFORMITÉ RÉGLEMENTAIRE · CSRD · CS3D · SEC · IFRS S2 · CBAM')}
                </div>
                {COMPLIANCE_STANDARDS.map((std,i)=>{
                  const yr = parseInt(std.deadline)||2025;
                  const now = 2026;
                  const risk = std.mandatory?(now>=yr?'OVERDUE':now>=yr-1?'DUE SOON':'UPCOMING'):'VOLUNTARY';
                  const rc = risk==='OVERDUE'?C.red:risk==='DUE SOON'?C.orange:risk==='UPCOMING'?C.yellow:C.muted;
                  return (
                    <div key={std.id} style={{ padding:'16px 0', borderBottom:i<COMPLIANCE_STANDARDS.length-1?'1px solid '+C.border+'40':'none' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10, alignItems:'flex-start' }}>
                        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                          <div style={{ width:36, height:36, borderRadius:9, background:std.color+'15', border:'1px solid '+std.color+'30', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{std.flag}</div>
                          <div>
                            <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:3 }}>
                              <span style={{ fontSize:9, padding:'2px 7px', background:rc+'15', color:rc, borderRadius:4, fontFamily:'JetBrains Mono, monospace' }}>{risk}</span>
                              <span style={{ fontSize:14, fontWeight:700, color:C.text }}>{std.label}</span>
                            </div>
                            <div style={{ fontSize:11, color:C.text2 }}>{std.full}</div>
                          </div>
                        </div>
                        <div style={{ textAlign:'right', flexShrink:0 }}>
                          <div style={{ fontSize:9, color:C.muted }}>{L('Deadline','Échéance')}</div>
                          <div style={{ fontSize:14, fontWeight:700, color:rc, fontFamily:'JetBrains Mono, monospace' }}>{std.deadline}</div>
                        </div>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                        <div style={{ padding:'8px 10px', background:'rgba(255,255,255,0.02)', borderRadius:7 }}>
                          <div style={{ fontSize:8, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:3 }}>SCOPE</div>
                          <div style={{ fontSize:11, color:C.text2 }}>{std.scope}</div>
                        </div>
                        <div style={{ padding:'8px 10px', background:'rgba(248,113,113,0.04)', borderRadius:7 }}>
                          <div style={{ fontSize:8, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:3 }}>{L('MAX PENALTY','PÉNALITÉ MAX')}</div>
                          <div style={{ fontSize:11, color:C.red, fontWeight:600 }}>{std.penalty}</div>
                        </div>
                        <div style={{ padding:'8px 10px', background:'rgba(56,189,248,0.04)', borderRadius:7 }}>
                          <div style={{ fontSize:8, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:3 }}>{L('REQUIRES','REQUIS')}</div>
                          <div style={{ fontSize:10, color:C.text2, lineHeight:1.5 }}>{std.requires.join(' · ')}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── OPTIMIZE ──────────────────────────────────────────────────── */}
          {tab==='optimize'&&(
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:12, padding:18 }}>
                <div style={{ fontSize:10, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:14 }}>
                  {L('GEO-ARBITRAGE — CARBON PRICE BY REGIME 2026 vs 2030 (USD/tCO₂)','GÉO-ARBITRAGE — PRIX CARBONE PAR RÉGIME 2026 vs 2030 (USD/tCO₂)')}
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={geoData} layout="vertical">
                    <XAxis type="number" tickFormatter={v=>'$'+v} tick={{ fontSize:9, fill:C.muted }}/>
                    <YAxis type="category" dataKey="flag" tick={{ fontSize:12 }} width={30}/>
                    <Tooltip content={<TT/>}/>
                    <Bar dataKey="p26" name={L('2026 price','Prix 2026')} fill="rgba(56,189,248,0.4)" radius={[0,3,3,0]}/>
                    <Bar dataKey="p30" name={L('2030 price','Prix 2030')} fill="rgba(248,113,113,0.4)" radius={[0,3,3,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:12, padding:18 }}>
                <div style={{ fontSize:10, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:14 }}>
                  {L('OPTIMIZATION STRATEGIES — ESTIMATED IMPACT 2024–2030','STRATÉGIES D\'OPTIMISATION — IMPACT ESTIMÉ 2024–2030')}
                </div>
                {[
                  { l:L('Buy African VCUs now (lock in $'+vcuPrice+'/t)','Acheter VCUs africains maintenant ($'+vcuPrice+'/t)'), saving:Math.round(totalSavings*0.45), icon:'🌍', tag:'HIGH ROI', tagC:C.green,  desc:L('Arbitrage EU ETS vs. African credits. Certify under Verra VCS.','Arbitrage EU ETS vs. crédits africains. Certifier sous Verra VCS.') },
                  { l:L('Accelerate 30% emission reduction by 2028','Accélérer réduction 30% émissions d\'ici 2028'),          saving:Math.round(totalTax*0.22), icon:'⚡', tag:'CAPEX',   tagC:C.yellow, desc:L('Renewable energy switchover + energy efficiency.','Passage énergies renouvelables + efficacité énergétique.') },
                  { l:L('CBAM certified embedded carbon declaration','Déclaration carbone incorporé certifiée CBAM'),          saving:Math.round(totalCbamSaving), icon:'🛂', tag:'EXPORT',  tagC:C.blue,   desc:L('Reduce CBAM bill by certifying lower embedded carbon.','Réduire la facture CBAM en certifiant un carbone incorporé inférieur.') },
                  { l:L('Article 6 ITMO sovereign agreement (Africa)','Accord souverain ITMO Article 6 (Afrique)'),           saving:Math.round(tax2026*0.30), icon:'🏛️', tag:'PREMIUM', tagC:C.purple, desc:L('Bilateral NDC transfers with EU/Singapore governments.','Transferts NDC bilatéraux avec gouvernements UE/Singapour.') },
                  { l:L('SBTi target → CSRD compliance','Objectif SBTi → conformité CSRD'),                                  saving:Math.round(totalTax*0.08), icon:'📋', tag:'RISK',    tagC:C.orange, desc:L('Avoid CSRD penalties up to 10M€. Investor confidence.','Éviter pénalités CSRD jusqu\'à 10M€. Confiance investisseurs.') },
                ].map((s,i)=>(
                  <div key={i} style={{ padding:'14px 0', borderBottom:i<4?'1px solid '+C.border+'30':'none' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div style={{ display:'flex', gap:12, alignItems:'flex-start', flex:1 }}>
                        <span style={{ fontSize:22, flexShrink:0 }}>{s.icon}</span>
                        <div style={{ flex:1 }}>
                          <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4 }}>
                            <div style={{ fontSize:12, color:C.text, fontWeight:600 }}>{s.l}</div>
                            <span style={{ fontSize:8, padding:'2px 6px', background:s.tagC+'15', color:s.tagC, border:'1px solid '+s.tagC+'30', borderRadius:3, fontFamily:'JetBrains Mono, monospace', flexShrink:0 }}>{s.tag}</span>
                          </div>
                          <div style={{ fontSize:10, color:C.muted, lineHeight:1.5 }}>{s.desc}</div>
                        </div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0, marginLeft:16 }}>
                        <div style={{ fontSize:16, fontWeight:800, color:C.green, fontFamily:'JetBrains Mono, monospace' }}>{fmtM(s.saving)}</div>
                        <div style={{ fontSize:9, color:C.muted }}>{L('est. saving','économie est.')}</div>
                      </div>
                    </div>
                  </div>
                ))}
                <div style={{ marginTop:14, padding:'14px 18px', background:'rgba(0,255,148,0.05)', border:'1px solid rgba(0,255,148,0.2)', borderRadius:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ fontSize:12, color:C.text2 }}>{L('Total optimization potential 2024–2030','Potentiel total optimisation 2024–2030')}</div>
                  <div style={{ fontSize:22, fontWeight:800, color:C.green, fontFamily:'Syne, sans-serif' }}>{fmtM(totalSavings+totalCbamSaving)}</div>
                </div>
              </div>
            </div>
          )}

          {/* ── REGIMES ───────────────────────────────────────────────────── */}
          {tab==='regimes'&&(
            <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:12, overflow:'hidden' }}>
              <div style={{ padding:'14px 20px', borderBottom:'1px solid '+C.border, fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace' }}>
                {L('GLOBAL CARBON PRICE REGIMES — 10 ACTIVE MARKETS','RÉGIMES MONDIAUX DE PRIX CARBONE — 10 MARCHÉS ACTIFS')}
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                  <thead>
                    <tr style={{ background:'rgba(255,255,255,0.02)' }}>
                      {[L('Regime','Régime'),'2024','2026','2028','2030',L('Growth','Croissance'),L('Type','Type'),'Sectors',L('Africa link','Lien Afrique')].map(h=>(
                        <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:8, color:C.muted, fontFamily:'JetBrains Mono, monospace', borderBottom:'1px solid '+C.border, whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(REGIMES).map(([k,r],i)=>{
                      const p = (idx) => '$'+(r.traj[idx]*(FX[r.cur]||1)).toFixed(0);
                      const g = Math.round((r.traj[6]-r.traj[0])/r.traj[0]*100);
                      const afLink = ['EU_ETS','CBAM'].includes(k)?'CBAM':k==='SOUTHAFRICA_CT'?'Direct':'Export';
                      const afC = afLink==='CBAM'?C.orange:afLink==='Direct'?C.green:C.blue;
                      return (
                        <tr key={k} onClick={()=>setActiveRegime(k)} style={{ borderBottom:'1px solid '+C.border+'22', cursor:'pointer', background:activeRegime===k?r.color+'08':'transparent' }}>
                          <td style={{ padding:'10px 14px', color:activeRegime===k?r.color:C.text, fontWeight:activeRegime===k?700:400 }}>
                            <span style={{ marginRight:6 }}>{r.flag}</span>{r.label}
                          </td>
                          <td style={{ padding:'10px 14px', color:C.muted, fontFamily:'JetBrains Mono, monospace', fontSize:10 }}>{p(0)}</td>
                          <td style={{ padding:'10px 14px', color:C.text, fontFamily:'JetBrains Mono, monospace', fontWeight:600 }}>{p(2)}</td>
                          <td style={{ padding:'10px 14px', color:C.yellow, fontFamily:'JetBrains Mono, monospace' }}>{p(4)}</td>
                          <td style={{ padding:'10px 14px', color:C.red, fontFamily:'JetBrains Mono, monospace', fontWeight:700 }}>{p(6)}</td>
                          <td style={{ padding:'10px 14px', color:g>100?C.red:g>50?C.orange:C.yellow, fontFamily:'JetBrains Mono, monospace' }}>+{g}%</td>
                          <td style={{ padding:'10px 14px', fontSize:9 }}>
                            <span style={{ padding:'2px 6px', background:r.color+'10', color:r.color, borderRadius:4, fontFamily:'JetBrains Mono, monospace' }}>{r.type.replace('_',' ')}</span>
                          </td>
                          <td style={{ padding:'10px 14px', fontSize:9, color:C.muted }}>{r.sectors[0]}</td>
                          <td style={{ padding:'10px 14px' }}>
                            <span style={{ fontSize:8, padding:'2px 6px', background:afC+'10', color:afC, borderRadius:4, fontFamily:'JetBrains Mono, monospace' }}>{afLink}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop:16, background:C.card, border:'1px solid '+C.border, borderRadius:10, padding:'12px 18px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
        <div style={{ fontSize:10, color:C.muted, fontFamily:'JetBrains Mono, monospace' }}>
          {L('Sources','Sources')}: ICE ECX · Shanghai Environment Exchange · Canada ECCC · BNEF Carbon Price Outlook 2026 · Règl. (UE) 2023/956 · SARS · IRAS · Clean Energy Regulator
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <a href="/dashboard/ghg-audit" style={{ fontSize:11, color:C.green, textDecoration:'none', padding:'6px 14px', border:'1px solid rgba(0,255,148,0.3)', borderRadius:7, fontWeight:600 }}>
            {L('Run GHG Audit →','Lancer GHG Audit →')}
          </a>
          <a href="/dashboard/marketplace" style={{ fontSize:11, color:C.blue, textDecoration:'none', padding:'6px 14px', border:'1px solid rgba(56,189,248,0.3)', borderRadius:7 }}>
            {L('Buy VCUs →','Acheter VCUs →')}
          </a>
          <a href="/dashboard/carbon-desk" style={{ fontSize:11, color:C.purple, textDecoration:'none', padding:'6px 14px', border:'1px solid rgba(167,139,250,0.3)', borderRadius:7 }}>
            {L('Carbon Desk →','Carbon Desk →')}
          </a>
        </div>
      </div>

    </div>
  );
}
