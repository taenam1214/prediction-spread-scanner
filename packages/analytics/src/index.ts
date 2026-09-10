import { createConsumer, ensureTopics, TOPICS } from "@spread-scanner/kafka";
import type { NormalizedPriceEvent } from "@spread-scanner/schemas";
import { REDIS_KEYS } from "@spread-scanner/schemas";
import Redis from "ioredis";
import { processLiquidityEvent } from "./liquidity";
import { runLeadLagForAllPairs } from "./lead-lag";
import { incr } from "./metrics";
import { pool } from "@spread-scanner/db";
import type { Consumer } from "kafkajs";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
const LEAD_LAG_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

let shutdownRequested = false;

function setupShutdown(resources: { consumer: Consumer; redis: Redis; intervalIds: NodeJS.Timeout[] }) {
  const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
  for (const signal of signals) {
    process.on(signal, async () => {
      if (shutdownRequested) return;
      shutdownRequested = true;
      console.log(`[analytics] Received ${signal}, shutting down...`);
      try {
        for (const id of resources.intervalIds) clearInterval(id);
        await resources.consumer.disconnect();
        await resources.redis.quit();
        await pool.end();
        process.exit(0);
      } catch (err) {
        console.error("[analytics] Shutdown error:", err);
        process.exit(1);
      }
    });
  }
}

async function main(): Promise<void> {
  console.log("[analytics] Starting...");

  await ensureTopics();
  const consumer = await createConsumer("analytics-group", [
    TOPICS.NORMALIZED_PRICES,
  ]);

  console.log("[analytics] Consuming from normalized-prices topic...");

  // Periodic lead-lag computation
  const leadLagInterval = setInterval(async () => {
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

  setupShutdown({ consumer, redis, intervalIds: [leadLagInterval] });

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;

      try {
        const event: NormalizedPriceEvent & { marketPairId: number } = JSON.parse(
          message.value.toString()
        );

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
          `[analytics] Error processing message: ${err.message}`
        );
      }
    },
  });
}

main().catch((err) => {
  console.error("[analytics] Fatal error:", err);
  process.exit(1);
});
