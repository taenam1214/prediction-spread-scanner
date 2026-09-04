import axios, { AxiosInstance } from "axios";

/**
 * Polymarket CLOB API client.
 *
 * Uses the public CLOB API endpoint to fetch order book data.
 * Docs: https://docs.polymarket.com/
 *
 * For the MVP, we poll the REST API. A production version would use
 * the WebSocket feed for lower latency.
 */

const CLOB_BASE_URL = "https://clob.polymarket.com";

const client: AxiosInstance = axios.create({
  baseURL: CLOB_BASE_URL,
  timeout: 10_000,
  headers: { "Content-Type": "application/json" },
});

// Retry with exponential backoff for rate limits
let consecutiveErrors = 0;

export interface PolymarketOrderbook {
  market: string;
  asset_id: string;
  bids: Array<{ price: string; size: string }>;
  asks: Array<{ price: string; size: string }>;
  hash: string;
  timestamp: string;
}

/**
 * Fetches the current order book for a Polymarket market/condition token.
 *
 * In the real Polymarket CLOB, the `token_id` is the condition token ID
 * for the YES outcome. For our MVP with seeded market IDs, we simulate
 * a realistic response shape when the API is unreachable.
 */
export async function fetchPolymarketOrderbook(
  marketId: string
): Promise<Record<string, unknown>> {
  try {
    // Attempt real API call
    const response = await client.get(`/book`, {
      params: { token_id: marketId },
    });
    consecutiveErrors = 0;
    return response.data;
  } catch (err: any) {
    consecutiveErrors++;

    // If the market ID is a seed/demo ID (starts with "poly_"), generate simulated data
    if (marketId.startsWith("poly_")) {
      return generateSimulatedOrderbook(marketId);
    }

    // For real market IDs, apply backoff
    const backoffMs = Math.min(1000 * 2 ** consecutiveErrors, 30_000);
    console.warn(
      `[polymarket-client] API error (attempt ${consecutiveErrors}), ` +
        `backing off ${backoffMs}ms: ${err.message}`
    );
    await sleep(backoffMs);
    throw err;
  }
}

/**
 * Generates a simulated order book for demo/seeded market pairs.
 * Produces realistic-looking price data with slight random walk.
 */
const priceState: Map<string, number> = new Map();

function generateSimulatedOrderbook(
  marketId: string
): Record<string, unknown> {
  // Initialize or random-walk the price
  let mid = priceState.get(marketId) ?? 0.3 + Math.random() * 0.4;
  mid += (Math.random() - 0.5) * 0.02; // random walk ±1%
  mid = Math.max(0.05, Math.min(0.95, mid)); // clamp
  priceState.set(marketId, mid);

  const spread = 0.01 + Math.random() * 0.02; // 1–3% spread
  const bestBid = Math.max(0.01, mid - spread / 2);
  const bestAsk = Math.min(0.99, mid + spread / 2);

  return {
    market: marketId,
    asset_id: marketId,
    bids: [
      { price: bestBid.toFixed(4), size: (100 + Math.random() * 500).toFixed(0) },
      { price: (bestBid - 0.01).toFixed(4), size: (200 + Math.random() * 300).toFixed(0) },
    ],
    asks: [
      { price: bestAsk.toFixed(4), size: (100 + Math.random() * 500).toFixed(0) },
      { price: (bestAsk + 0.01).toFixed(4), size: (200 + Math.random() * 300).toFixed(0) },
    ],
    timestamp: new Date().toISOString(),
    hash: `sim_${Date.now()}`,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
