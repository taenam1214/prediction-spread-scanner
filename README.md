# Prediction Spread Scanner

An event-driven system that ingests live prices from **Polymarket** and **Kalshi** for equivalent real-world events, streams them through Redpanda (Kafka API-compatible), detects cross-platform pricing divergence, and surfaces actionable signals on a live dashboard — with a backtesting layer to evaluate whether flagged opportunities would have been profitable.

> **Observation and backtesting only.** No real trading or order execution.

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│ Polymarket       │     │ Kalshi           │
│ ingestion worker │     │ ingestion worker │
└────────┬─────────┘     └────────┬─────────┘
         │  raw price events       │
         └───────────┬────────────┘
                      ▼
              ┌───────────────┐
              │  Redpanda      │
              │  raw-prices    │
              └───────┬───────┘
                      ▼
            ┌───────────────────┐
            │ Normalizer         │  common schema + join
            └─────────┬─────────┘
                      ▼
              ┌───────────────┐
              │  Redpanda      │
              │  normalized    │
              └───────┬───────┘
                      ▼
            ┌───────────────────┐
            │ Spread Detector    │  fee-adjusted threshold
            └─────────┬─────────┘
                      ▼
        ┌─────────────┴─────────────┐
        ▼                           ▼
   Postgres                      Redis
   (snapshots,                   (latest price
    opportunities,               cache for
    resolutions)                 dashboard)
        │                           │
        └───────────┬───────────────┘
                    ▼
            Fastify API (REST + WS)
                    ▼
            Next.js Dashboard
```

Each service is a separate process in the monorepo, communicating through Redpanda topics and Postgres/Redis. Services are decoupled — the ingestion workers have no idea the dashboard exists, and the spread detector has no idea how the data was ingested.

---

## Why This Architecture

### Why a message queue instead of direct DB writes?

The ingestion workers could write directly to Postgres and skip Redpanda entirely. That would work for 8 market pairs. It wouldn't work at 800, and it doesn't demonstrate the core architectural idea.

The queue buys three things:

1. **Decoupling.** Ingestion workers don't need to know about normalization logic, schema changes, or downstream consumers. Adding a new consumer (alerts, a different database, a metrics pipeline) requires zero changes to ingestion code.
2. **Backpressure.** If Postgres is slow or the normalizer is restarting, raw events buffer in Redpanda instead of causing cascading failures. At scale, this is the difference between a brief delay and data loss.
3. **Replayability.** Redpanda retains events for 7 days. If we deploy a bug in the normalizer, we can fix it and replay from the topic rather than re-fetching from external APIs (which may rate-limit us or not have historical data).

### Why Redpanda over real Kafka?

Redpanda is wire-compatible with the Kafka protocol — the application code uses `kafkajs` and wouldn't change if we swapped to a real Kafka cluster. But Redpanda is dramatically easier to run locally: single binary, no JVM, no ZooKeeper, starts in seconds, and uses a fraction of the memory. For a portfolio project that needs `docker compose up` to work smoothly, this matters.

### Why Redis for the dashboard read path?

The dashboard needs "latest price per market" with sub-second reads. Postgres could serve this, but it would mean either (a) constant polling with `ORDER BY captured_at DESC LIMIT 1` per market pair, or (b) maintaining a materialized view. Redis gives O(1) reads with TTL-based staleness detection. The normalizer writes to both Postgres (durable history) and Redis (ephemeral cache) on every event.

### Why Fastify?

Express is fine. Fastify is faster, has built-in schema validation, and its plugin system handles WebSocket upgrade cleanly. It's also a deliberate signal — Express is the default; choosing something else shows awareness of alternatives.

### Why separate ingestion workers per platform?

Polymarket and Kalshi have completely different APIs, authentication schemes, rate limits, and data shapes. Separating them means:
- A Kalshi API outage doesn't affect Polymarket ingestion.
- Each worker can be scaled, rate-limited, and debugged independently.
- Adding a third platform (Manifold, PredictIt) means adding a new worker, not modifying existing ones.

---

## Signal Logic

For each market pair, on every new normalized price event:

1. Look up the latest cached price for the **other** platform from Redis.
2. Compute `raw_spread = abs(polymarket_prob - kalshi_prob)`.
3. Subtract estimated round-trip fees: `fee_adjusted_spread = raw_spread - (poly_taker_fee + kalshi_taker_fee)`.
4. If `fee_adjusted_spread >= threshold` (default 3%), persist an opportunity to Postgres and publish to the `opportunities` topic.
5. When the spread drops below 50% of threshold, close any open opportunities for that pair.

### Fee Assumptions

These are approximations for signal computation, not exact trading cost models:

| Platform | Taker Fee | Notes |
|---|---|---|
| Polymarket | ~2% | CLOB taker fee on filled orders |
| Kalshi | ~7¢ per contract | On a $1 binary contract, roughly 7% |

The combined ~9% round-trip cost means a 12% raw spread yields only ~3% fee-adjusted spread. This is intentionally conservative — real fees depend on order type, account tier, and liquidity.

---

## Backtesting

The backtest engine replays historical opportunities against market resolutions:

- **With resolution data:** Determines if buying the cheaper side was correct at resolution. Profit ≈ spread - fees if correct; loss ≈ -(spread + fees) if wrong.
- **Without resolution data:** Falls back to spread convergence as a proxy for profitability (if the spread closed, a position could have been unwound at a profit).
- **Output:** Total opportunities, hit rate, theoretical P&L, average time to convergence, per-opportunity breakdown.

The backtest is accessible via `GET /api/backtest?threshold=0.03` and through the dashboard's Backtest page.

---

## Market Selection

Market pairs are manually curated, not automatically matched. This is deliberate:

- Automatic matching via NLP is a separate hard problem (market titles differ across platforms, resolutions may not align, etc.).
- A curated list ensures every pair is actually the same event on both platforms.
- The `market_pairs` table is the single source of truth for what's being tracked.

Seed data includes 8 pairs across economics, crypto, sports, and market indices.

---

## Project Structure

```
prediction-spread-scanner/
├── docker-compose.yml          # Full stack: Redpanda, Postgres, Redis, all services
├── packages/
│   ├── ingestion-polymarket/   # Polymarket CLOB API poller → raw-prices topic
│   ├── ingestion-kalshi/       # Kalshi Trading API poller → raw-prices topic
│   ├── normalizer/             # raw-prices → normalized-prices (+ Postgres + Redis)
│   ├── spread-detector/        # normalized-prices → opportunity detection
│   ├── analytics/              # Market microstructure analytics engine
│   ├── api/                    # Fastify REST + WebSocket backend
│   └── dashboard/              # Next.js frontend
├── shared/
│   ├── schemas/                # TypeScript types, config, validation, fee logic
│   ├── kafka/                  # kafkajs producer/consumer/admin helpers
│   └── db/                     # Postgres connection pool and query layer
├── db/migrations/              # SQL migrations (run automatically by Postgres init)
├── scripts/
│   ├── setup.sh                # Bootstrap infrastructure + seed data
│   ├── seed-historical-data.ts # Generate 48h of realistic demo data
│   ├── poll-resolutions.ts     # Check for and record market resolutions
│   ├── create-topics.ts        # Ensure Redpanda topics exist
│   ├── check-services.sh       # Quick health check for all services
│   └── reset-db.sh             # Truncate and re-seed
└── README.md
```

---

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 20+
- npm 9+

### Setup

```bash
git clone https://github.com/taenam1214/prediction-spread-scanner.git
cd prediction-spread-scanner

