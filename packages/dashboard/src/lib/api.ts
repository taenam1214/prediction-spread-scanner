const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

export interface MarketData {
  id: number;
  label: string;
  category: string;
  polymarketMarketId: string;
  kalshiMarketId: string;
  resolvesAt: string | null;
  active: boolean;
  latestSpread: SpreadData | null;
  polymarketPrice: PriceData | null;
  kalshiPrice: PriceData | null;
}

export interface SpreadData {
  marketPairId: number;
  polymarketProb: number;
  kalshiProb: number;
  spread: number;
  feeAdjustedSpread: number;
  timestamp: string;
}

export interface PriceData {
  platform: string;
  impliedProbability: number;
  bestBid: number;
  bestAsk: number;
  midpoint: number;
  timestamp: string;
}

export interface OpportunityData {
  id: number;
  market_pair_id: number;
  label: string;
  detected_at: string;
  polymarket_prob: number;
  kalshi_prob: number;
  spread: number;
  fee_adjusted_spread: number;
  still_open: boolean;
  closed_at: string | null;
  cheaper_platform: string;
}

export interface PriceHistoryRow {
  platform: string;
  implied_probability: number;
  best_bid: number;
  best_ask: number;
  midpoint: number;
  captured_at: string;
}

export async function getMarkets(): Promise<MarketData[]> {
  const data = await fetchJson<{ markets: MarketData[] }>("/api/markets");
  return data.markets;
}

export async function getMarket(id: number): Promise<MarketData> {
  const data = await fetchJson<{ market: MarketData }>(`/api/markets/${id}`);
  return data.market;
}

export async function getMarketHistory(
  id: number,
  limit = 500
): Promise<PriceHistoryRow[]> {
  const data = await fetchJson<{ history: PriceHistoryRow[] }>(
    `/api/markets/${id}/history?limit=${limit}`
  );
  return data.history;
}

export async function getOpportunities(
  limit = 50,
  onlyOpen = false
): Promise<OpportunityData[]> {
  const data = await fetchJson<{ opportunities: OpportunityData[] }>(
    `/api/opportunities?limit=${limit}&open=${onlyOpen}`
  );
  return data.opportunities;
}

export async function getSpreads(): Promise<
  Array<{
    marketPairId: number;
    label: string;
    category: string;
    spread: SpreadData | null;
  }>
> {
  const data = await fetchJson<{ spreads: any[] }>("/api/spreads");
  return data.spreads;
}

export function createSpreadWebSocket(
  onMessage: (data: any) => void
): WebSocket {
  const wsUrl = API_BASE.replace(/^http/, "ws");
  const ws = new WebSocket(`${wsUrl}/ws/spreads`);
  ws.onmessage = (event) => {
    try {
      onMessage(JSON.parse(event.data));
    } catch {}
  };
  return ws;
}
