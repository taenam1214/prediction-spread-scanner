import {
  getActiveMarketPairs,
  getPriceSnapshotsInWindow,
  insertLeadLagResult,
} from "@spread-scanner/db";
import type { LeadLagResult } from "@spread-scanner/schemas";

interface TimeSeries {
  timestamps: number[]; // epoch ms
  values: number[];
}

/**
 * Align two time series onto a common time grid using nearest-neighbor interpolation.
 * Returns aligned arrays of equal length.
 */
export function alignTimeSeries(
  a: TimeSeries,
  b: TimeSeries,
  intervalMs: number
): { alignedA: number[]; alignedB: number[]; timestamps: number[] } {
  if (a.timestamps.length === 0 || b.timestamps.length === 0) {
    return { alignedA: [], alignedB: [], timestamps: [] };
  }

  const start = Math.max(a.timestamps[0], b.timestamps[0]);
  const end = Math.min(
    a.timestamps[a.timestamps.length - 1],
    b.timestamps[b.timestamps.length - 1]
  );

  if (start >= end) return { alignedA: [], alignedB: [], timestamps: [] };

  const timestamps: number[] = [];
  const alignedA: number[] = [];
  const alignedB: number[] = [];

  let ai = 0;
  let bi = 0;

  for (let t = start; t <= end; t += intervalMs) {
    // Find nearest value in a
    while (ai < a.timestamps.length - 1 && a.timestamps[ai + 1] <= t) ai++;
    // Find nearest value in b
    while (bi < b.timestamps.length - 1 && b.timestamps[bi + 1] <= t) bi++;

    timestamps.push(t);
    alignedA.push(a.values[ai]);
    alignedB.push(b.values[bi]);
  }

  return { alignedA, alignedB, timestamps };
}

/**
 * Compute normalized cross-correlation R_xy[k] at a specific lag k.
 * R_xy[k] = sum((x[i] - mean_x) * (y[i+k] - mean_y)) / (N * std_x * std_y)
 */
export function crossCorrelation(x: number[], y: number[], lag: number): number {
  const n = x.length;
  if (n < 2) return 0;

  const meanX = x.reduce((s, v) => s + v, 0) / n;
  const meanY = y.reduce((s, v) => s + v, 0) / n;

  let varX = 0;
  let varY = 0;
  for (let i = 0; i < n; i++) {
    varX += (x[i] - meanX) ** 2;
    varY += (y[i] - meanY) ** 2;
  }
  const stdX = Math.sqrt(varX / n);
  const stdY = Math.sqrt(varY / n);

  if (stdX === 0 || stdY === 0) return 0;

  let sum = 0;
  let count = 0;
  for (let i = 0; i < n; i++) {
    const j = i + lag;
    if (j >= 0 && j < n) {
      sum += (x[i] - meanX) * (y[j] - meanY);
      count++;
    }
  }

  return count > 0 ? sum / (count * stdX * stdY) : 0;
}

/**
 * Find the lag k in [-maxLag, +maxLag] that maximizes |R_xy[k]|.
 * Positive lag means x leads y; negative means y leads x.
 */
export function findOptimalLag(
  x: number[],
  y: number[],
  maxLag: number
): { lag: number; correlation: number } {
  let bestLag = 0;
  let bestCorr = -Infinity;

  for (let k = -maxLag; k <= maxLag; k++) {
    const corr = crossCorrelation(x, y, k);
    if (Math.abs(corr) > Math.abs(bestCorr)) {
      bestCorr = corr;
      bestLag = k;
    }
  }

  return { lag: bestLag, correlation: bestCorr };
}

/**
 * Compute lead-lag for a single market pair over a time window.
 * Fetches price snapshots, aligns them, and runs cross-correlation.
 */
export async function computeLeadLag(
  marketPairId: number,
  windowStart: string,
  windowEnd: string,
  intervalMs = 30_000, // 30s grid
  maxLag = 20
): Promise<LeadLagResult | null> {
  const snapshots = await getPriceSnapshotsInWindow(
    marketPairId,
    windowStart,
    windowEnd
  );

  const polyData: TimeSeries = { timestamps: [], values: [] };
  const kalshiData: TimeSeries = { timestamps: [], values: [] };

  for (const row of snapshots) {
    const ts = new Date(row.captured_at).getTime();
    if (row.platform === "polymarket") {
      polyData.timestamps.push(ts);
      polyData.values.push(parseFloat(row.implied_probability));
    } else {
      kalshiData.timestamps.push(ts);
      kalshiData.values.push(parseFloat(row.implied_probability));
    }
  }

  const { alignedA, alignedB, timestamps } = alignTimeSeries(
    polyData,
    kalshiData,
    intervalMs
  );

  if (alignedA.length < 10) return null; // not enough data

  const { lag, correlation } = findOptimalLag(alignedA, alignedB, maxLag);

  // Positive lag means polymarket leads (polymarket price change appears
  // in kalshi `lag` steps later). Negative means kalshi leads.
  const leader = lag >= 0 ? "polymarket" : "kalshi";
  const lagMs = Math.abs(lag) * intervalMs;

  return {
    marketPairId,
    windowStart,
    windowEnd,
    leader: leader as "polymarket" | "kalshi",
    lagMs,
    correlation: parseFloat(Math.abs(correlation).toFixed(4)),
    sampleSize: alignedA.length,
    computedAt: new Date().toISOString(),
  };
}

/**
 * Run lead-lag analysis for all active market pairs over the last hour.
 * Inserts results into DB and returns them.
 */
export async function runLeadLagForAllPairs(): Promise<LeadLagResult[]> {
  const pairs = await getActiveMarketPairs();
  const now = new Date();
  const windowEnd = now.toISOString();
  const windowStart = new Date(now.getTime() - 60 * 60 * 1000).toISOString(); // 1 hour

  const results: LeadLagResult[] = [];

  for (const pair of pairs) {
    try {
      const result = await computeLeadLag(pair.id, windowStart, windowEnd);
      if (result) {
        const id = await insertLeadLagResult(result);
        results.push({ ...result, id });
      }
    } catch (err: any) {
      console.error(
        `[analytics] Lead-lag error for market ${pair.id}: ${err.message}`
      );
    }
  }

  return results;
}
