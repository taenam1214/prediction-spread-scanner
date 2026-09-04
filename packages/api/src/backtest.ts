import { pool } from "@spread-scanner/db";
import { PLATFORM_FEES } from "@spread-scanner/schemas";
import type { BacktestResult, BacktestEntry } from "@spread-scanner/schemas";

/**
 * Runs a backtest over all historical opportunities and resolutions.
 *
 * Strategy: for each opportunity where fee_adjusted_spread >= threshold,
 * simulate buying the cheaper side. At resolution, determine if the
 * cheaper side was correct (win) or not (loss).
 *
 * Without resolutions, we fall back to checking if the spread converged
 * (opportunity closed), treating convergence as a "win" (the position
 * could have been closed at a profit as the prices converged).
 */
export async function runBacktest(threshold: number): Promise<BacktestResult> {
  // Get all opportunities above threshold
  const { rows: opportunities } = await pool.query(
    `SELECT o.*, mp.label
     FROM opportunities o
     JOIN market_pairs mp ON mp.id = o.market_pair_id
     WHERE o.fee_adjusted_spread >= $1
     ORDER BY o.detected_at ASC`,
    [threshold]
  );

  // Get all resolutions
  const { rows: resolutions } = await pool.query(
    `SELECT * FROM resolutions`
  );
  const resolutionMap = new Map(
    resolutions.map((r: any) => [r.market_pair_id, r])
  );

  const entries: BacktestEntry[] = [];
  let totalPnl = 0;
  let wins = 0;

  for (const opp of opportunities) {
    const resolution = resolutionMap.get(opp.market_pair_id);
    let outcome: "win" | "loss" | "pending";
    let pnl: number;
    let exitSpread: number;

    if (resolution) {
      // Market resolved — determine if the cheaper side was correct
      const cheaperPlatform = opp.cheaper_platform;
      const resolvedYes = resolution.outcome === "yes";

      // If we bought YES on the cheaper platform, and it resolved YES, we win
      // The profit is roughly the spread minus fees
      const cheaperProb =
        cheaperPlatform === "polymarket"
          ? opp.polymarket_prob
          : opp.kalshi_prob;
      const correctSide = resolvedYes
        ? cheaperProb < 0.5  // bought YES cheap
        : cheaperProb > 0.5; // bought NO cheap (equiv to selling YES expensive)

      // Simplification: if the cheaper side was the correct resolution,
      // profit ≈ (1 - cheaperProb) - fees
      // if wrong, loss ≈ cheaperProb - fees
      const totalFees =
        PLATFORM_FEES.polymarket.takerFee + PLATFORM_FEES.kalshi.takerFee;

      if (correctSide) {
        pnl = opp.spread - totalFees;
        outcome = "win";
        wins++;
      } else {
        pnl = -(opp.spread + totalFees);
        outcome = "loss";
      }

      exitSpread = 0; // resolved to 0/1
    } else if (!opp.still_open && opp.closed_at) {
      // Spread converged — treat as win (could have closed position)
      const totalFees =
        PLATFORM_FEES.polymarket.takerFee + PLATFORM_FEES.kalshi.takerFee;
      pnl = (opp.fee_adjusted_spread * 0.7); // partial capture assumption
      outcome = "win";
      wins++;
      exitSpread = opp.spread * 0.3; // converged to ~30% of entry
    } else {
      // Still open / pending
      pnl = 0;
      outcome = "pending";
      exitSpread = opp.spread;
    }

    const holdDuration = opp.closed_at
      ? new Date(opp.closed_at).getTime() - new Date(opp.detected_at).getTime()
      : 0;

    totalPnl += pnl;

    entries.push({
      marketPairId: opp.market_pair_id,
      label: opp.label,
      entrySpread: opp.spread,
      exitSpread,
      outcome,
      pnl: parseFloat(pnl.toFixed(4)),
      holdDurationMs: holdDuration,
    });
  }

  const resolvedEntries = entries.filter((e) => e.outcome !== "pending");
  const hitRate =
    resolvedEntries.length > 0 ? wins / resolvedEntries.length : 0;
  const avgSpread =
    entries.length > 0
      ? entries.reduce((s, e) => s + e.entrySpread, 0) / entries.length
      : 0;
  const avgConvergence =
    resolvedEntries.length > 0
      ? resolvedEntries.reduce((s, e) => s + e.holdDurationMs, 0) /
        resolvedEntries.length
      : 0;

  return {
    totalOpportunities: entries.length,
    hitRate,
    theoreticalPnl: parseFloat(totalPnl.toFixed(4)),
    avgSpread,
    avgTimeToConvergenceMs: avgConvergence,
    entries,
  };
}
