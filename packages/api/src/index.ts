import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { registerRoutes } from "./routes";
import { startSpreadBroadcast } from "./ws";
import { setupGracefulShutdown } from "./graceful-shutdown";

const PORT = parseInt(process.env.PORT ?? "3001", 10);

async function main(): Promise<void> {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  });

  await app.register(websocket);

  registerRoutes(app);
  await startSpreadBroadcast(app);

  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`[api] Listening on port ${PORT}`);

  setupGracefulShutdown(app);
}

main().catch((err) => {
  console.error("[api] Fatal error:", err);
  process.exit(1);
});
