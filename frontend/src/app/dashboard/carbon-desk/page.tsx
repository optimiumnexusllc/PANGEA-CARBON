'use client';
import { useEffect, useState, useCallback } from 'react';
import { fetchAuthJson } from '@/lib/fetch-auth';
import { useLang } from '@/lib/lang-context';

const GREEN='#00FF94'; const RED='#F87171'; const YELLOW='#FCD34D';
const BLUE='#38BDF8'; const PURPLE='#A78BFA'; const ORANGE='#F97316';
const CARD='#0D1117'; const BORDER='#1E2D3D'; const MUTED='#4A6278';
const TEXT='#E8EFF6'; const TEXT2='#8FA3B8';

const BUYER_TYPES = [
  { id:'CORPORATE_VOLUNTARY', label:'Corporate Voluntary', icon:'🏢', color:BLUE,
    desc:'Offset volontaire — ESG, branding, engagement investisseurs', badge:'VOLUNTARY' },
  { id:'STRATEGIC_NETZERO',   label:'Strategic Net Zero',  icon:'🎯', color:GREEN,
    desc:'Engagement Net Zero signé (SBTi, UNFCCC Race to Zero)', badge:'STRATEGIC' },
  { id:'COMPLIANCE_CBAM',     label:'CBAM Compliance',     icon:'🇪🇺', color:ORANGE,
    desc:'Exportateurs vers UE — Carbon Border Adjustment Mechanism', badge:'REGULATORY' },
  { id:'COMPLIANCE_CORSIA',   label:'CORSIA Aviation',     icon:'✈️', color:PURPLE,
    desc:'Compagnies aériennes — Carbon Offsetting Scheme for Aviation', badge:'REGULATORY' },
  { id:'COMPLIANCE_LOCAL',    label:'Local Compliance',    icon:'⚖️', color:YELLOW,
    desc:'Régulation carbone nationale ou sectorielle', badge:'REGULATORY' },
  { id:'FINANCIAL',           label:'Financial / ESG Fund', icon:'💼', color:PURPLE,
    desc:'Banques, fonds ESG, assurances — reporting carbone portfolio', badge:'FINANCIAL' },
  { id:'SPECULATIVE',         label:'Carbon Trader',       icon:'📈', color:YELLOW,
    desc:'Trading carbone, arbitrage, investissement spéculatif', badge:'TRADING' },
];

const SECTORS = [
  'ENERGY','MANUFACTURING','TRANSPORT','FINANCE','TECH',
  'AGRI','MINING','CONSTRUCTION','RETAIL','HEALTHCARE','OTHER'
];

const CBAM_SECTORS = [
  { id:'STEEL',       label:'Acier / Steel',          factor:1.85, icon:'🔩' },
  { id:'CEMENT',      label:'Ciment / Cement',        factor:0.83, icon:'🏗️' },
  { id:'ALUMINIUM',   label:'Aluminium',              factor:6.70, icon:'⚙️' },
  { id:'FERTILIZER',  label:'Engrais / Fertilizers',  factor:2.30, icon:'🌾' },
  { id:'ELECTRICITY', label:'Électricité / Electricity',factor:0.50,icon:'⚡' },
  { id:'HYDROGEN',    label:'Hydrogène / Hydrogen',   factor:9.00, icon:'💧' },
];

const MOTIVATIONS = [
  { id:'ESG_REPORTING',    label:'ESG Reporting',          icon:'📊' },
  { id:'NET_ZERO',         label:'Net Zero Commitment',    icon:'🎯' },
  { id:'CBAM',             label:'CBAM Compliance',        icon:'🇪🇺' },
  { id:'BRAND',            label:'Brand & Marketing',      icon:'🌿' },
  { id:'INVESTOR_PRESSURE',label:'Investor Pressure',      icon:'💼' },
  { id:'REGULATION',       label:'Local Regulation',       icon:'⚖️' },
  { id:'SUPPLY_CHAIN',     label:'Supply Chain Scope 3',   icon:'🔗' },
  { id:'TRADING',          label:'Carbon Trading',         icon:'📈' },
];

const LEAD_GRADE = (score: number) => {
  if (score >= 80) return { label:'HOT LEAD',   color:RED,    bg:'rgba(248,113,113,0.12)' };
  if (score >= 60) return { label:'WARM LEAD',  color:ORANGE, bg:'rgba(249,115,22,0.12)'  };
  if (score >= 40) return { label:'PROSPECT',   color:YELLOW, bg:'rgba(252,211,77,0.12)'  };
  return             { label:'COLD',       color:MUTED,  bg:'rgba(74,98,120,0.12)'    };
};

