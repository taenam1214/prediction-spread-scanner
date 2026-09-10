import { createProducer, ensureTopics, TOPICS } from "@spread-scanner/kafka";
import { getActiveMarketPairs, pool } from "@spread-scanner/db";
import type { RawPriceEvent, MarketPair } from "@spread-scanner/schemas";
import { fetchPolymarketOrderbook } from "./polymarket-client";
import type { Producer } from "kafkajs";

const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL_MS ?? "5000", 10);

let shutdownRequested = false;

function setupShutdown(resources: { producer: Producer; intervalIds: NodeJS.Timeout[] }) {
  const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
  for (const signal of signals) {
    process.on(signal, async () => {
      if (shutdownRequested) return;
      shutdownRequested = true;
      console.log(`[polymarket-ingestion] Received ${signal}, shutting down...`);
      try {
        for (const id of resources.intervalIds) clearInterval(id);
        await resources.producer.disconnect();
        await pool.end();
        process.exit(0);
      } catch (err) {
        console.error("[polymarket-ingestion] Shutdown error:", err);
        process.exit(1);
      }
    });
  }
}

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
      const orderbook = await fetchPolymarketOrderbook(
        pair.polymarketMarketId
      );
      const event: RawPriceEvent = {
        platform: "polymarket",
        platformMarketId: pair.polymarketMarketId,
        rawPayload: orderbook,
        timestamp: new Date().toISOString(),
      };
      await publishRawEvent(producer, event);
      console.log(
        `[polymarket] Published price for ${pair.label} (${pair.polymarketMarketId})`
      );
    } catch (err: any) {
      console.error(
        `[polymarket] Error fetching ${pair.polymarketMarketId}: ${err.message}`
      );
    }
  }
}

async function main(): Promise<void> {
  console.log("[polymarket-ingestion] Starting...");

  await ensureTopics();
  const producer = await createProducer();
  console.log("[polymarket-ingestion] Connected to Redpanda");

  const pairs = await getActiveMarketPairs();
  console.log(
    `[polymarket-ingestion] Tracking ${pairs.length} market pairs`
  );

  // Initial poll
  await pollMarkets(producer, pairs);

  // Continuous polling
  const pollInterval = setInterval(async () => {
    try {
      const currentPairs = await getActiveMarketPairs();
      await pollMarkets(producer, currentPairs);
    } catch (err: any) {
      console.error(`[polymarket-ingestion] Poll cycle error: ${err.message}`);
    }
  }, POLL_INTERVAL);

  setupShutdown({ producer, intervalIds: [pollInterval] });
}

main().catch((err) => {
  console.error("[polymarket-ingestion] Fatal error:", err);
  process.exit(1);
});
