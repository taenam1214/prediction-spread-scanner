/**
 * Creates Kafka/Redpanda topics if they don't exist.
 * Run after starting Redpanda: npx tsx scripts/create-topics.ts
 */

import { Kafka } from "kafkajs";
import { TOPICS } from "@spread-scanner/schemas";

const kafka = new Kafka({
  clientId: "topic-setup",
  brokers: (process.env.KAFKA_BROKERS ?? "localhost:19092").split(","),
});

async function main() {
  const admin = kafka.admin();
  await admin.connect();

  const existing = await admin.listTopics();
  console.log(`Existing topics: ${existing.join(", ") || "(none)"}`);

  const topicsToCreate = Object.values(TOPICS).filter(
    (t) => !existing.includes(t)
  );

  if (topicsToCreate.length === 0) {
    console.log("All topics already exist.");
  } else {
    await admin.createTopics({
      topics: topicsToCreate.map((topic) => ({
        topic,
        numPartitions: 3,
        replicationFactor: 1,
        configEntries: [
          { name: "retention.ms", value: "604800000" }, // 7 days
          { name: "cleanup.policy", value: "delete" },
        ],
      })),
    });
    console.log(`Created topics: ${topicsToCreate.join(", ")}`);
  }

  await admin.disconnect();
}

main().catch((err) => {
  console.error("Topic creation failed:", err);
  process.exit(1);
});
