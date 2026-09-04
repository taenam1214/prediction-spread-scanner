import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { registerRoutes } from "./routes";
import { startSpreadBroadcast } from "./ws";

const PORT = parseInt(process.env.PORT ?? "3001", 10);

async function main(): Promise<void> {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(websocket);

  registerRoutes(app);
  startSpreadBroadcast(app);

  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`[api] Listening on port ${PORT}`);
}

main().catch((err) => {
  console.error("[api] Fatal error:", err);
  process.exit(1);
});
