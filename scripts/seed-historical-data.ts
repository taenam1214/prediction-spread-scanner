/**
 * Generates realistic historical price snapshots and opportunities
 * for demo/development purposes. Run after DB migrations.
 *
 * Usage: npx tsx scripts/seed-historical-data.ts
 */

import { Pool } from "pg";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgresql://scanner:scanner_dev_pw@localhost:5433/spread_scanner",
});

async function main() {
  console.log("Seeding historical data...");

  // Get market pairs
  const { rows: pairs } = await pool.query(
    "SELECT * FROM market_pairs ORDER BY id"
  );
  console.log(`Found ${pairs.length} market pairs`);

  const now = Date.now();
  const HOUR = 3600_000;
  const DAY = 24 * HOUR;

  // Generate 48 hours of price data at 30s intervals
  const startTime = now - 2 * DAY;
  const intervalMs = 30_000;
  const totalPoints = Math.floor((2 * DAY) / intervalMs);

  let snapshotCount = 0;
  let opportunityCount = 0;

  for (const pair of pairs) {
    // Initialize random walk for each platform
    let polyProb = 0.25 + Math.random() * 0.5;
    let kalshiProb = polyProb + (Math.random() - 0.5) * 0.06; // slight divergence

    for (let i = 0; i < totalPoints; i++) {
      const timestamp = new Date(startTime + i * intervalMs).toISOString();

      // Random walk with mean reversion toward each other
      const drift = (kalshiProb - polyProb) * 0.01; // slight convergence force
      polyProb += (Math.random() - 0.5) * 0.015 + drift;
      kalshiProb += (Math.random() - 0.5) * 0.015 - drift;

      // Occasionally inject divergence events
      if (Math.random() < 0.005) {
        const shock = (Math.random() - 0.5) * 0.1;
        if (Math.random() > 0.5) {
          polyProb += shock;
        } else {
          kalshiProb += shock;
        }
      }

      polyProb = Math.max(0.05, Math.min(0.95, polyProb));
      kalshiProb = Math.max(0.05, Math.min(0.95, kalshiProb));

      const polySpread = 0.01 + Math.random() * 0.02;
      const kalshiSpread = 0.01 + Math.random() * 0.03;

      // Insert Polymarket snapshot
      await pool.query(
        `INSERT INTO price_snapshots
           (market_pair_id, platform, platform_market_id, implied_probability,
            best_bid, best_ask, midpoint, captured_at)
         VALUES ($1, 'polymarket', $2, $3, $4, $5, $3, $6)`,
        [
          pair.id,
          pair.polymarket_market_id,
          polyProb,
          Math.max(0.01, polyProb - polySpread / 2),
          Math.min(0.99, polyProb + polySpread / 2),
          timestamp,
        ]
      );

      // Insert Kalshi snapshot
      await pool.query(
        `INSERT INTO price_snapshots
           (market_pair_id, platform, platform_market_id, implied_probability,
            best_bid, best_ask, midpoint, captured_at)
         VALUES ($1, 'kalshi', $2, $3, $4, $5, $3, $6)`,
        [
          pair.id,
          pair.kalshi_market_id,
          kalshiProb,
          Math.max(0.01, kalshiProb - kalshiSpread / 2),
          Math.min(0.99, kalshiProb + kalshiSpread / 2),
          timestamp,
        ]
      );

      snapshotCount += 2;

      // Check for opportunity
      const spread = Math.abs(polyProb - kalshiProb);
      const feeAdjusted = spread - 0.09; // ~9% round-trip fees

      if (feeAdjusted >= 0.03) {
        const closesAt = i + Math.floor(Math.random() * 20) + 5;
        const closedTimestamp =
          closesAt < totalPoints
            ? new Date(startTime + closesAt * intervalMs).toISOString()
            : null;

        await pool.query(
          `INSERT INTO opportunities
             (market_pair_id, detected_at, polymarket_prob, kalshi_prob,
              spread, fee_adjusted_spread, still_open, closed_at, cheaper_platform)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            pair.id,
            timestamp,
            polyProb,
            kalshiProb,
            spread,
            feeAdjusted,
            closedTimestamp == null,
            closedTimestamp,
            polyProb < kalshiProb ? "polymarket" : "kalshi",
          ]
        );
        opportunityCount++;
      }
    }

    console.log(`  Seeded ${pair.label}`);
  }

  // Add some sample resolutions for the first 3 markets
  for (let i = 0; i < Math.min(3, pairs.length); i++) {
    const pair = pairs[i];
    await pool.query(
      `INSERT INTO resolutions (market_pair_id, outcome, polymarket_final_prob, kalshi_final_prob, resolved_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (market_pair_id) DO NOTHING`,
      [
        pair.id,
        Math.random() > 0.5 ? "yes" : "no",
        Math.random() > 0.5 ? 0.98 : 0.02,
        Math.random() > 0.5 ? 0.97 : 0.03,
        new Date(now - 12 * HOUR).toISOString(),
      ]
    );
  }

  console.log(`\nDone: ${snapshotCount} snapshots, ${opportunityCount} opportunities`);

  // --- Seed Analytics Data ---

  console.log("\nSeeding analytics data...");

  let leadLagCount = 0;
  let liquidityCount = 0;

  // Seed lead-lag results (24h hourly)
  for (const pair of pairs) {
    for (let h = 0; h < 24; h++) {
      const windowEnd = new Date(now - h * HOUR);
      const windowStart = new Date(windowEnd.getTime() - HOUR);
      const leader = Math.random() > 0.6 ? "polymarket" : "kalshi";
      const lagMs = Math.floor(Math.random() * 10) * 30_000; // 0–5 minutes in 30s steps
      const correlation = 0.5 + Math.random() * 0.45;
      const sampleSize = 80 + Math.floor(Math.random() * 40);

      await pool.query(
        `INSERT INTO lead_lag_results
           (market_pair_id, window_start, window_end, leader, lag_ms,
            correlation, sample_size, computed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          pair.id,
          windowStart.toISOString(),
          windowEnd.toISOString(),
          leader,
          lagMs,
          parseFloat(correlation.toFixed(4)),
          sampleSize,
          windowEnd.toISOString(),
        ]
      );
      leadLagCount++;
    }
  }

  console.log(`  Seeded ${leadLagCount} lead-lag results`);

  // Seed liquidity snapshots (24h every 5min)
  const liqIntervalMs = 5 * 60 * 1000; // 5 minutes
  const liqStart = now - DAY;
  const liqPoints = Math.floor(DAY / liqIntervalMs);

  for (const pair of pairs) {
    for (let i = 0; i < liqPoints; i++) {
      const timestamp = new Date(liqStart + i * liqIntervalMs).toISOString();

      for (const platform of ["polymarket", "kalshi"] as const) {
        const spreadBps = 50 + Math.random() * 300; // 50–350 bps
        const depthScore = 1 - Math.min(Math.max(spreadBps / 500, 0), 1);
        const liquidityIndex = depthScore * 100;
        const mid = 0.3 + Math.random() * 0.4;
        const halfSpreadDecimal = spreadBps / 10_000 / 2;

        await pool.query(
          `INSERT INTO liquidity_snapshots
             (market_pair_id, platform, spread_bps, depth_score, liquidity_index,
              best_bid, best_ask, captured_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            pair.id,
            platform,
            parseFloat(spreadBps.toFixed(2)),
            parseFloat(depthScore.toFixed(4)),
            parseFloat(liquidityIndex.toFixed(2)),
            parseFloat(Math.max(0.01, mid - halfSpreadDecimal).toFixed(4)),
            parseFloat(Math.min(0.99, mid + halfSpreadDecimal).toFixed(4)),
            timestamp,
          ]
        );
        liquidityCount++;
      }
    }
    console.log(`  Seeded liquidity for ${pair.label}`);
  }

  console.log(`  Seeded ${liquidityCount} liquidity snapshots`);
  console.log("\nAll seeding complete.");
  await pool.end();
}

main().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
