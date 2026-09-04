import { Kafka, Producer, Consumer, logLevel } from "kafkajs";
import { TOPICS } from "@spread-scanner/schemas";

const brokers = (process.env.KAFKA_BROKERS ?? "localhost:19092").split(",");

export const kafka = new Kafka({
  clientId: "spread-scanner",
  brokers,
  logLevel: logLevel.WARN,
  retry: { initialRetryTime: 1000, retries: 10 },
});

export async function createProducer(): Promise<Producer> {
  const producer = kafka.producer();
  await producer.connect();
  return producer;
}

export async function createConsumer(
  groupId: string,
  topics: string[]
): Promise<Consumer> {
  const consumer = kafka.consumer({ groupId });
  await consumer.connect();
  for (const topic of topics) {
    await consumer.subscribe({ topic, fromBeginning: false });
  }
  return consumer;
}

export async function ensureTopics(): Promise<void> {
  const admin = kafka.admin();
  await admin.connect();
  const existing = await admin.listTopics();
  const needed = Object.values(TOPICS).filter((t) => !existing.includes(t));
  if (needed.length > 0) {
    await admin.createTopics({
      topics: needed.map((topic) => ({
        topic,
        numPartitions: 3,
        replicationFactor: 1,
      })),
    });
  }
  await admin.disconnect();
}

export { TOPICS };
