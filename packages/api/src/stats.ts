import { pool } from "@spread-scanner/db";

export interface SystemStats {
  totalMarketPairs: number;
  activeMarketPairs: number;
  totalSnapshots: number;
  totalOpportunities: number;
  openOpportunities: number;
  totalResolutions: number;
  oldestSnapshot: string | null;
  newestSnapshot: string | null;
}

export async function getSystemStats(): Promise<SystemStats> {
  const [pairs, snapshots, opportunities, resolutions, snapshotRange] =
    await Promise.all([
      pool.query(
        `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE active) AS active FROM market_pairs`
      ),
      pool.query(`SELECT COUNT(*) AS total FROM price_snapshots`),
      pool.query(
        `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE still_open) AS open FROM opportunities`
      ),
      pool.query(`SELECT COUNT(*) AS total FROM resolutions`),
      pool.query(
        `SELECT MIN(captured_at) AS oldest, MAX(captured_at) AS newest FROM price_snapshots`
      ),
    ]);

  return {
    totalMarketPairs: parseInt(pairs.rows[0].total),
    activeMarketPairs: parseInt(pairs.rows[0].active),
    totalSnapshots: parseInt(snapshots.rows[0].total),
    totalOpportunities: parseInt(opportunities.rows[0].total),
    openOpportunities: parseInt(opportunities.rows[0].open),
    totalResolutions: parseInt(resolutions.rows[0].total),
    oldestSnapshot: snapshotRange.rows[0].oldest,
    newestSnapshot: snapshotRange.rows[0].newest,
  };
}