# Start infrastructure and seed data
./scripts/setup.sh

# Start all services
docker compose up -d

# Or run services locally for development:
npm install
docker compose up -d redpanda postgres redis  # infrastructure only
npx --workspace=@spread-scanner/api tsx src/index.ts &
npx --workspace=@spread-scanner/ingestion-polymarket tsx src/index.ts &
npx --workspace=@spread-scanner/ingestion-kalshi tsx src/index.ts &
npx --workspace=@spread-scanner/normalizer tsx src/index.ts &
npx --workspace=@spread-scanner/spread-detector tsx src/index.ts &
cd packages/dashboard && npm run dev
```

### Access

| Service | URL |
|---|---|
| Dashboard | http://localhost:3000 |
| API | http://localhost:3001 |
| Redpanda Console | http://localhost:8080 |

### API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Service health check |
| GET | `/api/markets` | All market pairs with latest spread |
| GET | `/api/markets/:id` | Single market detail |
| GET | `/api/markets/:id/history` | Price history (limit param) |
| GET | `/api/opportunities` | Detected divergences (open=true filter) |
| GET | `/api/resolutions` | Market resolution outcomes |
| GET | `/api/spreads` | Latest cached spreads |
| GET | `/api/stats` | System-wide statistics |
| GET | `/api/backtest` | Run backtest (threshold param) |
| GET | `/api/analytics/summary` | Analytics engine summary stats |
| GET | `/api/analytics/lead-lag` | Lead-lag analysis results |
| GET | `/api/analytics/lead-lag/:id` | Lead-lag for specific market |
| GET | `/api/analytics/liquidity/:id` | Liquidity history for market |
| GET | `/api/analytics/liquidity/:id/latest` | Latest liquidity per platform |
| GET | `/api/analytics/simulate/:id` | Execution cost simulation |
| GET | `/api/analytics/simulate/:id/batch` | Batch simulation matrix |
| GET | `/api/analytics/half-life/:id` | Spread half-life computation |
| GET | `/api/analytics/calibration` | Platform calibration curves |
| WS | `/ws/spreads` | Real-time spread broadcast |

---

## Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Message queue | Redpanda | Kafka API-compatible, trivial to self-host, no JVM |
| Database | PostgreSQL 16 | Reliable, great indexing, JSON support if needed |
| Cache | Redis 7 | Sub-ms reads for dashboard, TTL for staleness |
| Backend | Fastify | Fast, typed, clean WebSocket support |
| Frontend | Next.js 14 + React 18 | App router, streaming, good DX |
| Charts | Recharts | Lightweight, composable, works with SSR |
| Runtime | Node.js 20 (TypeScript) | Shared types across all services |
| Containers | Docker Compose | One command to run everything locally |

---

## Market Microstructure Analytics

The analytics engine adds domain-specific analysis that goes beyond spread detection — the kind of analysis prediction market platforms run internally.

### Architecture

The analytics service is a Kafka consumer on `normalized-prices` (same topic as spread-detector). It runs two continuous processes:

1. **Liquidity scoring** — on every price event, computes quoted spread (bps), depth score, and liquidity index. Writes to `liquidity_snapshots` table and Redis cache.
2. **Lead-lag analysis** — every 5 minutes, runs cross-correlation over the last hour of aligned price data for all market pairs. Determines which platform moves first and by how much.

The API serves additional on-demand computations (execution simulation, calibration curves, spread half-life) that query historical data directly.

### Formulas

**Lead-Lag (Cross-Correlation):**
- Align Polymarket and Kalshi time series onto a 30-second grid
- Compute normalized cross-correlation R_xy[k] at lags k = -20 to +20
- Peak |R_xy[k]| determines the leader and lag magnitude

**Liquidity Index:**
- `spreadBps = (ask - bid) / midpoint × 10,000`
- `depthScore = 1 - clamp(spreadBps / 500, 0, 1)`
- `liquidityIndex = depthScore × 100` (0 = illiquid, 100 = very liquid)

**Execution Simulation:**
- `slippage = halfSpread + 50bps × (size / $1000)`
- `latencyPenalty = spreadBps × (1 - e^(-latencyMs / 2000))`
- `totalCost = slippage + latencyPenalty + platformFee`

**Spread Half-Life:**
- Models spread decay as `spread(t) = spread(0) × e^(-λt)`
- `halfLife = ln(2) / λ` estimated via OLS on closed opportunity durations

**Calibration (Brier Score):**
- `brierScore = mean((predicted - actual)²)` across resolved markets
- Buckets predictions into 10% ranges and compares to actual outcome frequency

### Dashboard Pages

| Page | Path | Description |
|------|------|-------------|
| Overview | `/analytics` | Summary stats, lead-lag results table |
| Execution Simulator | `/analytics/simulation` | Market/platform/size/latency controls, cost breakdown |
| Calibration Curves | `/analytics/calibration` | Predicted vs actual scatter, Brier score, bucket table |

---

## What I'd Do Differently at Scale

**Data ingestion:** Replace polling with WebSocket connections for both platforms. Polymarket's CLOB API and Kalshi both support WebSocket feeds for real-time order book updates. This cuts latency from seconds to milliseconds.

**Stream processing:** At high throughput (hundreds of markets, sub-second updates), replace plain KafkaJS consumers with a proper stream processor — ksqlDB for SQL-based transformations, or Apache Flink for complex event processing with windowing.

**Database:** Partition `price_snapshots` by time (monthly or weekly) using Postgres declarative partitioning, or move to TimescaleDB for automatic hypertable management. At millions of rows per day, this prevents full table scans and makes retention management straightforward.

**Orchestration:** Add Temporal for durable workflow orchestration — backtest runs, resolution tracking, market pair health checks, and stale data detection. The current cron-style scripts are fragile; Temporal gives retries, timeouts, and visibility for free.

**Observability:** Add Prometheus metrics from each service, Grafana dashboards, and structured JSON logging to a centralized store (Loki or ELK). The in-process metrics counters are a starting point but don't survive restarts.

**Deployment:** Move from Docker Compose to Kubernetes with Helm charts. Each service becomes a Deployment with HPA, Redpanda runs as a StatefulSet, and Postgres uses a managed service (RDS/Cloud SQL).

**Market matching:** Build an NLP pipeline to automatically suggest market pair candidates across platforms, with human approval before activation. This removes the manual curation bottleneck.

---

## License

MIT
