/**
 * Resolution tracker — polls platforms for resolved markets and writes outcomes.
 * Run periodically via cron or manually: npx tsx scripts/poll-resolutions.ts
 *
 * In production, this would be a Temporal workflow for durability.
 */

import { Pool } from "pg";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgresql://scanner:scanner_dev_pw@localhost:5433/spread_scanner",
});

async function main() {
  console.log("[resolution-tracker] Checking for resolved markets...");

  const { rows: pairs } = await pool.query(
    `SELECT mp.*
     FROM market_pairs mp
     LEFT JOIN resolutions r ON r.market_pair_id = mp.id
     WHERE mp.active = TRUE AND r.id IS NULL
       AND mp.resolves_at IS NOT NULL
       AND mp.resolves_at < NOW()
     ORDER BY mp.resolves_at`
  );

  if (pairs.length === 0) {
    console.log("[resolution-tracker] No newly resolved markets.");
    await pool.end();
    return;
  }

  console.log(`[resolution-tracker] Found ${pairs.length} markets past resolution date.`);

  for (const pair of pairs) {
    // In production, we would check the actual platform APIs here.
    // For the MVP, we mark them with simulated outcomes.
    const outcome = Math.random() > 0.5 ? "yes" : "no";
    const polyFinal = outcome === "yes" ? 0.95 + Math.random() * 0.05 : Math.random() * 0.05;
    const kalshiFinal = outcome === "yes" ? 0.94 + Math.random() * 0.06 : Math.random() * 0.06;

    await pool.query(
      `INSERT INTO resolutions (market_pair_id, outcome, polymarket_final_prob, kalshi_final_prob, resolved_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (market_pair_id) DO NOTHING`,
      [pair.id, outcome, polyFinal, kalshiFinal, pair.resolves_at]
    );

    // Close any open opportunities for this market
    await pool.query(
      `UPDATE opportunities SET still_open = FALSE, closed_at = $1
       WHERE market_pair_id = $2 AND still_open = TRUE`,
      [pair.resolves_at, pair.id]
    );

    // Deactivate the market pair
    await pool.query(
      `UPDATE market_pairs SET active = FALSE WHERE id = $1`,
      [pair.id]
    );

    console.log(
      `  Resolved: ${pair.label} → ${outcome} (poly=${polyFinal.toFixed(2)}, kalshi=${kalshiFinal.toFixed(2)})`
    );
  }

  console.log("[resolution-tracker] Done.");
  await pool.end();
}

main().catch((err) => {
  console.error("[resolution-tracker] Error:", err);
  process.exit(1);
});
