import { getLatestLiquidityByMarket } from "@spread-scanner/db";
import {
  REDIS_KEYS,
  PLATFORM_FEES,
} from "@spread-scanner/schemas";
import type {
  ExecutionSimulationRequest,
  ExecutionSimulationResult,
} from "@spread-scanner/schemas";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

// --- Simulation math (mirrored from analytics/execution-sim.ts) ---

function estimateSlippageBps(spreadBps: number, sizeUsd: number): number {
  const halfSpread = spreadBps / 2;
  const sizeImpact = 50 * (sizeUsd / 1000);
  return halfSpread + sizeImpact;
}

function computeLatencyPenaltyBps(
  spreadBps: number,
  latencyMs: number
): number {
  return spreadBps * (1 - Math.exp(-latencyMs / 2000));
}

function simulateExecution(
  req: ExecutionSimulationRequest,
  currentSpreadBps: number,
  feeAdjustedSpread: number
): ExecutionSimulationResult {
  const slippageBps = estimateSlippageBps(currentSpreadBps, req.sizeUsd);
  const latencyPenaltyBps = computeLatencyPenaltyBps(
    currentSpreadBps,
    req.latencyMs
  );

  const platformFeeBps = PLATFORM_FEES[req.platform].takerFee * 10_000;
  const totalCostBps = slippageBps + latencyPenaltyBps + platformFeeBps;
  const effectiveSpread = currentSpreadBps - totalCostBps;
  const profitable = effectiveSpread > 0;

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

// --- API functions ---

/**
 * Run execution simulation for a market pair on a specific platform.
 */
export async function runSimulation(
  marketPairId: number,
  platform: "polymarket" | "kalshi",
  sizeUsd: number,
  latencyMs: number
): Promise<ExecutionSimulationResult> {
  const spreadStr = await redis.get(REDIS_KEYS.latestSpread(marketPairId));
  let currentSpreadBps = 300; // default 3% = 300bps
  let feeAdjustedSpread = 0;

  if (spreadStr) {
    const spread = JSON.parse(spreadStr);
    currentSpreadBps = spread.spread * 10_000;
    feeAdjustedSpread = spread.feeAdjustedSpread;
  }

  const liquidity = await getLatestLiquidityByMarket(marketPairId);
  const platformLiq = liquidity.find(
    (l: any) => l.platform === platform
  );
  if (platformLiq) {
    currentSpreadBps = platformLiq.spread_bps;
  }

  const req: ExecutionSimulationRequest = {
    marketPairId,
    platform,
    sizeUsd,
    latencyMs,
  };

  return simulateExecution(req, currentSpreadBps, feeAdjustedSpread);
}

/**
 * Run batch simulations across multiple latency/size scenarios.
 */
export async function runBatchSimulation(
  marketPairId: number,
  platform: "polymarket" | "kalshi"
): Promise<ExecutionSimulationResult[]> {
  const sizes = [100, 500, 1000, 5000, 10000];
  const latencies = [50, 200, 500, 1000, 2000];

  const results: ExecutionSimulationResult[] = [];

  for (const sizeUsd of sizes) {
    for (const latencyMs of latencies) {
      const result = await runSimulation(
        marketPairId,
        platform,
        sizeUsd,
        latencyMs
      );
      results.push(result);
    }
  }

  return results;
}
