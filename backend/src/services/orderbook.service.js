/**
 * PANGEA CARBON — Order Book Engine
 * Price-time priority matching (standard exchange algorithm)
 * Real price discovery via bid/ask spread compression
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Order book en mémoire (Redis en production)
const books = {}; // { standard: { bids: [], asks: [] } }

function getBook(standard) {
  if (!books[standard]) books[standard] = { bids: [], asks: [], trades: [] };
  return books[standard];
}

/**
 * Ajouter un ordre (bid ou ask)
 * Price-time priority: meilleur prix d'abord, puis ordre d'arrivée
 */
function addOrder({ standard, side, price, quantity, orderId, userId, timestamp = Date.now() }) {
  const book = getBook(standard);
  const order = { orderId, userId, standard, side, price: parseFloat(price), quantity: parseFloat(quantity), filledQty: 0, status: 'OPEN', timestamp };

  if (side === 'BUY') {
    book.bids.push(order);
    book.bids.sort((a, b) => b.price - a.price || a.timestamp - b.timestamp); // desc price, asc time
  } else {
    book.asks.push(order);
    book.asks.sort((a, b) => a.price - b.price || a.timestamp - b.timestamp); // asc price, asc time
  }

  const matches = matchOrders(standard);
  return { order, matches, bookDepth: getDepth(standard) };
}

/**
 * Matching engine — price-time priority
 */
function matchOrders(standard) {
  const book = getBook(standard);
  const trades = [];

  while (book.bids.length > 0 && book.asks.length > 0) {
    const bestBid = book.bids[0];
    const bestAsk = book.asks[0];

    if (bestBid.price < bestAsk.price) break; // No match

    const tradePrice = bestAsk.price; // Maker price (ask side)
    const tradeQty = Math.min(
      bestBid.quantity - bestBid.filledQty,
      bestAsk.quantity - bestAsk.filledQty
    );

    const trade = {
      tradeId:  `TRD-${standard.slice(0,3)}-${Date.now()}`,
      standard, price: tradePrice, quantity: tradeQty,
      buyOrderId: bestBid.orderId, sellOrderId: bestAsk.orderId,
      buyerId: bestBid.userId, sellerId: bestAsk.userId,
      timestamp: Date.now(),
    };

    trades.push(trade);
    book.trades.unshift(trade);
    if (book.trades.length > 100) book.trades = book.trades.slice(0, 100);

    bestBid.filledQty += tradeQty;
    bestAsk.filledQty += tradeQty;

    if (bestBid.filledQty >= bestBid.quantity) { bestBid.status = 'FILLED'; book.bids.shift(); }
    if (bestAsk.filledQty >= bestAsk.quantity) { bestAsk.status = 'FILLED'; book.asks.shift(); }
  }

  return trades;
}

/**
 * Profondeur du carnet d'ordres (10 niveaux)
 */
function getDepth(standard, levels = 10) {
  const book = getBook(standard);

  const aggregateSide = (orders) => {
    const agg = {};
    orders.forEach(o => {
      const qty = o.quantity - o.filledQty;
      if (qty > 0) agg[o.price] = (agg[o.price] || 0) + qty;
    });
    return Object.entries(agg)
      .map(([price, qty]) => ({ price: parseFloat(price), quantity: parseFloat(qty.toFixed(2)), total: parseFloat((price * qty).toFixed(2)) }))
      .slice(0, levels);
  };

  const bids = aggregateSide(book.bids).sort((a,b) => b.price - a.price);
  const asks = aggregateSide(book.asks).sort((a,b) => a.price - b.price);
  const bestBid = bids[0]?.price || 0;
  const bestAsk = asks[0]?.price || 0;
  const spread = bestAsk && bestBid ? parseFloat((bestAsk - bestBid).toFixed(3)) : null;
  const midPrice = bestBid && bestAsk ? parseFloat(((bestBid + bestAsk) / 2).toFixed(3)) : null;
  const lastTrade = book.trades[0] || null;

  return { standard, bids, asks, spread, midPrice, bestBid, bestAsk, lastTrade, recentTrades: book.trades.slice(0, 10) };
}

/**
 * Initialiser le carnet avec de la liquidité simulée réaliste
 * Basée sur des prix carbone réels CBL (jan 2026)
 */
function seedLiquidity(standard, midPrice) {
  const book = getBook(standard);
  if (book.bids.length > 0 || book.asks.length > 0) return;

  const spread = 0.04; // 4% bid-ask typique OTC
  const tickSize = midPrice > 20 ? 0.25 : 0.10;
  const levels = 5;

  // Générer des ordres acheteurs (bids)
  for (let i = 0; i < levels; i++) {
    const price = parseFloat((midPrice * (1 - spread/2) - i * tickSize).toFixed(2));
    const qty = Math.round(500 + Math.random() * 2000);
    book.bids.push({
      orderId: `SEED-BID-${standard}-${i}`, userId: 'MARKET_MAKER',
      standard, side: 'BUY', price, quantity: qty, filledQty: 0,
      status: 'OPEN', timestamp: Date.now() - i * 1000,
    });
  }
  book.bids.sort((a,b) => b.price - a.price || a.timestamp - b.timestamp);

  // Générer des ordres vendeurs (asks)
  for (let i = 0; i < levels; i++) {
    const price = parseFloat((midPrice * (1 + spread/2) + i * tickSize).toFixed(2));
    const qty = Math.round(300 + Math.random() * 1500);
    book.asks.push({
      orderId: `SEED-ASK-${standard}-${i}`, userId: 'MARKET_MAKER',
      standard, side: 'SELL', price, quantity: qty, filledQty: 0,
      status: 'OPEN', timestamp: Date.now() - i * 1000,
    });
  }
  book.asks.sort((a,b) => a.price - b.price || a.timestamp - b.timestamp);
}

/**
 * Stats de marché pour un standard
 */
function getMarketStats(standard) {
  const book = getBook(standard);
  const trades = book.trades;
  const volume24h = trades.filter(t => Date.now() - t.timestamp < 86400000).reduce((s,t) => s + t.quantity, 0);
  const value24h  = trades.filter(t => Date.now() - t.timestamp < 86400000).reduce((s,t) => s + t.quantity * t.price, 0);
  const depth = getDepth(standard);

  return {
    standard, volume24h, value24h,
    bestBid: depth.bestBid, bestAsk: depth.bestAsk,
    spread: depth.spread, midPrice: depth.midPrice,
    totalBidDepth: depth.bids.reduce((s,b) => s+b.quantity, 0),
    totalAskDepth: depth.asks.reduce((s,a) => s+a.quantity, 0),
    lastTradePrice: trades[0]?.price || null,
    tradeCount24h: trades.filter(t => Date.now() - t.timestamp < 86400000).length,
  };
}

module.exports = { addOrder, getDepth, getMarketStats, seedLiquidity, getBook };
