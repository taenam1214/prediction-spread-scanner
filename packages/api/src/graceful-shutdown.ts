import { pool } from "@spread-scanner/db";
import type { FastifyInstance } from "fastify";
import type Redis from "ioredis";

const redisClients: Redis[] = [];
const cleanupCallbacks: (() => void)[] = [];

export function registerRedis(client: Redis): void {
  redisClients.push(client);
}

export function registerCleanup(fn: () => void): void {
  cleanupCallbacks.push(fn);
}

export function setupGracefulShutdown(app: FastifyInstance): void {
  let shutdownRequested = false;

  const shutdown = async (signal: string) => {
    if (shutdownRequested) return;
    shutdownRequested = true;
    console.log(`[api] Received ${signal}, shutting down...`);

    // Force exit after 10s if shutdown hangs
    const forceTimer = setTimeout(() => {
      console.error("[api] Shutdown timed out, forcing exit");
      process.exit(1);
    }, 10_000);
    forceTimer.unref();

    try {
      for (const fn of cleanupCallbacks) fn();
      await app.close();
      for (const client of redisClients) await client.quit();
      await pool.end();
      clearTimeout(forceTimer);
      console.log("[api] Shutdown complete.");
      process.exit(0);
    } catch (err) {
      console.error("[api] Shutdown error:", err);
      process.exit(1);
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}
