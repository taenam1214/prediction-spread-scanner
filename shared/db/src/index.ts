import { Pool, PoolClient } from "pg";
import type {
  MarketPair,
  NormalizedPriceEvent,
  Opportunity,
  Resolution,
} from "@spread-scanner/schemas";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgresql://scanner:scanner_dev_pw@localhost:5432/spread_scanner",
  max: 10,
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
