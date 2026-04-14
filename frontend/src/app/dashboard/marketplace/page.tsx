'use client';
import { useLang } from '@/lib/lang-context';
import { useEffect, useState, useCallback } from 'react';
import { apiExt } from '@/lib/api';
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
  { id: 'STRIPE_CHECKOUT',  label: 'Card (Stripe)',           icon: '💳', desc: 'Instant card payment' },
  { id: 'STRIPE_INVOICE',   label: 'Invoice / Wire Transfer', icon: '📧', desc: 'Receive invoice by email · 7 days' },
  { id: 'CINETPAY',         label: 'CinetPay — West Africa',  icon: '🌍', desc: 'MTN · Orange · Moov · Wave · XOF' },
  { id: 'FLUTTERWAVE',      label: 'Flutterwave — Pan-Africa',icon: '🦋', desc: 'Mobile Money · Bank · 30+ countries' },
];

export default function MarketplacePage() {
  const { lang } = useLang();
  const L = (en, fr) => lang === 'fr' ? fr : en;

  const [tab, setTab]                 = useState('buy');
  const [prices, setPrices]           = useState([]);
  const [listings, setListings]       = useState([]);
  const [stats, setStats]             = useState(null);
  const [loading, setLoading]         = useState(true);
  const [filterStd, setFilterStd]     = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [selectedListing, setSelectedListing] = useState(null);
  const [orderForm, setOrderForm]     = useState({ qty: '', price: '', orderType: 'MARKET', note: '', gateway: 'STRIPE_CHECKOUT' });
  const [orderResult, setOrderResult] = useState(null);
  const [placing, setPlacing]         = useState(false);
  const [orders, setOrders]           = useState([]);
  const [tickerIdx, setTickerIdx]     = useState(0);
  const [pangeaFee, setPangeaFee]     = useState(3.5);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchAuthJson('/marketplace/prices').catch(() => ({ prices: [] })),
      fetchAuthJson('/marketplace/listings').catch(() => ({ listings: [] })),
      fetchAuthJson('/marketplace/stats').catch(() => null),
    ]).then(([p, l, s]) => {
      setPrices(p.prices || []);
      setListings(l.listings || []);
      setStats(s);
      if (s?.pangeaFeePct) setPangeaFee(s.pangeaFeePct);
    }).finally(() => setLoading(false));

    try {
      const saved = JSON.parse(localStorage.getItem('pgc_orders') || '[]');
      setOrders(saved);
    } catch(_e) {}
  }, []);

  useEffect(() => {
    load();
    const iv1 = setInterval(() => {
      fetchAuthJson('/marketplace/prices').then(p => {
        setPrices(p.prices || []);
      }).catch(() => {});
    }, 30000);
    const iv2 = setInterval(() => setTickerIdx(i => i + 1), 3200);
    return () => { clearInterval(iv1); clearInterval(iv2); };
  }, [load]);

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

  const price  = selectedListing ? (orderForm.orderType === 'MARKET' ? (selectedListing.askPrice || 12) : parseFloat(orderForm.price) || 0) : 0;
  const qty    = parseFloat(orderForm.qty) || 0;
  const subtotal = qty * price;
  const fee    = subtotal * (pangeaFee / 100);
  const grand  = subtotal + fee;

  const placeOrder = async () => {
    if (!selectedListing) return;
    if (!orderForm.qty || qty <= 0) return;
    setPlacing(true);
    setOrderResult(null);
    try {
      const result = await fetchAuthJson('/marketplace/bid', {
        method: 'POST',
        body: JSON.stringify({
          listingId:       selectedListing.id,
          quantity:        qty,
          maxPrice:        price,
          orderType:       orderForm.orderType,
          buyerNote:       orderForm.note,
          paymentGateway:  orderForm.gateway,
        }),
      });
      setOrderResult(result);
      const newOrder = {
        ...result,
        listing: selectedListing,
        qty, price,
        createdAt: new Date().toISOString(),
      };
      const updated = [newOrder, ...orders].slice(0, 50);
      setOrders(updated);
      localStorage.setItem('pgc_orders', JSON.stringify(updated));
      // Auto-redirect si gateway le demande
      if (result.autoRedirect && result.paymentUrl) {
        setTimeout(() => { window.open(result.paymentUrl, '_blank'); }, 1500);
      }
    } catch(e) {
      setOrderResult({ error: e.message || 'Order failed — check your connection' });
    } finally {
      setPlacing(false);
    }
  };

  const inp = { background: '#121920', border: '1px solid #1E2D3D', borderRadius: 8, color: '#E8EFF6', padding: '10px 13px', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' };
  const tab_btn = (t, label) => (
    <button onClick={() => setTab(t)} style={{ padding: '8px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: tab === t ? 700 : 400, background: tab === t ? '#00FF94' : 'transparent', color: tab === t ? '#080B0F' : '#4A6278', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.04em' }}>
      {label}
    </button>
  );

  return (
    <div style={{ padding: 20, maxWidth: 1400, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 9, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em' }}>CARBON MARKETPLACE</div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: '#E8EFF6', margin: '4px 0 2px' }}>PANGEA CARBON Exchange</h1>
        <p style={{ fontSize: 12, color: '#4A6278' }}>{L('African carbon credits · ACM0002 · ACMI · Real-time settlement', 'Crédits carbone africains · ACM0002 · ACMI · Règlement temps réel')}</p>
      </div>

      {/* Live ticker */}
      <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 10, padding: '10px 16px', marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00FF94', animation: 'pulse 2s infinite' }}/>
          <span style={{ fontSize: 9, color: '#00FF94', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em' }}>LIVE MARKET</span>
          <span style={{ fontSize: 9, color: '#2A3F55', fontFamily: 'JetBrains Mono, monospace', marginLeft: 'auto' }}>PANGEA FEE: {pangeaFee}% · Xpansiv CBL ref.</span>
        </div>
        <div style={{ display: 'flex', gap: 20, overflowX: 'auto', paddingBottom: 4 }}>
          {prices.map(p => (
            <div key={p.standard} style={{ minWidth: 140, flexShrink: 0 }}>
              <div style={{ fontSize: 10, color: STD_COLOR[p.standard] || '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 2 }}>{STD_LABEL[p.standard]}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#E8EFF6', fontFamily: 'Syne, sans-serif' }}>{fmtUSD(p.last)}</div>
              <div style={{ fontSize: 10, color: p.changeP >= 0 ? '#00FF94' : '#F87171', fontFamily: 'JetBrains Mono, monospace' }}>
                {p.changeP >= 0 ? '+' : ''}{p.changeP}% · Vol {fmtK(p.volume24h)}
              </div>
              <div style={{ fontSize: 9, color: '#2A3F55', fontFamily: 'JetBrains Mono, monospace' }}>B: {fmtUSD(p.bid)} · A: {fmtUSD(p.ask)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: L('Available Credits','Crédits disponibles'), val: fmtK(stats?.totalAvailable || 0) + ' tCO2e', color: '#00FF94' },
          { label: L('Retired Credits','Crédits retirés'),    val: fmtK(stats?.totalRetired   || 0) + ' tCO2e', color: '#38BDF8' },
          { label: L('Active Listings','Annonces actives'),   val: String(stats?.activeListings || 0),           color: '#FCD34D' },
          { label: L('Africa Market Size','Marché Afrique'),  val: '$400M+',                                     color: '#A78BFA' },
        ].map(s => (
          <div key={s.label} style={{ background: '#0D1117', border: `1px solid ${s.color}20`, borderRadius: 9, padding: '12px 14px' }}>
            <div style={{ fontSize: 9, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>{s.label.toUpperCase()}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: s.color, fontFamily: 'Syne, sans-serif' }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 9, padding: 4, marginBottom: 16, width: 'fit-content' }}>
        {tab_btn('buy',       L('Buy Credits','Acheter'))}
        {tab_btn('sell',      L('Sell Credits','Vendre'))}
        {tab_btn('portfolio', `${L('My Orders','Mes ordres')} (${orders.length})`)}
      </div>

      {/* BUY TAB */}
      {tab === 'buy' && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <select value={filterStd} onChange={e => setFilterStd(e.target.value)} style={{ ...inp, width: 180 }}>
              <option value="">{L('All standards','Tous les standards')}</option>
              {Object.entries(STD_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)} style={{ ...inp, width: 160 }}>
              <option value="">{L('All countries','Tous les pays')}</option>
              {['CI','GH','NG','KE','SN','TZ','RW','ET','ZA','BF'].map(c => <option key={c} value={c}>{FLAG[c]} {c}</option>)}
            </select>
            {(filterStd || filterCountry) && (
              <button onClick={() => { setFilterStd(''); setFilterCountry(''); }} style={{ background: 'transparent', border: '1px solid #F87171', borderRadius: 7, color: '#F87171', padding: '8px 14px', cursor: 'pointer', fontSize: 12 }}>
                ✕ {L('Clear','Effacer')}
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#4A6278', fontSize: 13 }}>
              <div style={{ fontSize: 24, marginBottom: 10, animation: 'spin 2s linear infinite', display: 'inline-block' }}>⟳</div>
              <div>{L('Loading listings...','Chargement des annonces...')}</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
              {filtered.map(listing => (
                <div key={listing.id} style={{ background: '#0D1117', border: `1px solid ${STD_COLOR[listing.standard] || '#1E2D3D'}25`, borderRadius: 13, padding: 18, cursor: 'pointer', transition: 'border-color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = (STD_COLOR[listing.standard] || '#1E2D3D') + '60'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = (STD_COLOR[listing.standard] || '#1E2D3D') + '25'}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 9, background: (STD_COLOR[listing.standard] || '#4A6278') + '20', color: STD_COLOR[listing.standard] || '#4A6278', border: `1px solid ${STD_COLOR[listing.standard] || '#4A6278'}40`, borderRadius: 4, padding: '2px 8px', fontFamily: 'JetBrains Mono, monospace' }}>
                      {STD_LABEL[listing.standard]}
                    </span>
                    {listing.verified && <span style={{ fontSize: 9, color: '#00FF94', fontFamily: 'JetBrains Mono, monospace' }}>✓ VERIFIED</span>}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#E8EFF6', marginBottom: 4 }}>{listing.project?.name}</div>
                  <div style={{ fontSize: 11, color: '#4A6278', marginBottom: 12 }}>
                    {FLAG[listing.project?.countryCode]} {listing.project?.countryCode} · {listing.project?.type} · {listing.project?.installedMW}MW · Vintage {listing.vintage}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: STD_COLOR[listing.standard] || '#E8EFF6', fontFamily: 'Syne, sans-serif' }}>{fmtUSD(listing.askPrice)}</div>
                      <div style={{ fontSize: 10, color: '#4A6278' }}>per tCO₂e</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#E8EFF6' }}>{fmtK(listing.availableQty || listing.quantity)}</div>
                      <div style={{ fontSize: 10, color: '#4A6278' }}>tCO₂e available</div>
                    </div>
                  </div>
                  <button onClick={() => openBuy(listing)}
                    style={{ width: '100%', background: STD_COLOR[listing.standard] || '#00FF94', color: '#080B0F', border: 'none', borderRadius: 8, padding: '10px', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>
                    {L('Place Buy Order →','Passer un ordre d\'achat →')}
                  </button>
                </div>
              ))}
              {filtered.length === 0 && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 60, color: '#4A6278' }}>
                  {L('No listings match your filters','Aucune annonce ne correspond aux filtres')}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* SELL TAB */}
      {tab === 'sell' && (
        <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 14, color: '#E8EFF6', fontWeight: 600, marginBottom: 8 }}>{L('List your certified credits','Listez vos crédits certifiés')}</div>
          <p style={{ fontSize: 13, color: '#4A6278', lineHeight: 1.7, marginBottom: 20 }}>
            {L('Your certified PANGEA CARBON credits on the exchange. 2.5% platform fee on settlement. Credits must be PANGEA VERIFIED or higher.',
               'Vos crédits certifiés PANGEA CARBON sur la bourse. Frais de plateforme 2.5% au règlement. Crédits doivent être PANGEA VERIFIED ou supérieur.')}
          </p>
          {['Credits must be PANGEA VERIFIED or CERTIFIED','KYC/AML verification required (one-time)','Settlement in USD via wire transfer within 48h',`PANGEA CARBON fee: ${pangeaFee}% on gross sale`].map(r => (
            <div key={r} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 13, color: '#8FA3B8' }}>
              <span style={{ color: '#00FF94', flexShrink: 0 }}>✓</span><span>{r}</span>
            </div>
          ))}
          <button style={{ marginTop: 20, background: '#00FF94', color: '#080B0F', border: 'none', borderRadius: 9, padding: '12px 28px', fontWeight: 800, cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>
            {L('List My Credits →','Lister mes crédits →')}
          </button>
        </div>
      )}

      {/* MY ORDERS TAB */}
      {tab === 'portfolio' && (
        <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', background: '#121920', borderBottom: '1px solid #1E2D3D', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>{L('MY ORDERS','MES ORDRES')} — {orders.length}</span>
            <button onClick={load} style={{ background: 'transparent', border: 'none', color: '#4A6278', cursor: 'pointer', fontSize: 12 }}>↺ {L('Refresh','Actualiser')}</button>
          </div>
          {orders.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#4A6278', fontSize: 13 }}>
              {L('No orders yet — place your first buy order above','Aucun ordre — passez votre premier ordre d\'achat ci-dessus')}
            </div>
          ) : (
            orders.map((order, i) => {
              const statusColor = { PAID: '#00FF94', PAYMENT_PENDING: '#FCD34D', PENDING: '#8FA3B8', CANCELLED: '#F87171' };
              const gwIcon = { STRIPE_CARD: '💳', STRIPE_INVOICE: '📧', CINETPAY: '🌍', FLUTTERWAVE: '🦋', manual: '📞' };
              return (
                <div key={i} style={{ padding: '14px 18px', borderBottom: '1px solid rgba(30,45,61,0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 9, color: statusColor[order.status] || '#8FA3B8', background: (statusColor[order.status] || '#8FA3B8') + '15', border: `1px solid ${statusColor[order.status] || '#8FA3B8'}30`, borderRadius: 4, padding: '1px 7px', fontFamily: 'JetBrains Mono, monospace' }}>
                        {order.status}
                      </span>
                      <span style={{ fontSize: 10, color: '#4A6278' }}>{gwIcon[order.paymentMethod] || gwIcon[order.paymentGateway] || '📋'} {order.paymentGateway || order.paymentMethod || 'MARKET'}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#8FA3B8', fontFamily: 'JetBrains Mono, monospace' }}>{order.orderId}</div>
                    <div style={{ fontSize: 11, color: '#4A6278', marginTop: 2 }}>
                      {fmtK(order.quantity)} tCO₂e @ {fmtUSD(order.pricePerTonne || order.price)} · Fee: {fmtUSD(order.pangeaFee || order.pangea_fee || 0)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#E8EFF6', fontFamily: 'JetBrains Mono, monospace' }}>{fmtUSD(order.total)}</div>
                    <div style={{ fontSize: 10, color: '#4A6278' }}>{new Date(order.createdAt).toLocaleDateString()}</div>
                    {order.paymentUrl && (
                      <a href={order.paymentUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#00FF94', textDecoration: 'none' }}>
                        {L('Pay now →','Payer →')}
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ORDER MODAL */}
      {selectedListing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) closeBuy(); }}>
          <div style={{ background: '#0D1117', border: `1px solid ${STD_COLOR[selectedListing.standard]}40`, borderRadius: 18, padding: 28, maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 9, color: STD_COLOR[selectedListing.standard], fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em', marginBottom: 4 }}>
                  {L('PLACE BUY ORDER','PASSER UN ORDRE')} · {STD_LABEL[selectedListing.standard]}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#E8EFF6' }}>{selectedListing.project?.name}</div>
                <div style={{ fontSize: 11, color: '#4A6278' }}>
                  {FLAG[selectedListing.project?.countryCode]} {selectedListing.project?.countryCode} · {selectedListing.project?.type} · {selectedListing.project?.installedMW}MW · Vintage {selectedListing.vintage}
                </div>
              </div>
              <button onClick={closeBuy} style={{ background: 'transparent', border: 'none', color: '#4A6278', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>

            {!orderResult ? (
              <>
                {/* Price bar */}
                <div style={{ background: '#121920', borderRadius: 10, padding: 14, marginBottom: 20, display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 9, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>{L('ASK PRICE','PRIX VENDEUR')}</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: STD_COLOR[selectedListing.standard], fontFamily: 'Syne, sans-serif' }}>{fmtUSD(selectedListing.askPrice)}</div>
                    <div style={{ fontSize: 10, color: '#4A6278' }}>per tCO₂e</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 9, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>AVAILABLE</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#E8EFF6' }}>{fmtK(selectedListing.availableQty || selectedListing.quantity)}</div>
                    <div style={{ fontSize: 10, color: '#4A6278' }}>tCO₂e</div>
                  </div>
                </div>

                {/* Form */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 9, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>{L('ORDER TYPE','TYPE D\'ORDRE')}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['MARKET','LIMIT'].map(t => (
                      <button key={t} onClick={() => setOrderForm(f => ({ ...f, orderType: t }))}
                        style={{ flex: 1, padding: '8px', borderRadius: 7, border: `1px solid ${orderForm.orderType === t ? '#00FF94' : '#1E2D3D'}`, background: orderForm.orderType === t ? 'rgba(0,255,148,0.1)' : 'transparent', color: orderForm.orderType === t ? '#00FF94' : '#4A6278', cursor: 'pointer', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>
                        {t === 'MARKET' ? L('Market','Marché') : L('Limit','Limite')}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 9, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>
                    {L('QUANTITY (tCO₂e) *','QUANTITÉ (tCO₂e) *')}
                  </div>
                  <input type="number" min="1" max={selectedListing.availableQty || selectedListing.quantity}
                    placeholder={L('e.g. 100','ex. 100')}
                    value={orderForm.qty}
                    onChange={e => setOrderForm(f => ({ ...f, qty: e.target.value }))}
                    style={inp} autoFocus/>
                </div>

                {orderForm.orderType === 'LIMIT' && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 9, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>{L('LIMIT PRICE ($/tCO₂e)','PRIX LIMITE ($/tCO₂e)')}</div>
                    <input type="number" step="0.01" placeholder={String(selectedListing.askPrice)}
                      value={orderForm.price}
                      onChange={e => setOrderForm(f => ({ ...f, price: e.target.value }))}
                      style={inp}/>
                  </div>
                )}

                {/* Gateway selector */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 9, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8 }}>{L('PAYMENT METHOD','MODE DE PAIEMENT')}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {GATEWAYS.map(gw => (
                      <button key={gw.id} onClick={() => setOrderForm(f => ({ ...f, gateway: gw.id }))}
                        style={{ padding: '10px 12px', borderRadius: 8, border: `1px solid ${orderForm.gateway === gw.id ? '#00FF94' : '#1E2D3D'}`, background: orderForm.gateway === gw.id ? 'rgba(0,255,148,0.08)' : 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                        <div style={{ fontSize: 14, marginBottom: 2 }}>{gw.icon}</div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: orderForm.gateway === gw.id ? '#00FF94' : '#E8EFF6' }}>{gw.label}</div>
                        <div style={{ fontSize: 10, color: '#4A6278' }}>{gw.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 9, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>NOTE (optional)</div>
                  <input placeholder={L('e.g. Scope 3 offset, retirement reason','ex. Compensation Scope 3')}
                    value={orderForm.note}
                    onChange={e => setOrderForm(f => ({ ...f, note: e.target.value }))}
                    style={inp}/>
                </div>

                {/* Summary */}
                {qty > 0 && (
                  <div style={{ background: '#121920', borderRadius: 10, padding: 14, marginBottom: 16 }}>
                    {[
                      { k: L('Quantity','Quantité'),         v: `${qty.toLocaleString()} tCO₂e` },
                      { k: L('Price/tonne','Prix/tonne'),    v: fmtUSD(price) },
                      { k: L('Subtotal','Sous-total'),       v: fmtUSD(subtotal) },
                      { k: `PANGEA Fee (${pangeaFee}%)`,     v: fmtUSD(fee), note: '→ PANGEA Stripe' },
                      { k: L('TOTAL','TOTAL'),               v: fmtUSD(grand), highlight: true },
                    ].map(r => (
                      <div key={r.k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                        <span style={{ color: '#4A6278' }}>
                          {r.k}
                          {r.note && <span style={{ fontSize: 10, color: '#2A3F55', marginLeft: 6 }}>{r.note}</span>}
                        </span>
                        <span style={{ color: r.highlight ? '#00FF94' : '#E8EFF6', fontFamily: 'JetBrains Mono, monospace', fontWeight: r.highlight ? 800 : 400 }}>{r.v}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={closeBuy} style={{ flex: 1, background: 'transparent', border: '1px solid #1E2D3D', borderRadius: 9, color: '#4A6278', padding: 13, cursor: 'pointer', fontSize: 13 }}>
                    {L('Cancel','Annuler')}
                  </button>
                  <button onClick={placeOrder}
                    disabled={placing || qty <= 0}
                    style={{ flex: 2, background: placing || qty <= 0 ? '#1E2D3D' : '#00FF94', color: '#080B0F', border: 'none', borderRadius: 9, padding: 13, fontWeight: 800, fontSize: 14, cursor: placing || qty <= 0 ? 'not-allowed' : 'pointer', fontFamily: 'Syne, sans-serif', opacity: qty <= 0 ? 0.5 : 1 }}>
                    {placing ? `⟳ ${L('Processing...','Traitement...')}` : qty > 0 ? `${L('Confirm Order','Confirmer')} · ${fmtUSD(grand)}` : L('Enter quantity →','Entrez une quantité →')}
                  </button>
                </div>
              </>
            ) : orderResult.error ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>❌</div>
                <div style={{ fontSize: 16, color: '#F87171', fontWeight: 700, marginBottom: 8 }}>Order Failed</div>
                <div style={{ fontSize: 13, color: '#8FA3B8', marginBottom: 20, padding: '10px 14px', background: 'rgba(248,113,113,0.08)', borderRadius: 8, border: '1px solid rgba(248,113,113,0.2)' }}>
                  {orderResult.error}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setOrderResult(null)} style={{ flex: 1, background: 'transparent', border: '1px solid #1E2D3D', borderRadius: 8, color: '#4A6278', padding: '10px', cursor: 'pointer' }}>
                    ← {L('Try Again','Réessayer')}
                  </button>
                  <button onClick={closeBuy} style={{ flex: 1, background: 'transparent', border: '1px solid #1E2D3D', borderRadius: 8, color: '#4A6278', padding: '10px', cursor: 'pointer' }}>
                    {L('Close','Fermer')}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(0,255,148,0.12)', border: '2px solid rgba(0,255,148,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28 }}>✓</div>
                <div style={{ fontSize: 9, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>{orderResult.orderId}</div>
                <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, color: '#00FF94', marginBottom: 8 }}>
                  {L('Order Placed!','Ordre passé !')}
                </h2>

                {/* Payment badge */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                  <span style={{ fontSize: 12, padding: '5px 14px', borderRadius: 20, fontFamily: 'JetBrains Mono, monospace', background: 'rgba(0,255,148,0.1)', color: '#00FF94', border: '1px solid rgba(0,255,148,0.3)' }}>
                    {orderResult.paymentIcon} {orderResult.paymentGateway}
                  </span>
                </div>

                {/* Split breakdown */}
                {orderResult.splitBreakdown && (
                  <div style={{ background: '#121920', borderRadius: 10, padding: 14, marginBottom: 14, textAlign: 'left' }}>
                    <div style={{ fontSize: 9, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 10 }}>PAYMENT SPLIT</div>
                    {[
                      { k: L('Buyer pays','Buyer paie'), v: fmtUSD(orderResult.splitBreakdown.buyerPays), color: '#E8EFF6' },
                      { k: `PANGEA Fee (${pangeaFee}%)`, v: fmtUSD(orderResult.splitBreakdown.pangeaFee.amount), sub: '→ PANGEA Stripe', color: '#A78BFA' },
                      { k: L('Seller receives','Vendeur reçoit'), v: fmtUSD(orderResult.splitBreakdown.sellerGets.amount), sub: '→ Africa gateway', color: '#00FF94' },
                    ].map(r => (
                      <div key={r.k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, alignItems: 'center' }}>
                        <div>
                          <span style={{ color: '#8FA3B8' }}>{r.k}</span>
                          {r.sub && <div style={{ fontSize: 10, color: '#2A3F55' }}>{r.sub}</div>}
                        </div>
                        <span style={{ color: r.color, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{r.v}</span>
                      </div>
                    ))}
                  </div>
                )}

                <p style={{ fontSize: 12, color: '#8FA3B8', marginBottom: 16, lineHeight: 1.7 }}>{orderResult.message}</p>

                {/* Next steps */}
                {orderResult.nextSteps && (
                  <div style={{ textAlign: 'left', marginBottom: 18 }}>
                    {orderResult.nextSteps.map((step, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 12, color: '#8FA3B8' }}>
                        <span style={{ color: '#00FF94', flexShrink: 0, fontFamily: 'JetBrains Mono, monospace' }}>{i+1}.</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* CTA buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {orderResult.paymentUrl && (
                    <a href={orderResult.paymentUrl} target="_blank" rel="noreferrer"
                      style={{ display: 'block', background: '#00FF94', color: '#080B0F', borderRadius: 9, padding: '13px', fontWeight: 800, fontSize: 14, textDecoration: 'none', textAlign: 'center', fontFamily: 'Syne, sans-serif' }}>
                      {orderResult.paymentIcon} {L('Pay Now','Payer maintenant')} → {orderResult.paymentGateway}
                    </a>
                  )}
                  {orderResult.invoicePdf && (
                    <a href={orderResult.invoicePdf} target="_blank" rel="noreferrer"
                      style={{ display: 'block', background: 'transparent', border: '1px solid #38BDF8', color: '#38BDF8', borderRadius: 9, padding: '11px', fontWeight: 600, fontSize: 13, textDecoration: 'none', textAlign: 'center' }}>
                      ⬇ {L('Download Invoice PDF','Télécharger Facture PDF')}
                    </a>
                  )}
                  <button onClick={() => { closeBuy(); setTab('portfolio'); }}
                    style={{ background: 'transparent', border: '1px solid #1E2D3D', borderRadius: 9, color: '#4A6278', padding: '11px', cursor: 'pointer', fontSize: 13 }}>
                    {L('View My Orders','Voir mes ordres')} →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
