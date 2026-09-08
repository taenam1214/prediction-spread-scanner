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

// --- Analytics Types ---

export interface AnalyticsSummary {
  totalLeadLagComputations: number;
  totalLiquiditySnapshots: number;
  avgCorrelation: number;
  dominantLeader: "polymarket" | "kalshi" | null;
  avgLiquidityIndex: number;
}

export interface LeadLagRow {
  id: number;
  market_pair_id: number;
  label: string;
  window_start: string;
  window_end: string;
  leader: "polymarket" | "kalshi";
  lag_ms: number;
  correlation: number;
  sample_size: number;
  computed_at: string;
}

export interface LiquidityRow {
  id: number;
  market_pair_id: number;
  platform: string;
  spread_bps: number;
  depth_score: number;
  liquidity_index: number;
  best_bid: number;
  best_ask: number;
  captured_at: string;
}

export interface ExecutionSimResult {
  request: {
    marketPairId: number;
    platform: string;
    sizeUsd: number;
    latencyMs: number;
  };
  slippageBps: number;
  latencyPenaltyBps: number;
  totalCostBps: number;
  effectiveSpread: number;
  profitable: boolean;
  expectedPnl: number;
}

export interface SpreadHalfLifeData {
  marketPairId: number;
  halfLifeMs: number;
  lambda: number;
  r2: number;
  sampleSize: number;
}

export interface CalibrationBucket {
  bucketStart: number;
  bucketEnd: number;
  avgPredicted: number;
  avgActual: number;
  count: number;
}

export interface CalibrationData {
  platform: string;
  brierScore: number;
  buckets: CalibrationBucket[];
  totalResolved: number;
}

// --- Analytics API Functions ---

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  return fetchJson<AnalyticsSummary>("/api/analytics/summary");
}

export async function getLeadLagResults(
  limit = 50
): Promise<LeadLagRow[]> {
  const data = await fetchJson<{ results: LeadLagRow[] }>(
    `/api/analytics/lead-lag?limit=${limit}`
  );
  return data.results;
}

export async function getLeadLagForMarket(
  id: number,
  limit = 50
): Promise<{ latest: LeadLagRow | null; results: LeadLagRow[] }> {
  return fetchJson(`/api/analytics/lead-lag/${id}?limit=${limit}`);
}

export async function getLiquidityHistory(
  id: number,
  limit = 200
): Promise<LiquidityRow[]> {
  const data = await fetchJson<{ history: LiquidityRow[] }>(
    `/api/analytics/liquidity/${id}?limit=${limit}`
  );
  return data.history;
}

export async function getLatestLiquidity(
  id: number
): Promise<LiquidityRow[]> {
  const data = await fetchJson<{ snapshots: LiquidityRow[] }>(
    `/api/analytics/liquidity/${id}/latest`
  );
  return data.snapshots;
}

export async function simulateExecution(
  id: number,
  platform = "polymarket",
  sizeUsd = 1000,
  latencyMs = 200
): Promise<ExecutionSimResult> {
  return fetchJson<ExecutionSimResult>(
    `/api/analytics/simulate/${id}?platform=${platform}&size=${sizeUsd}&latency=${latencyMs}`
  );
}

export async function simulateExecutionBatch(
  id: number,
  platform = "polymarket"
): Promise<ExecutionSimResult[]> {
  const data = await fetchJson<{ results: ExecutionSimResult[] }>(
    `/api/analytics/simulate/${id}/batch?platform=${platform}`
  );
  return data.results;
}

export async function getSpreadHalfLife(
  id: number
): Promise<SpreadHalfLifeData> {
  return fetchJson<SpreadHalfLifeData>(`/api/analytics/half-life/${id}`);
}

export async function getCalibration(
  platform = "polymarket"
): Promise<CalibrationData> {
  return fetchJson<CalibrationData>(
    `/api/analytics/calibration?platform=${platform}`
  );
}
