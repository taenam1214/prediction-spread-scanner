import { createConsumer, createProducer, ensureTopics, TOPICS } from "@spread-scanner/kafka";
import {
  getActiveMarketPairs,
  getMarketPairByPlatformId,
  insertPriceSnapshot,
} from "@spread-scanner/db";
import type {
  RawPriceEvent,
  NormalizedPriceEvent,
  MarketPair,
} from "@spread-scanner/schemas";
import { REDIS_KEYS } from "@spread-scanner/schemas";
import Redis from "ioredis";
import { normalizePolymarket, normalizeKalshi } from "./normalize";
import type { Producer } from "kafkajs";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

async function main(): Promise<void> {
  console.log("[normalizer] Starting...");

  await ensureTopics();
  const producer = await createProducer();
  const consumer = await createConsumer("normalizer-group", [TOPICS.RAW_PRICES]);

  // Cache market pairs for fast lookup
  let pairsCache = await getActiveMarketPairs();
  const pairsByPlatformId = buildPairIndex(pairsCache);

  // Refresh pair cache periodically
  setInterval(async () => {
    pairsCache = await getActiveMarketPairs();
    rebuildPairIndex(pairsByPlatformId, pairsCache);
  }, 60_000);

  console.log("[normalizer] Consuming from raw-prices topic...");

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;

      const raw: RawPriceEvent = JSON.parse(message.value.toString());
      const pair = pairsByPlatformId.get(
        `${raw.platform}:${raw.platformMarketId}`
      );

      if (!pair) {
        // Unknown market — not in our pair mapping
        return;
      }

      try {
        const normalized = normalize(raw, pair);
        if (!normalized) return;

        // 1. Write to Postgres (price_snapshots)
        await insertPriceSnapshot({
          ...normalized,
          marketPairId: pair.id,
        });

        // 2. Cache latest price in Redis
        await redis.set(
          REDIS_KEYS.latestPrice(raw.platform, pair.id),
          JSON.stringify(normalized),
          "EX",
          300 // 5-minute TTL
        );

        // 3. Publish normalized event to downstream consumers
        await producer.send({
          topic: TOPICS.NORMALIZED_PRICES,
          messages: [
            {
              key: `${pair.id}`,
              value: JSON.stringify({ ...normalized, marketPairId: pair.id }),
            },
          ],
        });
      } catch (err: any) {
        console.error(
          `[normalizer] Error processing ${raw.platform}:${raw.platformMarketId}: ${err.message}`
        );
      }
    },
  });
}

function normalize(
  raw: RawPriceEvent,
  pair: MarketPair
): NormalizedPriceEvent | null {
  switch (raw.platform) {
    case "polymarket":
      return normalizePolymarket(raw, pair);
    case "kalshi":
      return normalizeKalshi(raw, pair);
    default:
      console.warn(`[normalizer] Unknown platform: ${raw.platform}`);
      return null;
  }
}

function buildPairIndex(
  pairs: MarketPair[]
): Map<string, MarketPair> {
  const index = new Map<string, MarketPair>();
  for (const pair of pairs) {
    index.set(`polymarket:${pair.polymarketMarketId}`, pair);
    index.set(`kalshi:${pair.kalshiMarketId}`, pair);
  }
  return index;
}

function rebuildPairIndex(
  index: Map<string, MarketPair>,
  pairs: MarketPair[]
): void {
  index.clear();
  for (const pair of pairs) {
    index.set(`polymarket:${pair.polymarketMarketId}`, pair);
    index.set(`kalshi:${pair.kalshiMarketId}`, pair);
  }
}

main().catch((err) => {
  console.error("[normalizer] Fatal error:", err);
  process.exit(1);
});
