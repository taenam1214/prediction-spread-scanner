import { PLATFORM_FEES } from "./index";

/**
 * Computes the fee-adjusted spread between two platform probabilities.
 *
 * The adjustment subtracts estimated round-trip trading costs:
 * - If you see Polymarket at 60% and Kalshi at 70%, the raw spread is 10%.
 * - To capture this, you'd buy YES at 60¢ on Polymarket and sell (buy NO at 30¢) on Kalshi.
 * - Round-trip fees eat into both sides of the trade.
 *
 * This is a simplification — real fee structures depend on order type,
 * tier, and market liquidity. See README for assumptions.
 */
export function computeFeeAdjustedSpread(
  polyProb: number,
  kalshiProb: number
): { rawSpread: number; feeAdjustedSpread: number; totalFees: number } {
  const rawSpread = Math.abs(polyProb - kalshiProb);

  const totalFees =
    PLATFORM_FEES.polymarket.takerFee + PLATFORM_FEES.kalshi.takerFee;

  return {
    rawSpread,
    feeAdjustedSpread: rawSpread - totalFees,
    totalFees,
  };
}

/**
 * Returns which platform has the cheaper price for a YES outcome.
 */
export function cheaperPlatform(
  polyProb: number,
  kalshiProb: number
): "polymarket" | "kalshi" {
  return polyProb < kalshiProb ? "polymarket" : "kalshi";
}
