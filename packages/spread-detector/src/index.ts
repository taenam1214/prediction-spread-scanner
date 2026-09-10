import { createConsumer, createProducer, ensureTopics, TOPICS } from "@spread-scanner/kafka";
import { insertOpportunity, closeOpportunity, pool } from "@spread-scanner/db";
import type {
  NormalizedPriceEvent,
  Opportunity,
  SpreadSnapshot,
} from "@spread-scanner/schemas";
import {
  PLATFORM_FEES,
  DEFAULT_SPREAD_THRESHOLD,
  REDIS_KEYS,
} from "@spread-scanner/schemas";
import Redis from "ioredis";
import type { Consumer, Producer } from "kafkajs";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
const SPREAD_THRESHOLD = parseFloat(
  process.env.SPREAD_THRESHOLD ?? `${DEFAULT_SPREAD_THRESHOLD}`
);

let shutdownRequested = false;

function setupShutdown(resources: { consumer: Consumer; producer: Producer; redis: Redis }) {
  const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
  for (const signal of signals) {
    process.on(signal, async () => {
      if (shutdownRequested) return;
      shutdownRequested = true;
      console.log(`[spread-detector] Received ${signal}, shutting down...`);
      try {
        await resources.consumer.disconnect();
        await resources.producer.disconnect();
        await resources.redis.quit();
        await pool.end();
        process.exit(0);
      } catch (err) {
        console.error("[spread-detector] Shutdown error:", err);
        process.exit(1);
      }
    });
  }
}

async function main(): Promise<void> {
  console.log("[spread-detector] Starting...");
  console.log(`[spread-detector] Threshold: ${(SPREAD_THRESHOLD * 100).toFixed(1)}%`);

  await ensureTopics();
  const producer = await createProducer();
  const consumer = await createConsumer("spread-detector-group", [
    TOPICS.NORMALIZED_PRICES,
  ]);

  setupShutdown({ consumer, producer, redis });

  console.log("[spread-detector] Consuming from normalized-prices topic...");

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;

      try {
        const event: NormalizedPriceEvent & { marketPairId: number } = JSON.parse(
          message.value.toString()
        );
        await detectSpread(event, producer);
      } catch (err: any) {
        console.error(
          `[spread-detector] Error processing message: ${err.message}`
        );
      }
    },
  });
}

async function detectSpread(
  event: NormalizedPriceEvent & { marketPairId: number },
  producer: any
): Promise<void> {
  const { marketPairId, platform, impliedProbability } = event;

  // Get the latest cached price from the OTHER platform
  const otherPlatform = platform === "polymarket" ? "kalshi" : "polymarket";
  const cachedStr = await redis.get(
    REDIS_KEYS.latestPrice(otherPlatform, marketPairId)
  );

  if (!cachedStr) {
    // No data from the other platform yet — nothing to compare
    return;
  }

  let otherEvent: NormalizedPriceEvent;
  try {
    otherEvent = JSON.parse(cachedStr);
  } catch {
    console.error(`[spread-detector] Corrupt Redis cache for ${otherPlatform}:${marketPairId}`);
    return;
  }

  // Compute raw spread
  const polyProb =
    platform === "polymarket"
      ? impliedProbability
      : otherEvent.impliedProbability;
  const kalshiProb =
    platform === "kalshi"
      ? impliedProbability
      : otherEvent.impliedProbability;

  const rawSpread = Math.abs(polyProb - kalshiProb);

  // Compute fee-adjusted spread
  // If buying the cheaper side, we pay taker fees on both platforms
  const totalFees =
    PLATFORM_FEES.polymarket.takerFee + PLATFORM_FEES.kalshi.takerFee;
  const feeAdjustedSpread = rawSpread - totalFees;

  // Cache latest spread in Redis for the dashboard
  const snapshot: SpreadSnapshot = {
    marketPairId,
    polymarketProb: polyProb,
    kalshiProb: kalshiProb,
    spread: rawSpread,
    feeAdjustedSpread,
    timestamp: event.timestamp,
  };
  await redis.set(
    REDIS_KEYS.latestSpread(marketPairId),
    JSON.stringify(snapshot),
    "EX",
    300
  );

  if (feeAdjustedSpread >= SPREAD_THRESHOLD) {
    // Opportunity detected
    const opp: Opportunity = {
      marketPairId,
      detectedAt: event.timestamp,
      polymarketProb: polyProb,
      kalshiProb: kalshiProb,
      spread: rawSpread,
      feeAdjustedSpread,
      stillOpen: true,
    };

    const oppId = await insertOpportunity(opp);
    console.log(
      `[spread-detector] OPPORTUNITY #${oppId}: market ${marketPairId} ` +
        `spread=${(rawSpread * 100).toFixed(2)}% ` +
        `fee-adjusted=${(feeAdjustedSpread * 100).toFixed(2)}% ` +
        `(poly=${(polyProb * 100).toFixed(1)}% kalshi=${(kalshiProb * 100).toFixed(1)}%)`
    );

    // Publish to opportunities topic
    await producer.send({
      topic: TOPICS.OPPORTUNITIES,
      messages: [
        {
          key: `${marketPairId}`,
          value: JSON.stringify({ ...opp, id: oppId }),
        },
      ],
    });
  } else {
    // If spread is below threshold, close any open opportunities for this pair
    if (feeAdjustedSpread < SPREAD_THRESHOLD * 0.5) {
      await closeOpportunity(marketPairId, event.timestamp);
    }
  }
}

main().catch((err) => {
  console.error("[spread-detector] Fatal error:", err);
  process.exit(1);
});
