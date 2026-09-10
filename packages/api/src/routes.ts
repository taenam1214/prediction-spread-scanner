import type { FastifyInstance } from "fastify";
import {
  getActiveMarketPairs,
  getMarketPairById,
  getOpportunities,
  getPriceHistory,
  getResolutions,
  getLeadLagResults,
  getLatestLeadLag,
  getLiquidityHistory,
  getLatestLiquidityByMarket,
  getAnalyticsSummary,
} from "@spread-scanner/db";
import { REDIS_KEYS } from "@spread-scanner/schemas";
import Redis from "ioredis";
import { runBacktest } from "./backtest";
import { getSystemStats } from "./stats";
import { runSimulation, runBatchSimulation } from "./execution-sim";
import { computeSpreadHalfLife, computeCalibration } from "./efficiency";
import { registerRedis } from "./graceful-shutdown";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
registerRedis(redis);

export function registerRoutes(app: FastifyInstance): void {
  // Health check
  app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  // List all active market pairs with latest spread data
  app.get("/api/markets", async () => {
    const pairs = await getActiveMarketPairs();

    // Enrich with latest spread from Redis
    const enriched = await Promise.all(
      pairs.map(async (pair) => {
        const spreadStr = await redis.get(REDIS_KEYS.latestSpread(pair.id));
        const latestSpread = spreadStr ? JSON.parse(spreadStr) : null;

        const polyStr = await redis.get(
          REDIS_KEYS.latestPrice("polymarket", pair.id)
        );
        const kalshiStr = await redis.get(
          REDIS_KEYS.latestPrice("kalshi", pair.id)
        );

        return {
          ...pair,
          latestSpread,
          polymarketPrice: polyStr ? JSON.parse(polyStr) : null,
          kalshiPrice: kalshiStr ? JSON.parse(kalshiStr) : null,
        };
      })
    );

    return { markets: enriched };
  });

  // Get single market pair detail
  app.get<{ Params: { id: string } }>("/api/markets/:id", async (req, reply) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return reply.status(400).send({ error: "Invalid market ID" });

    const pair = await getMarketPairById(id);
    if (!pair) return reply.status(404).send({ error: "Market pair not found" });

    const spreadStr = await redis.get(REDIS_KEYS.latestSpread(pair.id));
    const latestSpread = spreadStr ? JSON.parse(spreadStr) : null;

    return { market: pair, latestSpread };
  });

  // Get price history for a market pair
  app.get<{ Params: { id: string }; Querystring: { limit?: string } }>(
    "/api/markets/:id/history",
    async (req, reply) => {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return reply.status(400).send({ error: "Invalid market ID" });

      const limit = parseInt(req.query.limit ?? "500", 10);
      const history = await getPriceHistory(id, Math.min(limit, 2000));

      return { marketPairId: id, history };
    }
  );

  // List opportunities
  app.get<{ Querystring: { limit?: string; open?: string } }>(
    "/api/opportunities",
    async (req) => {
      const limit = parseInt(req.query.limit ?? "50", 10);
      const onlyOpen = req.query.open === "true";
      const opportunities = await getOpportunities(
        Math.min(limit, 200),
        onlyOpen
      );
      return { opportunities };
    }
  );

  // List resolutions
  app.get("/api/resolutions", async () => {
    const resolutions = await getResolutions();
    return { resolutions };
  });

  // Get latest spreads for all markets (from Redis cache)
  app.get("/api/spreads", async () => {
    const pairs = await getActiveMarketPairs();
    const spreads = await Promise.all(
      pairs.map(async (pair) => {
        const spreadStr = await redis.get(REDIS_KEYS.latestSpread(pair.id));
        return {
          marketPairId: pair.id,
          label: pair.label,
          category: pair.category,
          spread: spreadStr ? JSON.parse(spreadStr) : null,
        };
      })
    );
    return { spreads };
  });

  // System stats
  app.get("/api/stats", async () => {
    return await getSystemStats();
  });

  // Run backtest
  app.get<{ Querystring: { threshold?: string } }>(
    "/api/backtest",
    async (req) => {
      const threshold = parseFloat(req.query.threshold ?? "0.03");
      const result = await runBacktest(threshold);
      return result;
    }
  );

  // --- Analytics Routes ---

  // Analytics summary
  app.get("/api/analytics/summary", async () => {
    const summary = await getAnalyticsSummary();
    return summary;
  });

  // Lead-lag results (all or filtered by market)
  app.get<{ Querystring: { limit?: string } }>(
    "/api/analytics/lead-lag",
    async (req) => {
      const limit = parseInt(req.query.limit ?? "50", 10);
      const results = await getLeadLagResults(undefined, Math.min(limit, 200));
      return { results };
    }
  );

  // Lead-lag results for a specific market
  app.get<{ Params: { id: string }; Querystring: { limit?: string } }>(
    "/api/analytics/lead-lag/:id",
    async (req, reply) => {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return reply.status(400).send({ error: "Invalid market ID" });

      const limit = parseInt(req.query.limit ?? "50", 10);
      const results = await getLeadLagResults(id, Math.min(limit, 200));
      const latest = await getLatestLeadLag(id);

      return { marketPairId: id, latest, results };
    }
  );

  // Liquidity history for a market
  app.get<{ Params: { id: string }; Querystring: { limit?: string } }>(
    "/api/analytics/liquidity/:id",
    async (req, reply) => {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return reply.status(400).send({ error: "Invalid market ID" });

      const limit = parseInt(req.query.limit ?? "200", 10);
      const history = await getLiquidityHistory(id, Math.min(limit, 1000));

      return { marketPairId: id, history };
    }
  );

  // Latest liquidity for a market (one per platform)
  app.get<{ Params: { id: string } }>(
    "/api/analytics/liquidity/:id/latest",
    async (req, reply) => {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return reply.status(400).send({ error: "Invalid market ID" });

      const snapshots = await getLatestLiquidityByMarket(id);

      return { marketPairId: id, snapshots };
    }
  );

  // Execution simulation for a market
  app.get<{
    Params: { id: string };
    Querystring: { platform?: string; size?: string; latency?: string };
  }>(
    "/api/analytics/simulate/:id",
    async (req, reply) => {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return reply.status(400).send({ error: "Invalid market ID" });

      const platform = (req.query.platform ?? "polymarket") as "polymarket" | "kalshi";
      const sizeUsd = parseFloat(req.query.size ?? "1000");
      const latencyMs = parseFloat(req.query.latency ?? "200");

      const result = await runSimulation(id, platform, sizeUsd, latencyMs);
      return result;
    }
  );

  // Batch simulation (matrix of sizes × latencies)
  app.get<{
    Params: { id: string };
    Querystring: { platform?: string };
  }>(
    "/api/analytics/simulate/:id/batch",
    async (req, reply) => {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return reply.status(400).send({ error: "Invalid market ID" });

      const platform = (req.query.platform ?? "polymarket") as "polymarket" | "kalshi";
      const results = await runBatchSimulation(id, platform);

      return { marketPairId: id, platform, results };
    }
  );

  // Spread half-life for a market
  app.get<{ Params: { id: string } }>(
    "/api/analytics/half-life/:id",
    async (req, reply) => {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return reply.status(400).send({ error: "Invalid market ID" });

      const result = await computeSpreadHalfLife(id);
      if (!result) {
        return reply
          .status(404)
          .send({ error: "Not enough data to compute half-life" });
      }

      return result;
    }
  );

  // Calibration curves
  app.get<{ Querystring: { platform?: string } }>(
    "/api/analytics/calibration",
    async (req) => {
      const platform = (req.query.platform ?? "polymarket") as
        | "polymarket"
        | "kalshi";
      const result = await computeCalibration(platform);
      return result;
    }
  );
}