function fmt(n: number, suffix = '') {
  if (!n) return '—';
  if (n >= 1e9) return '$' + (n/1e9).toFixed(1) + 'B';
  if (n >= 1e6) return '$' + (n/1e6).toFixed(1) + 'M';
  if (n >= 1e3) return '$' + (n/1e3).toFixed(0) + 'K';
  return '$' + n.toFixed(0) + suffix;
}
function fmtT(n: number) {
  if (!n) return '—';
  if (n >= 1e6) return (n/1e6).toFixed(1) + 'Mt CO₂e';
  if (n >= 1e3) return (n/1e3).toFixed(1) + 'kt CO₂e';
  return n.toFixed(0) + ' tCO₂e';
}

export default function CarbonDesk() {
  const { lang } = useLang();
  const L = (en: string, fr: string) => lang === 'fr' ? fr : en;

  const [tab, setTab] = useState<'intelligence'|'buyers'|'profile'|'cbam'>('intelligence');
  const [buyers, setBuyers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [intel, setIntel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{msg:string;type:string}|null>(null);
  const [myProfile, setMyProfile] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [cbamCalc, setCbamCalc] = useState({ sector:'STEEL', exportsToEU:1000000, co2Embedded:0, carbonPriceEU:65 });
  const [cbamResult, setCbamResult] = useState<any>(null);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedBuyer, setSelectedBuyer] = useState<any>(null);

  const showToast = (msg: string, type = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, i, p] = await Promise.all([
        fetchAuthJson('/buyers?' + new URLSearchParams({ type: filterType, status: filterStatus, sort: 'leadScore' }).toString()),
        fetchAuthJson('/buyers/market-intelligence'),
        fetchAuthJson('/buyers/profile').catch(() => ({})),
      ]);
      setBuyers(b.buyers || []);
      setStats(b.stats || {});
      setIntel(i);
      setMyProfile(p || {});
    } catch(e: any) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  }, [filterType, filterStatus]);

  useEffect(() => { load(); }, [load]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const motivations = (myProfile._motivations || []).join(',');
      await fetchAuthJson('/buyers/profile', {
        method: 'PUT',
        body: JSON.stringify({ ...myProfile, motivations }),
      });
      showToast('Buyer profile saved!');
      await load();
    } catch(e: any) { showToast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const runCBAM = async () => {
    try {
      const result = await fetchAuthJson('/buyers/cbam-calculator', {
        method: 'POST', body: JSON.stringify(cbamCalc),
      });
      setCbamResult(result);
    } catch(e: any) { showToast(e.message, 'error'); }
  };

  const inp = { background:'#0A1628', border:"1px solid "+(BORDER)+"", borderRadius:8, color:TEXT, padding:'10px 14px', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box' as const };

  return (
    <div style={{ padding:24, maxWidth:1400, margin:'0 auto' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', top:20, right:20, zIndex:99999, maxWidth:420 }}>
          <div style={{ background:toast.type==='error'?'rgba(248,113,113,0.1)':'rgba(0,255,148,0.08)', border:1px solid ${toast.type==='error'?'rgba(248,113,113,0.35)':'rgba(0,255,148,0.3)'), borderRadius:12, padding:'14px 18px', display:'flex', alignItems:'center', gap:12, backdropFilter:'blur(20px)', boxShadow:'0 8px 32px rgba(0,0,0,0.5)', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3, background:toast.type==='error'?RED:GREEN }}/>
            <div style={{ width:22, height:22, borderRadius:'50%', background:toast.type==='error'?'rgba(248,113,113,0.15)':'rgba(0,255,148,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, color:toast.type==='error'?RED:GREEN, fontWeight:800, marginLeft:8 }}>
              {toast.type==='error'?'✗':'✓'}
            </div>
            <span style={{ fontSize:13, color:TEXT, flex:1 }}>{toast.msg}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:9, color:ORANGE, fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.15em', marginBottom:8 }}>
          PANGEA CARBON · CARBON DEMAND INTELLIGENCE
        </div>
        <h1 style={{ fontFamily:'Syne, sans-serif', fontSize:26, fontWeight:800, color:TEXT, margin:0, marginBottom:6 }}>
          Carbon Desk
        </h1>
        <p style={{ fontSize:13, color:MUTED, margin:0, maxWidth:600 }}>
          {L(
            'The bridge between carbon supply and corporate demand. Manage buyers, qualify leads, calculate CBAM exposure, and close deals.',
            'Le pont entre offre carbone et demande corporate. Gerez les acheteurs, qualifiez les leads, calculez l\'exposition CBAM.'
          )}
        </p>
      </div>

      {/* KPI row */}
      <div style={{ display:'flex', gap:12, marginBottom:28, flexWrap:'wrap' }}>
        {[
          { v: stats?.total||0,              l:'Total Buyers',     c:BLUE,   icon:'🏢', sub:'registered' },
          { v: stats?.qualified||0,          l:'Qualified',        c:GREEN,  icon:'✓',  sub:'active+qualified' },
          { v: stats?.premium||0,            l:'Premium',          c:PURPLE, icon:'🏆', sub:'tier 1 buyers' },
          { v: fmt(stats?.totalBudgetUSD||0),l:'Total Budget',     c:YELLOW, icon:'💰', sub:'annual USD' },
          { v: fmtT(stats?.totalVolumeT||0), l:'Demand Volume',    c:ORANGE, icon:'📊', sub:'tCO₂e/year' },
          { v: stats?.cbamBuyers||0,         l:'CBAM Buyers',      c:ORANGE, icon:'🇪🇺', sub:'regulatory' },
        ].map(s => (
          <div key={s.l} style={{ background:CARD, border:'1px solid '+s.c+'20', borderRadius:14, padding:'16px 20px', flex:1, minWidth:140, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg,' + s.c + ' 0%,transparent 100%)' }}/>
            <div style={{ fontSize:20, marginBottom:8 }}>{s.icon}</div>
            <div style={{ fontSize:20, fontWeight:800, color:s.c, fontFamily:'JetBrains Mono, monospace', lineHeight:1 }}>{s.v}</div>
            <div style={{ fontSize:11, color:TEXT, fontWeight:600, marginTop:6 }}>{s.l}</div>
            <div style={{ fontSize:10, color:MUTED, marginTop:2, fontFamily:'JetBrains Mono, monospace' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:2, marginBottom:24, borderBottom:1px solid ${BORDER) }}>
        {([
          ['intelligence', L('Market Intelligence','Intelligence marché'), '📡'],
          ['buyers',       L('Buyer CRM','CRM Acheteurs'),                '🏢'],
          ['profile',      L('My Buyer Profile','Mon profil acheteur'),    '👤'],
          ['cbam',         L('CBAM Calculator','Calculateur CBAM'),        '🇪🇺'],
        ] as [string,string,string][]).map(([id,label,icon]) => (
          <button key={id} onClick={() => setTab(id as any)}
            style={{ padding:'11px 20px', border:'none', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'JetBrains Mono, monospace', borderBottom:2px solid ${tab===id?ORANGE:'transparent'), background:'transparent', color:tab===id?ORANGE:MUTED, transition:'all .15s' }}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* ── MARKET INTELLIGENCE ───────────────────────────────────────────────── */}
      {tab === 'intelligence' && intel && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>

          {/* Market overview */}
          <div style={{ background:CARD, border:1px solid ${BORDER), borderRadius:14, padding:22 }}>
            <div style={{ fontSize:9, color:MUTED, fontFamily:'JetBrains Mono, monospace', marginBottom:16 }}>MARKET OVERVIEW</div>
            {[
              { l:'Volume traded', v:fmtT(intel.totalVolumeTraded), c:GREEN },
              { l:'Total value',   v:fmt(intel.totalValueUSD),    c:GREEN },
              { l:'Credits available', v:fmtT(intel.creditsAvailable), c:BLUE },
              { l:'Avg price/tonne', v:'$'+intel.avgPricePerTonne+'/t', c:YELLOW },
              { l:'Market trend (30d)', v:intel.marketTrend, c:GREEN },
            ].map(item => (
              <div key={item.l) style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:1px solid ${BORDER) }}>
                <span style={{ fontSize:12, color:TEXT2 }}>{item.l}</span>
                <span style={{ fontSize:13, color:item.c, fontWeight:700, fontFamily:'JetBrains Mono, monospace' }}>{item.v}</span>
              </div>
            ))}
            <div style={{ marginTop:16, padding:'12px 14px', background:'rgba(249,115,22,0.08)', border:'1px solid rgba(249,115,22,0.25)', borderRadius:10 }}>
              <div style={{ fontSize:10, color:ORANGE, fontFamily:'JetBrains Mono, monospace', marginBottom:4 }}>⚠ CBAM DEADLINE ALERT</div>
              <div style={{ fontSize:12, color:TEXT2 }}>{intel.cbamDeadlineAlert}</div>
            </div>
          </div>

          {/* Demand side breakdown */}
          <div style={{ background:CARD, border:1px solid ${BORDER), borderRadius:14, padding:22 }}>
            <div style={{ fontSize:9, color:MUTED, fontFamily:'JetBrains Mono, monospace', marginBottom:16 }}>DEMAND SIDE BREAKDOWN</div>
            {BUYER_TYPES.slice(0,5).map(bt => {
              const count = buyers.filter(b => b.buyerType === bt.id).length;
              const pct = buyers.length ? Math.round((count / buyers.length) * 100) : 0;
              return (
                <div key={bt.id} style={{ marginBottom:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                    <span style={{ fontSize:12, color:TEXT }}>{bt.icon} {bt.label}</span>
                    <span style={{ fontSize:11, color:bt.color, fontFamily:'JetBrains Mono, monospace' }}>{count} ({pct}%)</span>
                  </div>
                  <div style={{ height:4, background:BORDER, borderRadius:4 }}>
                    <div style={{ height:4, width:`${pct}%`, background:bt.color, borderRadius:4, transition:'width .5s' }}/>
                  </div>
                </div>
              );
            })}
            <div style={{ marginTop:16, padding:'12px 14px', background:`rgba(0,255,148,0.05)`, border:`1px solid rgba(0,255,148,0.15)`, borderRadius:10 }}>
              <div style={{ fontSize:10, color:GREEN, fontFamily:'JetBrains Mono, monospace', marginBottom:4 }}>TOP SECTORS</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {(intel.topBuyerSectors||[]).map((s:string) => (
                  <span key={s} style={{ fontSize:10, padding:'3px 8px', background:`rgba(0,255,148,0.1)`, border:`1px solid rgba(0,255,148,0.2)`, borderRadius:4, color:GREEN, fontFamily:'JetBrains Mono, monospace' }}>{s}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Strategic insights */}
          <div style={{ background:CARD, border:1px solid ${BORDER), borderRadius:14, padding:22, gridColumn:'1/-1' }}>
            <div style={{ fontSize:9, color:MUTED, fontFamily:'JetBrains Mono, monospace', marginBottom:16 }}>PANGEA CARBON MARKET POSITION</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
              {[
                { title:'Carbon Supply', icon:'⚡', color:GREEN, items:['Projets certifiés Verra/GS','Pipeline 11 étapes ACM0002','Credits blockchain SHA-256','Score PANGEA AAA→CCC'] },
                { title:'The Bridge', icon:'🌉', color:ORANGE, items:['Matching supply ↔ demand','CBAM compliance support','Forward contracts (20% deposit)','AI pricing & recommendations'] },
                { title:'Carbon Demand', icon:'🏢', color:BLUE, items:['Corporate Voluntary buyers','CBAM compliance buyers','Strategic Net Zero buyers','Financial / ESG funds'] },
              ].map(col => (
                <div key={col.title} style={{ padding:16, background:`${col.color) + '08', border:`1px solid ${col.color) + '20', borderRadius:12 }}>
                  <div style={{ fontSize:20, marginBottom:8 }}>{col.icon}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:col.color, marginBottom:12, fontFamily:'Syne, sans-serif' }}>{col.title}</div>
                  {col.items.map(i => (
                    <div key={i} style={{ fontSize:11, color:TEXT2, marginBottom:6, display:'flex', gap:6 }}>
                      <span style={{ color:col.color }}>→</span>{i}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── BUYER CRM ─────────────────────────────────────────────────────────── */}
      {tab === 'buyers' && (
        <div>
          {/* Filters */}
          <div style={{ display:'flex', gap:10, marginBottom:20 }}>
            <select style={{ ...inp, width:'auto', minWidth:180 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">All Types</option>
              {BUYER_TYPES.map(bt => <option key={bt.id} value={bt.id}>{bt.icon} {bt.label}</option>)}
            </select>
            <select style={{ ...inp, width:'auto', minWidth:160 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              {['PROSPECT','QUALIFIED','ACTIVE','PREMIUM','INACTIVE'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div style={{ flex:1, fontSize:12, color:MUTED, display:'flex', alignItems:'center', fontFamily:'JetBrains Mono, monospace' }}>
              {buyers.length} buyers · sorted by lead score
            </div>
          </div>

          {/* Buyer list */}
          {(!buyers.length) ? (
            <div style={{ background:CARD, border:1px solid ${BORDER), borderRadius:14, padding:48, textAlign:'center' }}>
              <div style={{ fontSize:44, marginBottom:16 }}>🏢</div>
              <div style={{ fontSize:16, color:TEXT, fontWeight:700, marginBottom:8 }}>{L('No buyers registered yet','Aucun acheteur enregistré')}</div>
              <div style={{ fontSize:13, color:MUTED }}>{L('Buyers register via the marketplace or you can add them manually.','Les acheteurs s\'inscrivent via la marketplace ou vous pouvez les ajouter manuellement.')}</div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {buyers.map(buyer => {
                const grade = LEAD_GRADE(buyer.leadScore||0);
                const bt = BUYER_TYPES.find(t => t.id === buyer.buyerType);
                return (
                  <div key={buyer.id} onClick={() => setSelectedBuyer(selectedBuyer?.id === buyer.id ? null : buyer)}
                    style={{ background:CARD, border:`1px solid ${BORDER), borderRadius:12, padding:'16px 20px', cursor:'pointer', transition:'all .15s', borderLeft:`3px solid ${grade.color) }}>
                    <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                      {/* Lead score */}
                      <div style={{ width:50, height:50, borderRadius:12, background:grade.bg, border:1px solid ${grade.color) + '30', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <div style={{ fontSize:16, fontWeight:800, color:grade.color, fontFamily:'JetBrains Mono, monospace' }}>{buyer.leadScore||0}</div>
                        <div style={{ fontSize:7, color:MUTED, textAlign:'center' }}>SCORE</div>
                      </div>
                      {/* Company info */}
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                          <div style={{ fontSize:14, fontWeight:700, color:TEXT }}>{buyer.companyName || buyer.organization?.name || '—'}</div>
                          {bt && <span style={{ fontSize:9, padding:'2px 7px', background:`${bt.color) + '15', border:`1px solid ${bt.color) + '30', borderRadius:4, color:bt.color, fontFamily:'JetBrains Mono, monospace' }}>{bt.badge}</span>}
                          <span style={{ fontSize:9, padding:'2px 7px', background:${grade.color) + '15', borderRadius:4, color:grade.color, fontFamily:'JetBrains Mono, monospace' }}>{grade.label}</span>
                        </div>
                        <div style={{ fontSize:11, color:MUTED, fontFamily:'JetBrains Mono, monospace' }}>
                          {buyer.sector && <span>{buyer.sector} · </span>}
                          {buyer.country && <span>{buyer.country} · </span>}
                          {bt?.icon} {bt?.label || buyer.buyerType}
                        </div>
                      </div>
                      {/* Metrics */}
                      <div style={{ display:'flex', gap:20, textAlign:'right' }}>
                        <div>
                          <div style={{ fontSize:14, fontWeight:700, color:YELLOW, fontFamily:'JetBrains Mono, monospace' }}>{fmt(buyer.annualBudgetUSD||0)</div>
                          <div style={{ fontSize:9, color:MUTED }}>budget/year</div>
                        </div>
                        <div>
                          <div style={{ fontSize:14, fontWeight:700, color:BLUE, fontFamily:'JetBrains Mono, monospace' }}>{fmtT(buyer.annualVolumeT||0)}</div>
                          <div style={{ fontSize:9, color:MUTED }}>demand</div>
                        </div>
                        <div>
                          <span style={{ fontSize:9, padding:'3px 8px', background:buyer.kycStatus==='VERIFIED'?'rgba(0,255,148,0.15)':'rgba(252,211,77,0.1)', color:buyer.kycStatus==='VERIFIED'?GREEN:YELLOW, borderRadius:4, fontFamily:'JetBrains Mono, monospace' }}>
                            {buyer.kycStatus==='VERIFIED'?'✓ KYC':'KYC PENDING'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {selectedBuyer?.id === buyer.id && (
                      <div style={{ marginTop:16, paddingTop:16, borderTop:1px solid ${BORDER), display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>
                        <div>
                          <div style={{ fontSize:9, color:MUTED, fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>CONTACT</div>
                          <div style={{ fontSize:12, color:TEXT }}>{buyer.contactName || '—'}</div>
                          <div style={{ fontSize:11, color:MUTED }}>{buyer.contactTitle || ''}</div>
                          <div style={{ fontSize:11, color:BLUE }}>{buyer.contactEmail || ''}</div>
                        </div>
                        <div>
                          <div style={{ fontSize:9, color:MUTED, fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>EMISSIONS PROFILE</div>
                          <div style={{ fontSize:11, color:TEXT }}>Scope 1: {fmtT(buyer.scope1Emissions||0)}</div>
                          <div style={{ fontSize:11, color:TEXT }}>Scope 2: {fmtT(buyer.scope2Emissions||0)}</div>
                          <div style={{ fontSize:11, color:TEXT }}>Scope 3: {fmtT(buyer.scope3Emissions||0)}</div>
                          <div style={{ fontSize:11, color:YELLOW, fontWeight:700 }}>Total: {fmtT(buyer.totalEmissions||0)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize:9, color:MUTED, fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>PREFERENCES</div>
                          {buyer.priceRangeMin && <div style={{ fontSize:11, color:TEXT }}>Price: ${buyer.priceRangeMin}–${buyer.priceRangeMax}/t</div>}
                          {buyer.netZeroTargetYear && <div style={{ fontSize:11, color:GREEN }}>Net Zero: {buyer.netZeroTargetYear}</div>}
                          {buyer.sbtValidated && <div style={{ fontSize:11, color:GREEN }}>✓ SBTi validated</div>}
                          {buyer.carbonDeskNote && <div style={{ fontSize:11, color:MUTED, marginTop:4, fontStyle:'italic' }}>📝 {buyer.carbonDeskNote}</div>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MY BUYER PROFILE ──────────────────────────────────────────────────── */}
      {tab === 'profile' && (
        <div style={{ maxWidth:760 }}>
          <div style={{ fontSize:9, color:MUTED, fontFamily:'JetBrains Mono, monospace', marginBottom:20 }}>BUYER PROFILE — {myProfile?.status || 'PROSPECT'}</div>

          {/* Type selector */}
          <div style={{ marginBottom:24 }}>
            <div style={{ fontSize:10, color:MUTED, fontFamily:'JetBrains Mono, monospace', marginBottom:12 }}>BUYER TYPE *</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8 }}>
              {BUYER_TYPES.map(bt => (
                <button key={bt.id} onClick={() => setMyProfile((p:any) => ({ ...p, buyerType: bt.id }))}
                  style={{ background:myProfile.buyerType===bt.id?`${bt.color) + '12':CARD, border:`1px solid ${myProfile.buyerType===bt.id?bt.color:BORDER), borderRadius:10, padding:'12px 16px', cursor:'pointer', textAlign:'left', transition:'all .2s', display:'flex', gap:12, alignItems:'flex-start' }}>
                  <span style={{ fontSize:20 }}>{bt.icon}</span>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:myProfile.buyerType===bt.id?bt.color:TEXT }}>{bt.label}</div>
                    <div style={{ fontSize:10, color:MUTED, marginTop:2 }}>{bt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Company info */}
          <div style={{ background:CARD, border:1px solid ${BORDER), borderRadius:14, padding:24, marginBottom:20 }}>
            <div style={{ fontSize:10, color:MUTED, fontFamily:'JetBrains Mono, monospace', marginBottom:16 }}>COMPANY INFORMATION</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              {[
                ['companyName','COMPANY NAME *','MTN Group','text'],
                ['companyRegNumber','REG NUMBER','RC-123456','text'],
                ['vatNumber','VAT / TIN NUMBER','A123456789','text'],
                ['sector','SECTOR *','','select'],
                ['country','COUNTRY *','NG','text'],
                ['hqCity','CITY','Lagos','text'],
                ['employeeCount','EMPLOYEES','50000','number'],
                ['annualRevenueUSD','ANNUAL REVENUE (USD)','2000000000','number'],
              ].map(([key,label,ph,type]) => (
                <div key={key as string}>
                  <div style={{ fontSize:10, color:MUTED, fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>{label as string}</div>
                  {type === 'select' ? (
                    <select style={inp} value={myProfile[key as string]||''} onChange={e => setMyProfile((p:any) => ({ ...p, [key as string]: e.target.value }))}>
                      <option value="">Select sector</option>
                      {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <input style={inp} type={type as string} placeholder={ph as string} value={myProfile[key as string]||''}
                      onChange={e => setMyProfile((p:any) => ({ ...p, [key as string]: e.target.value }))}/>
                  )}
                </div>
              ))}
              <div style={{ gridColumn:'1/-1', display:'flex', gap:8, alignItems:'center' }}>
                <input type="checkbox" id="listed" checked={myProfile.listedCompany||false}
                  onChange={e => setMyProfile((p:any) => ({ ...p, listedCompany: e.target.checked }))}
                  style={{ width:16, height:16, cursor:'pointer' }}/>
                <label htmlFor="listed" style={{ fontSize:12, color:TEXT, cursor:'pointer' }}>
                  {L('Listed company (stock exchange)','Entreprise cotée en bourse')}
                </label>
              </div>
            </div>
          </div>

          {/* Emissions & Budget */}
          <div style={{ background:CARD, border:1px solid ${BORDER), borderRadius:14, padding:24, marginBottom:20 }}>
            <div style={{ fontSize:10, color:MUTED, fontFamily:'JetBrains Mono, monospace', marginBottom:16 }}>CARBON PROFILE & PROCUREMENT NEEDS</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              {[
                ['scope1Emissions','SCOPE 1 (tCO₂e/year)','45000','number'],
                ['scope2Emissions','SCOPE 2 (tCO₂e/year)','12000','number'],
                ['scope3Emissions','SCOPE 3 (tCO₂e/year)','230000','number'],
                ['totalEmissions','TOTAL EMISSIONS (tCO₂e/year)','287000','number'],
                ['annualVolumeT','CREDITS NEEDED (tCO₂e/year)','50000','number'],
                ['annualBudgetUSD','ANNUAL CARBON BUDGET (USD)','600000','number'],
                ['priceRangeMin','PRICE MIN ($/tCO₂e)','10','number'],
                ['priceRangeMax','PRICE MAX ($/tCO₂e)','25','number'],
                ['netZeroTargetYear','NET ZERO TARGET YEAR','2040','number'],
                ['contactName','SUSTAINABILITY CONTACT NAME','Dr. Amina Konaté','text'],
                ['contactEmail','CONTACT EMAIL','sustainability@company.com','email'],
                ['contactTitle','CONTACT TITLE','Chief Sustainability Officer','text'],
              ].map(([key,label,ph,type]) => (
                <div key={key as string}>
                  <div style={{ fontSize:10, color:MUTED, fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>{label as string}</div>
                  <input style={inp} type={type as string} placeholder={ph as string} value={myProfile[key as string]||''}
                    onChange={e => setMyProfile((p:any) => ({ ...p, [key as string]: e.target.value }))}/>
                </div>
              ))}
            </div>

            {/* Motivations */}
            <div style={{ marginTop:16 }}>
              <div style={{ fontSize:10, color:MUTED, fontFamily:'JetBrains Mono, monospace', marginBottom:10 }}>PURCHASE MOTIVATIONS (multi-select)</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {MOTIVATIONS.map(m => {
                  const selected = (myProfile._motivations||[]).includes(m.id);
                  return (
                    <button key={m.id} onClick={() => {
                      const prev = myProfile._motivations||[];
                      const next = selected ? prev.filter((x:string) => x !== m.id) : [...prev, m.id];
                      setMyProfile((p:any) => ({ ...p, _motivations: next }));
                    )} style={{ padding:'7px 12px', border:1px solid ${selected?GREEN:BORDER), borderRadius:8, background:selected?'rgba(0,255,148,0.1)':CARD, color:selected?GREEN:MUTED, cursor:'pointer', fontSize:11, fontFamily:'JetBrains Mono, monospace', transition:'all .15s' }}>
                      {m.icon} {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <button onClick={saveProfile} disabled={saving}
            style={{ width:'100%', background:saving?CARD:'rgba(0,255,148,0.12)', border:1px solid ${saving?BORDER:'rgba(0,255,148,0.35)'), borderRadius:10, color:saving?MUTED:GREEN, padding:14, cursor:saving?'wait':'pointer', fontSize:14, fontWeight:800, fontFamily:'Syne, sans-serif' }}>
            {saving ? '⟳ Saving...' : '💾 ' + L('Save Buyer Profile','Enregistrer le profil acheteur')}
          </button>
        </div>
      )}

      {/* ── CBAM CALCULATOR ───────────────────────────────────────────────────── */}
      {tab === 'cbam' && (
        <div style={{ maxWidth:720 }}>
          <div style={{ background:CARD, border:`1px solid rgba(249,115,22,0.3)`, borderRadius:16, overflow:'hidden', marginBottom:20 }}>
            <div style={{ padding:'20px 24px', background:'rgba(249,115,22,0.06)', borderBottom:'1px solid rgba(249,115,22,0.2)', display:'flex', gap:14, alignItems:'center' }}>
              <span style={{ fontSize:32 }}>🇪🇺</span>
              <div>
                <div style={{ fontSize:16, fontWeight:800, color:ORANGE, fontFamily:'Syne, sans-serif' }}>CBAM Carbon Cost Calculator</div>
                <div style={{ fontSize:12, color:MUTED }}>Carbon Border Adjustment Mechanism — Compare EU ETS cost vs PANGEA offset</div>
              </div>
            </div>
            <div style={{ padding:24 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
                <div>
                  <div style={{ fontSize:10, color:MUTED, fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>SECTOR *</div>
                  <select style={inp} value={cbamCalc.sector} onChange={e => setCbamCalc(p => ({ ...p, sector: e.target.value }))}>
                    {CBAM_SECTORS.map(s => <option key={s.id} value={s.id}>{s.icon} {s.label} (EF: {s.factor} tCO₂/t)</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize:10, color:MUTED, fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>ANNUAL EXPORTS TO EU (USD)</div>
                  <input style={inp} type="number" placeholder="5000000" value={cbamCalc.exportsToEU}
                    onChange={e => setCbamCalc(p => ({ ...p, exportsToEU: parseFloat(e.target.value)||0 }))}/>
                </div>
                <div>
                  <div style={{ fontSize:10, color:MUTED, fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>CO₂ EMBEDDED (tCO₂e/year — if known)</div>
                  <input style={inp} type="number" placeholder="Leave 0 for auto-calculation" value={cbamCalc.co2Embedded}
                    onChange={e => setCbamCalc(p => ({ ...p, co2Embedded: parseFloat(e.target.value)||0 }))}/>
                </div>
                <div>
                  <div style={{ fontSize:10, color:MUTED, fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>EU ETS CARBON PRICE (€/tCO₂)</div>
                  <input style={inp} type="number" placeholder="65" value={cbamCalc.carbonPriceEU}
                    onChange={e => setCbamCalc(p => ({ ...p, carbonPriceEU: parseFloat(e.target.value)||65 }))}/>
                </div>
              </div>

              <button onClick={runCBAM}
                style={{ width:'100%', background:'rgba(249,115,22,0.12)', border:'1px solid rgba(249,115,22,0.35)', borderRadius:10, color:ORANGE, padding:14, cursor:'pointer', fontSize:14, fontWeight:800, fontFamily:'Syne, sans-serif' }}>
                🧮 {L('Calculate CBAM Exposure','Calculer exposition CBAM')}
              </button>

              {cbamResult && (
                <div style={{ marginTop:24, padding:20, background:'rgba(249,115,22,0.05)', border:'1px solid rgba(249,115,22,0.2)', borderRadius:12 }}>
                  <div style={{ fontSize:10, color:ORANGE, fontFamily:'JetBrains Mono, monospace', marginBottom:16 }}>CBAM ANALYSIS RESULTS</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                    {[
                      { l:'CO₂ embedded',       v:cbamResult.totalCO2tpa?.toLocaleString()+' tCO₂e/year', c:YELLOW },
                      { l:'Annual CBAM cost',    v:'$'+cbamResult.annualCBAMCost?.toLocaleString(), c:RED },
                      { l:'PANGEA offset cost',  v:'$'+cbamResult.pangeaOffsetCost?.toLocaleString(), c:GREEN },
                      { l:'Annual savings',      v:'$'+cbamResult.annualSavings?.toLocaleString(), c:GREEN },
                      { l:'Savings %',           v:cbamResult.savingsPct+'% cheaper via PANGEA', c:GREEN },
                      { l:'Urgency level',       v:cbamResult.urgency, c:cbamResult.urgency==='HIGH'?RED:cbamResult.urgency==='MEDIUM'?YELLOW:MUTED },
                    ].map(item => (
                      <div key={item.l} style={{ display:'flex', justifyContent:'space-between', padding:'10px 14px', background:CARD, borderRadius:8 }}>
                        <span style={{ fontSize:12, color:TEXT2 }}>{item.l}</span>
                        <span style={{ fontSize:13, color:item.c, fontWeight:700, fontFamily:'JetBrains Mono, monospace' }}>{item.v}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding:'12px 16px', background:cbamResult.annualSavings>0?'rgba(0,255,148,0.08)':'rgba(252,211,77,0.08)', border:1px solid ${cbamResult.annualSavings>0?'rgba(0,255,148,0.25)':'rgba(252,211,77,0.25)'), borderRadius:10 }}>
                    <div style={{ fontSize:12, color:cbamResult.annualSavings>0?GREEN:YELLOW, lineHeight:1.7 }}>
                      💡 {cbamResult.recommendation}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* CBAM explainer */}
          <div style={{ background:CARD, border:1px solid ${BORDER), borderRadius:14, padding:22 }}>
            <div style={{ fontSize:10, color:MUTED, fontFamily:'JetBrains Mono, monospace', marginBottom:14 }}>CBAM QUICK REFERENCE</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {CBAM_SECTORS.map(s => (
                <div key={s.id} style={{ padding:'10px 14px', background:`rgba(249,115,22,0.05)`, borderRadius:8, display:'flex', gap:12, alignItems:'center' }}>
                  <span style={{ fontSize:20 }}>{s.icon}</span>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600, color:TEXT }}>{s.label}</div>
                    <div style={{ fontSize:10, color:MUTED, fontFamily:'JetBrains Mono, monospace' }}>EF: {s.factor} tCO₂/t produit</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}