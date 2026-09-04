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
    "postgresql://scanner:scanner_dev_pw@localhost:5432/spread_scanner",
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
  await pool.end();
}

main().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
