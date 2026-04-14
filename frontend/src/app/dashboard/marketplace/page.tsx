'use client';
import { useLang } from '@/lib/lang-context';
import { useEffect, useState, useCallback } from 'react';
import { fetchAuthJson } from '@/lib/fetch-auth';

const fmt    = (n, d = 0) => (n ?? 0).toLocaleString('en-US', { maximumFractionDigits: d });
const fmtUSD = (n, d = 2) => '$' + (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtK   = (n) => n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(0)}K` : String(Math.round(n ?? 0));

const STD_COLOR = {
  VERRA_VCS: '#00FF94', GOLD_STANDARD: '#FCD34D',
  ARTICLE6: '#38BDF8', CORSIA: '#F87171', BIOMASS: '#EF9F27',
};
const STD_LABEL = {
  VERRA_VCS: 'Verra VCS', GOLD_STANDARD: 'Gold Standard',
  ARTICLE6: 'Article 6 ITMO', CORSIA: 'CORSIA', BIOMASS: 'Biomass',
};
const FLAG = { CI:'🇨🇮',GH:'🇬🇭',NG:'🇳🇬',KE:'🇰🇪',SN:'🇸🇳',TZ:'🇹🇿',RW:'🇷🇼',ET:'🇪🇹',ZA:'🇿🇦',BF:'🇧🇫' };

const GATEWAYS = [
  { id: 'STRIPE_CHECKOUT',  label: 'Card (Stripe)',            icon: '💳', desc: 'Instant card payment' },
  { id: 'STRIPE_INVOICE',   label: 'Invoice / Wire Transfer',  icon: '📧', desc: 'Email invoice · 7 days' },
  { id: 'CINETPAY',         label: 'CinetPay — West Africa',   icon: '🌍', desc: 'MTN · Orange · Wave · XOF' },
  { id: 'FLUTTERWAVE',      label: 'Flutterwave — Pan-Africa', icon: '🦋', desc: 'Mobile Money · 30+ countries' },
];

export default function MarketplacePage() {
  const { lang } = useLang();
  const L = (en, fr) => lang === 'fr' ? fr : en;

  const [tab, setTab]               = useState('buy');
  const [prices, setPrices]         = useState([]);
  const [listings, setListings]     = useState([]);
  const [stats, setStats]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [filterStd, setFilterStd]   = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [selectedListing, setSelectedListing] = useState(null);
  const [orderForm, setOrderForm]   = useState({ qty: '', price: '', orderType: 'MARKET', note: '', gateway: 'STRIPE_CHECKOUT' });
  const [orderResult, setOrderResult] = useState(null);
  const [placing, setPlacing]       = useState(false);
  const [orders, setOrders]         = useState([]);
  const [pangeaFee, setPangeaFee]   = useState(3.5);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]     = useState(false);
  const [paymentBanner, setPaymentBanner] = useState(null); // bannière retour Stripe

  const loadAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchAuthJson('/marketplace/prices').catch(() => ({ prices: [] })),
      fetchAuthJson('/marketplace/listings').catch(() => ({ listings: [] })),
      fetchAuthJson('/marketplace/stats').catch(() => null),
      fetchAuthJson('/marketplace/fee-info').catch(() => null),
    ]).then(([p, l, s, fi]) => {
      setPrices(p.prices || []);
      setListings(l.listings || []);
      setStats(s);
      const fee = fi?.pangeaFeePct || s?.pangeaFeePct || l?.pangeaFee || p?.pangeaFee || 3.5;
      setPangeaFee(parseFloat(fee));
    }).finally(() => setLoading(false));
    try {
      const saved = JSON.parse(localStorage.getItem('pgc_orders') || '[]');
      setOrders(saved);
    } catch(_e) {}
  }, []);

  useEffect(() => {
    loadAll();
    const iv1 = setInterval(() => {
      fetchAuthJson('/marketplace/prices').then(p => { setPrices(p.prices || []); }).catch(() => {});
    }, 30000);

    // Détecter le retour depuis Stripe / CinetPay / Flutterwave
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const orderId = params.get('order');
      const status  = params.get('status');
      if (orderId && status === 'success') {
        setTab('portfolio');
        // Poller le statut de l'ordre
        let attempts = 0;
        const poll = setInterval(async () => {
          attempts++;
          try {
            const order = await fetchAuthJson('/marketplace/order/' + orderId);
            if (order.status === 'PAID' || order.status === 'SETTLED') {
              setPaymentBanner({ type: 'success', orderId, total: order.total, qty: order.quantity });
              clearInterval(poll);
              loadAll(); // Rafraîchir les listings avec nouvelles quantités
            }
          } catch(_e) {}
          if (attempts >= 10) clearInterval(poll);
        }, 2000);
        // Nettoyer l'URL
        window.history.replaceState({}, '', '/dashboard/marketplace');
      } else if (orderId && status === 'cancelled') {
        setPaymentBanner({ type: 'cancelled', orderId });
        window.history.replaceState({}, '', '/dashboard/marketplace');
      }
    }
    return () => clearInterval(iv1);
  }, [loadAll]);

  const filtered = listings.filter(l =>
    (!filterStd     || l.standard === filterStd) &&
    (!filterCountry || l.project?.countryCode === filterCountry)
  );

  const openBuy = (listing) => {
    setSelectedListing(listing);
    setOrderForm({ qty: '', price: String((listing.askPrice || 12).toFixed(2)), orderType: 'MARKET', note: '', gateway: 'STRIPE_CHECKOUT' });
    setOrderResult(null);
  };
  const closeBuy = () => { setSelectedListing(null); setOrderResult(null); };

  const qtyVal   = parseFloat(orderForm.qty) || 0;
  const priceVal = selectedListing ? (orderForm.orderType === 'MARKET' ? (selectedListing.askPrice || 12) : parseFloat(orderForm.price) || 0) : 0;
  const subtotal = qtyVal * priceVal;
  const fee      = subtotal * (pangeaFee / 100);
  const grand    = subtotal + fee;

  const placeOrder = async () => {
    if (!selectedListing || qtyVal <= 0) return;
    setPlacing(true);
    setOrderResult(null);
    try {
      const result = await fetchAuthJson('/marketplace/bid', {
        method: 'POST',
        body: JSON.stringify({
          listingId: selectedListing.id,
          quantity:  qtyVal,
          maxPrice:  priceVal,
          orderType: orderForm.orderType,
          buyerNote: orderForm.note,
          paymentGateway: orderForm.gateway,
        }),
      });
      setOrderResult(result);
      const saved = { ...result, listing: selectedListing, qtyVal, priceVal, createdAt: new Date().toISOString() };
      const updated = [saved, ...orders].slice(0, 50);
      setOrders(updated);
      localStorage.setItem('pgc_orders', JSON.stringify(updated));
      // Redirect vers la gateway de paiement
      if (result.paymentUrl && result.paymentMode !== 'manual' && result.paymentMode !== 'invoice') {
        setTimeout(() => { window.location.href = result.paymentUrl; }, 2200);
      } else if (result.paymentUrl && result.paymentMode === 'invoice') {
        window.open(result.paymentUrl, '_blank', 'noopener,noreferrer');
      }
    } catch(e) {
      setOrderResult({ error: e.message || 'Order failed' });
    } finally {
      setPlacing(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetchAuthJson('/marketplace/orders/' + (deleteTarget.orderId || deleteTarget.id), { method: 'DELETE' });
      const updated = orders.filter(o => (o.orderId || o.id) !== (deleteTarget.orderId || deleteTarget.id));
      setOrders(updated);
      localStorage.setItem('pgc_orders', JSON.stringify(updated));
    } catch(e) {
      alert('Cannot delete: ' + (e.message || 'Order may be already paid'));
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  // UI helpers
  const inp = { background: '#121920', border: '1px solid #1E2D3D', borderRadius: 8, color: '#E8EFF6', padding: '10px 13px', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' };
  const tabBtn = (t, label) => (
    <button onClick={() => setTab(t)} style={{ padding: '8px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: tab === t ? 700 : 400, background: tab === t ? '#00FF94' : 'transparent', color: tab === t ? '#080B0F' : '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>
      {label}
    </button>
  );

  return (
    <div style={{ padding: 20, maxWidth: 1400, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 9, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.12em' }}>CARBON MARKETPLACE</div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: '#E8EFF6', margin: '4px 0 2px' }}>PANGEA CARBON Exchange</h1>
        <p style={{ fontSize: 12, color: '#4A6278' }}>{L('African carbon credits · ACM0002 · ACMI · Real-time settlement','Crédits carbone africains · ACM0002 · ACMI · Règlement temps réel')}</p>
      </div>

      {/* Bannière retour paiement */}
      {paymentBanner && (
        <div style={{ borderRadius:10, padding:'14px 18px', marginBottom:14, display:'flex', justifyContent:'space-between', alignItems:'center',
          background: paymentBanner.type === 'success' ? 'rgba(0,255,148,0.08)' : 'rgba(248,113,113,0.08)',
          border: `1px solid ${paymentBanner.type === 'success' ? 'rgba(0,255,148,0.3)' : 'rgba(248,113,113,0.3)'}` }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:22 }}>{paymentBanner.type === 'success' ? '✅' : '❌'}</span>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color: paymentBanner.type === 'success' ? '#00FF94' : '#F87171' }}>
                {paymentBanner.type === 'success' ? L('Payment confirmed!','Paiement confirmé !') : L('Payment cancelled','Paiement annulé')}
              </div>
              {paymentBanner.type === 'success' && paymentBanner.total && (
                <div style={{ fontSize:11, color:'#4A6278' }}>
                  {L('Order','Ordre')} {paymentBanner.orderId?.slice(-8)} · {fmtUSD(paymentBanner.total)} · {L('Credits transferred','Crédits transférés')}
                </div>
              )}
              {paymentBanner.type === 'cancelled' && (
                <div style={{ fontSize:11, color:'#4A6278' }}>{L('Your order has been cancelled','Votre ordre a été annulé')}</div>
              )}
            </div>
          </div>
          <button onClick={() => setPaymentBanner(null)} style={{ background:'transparent', border:'none', color:'#4A6278', cursor:'pointer', fontSize:18 }}>✕</button>
        </div>
      )}

      {/* Ticker */}
      <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 10, padding: '10px 16px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00FF94', animation: 'pgc-pulse 2s infinite' }}/>
          <span style={{ fontSize: 9, color: '#00FF94', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em' }}>LIVE MARKET</span>
          <span style={{ fontSize: 9, color: '#2A3F55', fontFamily: 'JetBrains Mono, monospace', marginLeft: 'auto' }}>PANGEA FEE: {pangeaFee.toFixed(1)}% · Xpansiv CBL ref.</span>
        </div>
        <div style={{ display: 'flex', gap: 24, overflowX: 'auto', paddingBottom: 2 }}>
          {prices.map(p => (
            <div key={p.standard} style={{ minWidth: 130, flexShrink: 0 }}>
              <div style={{ fontSize: 10, color: STD_COLOR[p.standard] || '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 2 }}>{STD_LABEL[p.standard]}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#E8EFF6', fontFamily: 'Syne, sans-serif' }}>{fmtUSD(p.last)}</div>
              <div style={{ fontSize: 10, color: p.changeP >= 0 ? '#00FF94' : '#F87171' }}>{p.changeP >= 0 ? '+' : ''}{p.changeP}% · Vol {fmtK(p.volume24h)}</div>
              <div style={{ fontSize: 9, color: '#2A3F55', fontFamily: 'JetBrains Mono, monospace' }}>B:{fmtUSD(p.bid)} A:{fmtUSD(p.ask)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
        {[
          { label: L('Available Credits','Crédits disponibles'), v: fmtK((stats as any)?.totalAvailable||0)+' tCO2e', c:'#00FF94' },
          { label: L('Retired Credits','Crédits retirés'),       v: fmtK((stats as any)?.totalRetired||0)+' tCO2e',  c:'#38BDF8' },
          { label: L('Active Listings','Annonces actives'),      v: String((stats as any)?.activeListings||0),        c:'#FCD34D' },
          { label: L('Africa Market','Marché Afrique'),          v: '$400M+',                                         c:'#A78BFA' },
        ].map(s => (
          <div key={s.label} style={{ background: '#0D1117', border: `1px solid ${s.c}20`, borderRadius: 9, padding: '11px 14px' }}>
            <div style={{ fontSize: 9, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>{s.label.toUpperCase()}</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: s.c, fontFamily: 'Syne, sans-serif' }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 9, padding: 4, marginBottom: 14, width: 'fit-content' }}>
        {tabBtn('buy', L('Buy Credits','Acheter'))}
        {tabBtn('sell', L('Sell Credits','Vendre'))}
        {tabBtn('portfolio', `${L('My Orders','Mes ordres')} (${orders.length})`)}
      </div>

      {/* BUY TAB */}
      {tab === 'buy' && (<>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <select value={filterStd} onChange={e => setFilterStd(e.target.value)} style={{ ...inp, width: 180 }}>
            <option value="">{L('All standards','Tous les standards')}</option>
            {Object.entries(STD_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)} style={{ ...inp, width: 160 }}>
            <option value="">{L('All countries','Tous les pays')}</option>
            {['CI','GH','NG','KE','SN','TZ','RW','ET','ZA','BF'].map(c => <option key={c} value={c}>{FLAG[c]} {c}</option>)}
          </select>
          {(filterStd || filterCountry) && (
            <button onClick={() => { setFilterStd(''); setFilterCountry(''); }} style={{ background:'transparent', border:'1px solid #F87171', borderRadius:7, color:'#F87171', padding:'8px 14px', cursor:'pointer', fontSize:12 }}>
              ✕ {L('Clear','Effacer')}
            </button>
          )}
        </div>
        {loading ? (
          <div style={{ textAlign:'center', padding:60, color:'#4A6278' }}>
            <div style={{ fontSize:28, marginBottom:10 }}>⟳</div>
            <div>{L('Loading listings...','Chargement des annonces...')}</div>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))', gap:12 }}>
            {filtered.map(listing => (
              <div key={listing.id} style={{ background:'#0D1117', border:`1px solid ${STD_COLOR[listing.standard]||'#1E2D3D'}25`, borderRadius:13, padding:18, transition:'border-color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor=(STD_COLOR[listing.standard]||'#1E2D3D')+'60')}
                onMouseLeave={e => (e.currentTarget.style.borderColor=(STD_COLOR[listing.standard]||'#1E2D3D')+'25')}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                  <span style={{ fontSize:9, background:(STD_COLOR[listing.standard]||'#4A6278')+'20', color:STD_COLOR[listing.standard]||'#4A6278', border:`1px solid ${STD_COLOR[listing.standard]||'#4A6278'}40`, borderRadius:4, padding:'2px 8px', fontFamily:'JetBrains Mono, monospace' }}>
                    {STD_LABEL[listing.standard]}
                  </span>
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    {listing.verified && <span style={{ fontSize:9, color:'#00FF94', fontFamily:'JetBrains Mono, monospace' }}>✓ VVB</span>}
                    {listing.carbonScore && (
                      <span style={{ fontSize:9, background:listing.carbonScore.grade==='AAA'?'rgba(0,255,148,0.15)':listing.carbonScore.grade==='AA'||listing.carbonScore.grade==='A'?'rgba(52,211,153,0.15)':'rgba(252,211,77,0.15)', color:listing.carbonScore.grade==='AAA'||listing.carbonScore.grade==='AA'||listing.carbonScore.grade==='A'?'#00FF94':'#FCD34D', border:'1px solid', borderColor:listing.carbonScore.grade==='AAA'||listing.carbonScore.grade==='AA'||listing.carbonScore.grade==='A'?'rgba(0,255,148,0.3)':'rgba(252,211,77,0.3)', borderRadius:4, padding:'2px 7px', fontFamily:'JetBrains Mono, monospace', fontWeight:800 }}>
                        {listing.carbonScore.grade} {listing.carbonScore.score?.toFixed(0)}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ fontSize:14, fontWeight:700, color:'#E8EFF6', marginBottom:4 }}>{listing.project?.name}</div>
                <div style={{ fontSize:11, color:'#4A6278', marginBottom:12 }}>
                  {FLAG[listing.project?.countryCode]} {listing.project?.countryCode} · {listing.project?.type} · {listing.project?.installedMW}MW · Vintage {listing.vintage}
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
                  <div>
                    <div style={{ fontSize:22, fontWeight:800, color:STD_COLOR[listing.standard]||'#E8EFF6', fontFamily:'Syne, sans-serif' }}>{fmtUSD(listing.askPrice)}</div>
                    <div style={{ fontSize:10, color:'#4A6278' }}>per tCO₂e</div>
                    {listing.carbonScore?.premiumPct > 0 && (
                      <div style={{ fontSize:9, color:'#00FF94', fontFamily:'JetBrains Mono, monospace' }}>+{listing.carbonScore.premiumPct}% PANGEA PREMIUM</div>
                    )}
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:14, fontWeight:600, color:'#E8EFF6' }}>{fmtK(listing.availableQty||listing.quantity)}</div>
                    <div style={{ fontSize:10, color:'#4A6278' }}>tCO₂e available</div>
                  </div>
                </div>
                <button onClick={() => openBuy(listing)}
                  style={{ width:'100%', background:STD_COLOR[listing.standard]||'#00FF94', color:'#080B0F', border:'none', borderRadius:8, padding:'10px', fontWeight:800, fontSize:13, cursor:'pointer', fontFamily:'Syne, sans-serif' }}>
                  {L('Place Buy Order →','Passer un ordre →')}
                </button>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ gridColumn:'1/-1', textAlign:'center', padding:60, color:'#4A6278' }}>
                {L('No listings match your filters','Aucune annonce ne correspond aux filtres')}
              </div>
            )}
          </div>
        )}
      </>)}

      {/* SELL TAB */}
      {tab === 'sell' && (
        <div style={{ background:'#0D1117', border:'1px solid #1E2D3D', borderRadius:12, padding:24 }}>
          <div style={{ fontSize:14, color:'#E8EFF6', fontWeight:600, marginBottom:8 }}>{L('List your certified credits','Listez vos crédits certifiés')}</div>
          <p style={{ fontSize:13, color:'#4A6278', lineHeight:1.7, marginBottom:20 }}>
            {L(`Your certified PANGEA CARBON credits on the exchange. ${pangeaFee.toFixed(1)}% platform fee on settlement.`,
               `Vos crédits certifiés sur la bourse. Frais de plateforme ${pangeaFee.toFixed(1)}% au règlement.`)}
          </p>
          {[L('Credits must be PANGEA VERIFIED or CERTIFIED','Crédits PANGEA VERIFIED ou CERTIFIED requis'),
            L('KYC/AML verification required (one-time)','Vérification KYC/AML requise (une seule fois)'),
            L('Settlement in USD via wire transfer within 48h','Règlement USD par virement sous 48h'),
            `PANGEA CARBON fee: ${pangeaFee.toFixed(1)}% on gross sale`
          ].map(r => (
            <div key={r} style={{ display:'flex', gap:8, marginBottom:8, fontSize:13, color:'#8FA3B8' }}>
              <span style={{ color:'#00FF94', flexShrink:0 }}>✓</span><span>{r}</span>
            </div>
          ))}
          <button style={{ marginTop:20, background:'#00FF94', color:'#080B0F', border:'none', borderRadius:9, padding:'12px 28px', fontWeight:800, cursor:'pointer', fontFamily:'Syne, sans-serif' }}>
            {L('List My Credits →','Lister mes crédits →')}
          </button>
        </div>
      )}

      {/* MY ORDERS TAB */}
      {tab === 'portfolio' && (
        <div style={{ background:'#0D1117', border:'1px solid #1E2D3D', borderRadius:12, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', background:'#121920', borderBottom:'1px solid #1E2D3D', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:10, color:'#4A6278', fontFamily:'JetBrains Mono, monospace' }}>{L('MY ORDERS','MES ORDRES')} — {orders.length}</span>
            <button onClick={loadAll} style={{ background:'transparent', border:'none', color:'#4A6278', cursor:'pointer', fontSize:12 }}>↺ {L('Refresh','Actualiser')}</button>
          </div>
          {orders.length === 0 ? (
            <div style={{ padding:40, textAlign:'center', color:'#4A6278', fontSize:13 }}>
              {L('No orders yet — place your first buy order above','Aucun ordre — passez votre premier ordre ci-dessus')}
            </div>
          ) : orders.map((order, i) => {
            const sc = { PAID:'#00FF94', PAYMENT_PENDING:'#FCD34D', PENDING:'#8FA3B8', CANCELLED:'#F87171' };
            const gi = { STRIPE_CARD:'💳', STRIPE_INVOICE:'📧', CINETPAY:'🌍', FLUTTERWAVE:'🦋', manual:'📞' };
            const isPaid = ['PAID','SETTLED','RETIRED'].includes(order.status);
            return (
              <div key={i} style={{ padding:'14px 18px', borderBottom:'1px solid rgba(30,45,61,0.4)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
                <div>
                  <div style={{ display:'flex', gap:6, marginBottom:4, alignItems:'center' }}>
                    <span style={{ fontSize:9, color:sc[order.status]||'#8FA3B8', background:(sc[order.status]||'#8FA3B8')+'15', border:`1px solid ${sc[order.status]||'#8FA3B8'}30`, borderRadius:4, padding:'2px 7px', fontFamily:'JetBrains Mono, monospace' }}>
                      {order.status}
                    </span>
                    <span style={{ fontSize:10, color:'#4A6278' }}>{gi[order.paymentMethod]||gi[order.paymentGateway]||'📋'} {order.paymentGateway||order.paymentMethod||'MARKET'}</span>
                  </div>
                  <div style={{ fontSize:11, color:'#8FA3B8', fontFamily:'JetBrains Mono, monospace' }}>{order.orderId||order.id}</div>
                  <div style={{ fontSize:11, color:'#4A6278', marginTop:2 }}>
                    {fmtK(order.quantity||order.qtyVal)} tCO₂e @ {fmtUSD(order.pricePerTonne||order.priceVal)} · Fee: {fmtUSD(order.pangeaFee||order.pangea_fee||0)}
                  </div>
                </div>
                <div style={{ textAlign:'right', display:'flex', flexDirection:'column', gap:6, alignItems:'flex-end' }}>
                  <div style={{ fontSize:15, fontWeight:700, color:'#E8EFF6', fontFamily:'JetBrains Mono, monospace' }}>{fmtUSD(order.total)}</div>
                  <div style={{ fontSize:10, color:'#4A6278' }}>{new Date(order.createdAt).toLocaleDateString()}</div>
                  <div style={{ display:'flex', gap:6 }}>
                    {order.paymentUrl && !isPaid && (
                      <a href={order.paymentUrl} target="_blank" rel="noreferrer"
                        style={{ fontSize:11, color:'#00FF94', textDecoration:'none', padding:'4px 10px', border:'1px solid rgba(0,255,148,0.3)', borderRadius:5 }}>
                        💳 {L('Pay','Payer')} →
                      </a>
                    )}
                    {!isPaid && (
                      <button onClick={() => setDeleteTarget(order)}
                        style={{ fontSize:11, color:'#F87171', background:'transparent', border:'1px solid rgba(248,113,113,0.25)', borderRadius:5, padding:'4px 10px', cursor:'pointer' }}>
                        🗑
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ORDER MODAL ────────────────────────────────────────────────────── */}
      {selectedListing && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.88)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}
          onClick={e => { if (e.target === e.currentTarget) closeBuy(); }}>
          <div style={{ background:'#0D1117', border:`1px solid ${STD_COLOR[selectedListing.standard]}40`, borderRadius:18, padding:28, maxWidth:520, width:'100%', maxHeight:'90vh', overflowY:'auto' }}>

            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
              <div>
                <div style={{ fontSize:9, color:STD_COLOR[selectedListing.standard], fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.1em', marginBottom:4 }}>
                  {L('PLACE BUY ORDER','PASSER UN ORDRE')} · {STD_LABEL[selectedListing.standard]}
                </div>
                <div style={{ fontSize:16, fontWeight:700, color:'#E8EFF6' }}>{selectedListing.project?.name}</div>
                <div style={{ fontSize:11, color:'#4A6278' }}>
                  {FLAG[selectedListing.project?.countryCode]} {selectedListing.project?.countryCode} · {selectedListing.project?.type} · {selectedListing.project?.installedMW}MW · Vintage {selectedListing.vintage}
                </div>
              </div>
              <button onClick={closeBuy} style={{ background:'transparent', border:'none', color:'#4A6278', cursor:'pointer', fontSize:20, lineHeight:1 }}>✕</button>
            </div>

            {!orderResult ? (<>
              {/* Price */}
              <div style={{ background:'#121920', borderRadius:10, padding:14, marginBottom:18, display:'flex', justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontSize:9, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:2 }}>ASK PRICE</div>
                  <div style={{ fontSize:24, fontWeight:800, color:STD_COLOR[selectedListing.standard], fontFamily:'Syne, sans-serif' }}>{fmtUSD(selectedListing.askPrice)}</div>
                  <div style={{ fontSize:10, color:'#4A6278' }}>per tCO₂e</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:9, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:2 }}>AVAILABLE</div>
                  <div style={{ fontSize:18, fontWeight:700, color:'#E8EFF6' }}>{fmtK(selectedListing.availableQty||selectedListing.quantity)}</div>
                  <div style={{ fontSize:10, color:'#4A6278' }}>tCO₂e</div>
                </div>
              </div>

              {/* Order type */}
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:9, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:7 }}>{L('ORDER TYPE','TYPE D\'ORDRE')}</div>
                <div style={{ display:'flex', gap:6 }}>
                  {['MARKET','LIMIT'].map(t => (
                    <button key={t} onClick={() => setOrderForm(f => ({ ...f, orderType: t }))}
                      style={{ flex:1, padding:'9px', borderRadius:7, border:`1px solid ${orderForm.orderType===t?'#00FF94':'#1E2D3D'}`, background:orderForm.orderType===t?'rgba(0,255,148,0.08)':'transparent', color:orderForm.orderType===t?'#00FF94':'#4A6278', cursor:'pointer', fontSize:12, fontFamily:'JetBrains Mono, monospace' }}>
                      {t==='MARKET' ? L('Market','Marché') : L('Limit','Limite')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:9, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:7 }}>{L('QUANTITY (tCO₂e) *','QUANTITÉ (tCO₂e) *')}</div>
                <input type="number" min="1" placeholder={L('e.g. 100','ex. 100')}
                  value={orderForm.qty} onChange={e => setOrderForm(f => ({ ...f, qty: e.target.value }))}
                  style={inp} autoFocus/>
              </div>

              {orderForm.orderType === 'LIMIT' && (
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:9, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:7 }}>{L('LIMIT PRICE ($/tCO₂e)','PRIX LIMITE')}</div>
                  <input type="number" step="0.01" value={orderForm.price} onChange={e => setOrderForm(f => ({ ...f, price: e.target.value }))} style={inp}/>
                </div>
              )}

              {/* Gateway */}
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:9, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:8 }}>{L('PAYMENT METHOD','MODE DE PAIEMENT')}</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
                  {GATEWAYS.map(gw => (
                    <button key={gw.id} onClick={() => setOrderForm(f => ({ ...f, gateway: gw.id }))}
                      style={{ padding:'10px 12px', borderRadius:8, border:`1px solid ${orderForm.gateway===gw.id?'#00FF94':'#1E2D3D'}`, background:orderForm.gateway===gw.id?'rgba(0,255,148,0.08)':'transparent', cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}>
                      <div style={{ fontSize:15, marginBottom:3 }}>{gw.icon}</div>
                      <div style={{ fontSize:11, fontWeight:600, color:orderForm.gateway===gw.id?'#00FF94':'#E8EFF6' }}>{gw.label}</div>
                      <div style={{ fontSize:10, color:'#4A6278' }}>{gw.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div style={{ marginBottom:18 }}>
                <div style={{ fontSize:9, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:7 }}>NOTE (optional)</div>
                <input placeholder={L('e.g. Scope 3 offset, retirement reason','ex. Compensation Scope 3')} value={orderForm.note} onChange={e => setOrderForm(f => ({ ...f, note: e.target.value }))} style={inp}/>
              </div>

              {/* Summary */}
              {qtyVal > 0 && (
                <div style={{ background:'#121920', borderRadius:10, padding:14, marginBottom:16 }}>
                  {[
                    { k: L('Quantity','Quantité'),         v: `${qtyVal.toLocaleString()} tCO₂e` },
                    { k: L('Price/tonne','Prix/tonne'),    v: fmtUSD(priceVal) },
                    { k: L('Subtotal','Sous-total'),       v: fmtUSD(subtotal) },
                    { k: `PANGEA Fee (${pangeaFee.toFixed(1)}%)`, v: fmtUSD(fee), sub: '→ PANGEA Stripe' },
                    { k: 'TOTAL',                          v: fmtUSD(grand), bold: true },
                  ].map(r => (
                    <div key={r.k} style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:13 }}>
                      <span style={{ color:'#4A6278' }}>
                        {r.k}
                        {(r as any).sub && <span style={{ fontSize:10, color:'#2A3F55', marginLeft:6 }}>{(r as any).sub}</span>}
                      </span>
                      <span style={{ color:(r as any).bold?'#00FF94':'#E8EFF6', fontFamily:'JetBrains Mono, monospace', fontWeight:(r as any).bold?800:400 }}>{r.v}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display:'flex', gap:10 }}>
                <button onClick={closeBuy} style={{ flex:1, background:'transparent', border:'1px solid #1E2D3D', borderRadius:9, color:'#4A6278', padding:13, cursor:'pointer', fontSize:13 }}>
                  {L('Cancel','Annuler')}
                </button>
                <button onClick={placeOrder} disabled={placing||qtyVal<=0}
                  style={{ flex:2, background:placing||qtyVal<=0?'#1E2D3D':'#00FF94', color:'#080B0F', border:'none', borderRadius:9, padding:13, fontWeight:800, fontSize:14, cursor:placing||qtyVal<=0?'not-allowed':'pointer', fontFamily:'Syne, sans-serif', opacity:qtyVal<=0?0.5:1 }}>
                  {placing ? `⟳ ${L('Processing...','Traitement...')}` : qtyVal>0 ? `${L('Confirm Order','Confirmer')} · ${fmtUSD(grand)}` : L('Enter quantity →','Entrez une quantité →')}
                </button>
              </div>
            </>) : orderResult.error ? (
              <div style={{ textAlign:'center', padding:'16px 0' }}>
                <div style={{ fontSize:36, marginBottom:10 }}>❌</div>
                <div style={{ fontSize:15, color:'#F87171', fontWeight:700, marginBottom:8 }}>Order Failed</div>
                <div style={{ fontSize:13, color:'#8FA3B8', marginBottom:16, padding:'10px 14px', background:'rgba(248,113,113,0.08)', borderRadius:8, border:'1px solid rgba(248,113,113,0.2)', textAlign:'left', wordBreak:'break-word' }}>
                  {orderResult.error}
                  {orderResult.paymentError && (
                    <div style={{ marginTop:8, fontSize:11, color:'#F87171', opacity:0.7 }}>Gateway: {orderResult.paymentError}</div>
                  )}
                </div>
                {orderResult.error?.includes('STRIPE') && (
                  <div style={{ fontSize:12, color:'#FCD34D', marginBottom:16, padding:'8px 12px', background:'rgba(252,211,77,0.08)', borderRadius:7, border:'1px solid rgba(252,211,77,0.2)', textAlign:'left' }}>
                    💡 {L('Configure your Stripe key in Admin → Secrets → Stripe Payments','Configurez votre clé Stripe dans Admin → Secrets → Stripe Payments')}
                  </div>
                )}
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => setOrderResult(null)} style={{ flex:1, background:'transparent', border:'1px solid #1E2D3D', borderRadius:8, color:'#4A6278', padding:'10px', cursor:'pointer', fontSize:13 }}>
                    ← {L('Try Again','Réessayer')}
                  </button>
                  <button onClick={closeBuy} style={{ flex:1, background:'transparent', border:'1px solid #1E2D3D', borderRadius:8, color:'#4A6278', padding:'10px', cursor:'pointer', fontSize:13 }}>
                    {L('Close','Fermer')}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign:'center' }}>
                <div style={{ width:64, height:64, borderRadius:'50%', background:'rgba(0,255,148,0.12)', border:'2px solid rgba(0,255,148,0.3)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', fontSize:26 }}>✓</div>
                <div style={{ fontSize:9, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:4 }}>{orderResult.orderId}</div>
                <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:18, color:'#00FF94', marginBottom:10 }}>
                  {['checkout','cinetpay','flutterwave'].includes(orderResult.paymentMode)
                    ? L('Redirecting to payment...','Redirection vers paiement...')
                    : L('Order Confirmed!','Ordre confirmé !')}
                </h2>

                {['checkout','cinetpay','flutterwave'].includes(orderResult.paymentMode) && orderResult.paymentUrl && (
                  <div style={{ background:'rgba(0,255,148,0.06)', border:'1px solid rgba(0,255,148,0.2)', borderRadius:10, padding:'12px 16px', marginBottom:14, fontSize:13 }}>
                    <div style={{ color:'#8FA3B8', marginBottom:8 }}>{L('You will be redirected in 2 seconds...','Redirection dans 2 secondes...')}</div>
                    <a href={orderResult.paymentUrl}
                      style={{ display:'inline-block', background:'#00FF94', color:'#080B0F', borderRadius:8, padding:'10px 20px', fontWeight:800, fontSize:13, textDecoration:'none', fontFamily:'Syne, sans-serif' }}>
                      {orderResult.paymentIcon} {L('Pay now →','Payer maintenant →')}
                    </a>
                  </div>
                )}

                {/* Split breakdown */}
                {orderResult.splitBreakdown && (
                  <div style={{ background:'#121920', borderRadius:10, padding:14, marginBottom:14, textAlign:'left' }}>
                    <div style={{ fontSize:9, color:'#4A6278', fontFamily:'JetBrains Mono, monospace', marginBottom:10 }}>PAYMENT SPLIT</div>
                    {[
                      { k: L('You pay','Vous payez'),         v: fmtUSD(orderResult.splitBreakdown.buyerPays), color:'#E8EFF6' },
                      { k: `PANGEA Fee (${pangeaFee.toFixed(1)}%)`, v: fmtUSD(orderResult.splitBreakdown.pangeaFee.amount), sub:'→ PANGEA Stripe', color:'#A78BFA' },
                      { k: L('Seller receives','Vendeur reçoit'), v: fmtUSD(orderResult.splitBreakdown.sellerGets.amount), sub:'→ Africa gateway', color:'#00FF94' },
                    ].map(r => (
                      <div key={r.k} style={{ display:'flex', justifyContent:'space-between', marginBottom:8, fontSize:13, alignItems:'center' }}>
                        <div>
                          <span style={{ color:'#8FA3B8' }}>{r.k}</span>
                          {(r as any).sub && <div style={{ fontSize:10, color:'#2A3F55' }}>{(r as any).sub}</div>}
                        </div>
                        <span style={{ color:r.color, fontFamily:'JetBrains Mono, monospace', fontWeight:700 }}>{r.v}</span>
                      </div>
                    ))}
                  </div>
                )}

                <p style={{ fontSize:12, color:'#8FA3B8', marginBottom:14, lineHeight:1.7 }}>{orderResult.message}</p>
                {orderResult.nextSteps && (
                  <div style={{ textAlign:'left', marginBottom:16 }}>
                    {orderResult.nextSteps.map((step, i) => (
                      <div key={i} style={{ display:'flex', gap:8, marginBottom:5, fontSize:12, color:'#8FA3B8' }}>
                        <span style={{ color:'#00FF94', flexShrink:0, fontFamily:'JetBrains Mono, monospace' }}>{i+1}.</span><span>{step}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {orderResult.paymentUrl && orderResult.paymentMode === 'invoice' && (
                    <a href={orderResult.paymentUrl} target="_blank" rel="noreferrer"
                      style={{ display:'block', background:'#38BDF8', color:'#080B0F', borderRadius:9, padding:'12px', fontWeight:800, fontSize:13, textDecoration:'none', textAlign:'center' }}>
                      📧 {L('Open Invoice','Ouvrir la facture')}
                    </a>
                  )}
                  {orderResult.invoicePdf && (
                    <a href={orderResult.invoicePdf} target="_blank" rel="noreferrer"
                      style={{ display:'block', background:'transparent', border:'1px solid #38BDF8', color:'#38BDF8', borderRadius:9, padding:'11px', textDecoration:'none', textAlign:'center', fontSize:13 }}>
                      ⬇ {L('Download Invoice PDF','Télécharger Facture PDF')}
                    </a>
                  )}
                  <button onClick={() => { closeBuy(); setTab('portfolio'); }}
                    style={{ background:'transparent', border:'1px solid #1E2D3D', borderRadius:9, color:'#4A6278', padding:'11px', cursor:'pointer', fontSize:13 }}>
                    {L('View My Orders →','Voir mes ordres →')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM MODAL — charte PANGEA CARBON ──────────────────── */}
      {deleteTarget && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.88)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1100, padding:16 }}>
          <div style={{ background:'#0D1117', border:'1px solid rgba(248,113,113,0.35)', borderRadius:18, padding:32, maxWidth:420, width:'100%', boxShadow:'0 0 60px rgba(248,113,113,0.1)' }}>
            {/* Icône */}
            <div style={{ width:56, height:56, borderRadius:'50%', background:'rgba(248,113,113,0.1)', border:'2px solid rgba(248,113,113,0.3)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', fontSize:24 }}>
              🗑
            </div>
            {/* Titre */}
            <div style={{ fontSize:9, color:'#F87171', fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.1em', textAlign:'center', marginBottom:8 }}>
              MARKETPLACE · SUPPRESSION ORDRE
            </div>
            <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:17, fontWeight:800, color:'#E8EFF6', textAlign:'center', marginBottom:6 }}>
              {L('Cancel this order?','Annuler cet ordre ?')}
            </h2>
            {/* Recap ordre */}
            <div style={{ background:'#121920', border:'1px solid #1E2D3D', borderRadius:10, padding:'12px 16px', margin:'16px 0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:11, color:'#8FA3B8', fontFamily:'JetBrains Mono, monospace', marginBottom:2 }}>
                  {deleteTarget.orderId || deleteTarget.id}
                </div>
                <div style={{ fontSize:12, color:'#4A6278' }}>
                  {fmtK(deleteTarget.quantity||deleteTarget.qtyVal)} tCO₂e · {deleteTarget.paymentGateway||deleteTarget.paymentMethod||'MARKET'}
                </div>
              </div>
              <div style={{ fontSize:15, fontWeight:700, color:'#F87171', fontFamily:'JetBrains Mono, monospace' }}>
                {fmtUSD(deleteTarget.total)}
              </div>
            </div>
            <p style={{ fontSize:12, color:'#4A6278', textAlign:'center', lineHeight:1.7, marginBottom:24 }}>
              {L('This action is irreversible. The order will be permanently removed.','Cette action est irréversible. L\'ordre sera définitivement supprimé.')}
            </p>
            {/* Boutons */}
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setDeleteTarget(null)} disabled={deleting}
                style={{ flex:1, background:'transparent', border:'1px solid #1E2D3D', borderRadius:9, color:'#8FA3B8', padding:13, cursor:'pointer', fontSize:13, fontFamily:'Syne, sans-serif' }}>
                {L('Keep order','Garder l\'ordre')}
              </button>
              <button onClick={confirmDelete} disabled={deleting}
                style={{ flex:1, background:deleting?'#1E2D3D':'#F87171', color:'#fff', border:'none', borderRadius:9, padding:13, fontWeight:800, fontSize:13, cursor:deleting?'wait':'pointer', fontFamily:'Syne, sans-serif', transition:'background 0.15s' }}>
                {deleting ? '⟳ ...' : L('Delete order','Supprimer l\'ordre')}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes pgc-pulse{0%,100%{opacity:1}50%{opacity:0.25}}`}</style>
    </div>
  );
}
