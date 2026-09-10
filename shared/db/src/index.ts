import { Pool, PoolClient } from "pg";
import type {
  MarketPair,
  NormalizedPriceEvent,
  Opportunity,
  Resolution,
  LeadLagResult,
  LiquiditySnapshot,
  AnalyticsSummary,
} from "@spread-scanner/schemas";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("[db] DATABASE_URL is required");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  statement_timeout: 30_000,
});

export { pool };

// --- Market Pairs ---

export async function getActiveMarketPairs(): Promise<MarketPair[]> {
  const { rows } = await pool.query(
    `SELECT id, label, category, polymarket_market_id, kalshi_market_id,
            resolves_at, active, created_at
     FROM market_pairs WHERE active = TRUE ORDER BY id`
  );
  return rows.map(mapMarketPair);
}

export async function getMarketPairByPlatformId(
  platform: "polymarket" | "kalshi",
  platformMarketId: string
): Promise<MarketPair | null> {
  const col =
    platform === "polymarket" ? "polymarket_market_id" : "kalshi_market_id";
  const { rows } = await pool.query(
    `SELECT * FROM market_pairs WHERE ${col} = $1 AND active = TRUE`,
    [platformMarketId]
  );
  return rows.length > 0 ? mapMarketPair(rows[0]) : null;
}

export async function getMarketPairById(
  id: number
): Promise<MarketPair | null> {
  const { rows } = await pool.query(`SELECT * FROM market_pairs WHERE id = $1`, [
    id,
  ]);
  return rows.length > 0 ? mapMarketPair(rows[0]) : null;
}

// --- Price Snapshots ---

export async function insertPriceSnapshot(
  event: NormalizedPriceEvent & { marketPairId: number }
): Promise<void> {
  await pool.query(
    `INSERT INTO price_snapshots
       (market_pair_id, platform, platform_market_id, implied_probability,
        best_bid, best_ask, midpoint, captured_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      event.marketPairId,
      event.platform,
      event.platformMarketId,
      event.impliedProbability,
      event.bestBid,
      event.bestAsk,
      event.midpoint,
      event.timestamp,
    ]
  );
}

export async function getPriceHistory(
  marketPairId: number,
  limit = 500
): Promise<any[]> {
  const { rows } = await pool.query(
    `SELECT platform, implied_probability, best_bid, best_ask, midpoint, captured_at
     FROM price_snapshots
     WHERE market_pair_id = $1
     ORDER BY captured_at DESC
     LIMIT $2`,
    [marketPairId, limit]
  );
  return rows;
}

// --- Opportunities ---

export async function insertOpportunity(opp: Opportunity): Promise<number> {
  const { rows } = await pool.query(
    `INSERT INTO opportunities
       (market_pair_id, detected_at, polymarket_prob, kalshi_prob,
        spread, fee_adjusted_spread, still_open, cheaper_platform)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      opp.marketPairId,
      opp.detectedAt,
      opp.polymarketProb,
      opp.kalshiProb,
      opp.spread,
      opp.feeAdjustedSpread,
      opp.stillOpen,
      opp.polymarketProb < opp.kalshiProb ? "polymarket" : "kalshi",
    ]
  );
  return rows[0].id;
}

export async function closeOpportunity(
  marketPairId: number,
  closedAt: string
): Promise<void> {
  await pool.query(
    `UPDATE opportunities SET still_open = FALSE, closed_at = $1
     WHERE market_pair_id = $2 AND still_open = TRUE`,
    [closedAt, marketPairId]
  );
}

