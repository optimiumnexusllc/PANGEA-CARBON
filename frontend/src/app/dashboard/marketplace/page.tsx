'use client';
import { useLang } from '@/lib/lang-context';
import { useEffect, useState, useCallback } from 'react';
import { apiExt } from '@/lib/api';
import { fetchAuthJson } from '@/lib/fetch-auth';

const fmt = (n: number, d = 0) => n?.toLocaleString('en-US', { maximumFractionDigits: d }) ?? '0';
const fmtUSD = (n: number, d = 2) => '$' + (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtK = (n: number) => n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(0)}K` : String(Math.round(n));

const STD_COLOR = {
  VERRA_VCS: '#00FF94', GOLD_STANDARD: '#FCD34D',
  ARTICLE6: '#38BDF8', CORSIA: '#F87171', BIOMASS: '#EF9F27',
};
const STD_LABEL = {
  VERRA_VCS: 'Verra VCS', GOLD_STANDARD: 'Gold Standard',
  ARTICLE6: 'Article 6 ITMO', CORSIA: 'CORSIA', BIOMASS: 'Biomass',
};
const FLAG = {
  CI: '🇨🇮', GH: '🇬🇭', NG: '🇳🇬', KE: '🇰🇪', SN: '🇸🇳',
  TZ: '🇹🇿', RW: '🇷🇼', ET: '🇪🇹', ZA: '🇿🇦', BF: '🇧🇫',
};

type Tab = 'buy' | 'sell' | 'portfolio' | 'orderbook';

export default function MarketplacePage() {
  const { t } = useLang();
  const [tab, setTab] = useState<Tab>('buy');
  const [prices, setPrices] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ standard: '', country: '', maxPrice: '' });
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [orderForm, setOrderForm] = useState({ qty: '', price: '', orderType: 'MARKET', note: '' });
  const [orderResult, setOrderResult] = useState<any>(null);
  const [placing, setPlacing] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [tickerIdx, setTickerIdx] = useState(0);

  const load = useCallback(() => {
    Promise.all([
      apiExt.getPrices(),
      apiExt.getListings(),
      apiExt.getMarketStats(),
    ]).then(([p, l, s]) => {
      setPrices(p.prices || []);
      setListings(l.listings || []);
      setStats(s);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const priceInterval = setInterval(() => {
      apiExt.getPrices().then(p => setPrices(p.prices || [])).catch(() => {});
    }, 30000);
    const tickerInterval = setInterval(() => {
      setTickerIdx(i => i + 1);
    }, 3000);
    // Load mock orders from localStorage
    try {
      const saved = JSON.parse(localStorage.getItem('pgc_orders') || '[]');
      setOrders(saved);
    } catch {}
    return () => { clearInterval(priceInterval); clearInterval(tickerInterval); };
  }, [load]);

  const filteredListings = listings.filter(l =>
    (!filter.standard || l.standard === filter.standard) &&
    (!filter.country || l.project?.countryCode === filter.country) &&
    (!filter.maxPrice || l.askPrice <= parseFloat(filter.maxPrice))
  );

  const placeOrder = async () => {
    if (!selectedListing || !orderForm.qty) return;
    setPlacing(true);
    setOrderResult(null);
    try {
      const price = orderForm.orderType === 'MARKET'
        ? selectedListing.askPrice
        : parseFloat(orderForm.price);
      const result = await fetchAuthJson('/marketplace/bid', {
        method: 'POST',
        body: JSON.stringify({
          listingId: selectedListing.id,
          quantity: parseFloat(orderForm.qty),
          maxPrice: price,
          orderType: orderForm.orderType,
          buyerNote: orderForm.note,
        }),
      });
      setOrderResult(result);
      // Persist order locally
      const newOrder = {
        ...result,
        listing: selectedListing,
        qty: parseFloat(orderForm.qty),
        price,
        createdAt: new Date().toISOString(),
        type: orderForm.orderType,
      };
      const updated = [newOrder, ...orders].slice(0, 50);
      setOrders(updated);
      localStorage.setItem('pgc_orders', JSON.stringify(updated));
    } catch (e: any) {
      setOrderResult({ error: e.message || 'Order failed' });
    } finally {
      setPlacing(false);
    }
  };

  const openBuy = (listing: any) => {
    setSelectedListing(listing);
    setOrderForm({ qty: '', price: String(listing.askPrice.toFixed(2)), orderType: 'MARKET', note: '' });
    setOrderResult(null);
  };

  const closeBuy = () => { setSelectedListing(null); setOrderResult(null); };

  const total = selectedListing && orderForm.qty
    ? (parseFloat(orderForm.qty) * (orderForm.orderType === 'MARKET' ? selectedListing.askPrice : parseFloat(orderForm.price) || 0))
    : 0;
  const fee = total * 0.025;
  const grand = total + fee;

  const inp = {
    background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7,
    color: '#E8EFF6', padding: '10px 12px', fontSize: 13, outline: 'none', width: '100%',
  };
  const tabBtn = (id: Tab, label: string) => (
    <button onClick={() => setTab(id)} style={{
      padding: '8px 18px', borderRadius: 7, border: 'none', cursor: 'pointer',
      background: tab === id ? '#00FF94' : 'transparent',
      color: tab === id ? '#080B0F' : '#4A6278',
      fontWeight: tab === id ? 700 : 400, fontSize: 13,
    }}>{label}</button>
  );

  if (loading) return (
    <div style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid rgba(0,255,148,0.2)', borderTopColor: '#00FF94', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }}/>
        <div style={{ fontSize: 13, color: '#4A6278' }}>Loading market data...</div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>CARBON MARKETPLACE</div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: '#E8EFF6', margin: 0 }}>
            PANGEA CARBON Exchange
          </h1>
          <div style={{ fontSize: 12, color: '#4A6278', marginTop: 4 }}>
            African carbon credits · ACM0002 · ACMI · Real-time settlement
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00FF94', animation: 'pulse 2s infinite' }}/>
          <span style={{ fontSize: 11, color: '#00FF94', fontFamily: 'JetBrains Mono, monospace' }}>LIVE MARKET</span>
        </div>
      </div>

      {/* Price Ticker */}
      <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 10, padding: '10px 0', marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 0 }}>
          {prices.map((p, i) => (
            <div key={p.standard} style={{ flex: 1, padding: '10px 20px', borderRight: i < prices.length - 1 ? '1px solid #1E2D3D' : 'none', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: STD_COLOR[p.standard] || '#4A6278' }}/>
                <span style={{ fontSize: 10, color: STD_COLOR[p.standard], fontFamily: 'JetBrains Mono, monospace' }}>
                  {STD_LABEL[p.standard]}
                </span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Syne, sans-serif', color: '#E8EFF6' }}>
                {fmtUSD(p.last)}
              </div>
              <div style={{ fontSize: 11, color: p.changeP >= 0 ? '#00FF94' : '#F87171', fontFamily: 'JetBrains Mono, monospace' }}>
                {p.changeP >= 0 ? '+' : ''}{p.changeP?.toFixed(1)}% · Vol {fmtK(p.volume24h)}
              </div>
              <div style={{ fontSize: 10, color: '#4A6278', marginTop: 2 }}>
                B: {fmtUSD(p.bid)} · A: {fmtUSD(p.ask)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Available Credits', val: fmtK(stats.totalAvailable || 0) + ' tCO2e', color: '#00FF94' },
            { label: 'Retired Credits', val: fmtK(stats.totalRetired || 0) + ' tCO2e', color: '#38BDF8' },
            { label: 'Active Listings', val: String(stats.activeListings || 0), color: '#FCD34D' },
            { label: 'Africa Market Size', val: '$400M+', color: '#A78BFA' },
          ].map(s => (
            <div key={s.label} style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>{s.label.toUpperCase()}</div>
              <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Syne, sans-serif', color: s.color }}>{s.val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 10, padding: 4, marginBottom: 20, width: 'fit-content' }}>
        {tabBtn('buy', 'Buy Credits')}
        {tabBtn('sell', 'Sell Credits')}
        {tabBtn('portfolio', 'My Orders')}
        {tabBtn('orderbook', 'Order Book')}
      </div>

      {/* BUY TAB */}
      {tab === 'buy' && (
        <div>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <select value={filter.standard} onChange={e => setFilter(f => ({ ...f, standard: e.target.value }))}
              style={{ ...inp, width: 180 }}>
              <option value="">All Standards</option>
              {Object.entries(STD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={filter.country} onChange={e => setFilter(f => ({ ...f, country: e.target.value }))}
              style={{ ...inp, width: 160 }}>
              <option value="">All Countries</option>
              {Object.entries(FLAG).map(([k]) => <option key={k} value={k}>{FLAG[k]} {k}</option>)}
            </select>
            <input type="number" placeholder="Max price ($/t)" value={filter.maxPrice}
              onChange={e => setFilter(f => ({ ...f, maxPrice: e.target.value }))}
              style={{ ...inp, width: 160 }} />
            <button onClick={() => setFilter({ standard: '', country: '', maxPrice: '' })}
              style={{ padding: '10px 16px', background: 'transparent', border: '1px solid #1E2D3D', borderRadius: 7, color: '#4A6278', cursor: 'pointer', fontSize: 12 }}>
              Clear
            </button>
            <div style={{ marginLeft: 'auto', fontSize: 12, color: '#4A6278', alignSelf: 'center' }}>
              {filteredListings.length} listings · {fmtK(filteredListings.reduce((s, l) => s + (l.availableQty || l.quantity), 0))} tCO2e available
            </div>
          </div>

          {/* Listings Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
            {filteredListings.map(listing => {
              const color = STD_COLOR[listing.standard] || '#4A6278';
              const flag = FLAG[listing.project?.countryCode] || '🌍';
              return (
                <div key={listing.id} style={{
                  background: '#0D1117', border: `1px solid ${color}25`,
                  borderRadius: 12, padding: 18,
                  transition: 'border-color 0.2s, transform 0.1s',
                  cursor: 'default',
                }}>
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: color }}/>
                        <span style={{ fontSize: 10, color, fontFamily: 'JetBrains Mono, monospace' }}>
                          {STD_LABEL[listing.standard]}
                        </span>
                        {listing.verified && (
                          <span style={{ fontSize: 9, background: 'rgba(0,255,148,0.1)', color: '#00FF94', border: '1px solid rgba(0,255,148,0.25)', borderRadius: 4, padding: '1px 6px' }}>
                            VERIFIED
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#E8EFF6', maxWidth: 200 }}>
                        {listing.project?.name || 'African Carbon Project'}
                      </div>
                      <div style={{ fontSize: 12, color: '#4A6278', marginTop: 2 }}>
                        {flag} {listing.project?.countryCode} · {listing.project?.type} · {listing.project?.installedMW}MW · Vintage {listing.vintage}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Syne, sans-serif', color }}>
                        {fmtUSD(listing.askPrice)}
                      </div>
                      <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>per tCO2e</div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                    <div style={{ background: '#121920', borderRadius: 7, padding: '8px 10px' }}>
                      <div style={{ fontSize: 9, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 2 }}>AVAILABLE</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#E8EFF6' }}>{fmtK(listing.availableQty || listing.quantity)} t</div>
                    </div>
                    <div style={{ background: '#121920', borderRadius: 7, padding: '8px 10px' }}>
                      <div style={{ fontSize: 9, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 2 }}>TOTAL VALUE</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#E8EFF6' }}>{fmtUSD((listing.availableQty || listing.quantity) * listing.askPrice, 0)}</div>
                    </div>
                  </div>

                  {/* Depth bar */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 9, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>DEPTH</span>
                      <span style={{ fontSize: 9, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>
                        {Math.round((listing.availableQty || listing.quantity) / listing.quantity * 100)}% available
                      </span>
                    </div>
                    <div style={{ height: 4, background: '#1E2D3D', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${Math.min(100, (listing.availableQty || listing.quantity) / listing.quantity * 100)}%`, background: color, borderRadius: 2, transition: 'width 0.3s' }}/>
                    </div>
                  </div>

                  {/* Buy Button */}
                  <button onClick={() => openBuy(listing)} style={{
                    width: '100%', background: `${color}15`, border: `1px solid ${color}40`,
                    borderRadius: 8, padding: '11px', fontWeight: 800, fontSize: 14,
                    color, cursor: 'pointer', fontFamily: 'Syne, sans-serif',
                    transition: 'all 0.15s',
                  }}>
                    Place Buy Order →
                  </button>
                </div>
              );
            })}
          </div>

          {filteredListings.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#4A6278' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
              <div style={{ fontSize: 14 }}>No listings match your filters</div>
            </div>
          )}
        </div>
      )}

      {/* SELL TAB */}
      {tab === 'sell' && (
        <div style={{ maxWidth: 640 }}>
          <div style={{ background: '#0D1117', border: '1px solid rgba(252,211,77,0.2)', borderRadius: 14, padding: 28 }}>
            <div style={{ fontSize: 10, color: '#FCD34D', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6, letterSpacing: '0.1em' }}>LIST YOUR CREDITS FOR SALE</div>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, color: '#E8EFF6', marginBottom: 6 }}>Sell Carbon Credits</h2>
            <p style={{ fontSize: 13, color: '#4A6278', marginBottom: 24, lineHeight: 1.7 }}>
              List your certified PANGEA CARBON credits on the exchange. 2.5% platform fee on settlement. Credits must be PANGEA VERIFIED or higher.
            </p>
            {[
              { label: 'SELECT CERTIFIED PROJECT', ph: 'Choose from your certified projects...' },
              { label: 'VINTAGE YEAR', ph: '2024' },
              { label: 'QUANTITY (tCO2e)', ph: 'e.g. 5000' },
              { label: 'ASK PRICE ($/tCO2e)', ph: 'e.g. 12.50' },
              { label: 'MINIMUM ORDER (tCO2e)', ph: 'e.g. 100' },
              { label: 'LISTING NOTES', ph: 'Additional information for buyers...' },
            ].map(f => (
              <div key={f.label} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 5 }}>{f.label}</div>
                {f.label.includes('NOTES') ? (
                  <textarea placeholder={f.ph} rows={3} style={{ ...inp, resize: 'vertical' }}/>
                ) : (
                  <input placeholder={f.ph} style={inp} />
                )}
              </div>
            ))}
            <div style={{ background: 'rgba(252,211,77,0.06)', border: '1px solid rgba(252,211,77,0.15)', borderRadius: 8, padding: 14, marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: '#FCD34D', marginBottom: 6, fontWeight: 600 }}>Seller requirements</div>
              {['Credits must be PANGEA VERIFIED or CERTIFIED', 'KYC/AML verification required (one-time)', 'Settlement in USD via wire transfer within 48h', 'PANGEA CARBON fee: 2.5% on gross sale'].map(r => (
                <div key={r} style={{ fontSize: 12, color: '#8FA3B8', marginBottom: 4 }}>✓ {r}</div>
              ))}
            </div>
            <button style={{ width: '100%', background: '#FCD34D', color: '#080B0F', border: 'none', borderRadius: 9, padding: 13, fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>
              Submit Listing →
            </button>
          </div>
        </div>
      )}

      {/* PORTFOLIO / ORDERS TAB */}
      {tab === 'portfolio' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#E8EFF6' }}>My Orders ({orders.length})</div>
            {orders.length > 0 && (
              <button onClick={() => { setOrders([]); localStorage.removeItem('pgc_orders'); }}
                style={{ fontSize: 11, background: 'transparent', border: '1px solid #1E2D3D', borderRadius: 6, color: '#4A6278', padding: '4px 10px', cursor: 'pointer' }}>
                Clear
              </button>
            )}
          </div>
          {orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#4A6278' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 14, marginBottom: 6 }}>No orders yet</div>
              <div style={{ fontSize: 12 }}>Place your first buy order from the Buy tab</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {orders.map((order, i) => (
                <div key={i} style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 11, background: 'rgba(252,211,77,0.12)', color: '#FCD34D', border: '1px solid rgba(252,211,77,0.25)', borderRadius: 4, padding: '2px 8px', fontFamily: 'JetBrains Mono, monospace' }}>
                          {order.orderId || `ORD-${i}`}
                        </span>
                        <span style={{ fontSize: 10, color: '#00FF94', background: 'rgba(0,255,148,0.08)', border: '1px solid rgba(0,255,148,0.2)', borderRadius: 4, padding: '2px 8px' }}>
                          {order.status || 'PENDING'}
                        </span>
                        <span style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>
                          {order.type || 'MARKET'}
                        </span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#E8EFF6', marginBottom: 2 }}>
                        {order.listing?.project?.name || 'African Carbon Credits'}
                      </div>
                      <div style={{ fontSize: 12, color: '#4A6278' }}>
                        {fmtK(order.qty)} tCO2e @ {fmtUSD(order.price)} · Fee: {fmtUSD(order.pangea_fee || 0)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Syne, sans-serif', color: '#00FF94' }}>
                        {fmtUSD(order.total || 0)}
                      </div>
                      <div style={{ fontSize: 10, color: '#4A6278', marginTop: 2 }}>
                        {new Date(order.createdAt).toLocaleDateString('en-US')}
                      </div>
                    </div>
                  </div>
                  {order.message && (
                    <div style={{ marginTop: 10, fontSize: 12, color: '#8FA3B8', background: '#121920', borderRadius: 6, padding: '8px 12px' }}>
                      {order.message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ORDER BOOK TAB */}
      {tab === 'orderbook' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {prices.map(p => (
            <div key={p.standard} style={{ background: '#0D1117', border: `1px solid ${STD_COLOR[p.standard]}25`, borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', background: '#121920', borderBottom: '1px solid #1E2D3D', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: STD_COLOR[p.standard] }}/>
                  <span style={{ fontSize: 12, fontWeight: 700, color: STD_COLOR[p.standard], fontFamily: 'JetBrains Mono, monospace' }}>
                    {STD_LABEL[p.standard]}
                  </span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#E8EFF6' }}>{fmtUSD(p.last)}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '0' }}>
                {/* Bids */}
                <div style={{ borderRight: '1px solid #1E2D3D' }}>
                  <div style={{ padding: '8px 12px', fontSize: 9, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', background: '#0D1117', borderBottom: '1px solid #1E2D3D' }}>
                    BIDS (BUY)
                  </div>
                  {[0, 0.2, 0.4, 0.6, 0.8].map((offset, i) => (
                    <div key={i} style={{ padding: '6px 12px', display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                      <span style={{ color: '#00FF94', fontFamily: 'JetBrains Mono, monospace' }}>{fmtUSD(p.bid - offset)}</span>
                      <span style={{ color: '#4A6278' }}>{fmtK(Math.floor(1000 + Math.random() * 5000))} t</span>
                    </div>
                  ))}
                </div>
                {/* Asks */}
                <div>
                  <div style={{ padding: '8px 12px', fontSize: 9, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', background: '#0D1117', borderBottom: '1px solid #1E2D3D' }}>
                    ASKS (SELL)
                  </div>
                  {[0, 0.2, 0.4, 0.6, 0.8].map((offset, i) => (
                    <div key={i} style={{ padding: '6px 12px', display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                      <span style={{ color: '#F87171', fontFamily: 'JetBrains Mono, monospace' }}>{fmtUSD(p.ask + offset)}</span>
                      <span style={{ color: '#4A6278' }}>{fmtK(Math.floor(500 + Math.random() * 3000))} t</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* BUY ORDER MODAL */}
      {selectedListing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) closeBuy(); }}>
          <div style={{ background: '#0D1117', border: `1px solid ${STD_COLOR[selectedListing.standard]}35`, borderRadius: 18, padding: 32, maxWidth: 540, width: '100%', position: 'relative' }}>
            <button onClick={closeBuy} style={{ position: 'absolute', top: 16, right: 20, background: 'none', border: 'none', color: '#4A6278', cursor: 'pointer', fontSize: 22 }}>×</button>

            {!orderResult ? (
              <>
                {/* Modal Header */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, color: STD_COLOR[selectedListing.standard], fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em', marginBottom: 6 }}>
                    PLACE BUY ORDER · {STD_LABEL[selectedListing.standard]}
                  </div>
                  <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: '#E8EFF6', margin: 0, marginBottom: 4 }}>
                    {selectedListing.project?.name}
                  </h2>
                  <div style={{ fontSize: 12, color: '#4A6278' }}>
                    {FLAG[selectedListing.project?.countryCode]} {selectedListing.project?.countryCode} · {selectedListing.project?.type} · {selectedListing.project?.installedMW}MW · Vintage {selectedListing.vintage}
                  </div>
                </div>

                {/* Current Price */}
                <div style={{ background: '#121920', border: '1px solid #1E2D3D', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 9, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>MARKET PRICE</div>
                    <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Syne, sans-serif', color: STD_COLOR[selectedListing.standard] }}>
                      {fmtUSD(selectedListing.askPrice)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 9, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>AVAILABLE</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#E8EFF6' }}>
                      {fmtK(selectedListing.availableQty || selectedListing.quantity)} tCO2e
                    </div>
                  </div>
                </div>

                {/* Order Type */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>ORDER TYPE</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[{ v: 'MARKET', l: 'Market Order' }, { v: 'LIMIT', l: 'Limit Order' }].map(ot => (
                      <button key={ot.v} onClick={() => setOrderForm(f => ({ ...f, orderType: ot.v }))} style={{
                        flex: 1, padding: '9px', borderRadius: 7, border: `1px solid ${orderForm.orderType === ot.v ? '#00FF94' : '#1E2D3D'}`,
                        background: orderForm.orderType === ot.v ? 'rgba(0,255,148,0.1)' : 'transparent',
                        color: orderForm.orderType === ot.v ? '#00FF94' : '#4A6278', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                      }}>{ot.l}</button>
                    ))}
                  </div>
                </div>

                {/* Quantity */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>QUANTITY (tCO2e) *</div>
                  <input type="number" min="1" max={selectedListing.availableQty || selectedListing.quantity}
                    placeholder="e.g. 500"
                    value={orderForm.qty}
                    onChange={e => setOrderForm(f => ({ ...f, qty: e.target.value }))}
                    style={inp} />
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    {[100, 500, 1000, 5000].map(q => (
                      <button key={q} onClick={() => setOrderForm(f => ({ ...f, qty: String(q) }))}
                        style={{ fontSize: 10, padding: '3px 8px', border: '1px solid #1E2D3D', borderRadius: 4, background: 'transparent', color: '#4A6278', cursor: 'pointer' }}>
                        {fmtK(q)}t
                      </button>
                    ))}
                  </div>
                </div>

                {/* Limit Price (only for LIMIT orders) */}
                {orderForm.orderType === 'LIMIT' && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>LIMIT PRICE ($/tCO2e)</div>
                    <input type="number" step="0.01" placeholder={String(selectedListing.askPrice)}
                      value={orderForm.price}
                      onChange={e => setOrderForm(f => ({ ...f, price: e.target.value }))}
                      style={inp} />
                  </div>
                )}

                {/* Note */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>BUYER NOTE (optional)</div>
                  <input placeholder="e.g. For FY2025 carbon neutrality report"
                    value={orderForm.note}
                    onChange={e => setOrderForm(f => ({ ...f, note: e.target.value }))}
                    style={inp} />
                </div>

                {/* Summary */}
                {orderForm.qty && parseFloat(orderForm.qty) > 0 && (
                  <div style={{ background: '#121920', border: '1px solid #1E2D3D', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
                    <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 12 }}>ORDER SUMMARY</div>
                    {[
                      { k: 'Quantity', v: `${fmtK(parseFloat(orderForm.qty))} tCO2e` },
                      { k: 'Price/tonne', v: fmtUSD(orderForm.orderType === 'MARKET' ? selectedListing.askPrice : parseFloat(orderForm.price) || 0) },
                      { k: 'Subtotal', v: fmtUSD(total) },
                      { k: 'PANGEA Fee (2.5%)', v: fmtUSD(fee) },
                    ].map(r => (
                      <div key={r.k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                        <span style={{ color: '#4A6278' }}>{r.k}</span>
                        <span style={{ color: '#E8EFF6', fontFamily: 'JetBrains Mono, monospace' }}>{r.v}</span>
                      </div>
                    ))}
                    <div style={{ borderTop: '1px solid #1E2D3D', paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#E8EFF6' }}>Total</span>
                      <span style={{ fontSize: 18, fontWeight: 800, color: '#00FF94', fontFamily: 'Syne, sans-serif' }}>{fmtUSD(grand)}</span>
                    </div>
                  </div>
                )}

                {/* Submit */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={closeBuy} style={{ flex: 1, background: 'transparent', border: '1px solid #1E2D3D', borderRadius: 9, color: '#4A6278', padding: 12, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button onClick={placeOrder} disabled={placing || !orderForm.qty || parseFloat(orderForm.qty) <= 0}
                    style={{ flex: 2, background: placing ? '#1E2D3D' : '#00FF94', color: '#080B0F', border: 'none', borderRadius: 9, padding: 12, fontWeight: 800, fontSize: 14, cursor: placing ? 'wait' : 'pointer', fontFamily: 'Syne, sans-serif' }}>
                    {placing ? 'Processing...' : `Confirm Order · ${fmtUSD(grand)}`}
                  </button>
                </div>
              </>
            ) : orderResult.error ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>❌</div>
                <div style={{ fontSize: 16, color: '#F87171', fontWeight: 700, marginBottom: 8 }}>Order Failed</div>
                <div style={{ fontSize: 13, color: '#8FA3B8', marginBottom: 20 }}>{orderResult.error}</div>
                <button onClick={() => setOrderResult(null)} style={{ background: 'transparent', border: '1px solid #1E2D3D', borderRadius: 8, color: '#4A6278', padding: '8px 20px', cursor: 'pointer' }}>
                  Try Again
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(0,255,148,0.12)', border: '2px solid rgba(0,255,148,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28 }}>✓</div>
                <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>{orderResult.orderId}</div>
                <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, color: '#00FF94', marginBottom: 8 }}>Order Confirmed!</h2>
                <p style={{ fontSize: 13, color: '#8FA3B8', marginBottom: 20, lineHeight: 1.7 }}>{orderResult.message}</p>
                <div style={{ background: '#121920', border: '1px solid #1E2D3D', borderRadius: 10, padding: 16, marginBottom: 20, textAlign: 'left' }}>
                  {[
                    { k: 'Order ID', v: orderResult.orderId },
                    { k: 'Quantity', v: `${fmtK(orderResult.quantity)} tCO2e` },
                    { k: 'Price', v: fmtUSD(orderResult.maxPrice) },
                    { k: 'PANGEA Fee', v: fmtUSD(orderResult.pangea_fee) },
                    { k: 'Total', v: fmtUSD(orderResult.total) },
                  ].map(r => (
                    <div key={r.k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                      <span style={{ color: '#4A6278' }}>{r.k}</span>
                      <span style={{ color: '#E8EFF6', fontFamily: 'JetBrains Mono, monospace' }}>{r.v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: '#4A6278', marginBottom: 20 }}>
                  Next step: {orderResult.nextStep}
                </div>
                <button onClick={() => { closeBuy(); setTab('portfolio'); }} style={{ background: '#00FF94', color: '#080B0F', border: 'none', borderRadius: 9, padding: '10px 28px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                  View in My Orders
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}
