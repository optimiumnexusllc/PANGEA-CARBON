'use client';
import { useLang } from '@/lib/lang-context';
import { useEffect, useState } from 'react';
import { apiExt } from '@/lib/api';

const fmt = (n: number, d = 0) => n?.toLocaleString('fr-FR', { maximumFractionDigits: d }) ?? '0';
const fmtUSD = (n: number, d = 2) => '$' + n?.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });

const STANDARD_COLOR: Record<string, string> = {
  VERRA_VCS: '#00FF94', GOLD_STANDARD: '#FCD34D',
  ARTICLE6: '#38BDF8', CORSIA: '#F87171', BIOMASS: '#EF9F27',
};
const STANDARD_LABEL: Record<string, string> = {
  VERRA_VCS: 'Verra VCS', GOLD_STANDARD: 'Gold Standard',
  ARTICLE6: 'Article 6', CORSIA: 'CORSIA', BIOMASS: 'Biomasse',
};

export default function MarketplacePage() {
  const { t } = useLang();
  const [prices, setPrices] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ standard: '', country: '', maxPrice: '' });
  const [bidModal, setBidModal] = useState<any>(null);
  const [bidQty, setBidQty] = useState('');
  const [bidPrice, setBidPrice] = useState('');
  const [bidResult, setBidResult] = useState<any>(null);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    Promise.all([
      apiExt.getPrices(),
      apiExt.getListings(),
      apiExt.getMarketStats(),
    ]).then(([p, l, s]) => {
      setPrices(p.prices || []);
      setListings(l.listings || []);
      setStats(s);
    }).catch(console.error).finally(() => setLoading(false));

    // Refresh prix toutes les 30s
    const interval = setInterval(() => {
      apiExt.getPrices().then(p => setPrices(p.prices || [])).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredListings = listings.filter(l =>
    (!filter.standard || l.standard === filter.standard) &&
    (!filter.country || l.project?.countryCode === filter.country) &&
    (!filter.maxPrice || l.askPrice <= parseFloat(filter.maxPrice))
  );

  const placeBid = async () => {
    if (!bidModal || !bidQty || !bidPrice) return;
    setPlacing(true);
    try {
      const result = await apiExt.placeBid({ listingId: bidModal.id, quantity: parseFloat(bidQty), maxPrice: parseFloat(bidPrice) });
      setBidResult(result);
    } catch (e: any) {
      setBidResult({ error: e.message });
    } finally { setPlacing(false); }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1300, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, color: '#A78BFA', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>CARBON MARKETPLACE · PANGEA CARBON</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: '#E8EFF6', margin: 0 }}>Carbon Marketplace</h1>
            <p style={{ fontSize: 13, color: '#4A6278', marginTop: 4 }}>Place de marché crédits carbone africains · Commission PANGEA CARBON: 2.5%</p>
          </div>
          <div style={{ display: 'flex', align: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00FF94', animation: 'pulse 2s infinite', alignSelf: 'center' }}/>
            <span style={{ fontSize: 12, color: '#00FF94', fontFamily: 'JetBrains Mono, monospace' }}>MARCHÉ OUVERT</span>
          </div>
        </div>
      </div>

      {/* Stats globales */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Crédits disponibles', value: `${fmt(stats.totalAvailable)} tCO₂e`, color: '#00FF94' },
            { label: 'Crédits retirés', value: `${fmt(stats.totalRetired)} tCO₂e`, color: '#4A6278' },
            { label: 'Annonces actives', value: stats.activeListings, color: '#38BDF8' },
            { label: 'Marché africain', value: '$400M+', color: '#A78BFA' },
          ].map(k => (
            <div key={k.label} style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>{k.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: k.color, fontFamily: 'Syne, sans-serif' }}>{String(k.value)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Prix live */}
      <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, marginBottom: 20, overflow: 'hidden' }}>
        <div style={{ padding: '10px 18px', background: '#121920', borderBottom: '1px solid #1E2D3D', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>PRIX LIVE — XPANSIV CBL REFERENCE · Actualisation 30s</div>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00FF94', animation: 'pulse 2s infinite' }}/>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {prices.map((p: any, i: number) => {
            const color = STANDARD_COLOR[p.standard] || '#8FA3B8';
            const up = p.change >= 0;
            return (
              <div key={p.standard} style={{ padding: '14px 16px', borderRight: i < prices.length - 1 ? '1px solid rgba(30,45,61,0.4)' : 'none' }}>
                <div style={{ fontSize: 10, color, fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>{STANDARD_LABEL[p.standard] || p.standard}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: 'Syne, sans-serif' }}>{fmtUSD(p.last)}</div>
                <div style={{ fontSize: 11, color: up ? '#00FF94' : '#F87171', marginTop: 2 }}>
                  {up ? '▲' : '▼'} {Math.abs(p.change).toFixed(2)} ({up ? '+' : ''}{p.changeP?.toFixed(1)}%)
                </div>
                <div style={{ fontSize: 10, color: '#2A3F55', marginTop: 4 }}>
                  Bid: {fmtUSD(p.bid)} · Ask: {fmtUSD(p.ask)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={filter.standard} onChange={e => setFilter(f => ({ ...f, standard: e.target.value }))}
          style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '8px 12px', fontSize: 13 }}>
          <option value="">Tous les standards</option>
          {Object.entries(STANDARD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filter.country} onChange={e => setFilter(f => ({ ...f, country: e.target.value }))}
          style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '8px 12px', fontSize: 13 }}>
          <option value="">Tous les pays</option>
          {['CI','KE','NG','GH','SN','MA','ZA','ET'].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="number" placeholder="Prix max ($/t)" value={filter.maxPrice}
          onChange={e => setFilter(f => ({ ...f, maxPrice: e.target.value }))}
          style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '8px 12px', fontSize: 13, width: 160, outline: 'none' }}/>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#4A6278' }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{filteredListings.length} annonces</span>
        </div>
      </div>

      {/* Listings */}
      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: '#4A6278' }}>Chargement du marché...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {filteredListings.map((listing: any) => {
            const color = STANDARD_COLOR[listing.standard] || '#8FA3B8';
            const label = STANDARD_LABEL[listing.standard] || listing.standard;
            return (
              <div key={listing.id} style={{ background: '#0D1117', border: `1px solid ${color}20`, borderRadius: 12, padding: 18, transition: 'all 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${color}45`; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${color}20`; (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#E8EFF6', marginBottom: 3 }}>
                      {listing.project?.name || 'Projet carbone africain'}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ fontSize: 10, background: `${color}15`, color, border: `1px solid ${color}25`, borderRadius: 4, padding: '2px 7px', fontFamily: 'JetBrains Mono, monospace' }}>{label}</span>
                      <span style={{ fontSize: 10, background: 'rgba(74,98,120,0.3)', color: '#8FA3B8', borderRadius: 4, padding: '2px 7px', fontFamily: 'JetBrains Mono, monospace' }}>
                        {listing.project?.countryCode} · {listing.project?.type}
                      </span>
                    </div>
                  </div>
                  {listing.verified && <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,255,148,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>✓</div>}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 3 }}>DISPONIBLE</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: color, fontFamily: 'Syne, sans-serif' }}>{fmt(listing.availableQty || listing.quantity)}</div>
                    <div style={{ fontSize: 10, color: '#4A6278' }}>tCO₂e · Vintage {listing.vintage}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 3 }}>PRIX ASK</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#FCD34D', fontFamily: 'Syne, sans-serif' }}>{fmtUSD(listing.askPrice)}</div>
                    <div style={{ fontSize: 10, color: '#4A6278' }}>$/tCO₂e</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid rgba(30,45,61,0.4)' }}>
                  <div style={{ fontSize: 11, color: '#4A6278' }}>
                    Total: <span style={{ color: '#E8EFF6', fontWeight: 600 }}>{fmtUSD((listing.availableQty || listing.quantity) * listing.askPrice, 0)}</span>
                    <span style={{ color: '#2A3F55' }}> + 2.5% fee</span>
                  </div>
                  <button onClick={() => { setBidModal(listing); setBidQty(''); setBidPrice(String(listing.askPrice.toFixed(2))); setBidResult(null); }}
                    style={{ background: color, color: '#080B0F', border: 'none', borderRadius: 6, padding: '7px 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                    Acheter →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bid modal */}
      {bidModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#121920', border: '1px solid #1E2D3D', borderRadius: 14, padding: 28, width: '100%', maxWidth: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, color: '#E8EFF6', margin: 0 }}>Ordre d'achat</h2>
              <button onClick={() => { setBidModal(null); setBidResult(null); }} style={{ background: 'none', border: 'none', color: '#4A6278', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>

            {bidResult ? (
              bidResult.error ? (
                <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8, padding: 16, color: '#F87171', fontSize: 13 }}>
                  ✗ {bidResult.error}
                </div>
              ) : (
                <div>
                  <div style={{ background: 'rgba(0,255,148,0.08)', border: '1px solid rgba(0,255,148,0.2)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#00FF94', marginBottom: 8 }}>✓ Ordre #{bidResult.orderId}</div>
                    <div style={{ fontSize: 12, color: '#8FA3B8', lineHeight: 1.7 }}>{bidResult.message}</div>
                  </div>
                  <div style={{ fontSize: 12, color: '#4A6278' }}>
                    Quantité: <strong style={{ color: '#E8EFF6' }}>{bidResult.quantity} tCO₂e</strong> ·
                    Fee PANGEA: <strong style={{ color: '#E8EFF6' }}>{fmtUSD(bidResult.pangea_fee)}</strong> ·
                    Total: <strong style={{ color: '#FCD34D' }}>{fmtUSD(bidResult.total)}</strong>
                  </div>
                  <div style={{ marginTop: 16, padding: 12, background: '#0D1117', borderRadius: 8, fontSize: 12, color: '#4A6278' }}>
                    📧 Prochaine étape: {bidResult.nextStep}
                  </div>
                </div>
              )
            ) : (
              <>
                <div style={{ background: '#0D1117', borderRadius: 8, padding: 14, marginBottom: 18, fontSize: 12 }}>
                  <div style={{ fontWeight: 600, color: '#E8EFF6', marginBottom: 4 }}>{bidModal.project?.name}</div>
                  <div style={{ color: '#4A6278' }}>{STANDARD_LABEL[bidModal.standard]} · Vintage {bidModal.vintage} · {bidModal.project?.countryCode}</div>
                </div>
                {[
                  { label: 'Quantité (tCO₂e)', val: bidQty, set: setBidQty, type: 'number', placeholder: `Max: ${fmt(bidModal.availableQty || bidModal.quantity)}` },
                  { label: 'Prix max ($/tCO₂e)', val: bidPrice, set: setBidPrice, type: 'number', placeholder: `Ask: ${fmtUSD(bidModal.askPrice)}` },
                ].map(f => (
                  <div key={f.label} style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 5, textTransform: 'uppercase' as const }}>{f.label}</label>
                    <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                      style={{ width: '100%', background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' as const, outline: 'none' }}/>
                  </div>
                ))}
                {bidQty && bidPrice && (
                  <div style={{ padding: '10px 14px', background: 'rgba(252,211,77,0.06)', borderRadius: 8, border: '1px solid rgba(252,211,77,0.15)', marginBottom: 16, fontSize: 13 }}>
                    Subtotal: <strong style={{ color: '#FCD34D' }}>{fmtUSD(parseFloat(bidQty) * parseFloat(bidPrice))}</strong>
                    {' '}+ Fee 2.5%: <strong style={{ color: '#FCD34D' }}>{fmtUSD(parseFloat(bidQty) * parseFloat(bidPrice) * 0.025)}</strong>
                    {' '}= <strong style={{ color: '#FCD34D' }}>{fmtUSD(parseFloat(bidQty) * parseFloat(bidPrice) * 1.025)}</strong>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setBidModal(null)} style={{ flex: 1, background: 'transparent', border: '1px solid #1E2D3D', borderRadius: 8, color: '#4A6278', padding: '10px', cursor: 'pointer' }}>Annuler</button>
                  <button onClick={placeBid} disabled={placing || !bidQty || !bidPrice}
                    style={{ flex: 1, background: placing ? '#1E2D3D' : '#A78BFA', color: placing ? '#4A6278' : '#080B0F', border: 'none', borderRadius: 8, padding: '10px', fontWeight: 700, cursor: 'pointer' }}>
                    {placing ? '⏳...' : 'Placer l\'ordre →'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}
