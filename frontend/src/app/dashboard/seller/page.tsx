'use client';
import { useEffect, useState, useCallback } from 'react';
import { fetchAuthJson } from '@/lib/fetch-auth';
import { useLang } from '@/lib/lang-context';

const GATEWAYS = [
  { id:'MTN_MOMO',     label:'MTN Mobile Money',     icon:'📱', color:'#FCD34D', regions:'CI · GH · UG · RW · CM' },
  { id:'ORANGE_MONEY', label:'Orange Money',          icon:'🟠', color:'#F97316', regions:'CI · SN · ML · BF · CM' },
  { id:'WAVE',         label:'Wave',                  icon:'🌊', color:'#38BDF8', regions:'CI · SN' },
  { id:'FLUTTERWAVE',  label:'Flutterwave',           icon:'🦋', color:'#A78BFA', regions:'NG · GH · KE · ZA + 20 pays' },
  { id:'PAYSTACK',     label:'Paystack',              icon:'💚', color:'#00FF94', regions:'NG · GH · KE · ZA' },
  { id:'WIRE',         label:'Virement SWIFT/SEPA',   icon:'🏦', color:'#E8EFF6', regions:'International' },
];

const GRADE_COLORS = { AAA:'#00FF94', AA:'#34D399', A:'#6EE7B7', BBB:'#FCD34D', BB:'#F97316', B:'#F87171', CCC:'#DC2626', UNRATED:'#4A6278' };
const GRADE_BG     = { AAA:'rgba(0,255,148,0.12)', AA:'rgba(52,211,153,0.12)', A:'rgba(110,231,183,0.12)', BBB:'rgba(252,211,77,0.12)', BB:'rgba(249,115,22,0.12)', B:'rgba(248,113,113,0.12)', CCC:'rgba(220,38,38,0.12)', UNRATED:'rgba(74,98,120,0.12)' };

const STATUS_COLOR = { PENDING:'#FCD34D', PAYMENT_PENDING:'#38BDF8', PAID:'#00FF94', SETTLED:'#00FF94', CANCELLED:'#F87171', REFUNDED:'#F87171' };

