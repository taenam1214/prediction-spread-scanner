import axios, { AxiosInstance } from "axios";

/**
 * Kalshi Trading API client.
 *
 * Uses the public market data API to fetch order book snapshots.
 * Docs: https://trading-api.readme.io/reference
 *
 * For authenticated endpoints (trading), KALSHI_API_KEY and KALSHI_API_SECRET
 * environment variables are required. Market data is public.
 */

const KALSHI_API_BASE = "https://trading-api.kalshi.com/trade-api/v2";

const client: AxiosInstance = axios.create({
  baseURL: KALSHI_API_BASE,
  timeout: 10_000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

let consecutiveErrors = 0;

export interface KalshiOrderbook {
  ticker: string;
  yes_bid: number;
  yes_ask: number;
  no_bid: number;
  no_ask: number;
  last_price: number;
  volume: number;
}

/**
 * Fetches market data for a Kalshi ticker.
 * Falls back to simulated data for seeded/demo tickers.
 */
export async function fetchKalshiMarketData(
  ticker: string
): Promise<Record<string, unknown>> {
  try {
    const response = await client.get(`/markets/${ticker}`);
    consecutiveErrors = 0;
    return response.data?.market ?? response.data;
  } catch (err: any) {
    consecutiveErrors++;

    // For seed data tickers (uppercase with hyphens), simulate
    if (/^[A-Z]/.test(ticker)) {
      return generateSimulatedKalshiData(ticker);
    }

    const backoffMs = Math.min(1000 * 2 ** consecutiveErrors, 30_000);
    console.warn(
      `[kalshi-client] API error (attempt ${consecutiveErrors}), ` +
        `backing off ${backoffMs}ms: ${err.message}`
    );
    await sleep(backoffMs);
    throw err;
  }
}

/**
 * Generates simulated Kalshi market data for demo purposes.
 * Prices are in cents (0–100 for a $1 binary contract).
 */
const priceState: Map<string, number> = new Map();

function generateSimulatedKalshiData(
  ticker: string
): Record<string, unknown> {
  let yesPrice = priceState.get(ticker) ?? 30 + Math.random() * 40;
  yesPrice += (Math.random() - 0.5) * 2; // random walk ±1 cent
  yesPrice = Math.max(5, Math.min(95, yesPrice));
  priceState.set(ticker, yesPrice);

  const spread = 1 + Math.random() * 3; // 1–4 cent spread
  const yesBid = Math.max(1, yesPrice - spread / 2);
  const yesAsk = Math.min(99, yesPrice + spread / 2);

  return {
    ticker,
    yes_bid: Math.round(yesBid),
    yes_ask: Math.round(yesAsk),
    no_bid: Math.round(100 - yesAsk),
    no_ask: Math.round(100 - yesBid),
    last_price: Math.round(yesPrice),
    volume: Math.round(1000 + Math.random() * 5000),
    open_interest: Math.round(5000 + Math.random() * 20000),
    status: "active",
    result: null,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
