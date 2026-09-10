import type { FastifyInstance } from "fastify";
import { getActiveMarketPairs } from "@spread-scanner/db";
import { REDIS_KEYS } from "@spread-scanner/schemas";
import Redis from "ioredis";
import type { WebSocket } from "ws";
import { registerRedis, registerCleanup } from "./graceful-shutdown";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
registerRedis(redis);

const clients = new Set<WebSocket>();

/**
 * Registers WebSocket endpoint and starts periodic broadcast
 * of latest spread data to all connected dashboard clients.
 */
export function startSpreadBroadcast(app: FastifyInstance): void {
  app.get("/ws/spreads", { websocket: true }, (socket) => {
    clients.add(socket);
    console.log(`[ws] Client connected (total: ${clients.size})`);

    socket.on("close", () => {
      clients.delete(socket);
      console.log(`[ws] Client disconnected (total: ${clients.size})`);
    });

    socket.on("error", () => {
      clients.delete(socket);
    });

    // Send initial snapshot immediately
    sendSnapshot(socket).catch(() => {});
  });

  // Broadcast every 2 seconds
  const broadcastInterval = setInterval(() => {
    if (clients.size === 0) return;
    broadcastToAll().catch((err) =>
      console.error("[ws] Broadcast error:", err.message)
    );
  }, 2000);

  registerCleanup(() => clearInterval(broadcastInterval));
}

async function sendSnapshot(socket: WebSocket): Promise<void> {
  const data = await buildSnapshot();
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(data));
  }
}

async function broadcastToAll(): Promise<void> {
  const data = await buildSnapshot();
  const payload = JSON.stringify(data);
  for (const client of clients) {
    if (client.readyState === client.OPEN) {
      client.send(payload);
    } else {
      clients.delete(client);
    }
  }
}

async function buildSnapshot(): Promise<Record<string, unknown>> {
  const pairs = await getActiveMarketPairs();
  const spreads = await Promise.all(
    pairs.map(async (pair) => {
      const spreadStr = await redis.get(REDIS_KEYS.latestSpread(pair.id));
      const polyStr = await redis.get(
        REDIS_KEYS.latestPrice("polymarket", pair.id)
      );
      const kalshiStr = await redis.get(
        REDIS_KEYS.latestPrice("kalshi", pair.id)
      );

      return {
        marketPairId: pair.id,
        label: pair.label,
        category: pair.category,
        spread: spreadStr ? JSON.parse(spreadStr) : null,
        polymarketPrice: polyStr ? JSON.parse(polyStr) : null,
        kalshiPrice: kalshiStr ? JSON.parse(kalshiStr) : null,
      };
    })
  );

  return { type: "spread_update", timestamp: new Date().toISOString(), spreads };
}
