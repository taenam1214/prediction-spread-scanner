import { insertLiquiditySnapshot } from "@spread-scanner/db";
import type {
  NormalizedPriceEvent,
  LiquiditySnapshot,
} from "@spread-scanner/schemas";

/**
 * Compute quoted spread in basis points from best bid/ask.
 * spreadBps = (ask - bid) / midpoint * 10000
 */
export function computeQuotedSpreadBps(
  bestBid: number,
  bestAsk: number
): number {
  if (bestBid <= 0 || bestAsk <= 0) return 0;
  const mid = (bestBid + bestAsk) / 2;
  if (mid === 0) return 0;
  return ((bestAsk - bestBid) / mid) * 10_000;
}

/**
 * Compute depth score: 1 - clamp(spreadBps / 500, 0, 1)
 * A tighter spread yields a higher depth score (closer to 1).
 */
export function computeDepthScore(spreadBps: number): number {
  return 1 - Math.min(Math.max(spreadBps / 500, 0), 1);
}

/**
 * Compute liquidity index = depthScore * 100
 * Range: 0 (illiquid) to 100 (very liquid).
 */
export function computeLiquidityIndex(depthScore: number): number {
  return depthScore * 100;
}

/**
 * Build a LiquiditySnapshot from a normalized price event.
 */
export function buildLiquiditySnapshot(
  event: NormalizedPriceEvent & { marketPairId: number }
): LiquiditySnapshot {
  const spreadBps = computeQuotedSpreadBps(event.bestBid, event.bestAsk);
  const depthScore = computeDepthScore(spreadBps);
  const liquidityIndex = computeLiquidityIndex(depthScore);

  return {
    marketPairId: event.marketPairId,
    platform: event.platform,
    spreadBps: parseFloat(spreadBps.toFixed(2)),
    depthScore: parseFloat(depthScore.toFixed(4)),
    liquidityIndex: parseFloat(liquidityIndex.toFixed(2)),
    bestBid: event.bestBid,
    bestAsk: event.bestAsk,
    capturedAt: event.timestamp,
  };
}

/**
 * Process a single normalized price event: build snapshot and persist.
 */
export async function processLiquidityEvent(
  event: NormalizedPriceEvent & { marketPairId: number }
): Promise<LiquiditySnapshot> {
  const snapshot = buildLiquiditySnapshot(event);
  await insertLiquiditySnapshot(snapshot);
  return snapshot;
}
