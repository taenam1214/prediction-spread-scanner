// Shared type definitions for prediction spread scanner events

export interface NormalizedPriceEvent {
  internalMarketId: string;
  platform: "polymarket" | "kalshi";
  platformMarketId: string;
  impliedProbability: number; // 0–1
  bestBid: number;
  bestAsk: number;
  midpoint: number;
  timestamp: string; // ISO 8601
}

export interface RawPriceEvent {
  platform: "polymarket" | "kalshi";
  platformMarketId: string;
  rawPayload: Record<string, unknown>;
  timestamp: string;
}

export interface Opportunity {
  id?: number;
  marketPairId: number;
  detectedAt: string;
  polymarketProb: number;
  kalshiProb: number;
  spread: number;
  feeAdjustedSpread: number;
  stillOpen: boolean;
  closedAt?: string | null;
}

export interface MarketPair {
  id: number;
  label: string;
  polymarketMarketId: string;
  kalshiMarketId: string;
  category: string;
  resolvesAt: string | null;
  active: boolean;
  createdAt: string;
}

export interface Resolution {
  id?: number;
  marketPairId: number;
  outcome: "yes" | "no";
  polymarketFinalProb: number;
  kalshiFinalProb: number;
  resolvedAt: string;
}

export interface SpreadSnapshot {
  marketPairId: number;
  polymarketProb: number;
  kalshiProb: number;
  spread: number;
  feeAdjustedSpread: number;
  timestamp: string;
}

export interface BacktestResult {
  totalOpportunities: number;
  hitRate: number;
  theoreticalPnl: number;
  avgSpread: number;
  avgTimeToConvergenceMs: number;
  entries: BacktestEntry[];
}

export interface BacktestEntry {
  marketPairId: number;
  label: string;
  entrySpread: number;
  exitSpread: number;
  outcome: "win" | "loss" | "pending";
  pnl: number;
  holdDurationMs: number;
}

// Platform fee constants (approximate, for signal computation)
export const PLATFORM_FEES = {
  polymarket: {
    takerFee: 0.02, // 2% taker fee
    makerFee: 0.0,
  },
  kalshi: {
    takerFee: 0.07, // ~7 cents per contract (on $1 contract)
    makerFee: 0.0,
  },
} as const;

export const DEFAULT_SPREAD_THRESHOLD = 0.03; // 3% fee-adjusted spread

// Kafka/Redpanda topic names
export const TOPICS = {
  RAW_PRICES: "raw-prices",
  NORMALIZED_PRICES: "normalized-prices",
  OPPORTUNITIES: "opportunities",
} as const;

// Redis key patterns
export const REDIS_KEYS = {
  latestPrice: (platform: string, marketPairId: number) =>
    `price:${platform}:${marketPairId}`,
  latestSpread: (marketPairId: number) => `spread:${marketPairId}`,
} as const;
