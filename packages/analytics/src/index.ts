import { createConsumer, ensureTopics, TOPICS } from "@spread-scanner/kafka";
import type { NormalizedPriceEvent } from "@spread-scanner/schemas";
import { REDIS_KEYS } from "@spread-scanner/schemas";
import Redis from "ioredis";
import { processLiquidityEvent } from "./liquidity";
import { runLeadLagForAllPairs } from "./lead-lag";
import { incr } from "./metrics";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
const LEAD_LAG_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

async function main(): Promise<void> {
  console.log("[analytics] Starting...");

  await ensureTopics();
  const consumer = await createConsumer("analytics-group", [
    TOPICS.NORMALIZED_PRICES,
  ]);

  console.log("[analytics] Consuming from normalized-prices topic...");

  // Periodic lead-lag computation
  setInterval(async () => {
    try {
      console.log("[analytics] Running periodic lead-lag analysis...");
      const results = await runLeadLagForAllPairs();
      incr("leadLagComputations");

      for (const result of results) {
        await redis.set(
          REDIS_KEYS.analyticsLeadLag(result.marketPairId),
          JSON.stringify(result),
          "EX",
          600 // 10 min TTL
        );
      }

      console.log(
        `[analytics] Lead-lag computed for ${results.length} market pairs`
      );
    } catch (err: any) {
      incr("errors");
      console.error(`[analytics] Lead-lag periodic error: ${err.message}`);
    }
  }, LEAD_LAG_INTERVAL_MS);

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;

      const event: NormalizedPriceEvent & { marketPairId: number } = JSON.parse(
        message.value.toString()
      );

      try {
        incr("eventsProcessed");

        // Process liquidity event and cache
        const snapshot = await processLiquidityEvent(event);
        incr("liquiditySnapshotsWritten");

        await redis.set(
          REDIS_KEYS.analyticsLiquidity(event.platform, event.marketPairId),
          JSON.stringify(snapshot),
          "EX",
          300 // 5 min TTL
        );
      } catch (err: any) {
        incr("errors");
        console.error(
          `[analytics] Error processing market ${event.marketPairId}: ${err.message}`
        );
      }
    },
  });
}

main().catch((err) => {
  console.error("[analytics] Fatal error:", err);
  process.exit(1);
});