export async function getOpportunities(
  limit = 50,
  onlyOpen = false
): Promise<any[]> {
  const where = onlyOpen ? "WHERE o.still_open = TRUE" : "";
  const { rows } = await pool.query(
    `SELECT o.*, mp.label
     FROM opportunities o
     JOIN market_pairs mp ON mp.id = o.market_pair_id
     ${where}
     ORDER BY o.detected_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

// --- Resolutions ---

export async function insertResolution(res: Resolution): Promise<void> {
  await pool.query(
    `INSERT INTO resolutions (market_pair_id, outcome, polymarket_final_prob, kalshi_final_prob, resolved_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (market_pair_id) DO UPDATE SET
       outcome = EXCLUDED.outcome,
       polymarket_final_prob = EXCLUDED.polymarket_final_prob,
       kalshi_final_prob = EXCLUDED.kalshi_final_prob,
       resolved_at = EXCLUDED.resolved_at`,
    [
      res.marketPairId,
      res.outcome,
      res.polymarketFinalProb,
      res.kalshiFinalProb,
      res.resolvedAt,
    ]
  );
}

export async function getResolutions(): Promise<any[]> {
  const { rows } = await pool.query(
    `SELECT r.*, mp.label FROM resolutions r JOIN market_pairs mp ON mp.id = r.market_pair_id ORDER BY r.resolved_at DESC`
  );
  return rows;
}

// --- Lead-Lag Results ---

export async function insertLeadLagResult(
  result: LeadLagResult
): Promise<number> {
  const { rows } = await pool.query(
    `INSERT INTO lead_lag_results
       (market_pair_id, window_start, window_end, leader, lag_ms,
        correlation, sample_size, computed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      result.marketPairId,
      result.windowStart,
      result.windowEnd,
      result.leader,
      result.lagMs,
      result.correlation,
      result.sampleSize,
      result.computedAt,
    ]
  );
  return rows[0].id;
}

export async function getLeadLagResults(
  marketPairId?: number,
  limit = 50
): Promise<any[]> {
  if (marketPairId) {
    const { rows } = await pool.query(
      `SELECT ll.*, mp.label
       FROM lead_lag_results ll
       JOIN market_pairs mp ON mp.id = ll.market_pair_id
       WHERE ll.market_pair_id = $1
       ORDER BY ll.computed_at DESC
       LIMIT $2`,
      [marketPairId, limit]
    );
    return rows;
  }
  const { rows } = await pool.query(
    `SELECT ll.*, mp.label
     FROM lead_lag_results ll
     JOIN market_pairs mp ON mp.id = ll.market_pair_id
     ORDER BY ll.computed_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

export async function getLatestLeadLag(
  marketPairId: number
): Promise<any | null> {
  const { rows } = await pool.query(
    `SELECT ll.*, mp.label
     FROM lead_lag_results ll
     JOIN market_pairs mp ON mp.id = ll.market_pair_id
     WHERE ll.market_pair_id = $1
     ORDER BY ll.computed_at DESC
     LIMIT 1`,
    [marketPairId]
  );
  return rows.length > 0 ? rows[0] : null;
}

// --- Liquidity Snapshots ---

export async function insertLiquiditySnapshot(
  snapshot: LiquiditySnapshot
): Promise<void> {
  await pool.query(
    `INSERT INTO liquidity_snapshots
       (market_pair_id, platform, spread_bps, depth_score, liquidity_index,
        best_bid, best_ask, captured_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      snapshot.marketPairId,
      snapshot.platform,
      snapshot.spreadBps,
      snapshot.depthScore,
      snapshot.liquidityIndex,
      snapshot.bestBid,
      snapshot.bestAsk,
      snapshot.capturedAt,
    ]
  );
}

export async function getLiquidityHistory(
  marketPairId: number,
  limit = 200
): Promise<any[]> {
  const { rows } = await pool.query(
    `SELECT * FROM liquidity_snapshots
     WHERE market_pair_id = $1
     ORDER BY captured_at DESC
     LIMIT $2`,
    [marketPairId, limit]
  );
  return rows;
}

export async function getLatestLiquidityByMarket(
  marketPairId: number
): Promise<any[]> {
  const { rows } = await pool.query(
    `SELECT DISTINCT ON (platform) *
     FROM liquidity_snapshots
     WHERE market_pair_id = $1
     ORDER BY platform, captured_at DESC`,
    [marketPairId]
  );
  return rows;
}

export async function getPriceSnapshotsInWindow(
  marketPairId: number,
  windowStart: string,
  windowEnd: string
): Promise<any[]> {
  const { rows } = await pool.query(
    `SELECT platform, implied_probability, captured_at
     FROM price_snapshots
     WHERE market_pair_id = $1
       AND captured_at >= $2
       AND captured_at <= $3
     ORDER BY captured_at ASC`,
    [marketPairId, windowStart, windowEnd]
  );
  return rows;
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const { rows: llRows } = await pool.query(
    `SELECT
       COUNT(*)::int AS total_ll,
       COALESCE(AVG(correlation), 0) AS avg_corr,
       (SELECT leader FROM lead_lag_results
        GROUP BY leader ORDER BY COUNT(*) DESC LIMIT 1) AS dominant
     FROM lead_lag_results`
  );

  const { rows: liqRows } = await pool.query(
    `SELECT
       COUNT(*)::int AS total_liq,
       COALESCE(AVG(liquidity_index), 0) AS avg_liq
     FROM liquidity_snapshots`
  );

  return {
    totalLeadLagComputations: llRows[0]?.total_ll ?? 0,
    totalLiquiditySnapshots: liqRows[0]?.total_liq ?? 0,
    avgCorrelation: parseFloat(llRows[0]?.avg_corr ?? "0"),
    dominantLeader: llRows[0]?.dominant ?? null,
    avgLiquidityIndex: parseFloat(liqRows[0]?.avg_liq ?? "0"),
  };
}

// --- Helpers ---

function mapMarketPair(row: any): MarketPair {
  return {
    id: row.id,
    label: row.label,
    category: row.category,
    polymarketMarketId: row.polymarket_market_id,
    kalshiMarketId: row.kalshi_market_id,
    resolvesAt: row.resolves_at,
    active: row.active,
    createdAt: row.created_at,
  };
}
