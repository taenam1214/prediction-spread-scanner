import type {
  ExecutionSimulationRequest,
  ExecutionSimulationResult,
} from "@spread-scanner/schemas";
import { PLATFORM_FEES } from "@spread-scanner/schemas";

/**
 * Estimate slippage in basis points as a function of order size.
 * slippage = halfSpread + 50bps * (sizeUsd / $1000)
 *
 * Assumes linear impact — larger orders move the book further.
 */
export function estimateSlippageBps(
  spreadBps: number,
  sizeUsd: number
): number {
  const halfSpread = spreadBps / 2;
  const sizeImpact = 50 * (sizeUsd / 1000);
  return halfSpread + sizeImpact;
}

/**
 * Compute the latency penalty in basis points.
 * The longer the latency, the more the price can move against us.
 * latencyPenalty = spreadBps * (1 - e^(-latencyMs / 2000))
 */
export function computeLatencyPenaltyBps(
  spreadBps: number,
  latencyMs: number
): number {
  return spreadBps * (1 - Math.exp(-latencyMs / 2000));
}

/**
 * Simulate execution of a trade and estimate profitability.
 * Combines slippage, latency penalty, and platform fees.
 */
export function simulateExecution(
  req: ExecutionSimulationRequest,
  currentSpreadBps: number,
  feeAdjustedSpread: number
): ExecutionSimulationResult {
  const slippageBps = estimateSlippageBps(currentSpreadBps, req.sizeUsd);
  const latencyPenaltyBps = computeLatencyPenaltyBps(
    currentSpreadBps,
    req.latencyMs
  );

  const platformFeeBps =
    PLATFORM_FEES[req.platform].takerFee * 10_000; // convert to bps

  const totalCostBps = slippageBps + latencyPenaltyBps + platformFeeBps;
  const effectiveSpread = currentSpreadBps - totalCostBps;
  const profitable = effectiveSpread > 0;

  // expectedPnl: fraction of $1 per contract, scaled by size
  const expectedPnl = profitable
    ? (effectiveSpread / 10_000) * req.sizeUsd
    : -(totalCostBps / 10_000) * req.sizeUsd;

  return {
    request: req,
    slippageBps: parseFloat(slippageBps.toFixed(2)),
    latencyPenaltyBps: parseFloat(latencyPenaltyBps.toFixed(2)),
    totalCostBps: parseFloat(totalCostBps.toFixed(2)),
    effectiveSpread: parseFloat(effectiveSpread.toFixed(2)),
    profitable,
    expectedPnl: parseFloat(expectedPnl.toFixed(4)),
  };
}
