import { pool } from "@spread-scanner/db";
import type { FastifyInstance } from "fastify";

export function setupGracefulShutdown(app: FastifyInstance): void {
  const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];

  for (const signal of signals) {
    process.on(signal, async () => {
      console.log(`[api] Received ${signal}, shutting down gracefully...`);
      try {
        await app.close();
        await pool.end();
        console.log("[api] Shutdown complete.");
        process.exit(0);
      } catch (err) {
        console.error("[api] Error during shutdown:", err);
        process.exit(1);
      }
    });
  }
}