function fmt(n: number) { return '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 }); }
function fmtK(n: number) { return (n||0) >= 1000 ? ((n||0)/1000).toFixed(1)+'K' : Math.round(n||0).toString(); }

export default function SellerDashboard() {
  const { lang } = useLang();
  const L = (en: string, fr: string) => lang === 'fr' ? fr : en;

  const [tab, setTab] = useState<'overview'|'gateway'|'payouts'|'listings'|'forward'>('overview');
  const [dash, setDash] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{msg:string;type:string}|null>(null);
  const [savingGw, setSavingGw] = useState(false);
  const [gw, setGw] = useState<any>({});
  const [selectedGw, setSelectedGw] = useState('WIRE');

  const showToast = (msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAuthJson('/seller/dashboard');
      setDash(data);
      if (data.profile) {
        setGw(data.profile);
        setSelectedGw(data.profile.preferredGateway || 'WIRE');
      }
    } catch(e: any) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveGateway = async () => {
    setSavingGw(true);
    try {
      await fetchAuthJson('/seller/profile', {
        method: 'PUT',
        body: JSON.stringify({ ...gw, preferredGateway: selectedGw }),
      });
      showToast(L('Gateway saved!', 'Gateway enregistrée !'));
      await load();
    } catch(e: any) { showToast(e.message, 'error'); }
    finally { setSavingGw(false); }
  };

  const inp = { background:'#0A1628', border:'1px solid #1E2D3D', borderRadius:8, color:'#E8EFF6', padding:'10px 14px', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box' as 'border-box' };

  const statCard = (label: string, value: string, sub: string, color: string, icon: string) => (
    <div style={{ background:'#0D1117', border:`1px solid ${color}25`, borderRadius:14, padding:20, flex:1, minWidth:160, position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${color} 0%,transparent 100%)` }}/>
      <div style={{ fontSize:20, marginBottom:8 }}>{icon}</div>
      <div style={{ fontSize:22, fontWeight:800, color, fontFamily:'JetBrains Mono, monospace' }}>{value}</div>
      <div style={{ fontSize:11, color:'#E8EFF6', fontWeight:600, marginTop:2 }}>{label}</div>
      <div style={{ fontSize:10, color:'#4A6278', marginTop:3, fontFamily:'JetBrains Mono, monospace' }}>{sub}</div>
    </div>
  );

  if (loading) return (
    <div style={{ padding:32, textAlign:'center', color:'#4A6278', fontFamily:'JetBrains Mono, monospace', fontSize:12 }}>
      LOADING SELLER DASHBOARD...
    </div>
  );

  return (
    <div style={{ padding:24, maxWidth:1400, margin:'0 auto' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', top:20, right:20, zIndex:99999, maxWidth:420 }}>
          <div style={{ background:toast.type==='error'?'rgba(248,113,113,0.1)':'rgba(0,255,148,0.08)', border:'1px solid '+(toast.type==='error'?'rgba(248,113,113,0.35)':'rgba(0,255,148,0.3)'), borderRadius:12, padding:'14px 18px', display:'flex', alignItems:'center', gap:12, backdropFilter:'blur(20px)', boxShadow:'0 8px 32px rgba(0,0,0,0.5)', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3, background:toast.type==='error'?'#F87171':'#00FF94' }}/>
            <div style={{ width:22, height:22, borderRadius:'50%', background:toast.type==='error'?'rgba(248,113,113,0.15)':'rgba(0,255,148,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, color:toast.type==='error'?'#F87171':'#00FF94', fontWeight:800, marginLeft:8 }}>
              {toast.type==='error'?'✗':'✓'}
            </div>
            <span style={{ fontSize:13, color:'#E8EFF6', flex:1 }}>{toast.msg}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:9, color:'#00FF94', fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.15em', marginBottom:6 }}>
          PANGEA CARBON · SELLER PORTAL
        </div>
        <h1 style={{ fontFamily:'Syne, sans-serif', fontSize:26, fontWeight:800, color:'#E8EFF6', margin:0, marginBottom:6 }}>
          {L('Seller Dashboard','Espace Vendeur')}
        </h1>
        <p style={{ fontSize:13, color:'#4A6278', margin:0 }}>
          {L('Manage your listings, configure your payout gateway, track your revenue.',
             'Gérez vos listings, configurez votre gateway de paiement, suivez vos revenus.')}
        </p>

        {/* Gateway warning */}
        {!dash?.hasGateway && (
          <div style={{ marginTop:16, padding:'12px 18px', background:'rgba(252,211,77,0.08)', border:'1px solid rgba(252,211,77,0.3)', borderRadius:10, display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:18 }}>⚠</span>
            <div>
              <div style={{ fontSize:13, color:'#FCD34D', fontWeight:700 }}>{L('Payment gateway not configured','Gateway de paiement non configurée')}</div>
              <div style={{ fontSize:12, color:'#8FA3B8' }}>{L('You need to configure your payout gateway to receive funds from sales.','Configurez votre gateway pour recevoir les paiements de vos ventes.')}</div>
            </div>
            <button onClick={() => setTab('gateway')} style={{ marginLeft:'auto', background:'rgba(252,211,77,0.15)', border:'1px solid rgba(252,211,77,0.4)', borderRadius:8, color:'#FCD34D', padding:'8px 16px', cursor:'pointer', fontSize:12, fontWeight:700, whiteSpace:'nowrap' }}>
              {L('Configure now →','Configurer →')}
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display:'flex', gap:14, marginBottom:28, flexWrap:'wrap' }}>
        {statCard(L('Total Revenue','Revenus totaux'), fmt(dash?.revenue||0), L('Settled sales','Ventes réglées'), '#00FF94', '💰')}
        {statCard(L('Pending','En attente'), fmt(dash?.pending||0), L('Awaiting payment','En attente paiement'), '#FCD34D', '⏳')}
        {statCard(L('Active Listings','Listings actifs'), String(dash?.listings?.length||0), 'tCO₂e', '#38BDF8', '📋')}
        {statCard(L('Orders','Ordres'), String(dash?.ordersCount||0), L('Total','Total'), '#A78BFA', '📦')}
        {statCard(L('Settled','Réglés'), String(dash?.settledCount||0), L('Completed','Complétés'), '#00FF94', '✅')}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:24, borderBottom:'1px solid #1E2D3D', paddingBottom:0 }}>
        {([['overview',L('Overview','Vue d\'ensemble'),'📊'],['listings',L('My Listings','Mes Listings'),'📋'],['gateway',L('Payment Gateway','Gateway Paiement'),'💳'],['payouts',L('Payouts','Paiements'),'💸'],['forward',L('Forward Contracts','Contrats à terme'),'📅']] as [string,string,string][]).map(([id,label,icon]) => (
          <button key={id} onClick={() => setTab(id as any)}
            style={{ padding:'10px 18px', border:'none', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'JetBrains Mono, monospace', borderBottom:`2px solid ${tab===id?'#00FF94':'transparent'}`, background:'transparent', color:tab===id?'#00FF94':'#4A6278', borderRadius:'4px 4px 0 0', transition:'all .15s' }}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === 'overview' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          {/* Recent orders */}
          <div style={{ background:'#0D1117', border:'1px solid #1E2D3D', borderRadius:14, padding:20 }}>
            <div style={{ fontSize:9, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.1em', marginBottom:14 }}>RECENT ORDERS</div>
            {(!dash?.recentOrders?.length) ? (
              <div style={{ fontSize:12, color:'#4A6278', textAlign:'center', padding:24 }}>
                {L('No orders yet. List your credits on the marketplace to start selling.','Aucun ordre. Listez vos crédits sur la marketplace pour commencer.')}
              </div>
            ) : dash.recentOrders.map((o: any) => (
              <div key={o.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid #1E2D3D' }}>
                <div>
                  <div style={{ fontSize:12, color:'#E8EFF6', fontWeight:600 }}>{o.quantity?.toFixed(1)} tCO₂e</div>
                  <div style={{ fontSize:10, color:'#4A6278', fontFamily:'JetBrains Mono, monospace' }}>{new Date(o.createdAt).toLocaleDateString()}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:13, color:'#00FF94', fontWeight:700, fontFamily:'JetBrains Mono, monospace' }}>{fmt(o.sellerAmount||0)}</div>
                  <div style={{ fontSize:9, padding:'2px 8px', borderRadius:4, background:(STATUS_COLOR[o.status as keyof typeof STATUS_COLOR]||'#4A6278')+'20', color:STATUS_COLOR[o.status as keyof typeof STATUS_COLOR]||'#4A6278', fontFamily:'JetBrains Mono, monospace' }}>{o.status}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Gateway status */}
          <div style={{ background:'#0D1117', border:'1px solid #1E2D3D', borderRadius:14, padding:20 }}>
            <div style={{ fontSize:9, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.1em', marginBottom:14 }}>PAYOUT GATEWAY</div>
            {dash?.profile ? (() => {
              const gwInfo = GATEWAYS.find(g => g.id === dash.profile.preferredGateway) || GATEWAYS[5];
              return (
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:14, padding:16, background:'rgba(0,255,148,0.05)', border:'1px solid rgba(0,255,148,0.15)', borderRadius:10, marginBottom:16 }}>
                    <div style={{ fontSize:28 }}>{gwInfo.icon}</div>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color:'#E8EFF6' }}>{gwInfo.label}</div>
                      <div style={{ fontSize:11, color:'#4A6278', fontFamily:'JetBrains Mono, monospace' }}>{gwInfo.regions}</div>
                      <div style={{ fontSize:10, color:dash.profile.verificationStatus==='VERIFIED'?'#00FF94':'#FCD34D', marginTop:4 }}>
                        {dash.profile.verificationStatus === 'VERIFIED' ? '✓ VERIFIED' : '⏳ PENDING VERIFICATION'}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize:12, color:'#4A6278', lineHeight:1.8 }}>
                    {dash.profile.preferredGateway === 'WIRE' && dash.profile.bankName && (
                      <div>🏦 {dash.profile.bankName} · {dash.profile.bankCurrency}</div>
                    )}
                    {dash.profile.mtnMomoNumber && <div>📱 MTN MoMo: {dash.profile.mtnMomoNumber}</div>}
                    {dash.profile.orangeMoneyNumber && <div>🟠 Orange Money: {dash.profile.orangeMoneyNumber}</div>}
                  </div>
                  <button onClick={() => setTab('gateway')} style={{ marginTop:14, width:'100%', background:'transparent', border:'1px solid #1E2D3D', borderRadius:8, color:'#4A6278', padding:10, cursor:'pointer', fontSize:12 }}>
                    {L('Edit gateway →','Modifier gateway →')}
                  </button>
                </div>
              );
            })() : (
              <div style={{ textAlign:'center', padding:24 }}>
                <div style={{ fontSize:32, marginBottom:12 }}>🏦</div>
                <div style={{ fontSize:13, color:'#8FA3B8', marginBottom:16 }}>{L('No gateway configured','Aucune gateway configurée')}</div>
                <button onClick={() => setTab('gateway')} style={{ background:'rgba(0,255,148,0.1)', border:'1px solid rgba(0,255,148,0.3)', borderRadius:8, color:'#00FF94', padding:'10px 20px', cursor:'pointer', fontSize:13, fontWeight:700 }}>
                  {L('Set up now','Configurer maintenant')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LISTINGS */}
      {tab === 'listings' && (
        <div>
          <div style={{ fontSize:9, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:16 }}>
            {dash?.listings?.length||0} CREDIT LISTINGS
          </div>
          {(!dash?.listings?.length) ? (
            <div style={{ background:'#0D1117', border:'1px solid #1E2D3D', borderRadius:14, padding:40, textAlign:'center' }}>
              <div style={{ fontSize:40, marginBottom:16 }}>🌿</div>
              <div style={{ fontSize:16, color:'#E8EFF6', fontWeight:700, marginBottom:8 }}>{L('No credits listed yet','Aucun crédit listé')}</div>
              <div style={{ fontSize:13, color:'#4A6278' }}>{L('Complete the 11-step pipeline to issue and list your credits.','Complétez le pipeline 11 étapes pour émettre et lister vos crédits.')}</div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {dash.listings.map((l: any) => {
                const grade = l.carbonScore?.grade || 'UNRATED';
                return (
                  <div key={l.id} style={{ background:'#0D1117', border:'1px solid #1E2D3D', borderRadius:14, padding:20, display:'flex', alignItems:'center', gap:20 }}>
                    <div style={{ width:56, height:56, borderRadius:12, background:GRADE_BG[grade as keyof typeof GRADE_BG], border:`1px solid ${GRADE_COLORS[grade as keyof typeof GRADE_COLORS]}30`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <div style={{ fontSize:16, fontWeight:800, color:GRADE_COLORS[grade as keyof typeof GRADE_COLORS], fontFamily:'JetBrains Mono, monospace' }}>{grade}</div>
                      <div style={{ fontSize:8, color:'#4A6278' }}>SCORE</div>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:700, color:'#E8EFF6' }}>{l.project?.name || 'Project'}</div>
                      <div style={{ fontSize:11, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginTop:2 }}>
                        {l.project?.countryCode} · {l.vintage} · {l.standard} · {l.quantity?.toFixed(1)} tCO₂e
                      </div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:18, fontWeight:800, color:'#00FF94', fontFamily:'JetBrains Mono, monospace' }}>
                        ${(l.askPrice || 12).toFixed(2)}/t
                      </div>
                      {l.carbonScore?.premiumPct > 0 && (
                        <div style={{ fontSize:10, color:'#00FF94', fontFamily:'JetBrains Mono, monospace' }}>
                          +{l.carbonScore.premiumPct}% PANGEA PREMIUM
                        </div>
                      )}
                    </div>
                    {l.carbonScore?.score && (
                      <div style={{ textAlign:'center', padding:'8px 14px', background:'rgba(0,255,148,0.05)', borderRadius:8, border:'1px solid rgba(0,255,148,0.1)' }}>
                        <div style={{ fontSize:18, fontWeight:800, color:GRADE_COLORS[grade as keyof typeof GRADE_COLORS], fontFamily:'JetBrains Mono, monospace' }}>{l.carbonScore.score}</div>
                        <div style={{ fontSize:9, color:'#4A6278' }}>PANGEA SCORE</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* GATEWAY CONFIG */}
      {tab === 'gateway' && (
        <div style={{ maxWidth:700 }}>
          <div style={{ fontSize:9, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:20 }}>CONFIGURE YOUR PAYOUT GATEWAY</div>

          {/* Gateway selector */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:28 }}>
            {GATEWAYS.map(g => (
              <button key={g.id} onClick={() => setSelectedGw(g.id)}
                style={{ background:selectedGw===g.id?`${g.color}15`:'#0D1117', border:`1px solid ${selectedGw===g.id?g.color:'#1E2D3D'}`, borderRadius:12, padding:16, cursor:'pointer', textAlign:'left', transition:'all .2s' }}>
                <div style={{ fontSize:22, marginBottom:8 }}>{g.icon}</div>
                <div style={{ fontSize:12, fontWeight:700, color:selectedGw===g.id?g.color:'#E8EFF6' }}>{g.label}</div>
                <div style={{ fontSize:10, color:'#4A6278', marginTop:4, fontFamily:'JetBrains Mono, monospace' }}>{g.regions}</div>
              </button>
            ))}
          </div>

          {/* Fields per gateway */}
          <div style={{ background:'#0D1117', border:'1px solid #1E2D3D', borderRadius:14, padding:24 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#E8EFF6', marginBottom:20 }}>
              {GATEWAYS.find(g=>g.id===selectedGw)?.icon} {GATEWAYS.find(g=>g.id===selectedGw)?.label} {L('Configuration','Configuration')}
            </div>

            {(selectedGw === 'MTN_MOMO' || selectedGw === 'ORANGE_MONEY' || selectedGw === 'WAVE') && (
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div>
                  <div style={{ fontSize:10, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>NUMÉRO DE TÉLÉPHONE *</div>
                  <input style={inp} placeholder="+225 07 12 34 56" value={
                    selectedGw==='MTN_MOMO' ? (gw.mtnMomoNumber||'') :
                    selectedGw==='ORANGE_MONEY' ? (gw.orangeMoneyNumber||'') : (gw.waveNumber||'')
                  } onChange={e => setGw({...gw,
                    [selectedGw==='MTN_MOMO'?'mtnMomoNumber':selectedGw==='ORANGE_MONEY'?'orangeMoneyNumber':'waveNumber']: e.target.value
                  })}/>
                </div>
                <div>
                  <div style={{ fontSize:10, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>PAYS *</div>
                  <select style={inp} value={
                    selectedGw==='MTN_MOMO' ? (gw.mtnMomoCountry||'') :
                    selectedGw==='ORANGE_MONEY' ? (gw.orangeMoneyCountry||'') : (gw.waveCountry||'')
                  } onChange={e => setGw({...gw, [selectedGw==='MTN_MOMO'?'mtnMomoCountry':selectedGw==='ORANGE_MONEY'?'orangeMoneyCountry':'waveCountry']: e.target.value})}>
                    <option value="">Sélectionner</option>
                    {['CI','GH','SN','ML','BF','CM','UG','RW','NG'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            )}

            {(selectedGw === 'FLUTTERWAVE' || selectedGw === 'PAYSTACK') && (
              <div>
                <div style={{ fontSize:10, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>ACCOUNT ID / RECIPIENT CODE *</div>
                <input style={inp} placeholder="RCP_xxxxxxxx" value={selectedGw==='FLUTTERWAVE'?(gw.flutterwaveAcct||''):(gw.paystackAcct||'')}
                  onChange={e => setGw({...gw, [selectedGw==='FLUTTERWAVE'?'flutterwaveAcct':'paystackAcct']: e.target.value})}/>
                <div style={{ fontSize:11, color:'#4A6278', marginTop:8 }}>
                  {L('Find your recipient code in your Flutterwave/Paystack dashboard → Transfers → Recipients.',
                     'Trouvez votre code dans votre dashboard Flutterwave/Paystack → Virements → Bénéficiaires.')}
                </div>
              </div>
            )}

            {selectedGw === 'WIRE' && (
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {[
                  ['bankBeneficiary','BENEFICIARY NAME *','Optimium Nexus LLC'],
                  ['bankName','BANK NAME *','Ecobank, Stanbic, CIB...'],
                  ['bankIBAN','IBAN / ACCOUNT NUMBER *','GB29 NWBK 6016 1331 9268 19'],
                  ['bankSwift','SWIFT / BIC CODE *','ECOCCIAB'],
                ].map(([field,label,ph]) => (
                  <div key={field}>
                    <div style={{ fontSize:10, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>{label}</div>
                    <input style={inp} placeholder={ph as string} value={gw[field]||''} onChange={e => setGw({...gw, [field]: e.target.value})}/>
                  </div>
                ))}
                <div>
                  <div style={{ fontSize:10, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>CURRENCY</div>
                  <select style={inp} value={gw.bankCurrency||'USD'} onChange={e => setGw({...gw, bankCurrency: e.target.value})}>
                    {['USD','EUR','GBP','XOF','XAF','GHS','NGN','KES','ZAR'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div style={{ marginTop:20, padding:14, background:'rgba(0,255,148,0.05)', border:'1px solid rgba(0,255,148,0.1)', borderRadius:10, fontSize:12, color:'#4A6278', lineHeight:1.7 }}>
              🔒 {L('Your banking details are encrypted and used exclusively for carbon credit sales payouts. PANGEA CARBON never charges from this account.',
                     'Vos coordonnées bancaires sont chiffrées et utilisées exclusivement pour les virements de ventes de crédits carbone. PANGEA CARBON ne débite jamais ce compte.')}
            </div>

            <button onClick={saveGateway} disabled={savingGw}
              style={{ marginTop:16, width:'100%', background:savingGw?'#1E2D3D':'rgba(0,255,148,0.12)', border:'1px solid rgba(0,255,148,0.35)', borderRadius:10, color:savingGw?'#4A6278':'#00FF94', padding:14, cursor:savingGw?'wait':'pointer', fontSize:14, fontWeight:800, fontFamily:'Syne, sans-serif', transition:'all .2s' }}>
              {savingGw ? '⟳ ' + L('Saving...','Enregistrement...') : '💾 ' + L('Save Gateway','Enregistrer la gateway')}
            </button>
          </div>
        </div>
      )}

      {/* PAYOUTS */}
      {tab === 'payouts' && (
        <div>
          <div style={{ display:'flex', gap:14, marginBottom:20 }}>
            <div style={{ background:'#0D1117', border:'1px solid rgba(0,255,148,0.2)', borderRadius:12, padding:16, flex:1 }}>
              <div style={{ fontSize:10, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>TOTAL PAID</div>
              <div style={{ fontSize:22, fontWeight:800, color:'#00FF94', fontFamily:'JetBrains Mono, monospace' }}>{fmt(dash?.payouts?.filter((p:any)=>p.status==='PAID').reduce((s:number,p:any)=>s+p.amount,0)||0)}</div>
            </div>
            <div style={{ background:'#0D1117', border:'1px solid rgba(252,211,77,0.2)', borderRadius:12, padding:16, flex:1 }}>
              <div style={{ fontSize:10, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>PENDING PAYOUT</div>
              <div style={{ fontSize:22, fontWeight:800, color:'#FCD34D', fontFamily:'JetBrains Mono, monospace' }}>{fmt(dash?.payouts?.filter((p:any)=>p.status==='PENDING').reduce((s:number,p:any)=>s+p.amount,0)||0)}</div>
            </div>
          </div>
          {(!dash?.payouts?.length) ? (
            <div style={{ background:'#0D1117', border:'1px solid #1E2D3D', borderRadius:14, padding:40, textAlign:'center', color:'#4A6278', fontSize:13 }}>
              {L('No payouts yet','Aucun versement')}
            </div>
          ) : (
            <div style={{ background:'#0D1117', border:'1px solid #1E2D3D', borderRadius:14, overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'rgba(0,255,148,0.03)' }}>
                    {['DATE','AMOUNT','GATEWAY','STATUS','REF'].map(h => (
                      <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:9, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', borderBottom:'1px solid #1E2D3D' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dash.payouts.map((p: any) => (
                    <tr key={p.id} style={{ borderBottom:'1px solid #0D1117' }}>
                      <td style={{ padding:'12px 16px', fontSize:12, color:'#8FA3B8' }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding:'12px 16px', fontSize:13, color:'#00FF94', fontWeight:700, fontFamily:'JetBrains Mono, monospace' }}>{fmt(p.amount)}</td>
                      <td style={{ padding:'12px 16px', fontSize:11, color:'#E8EFF6' }}>{p.gateway}</td>
                      <td style={{ padding:'12px 16px' }}>
                        <span style={{ fontSize:9, padding:'3px 8px', borderRadius:4, background:(p.status==='PAID'?'rgba(0,255,148,0.15)':p.status==='PENDING'?'rgba(252,211,77,0.15)':'rgba(248,113,113,0.15)'), color:p.status==='PAID'?'#00FF94':p.status==='PENDING'?'#FCD34D':'#F87171', fontFamily:'JetBrains Mono, monospace' }}>{p.status}</span>
                      </td>
                      <td style={{ padding:'12px 16px', fontSize:10, color:'#4A6278', fontFamily:'JetBrains Mono, monospace' }}>{p.gatewayRef || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* FORWARD CONTRACTS */}
      {tab === 'forward' && (
        <div style={{ background:'#0D1117', border:'1px solid #1E2D3D', borderRadius:14, padding:32, textAlign:'center' }}>
          <div style={{ fontSize:40, marginBottom:16 }}>📅</div>
          <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:20, fontWeight:800, color:'#E8EFF6', margin:'0 0 12px' }}>
            {L('Forward Contracts','Contrats à terme')}
          </h2>
          <p style={{ fontSize:13, color:'#4A6278', maxWidth:480, margin:'0 auto 24px', lineHeight:1.7 }}>
            {L('Lock in prices for future credits. Buyers commit now, you deliver when credits are issued. Deposits of 20% secured upfront.',
               'Verrouillez les prix pour des crédits futurs. Les acheteurs s\'engagent maintenant, vous livrez à l\'émission. Acompte de 20% sécurisé.')}
          </p>
          <div style={{ display:'inline-flex', gap:8, padding:'6px 14px', background:'rgba(252,211,77,0.1)', border:'1px solid rgba(252,211,77,0.3)', borderRadius:20 }}>
            <span style={{ fontSize:12, color:'#FCD34D', fontFamily:'JetBrains Mono, monospace' }}>⚡ COMING SOON — Q3 2025</span>
          </div>
        </div>
      )}

    </div>
  );
}
