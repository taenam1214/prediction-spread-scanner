import type {
  RawPriceEvent,
  NormalizedPriceEvent,
  MarketPair,
} from "@spread-scanner/schemas";

/**
 * Normalizes a Polymarket CLOB order book into our common schema.
 *
 * Polymarket prices are in decimal 0–1 (e.g. 0.65 = 65% implied probability).
 * The best bid is the highest buy order; the best ask is the lowest sell order.
 */
export function normalizePolymarket(
  raw: RawPriceEvent,
  pair: MarketPair
): NormalizedPriceEvent | null {
  const payload = raw.rawPayload as any;

  const bids = payload.bids ?? [];
  const asks = payload.asks ?? [];

  if (bids.length === 0 && asks.length === 0) {
    return null; // no book data
  }

  const bestBid = bids.length > 0 ? parseFloat(bids[0].price) : 0;
  const bestAsk = asks.length > 0 ? parseFloat(asks[0].price) : 1;
  const midpoint = (bestBid + bestAsk) / 2;

  return {
    internalMarketId: `${pair.id}`,
    platform: "polymarket",
    platformMarketId: raw.platformMarketId,
    impliedProbability: midpoint, // midpoint as implied prob
    bestBid,
    bestAsk,
    midpoint,
    timestamp: raw.timestamp,
  };
}

/**
 * Normalizes Kalshi market data into our common schema.
 *
 * Kalshi prices are in cents (0–100) for a $1 binary contract.
 * yes_bid=65 means the best bid for YES is $0.65 → 65% implied probability.
 */
export function normalizeKalshi(
  raw: RawPriceEvent,
  pair: MarketPair
): NormalizedPriceEvent | null {
  const payload = raw.rawPayload as any;

  const yesBid = (payload.yes_bid ?? 0) / 100;
  const yesAsk = (payload.yes_ask ?? 100) / 100;
  const midpoint = (yesBid + yesAsk) / 2;

  return {
    internalMarketId: `${pair.id}`,
    platform: "kalshi",
    platformMarketId: raw.platformMarketId,
    impliedProbability: midpoint,
    bestBid: yesBid,
    bestAsk: yesAsk,
    midpoint,
    timestamp: raw.timestamp,
  };
}
