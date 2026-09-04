import { createProducer, ensureTopics, TOPICS } from "@spread-scanner/kafka";
import { getActiveMarketPairs } from "@spread-scanner/db";
import type { RawPriceEvent, MarketPair } from "@spread-scanner/schemas";
import { fetchKalshiMarketData } from "./kalshi-client";
import type { Producer } from "kafkajs";

const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL_MS ?? "5000", 10);

async function publishRawEvent(
  producer: Producer,
  event: RawPriceEvent
): Promise<void> {
  await producer.send({
    topic: TOPICS.RAW_PRICES,
    messages: [
      {
        key: event.platformMarketId,
        value: JSON.stringify(event),
      },
    ],
  });
}

async function pollMarkets(
  producer: Producer,
  pairs: MarketPair[]
): Promise<void> {
  for (const pair of pairs) {
    try {
      const marketData = await fetchKalshiMarketData(pair.kalshiMarketId);
      const event: RawPriceEvent = {
        platform: "kalshi",
        platformMarketId: pair.kalshiMarketId,
        rawPayload: marketData,
        timestamp: new Date().toISOString(),
      };
      await publishRawEvent(producer, event);
      console.log(
        `[kalshi] Published price for ${pair.label} (${pair.kalshiMarketId})`
      );
    } catch (err: any) {
      console.error(
        `[kalshi] Error fetching ${pair.kalshiMarketId}: ${err.message}`
      );
    }
  }
}

async function main(): Promise<void> {
  console.log("[kalshi-ingestion] Starting...");

  await ensureTopics();
  const producer = await createProducer();
  console.log("[kalshi-ingestion] Connected to Redpanda");

  const pairs = await getActiveMarketPairs();
  console.log(`[kalshi-ingestion] Tracking ${pairs.length} market pairs`);

  // Initial poll
  await pollMarkets(producer, pairs);

  // Continuous polling
  setInterval(async () => {
    try {
      const currentPairs = await getActiveMarketPairs();
      await pollMarkets(producer, currentPairs);
    } catch (err: any) {
      console.error(`[kalshi-ingestion] Poll cycle error: ${err.message}`);
    }
  }, POLL_INTERVAL);
}

main().catch((err) => {
  console.error("[kalshi-ingestion] Fatal error:", err);
  process.exit(1);
});
