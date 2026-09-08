# Project Conventions

## Monorepo Structure

- **Workspaces:** `shared/*` and `packages/*` under npm workspaces
- **Scope:** All packages use `@spread-scanner/*` namespace
- **Shared libs:** `schemas` (types + constants), `kafka` (KafkaJS helpers), `db` (pg pool + queries)
- **Services:** `ingestion-polymarket`, `ingestion-kalshi`, `normalizer`, `spread-detector`, `analytics`, `api`, `dashboard`

## TypeScript

- Extend `../../tsconfig.base.json` from every package
- Target: ES2022, Module: CommonJS, Strict mode
- Use `tsx` for execution (no build step for dev)
- Run `npm run typecheck` from root to validate all packages

## Coding Style

- No semicolons in import groups; semicolons elsewhere follow existing files
- camelCase for functions and variables, PascalCase for types/interfaces
- DB column names use snake_case; TypeScript interfaces use camelCase
- Mapper functions (e.g. `mapMarketPair`) convert between DB rows and typed objects
- Kafka consumer pattern: `createConsumer(groupId, [topics])` → `consumer.run({ eachMessage })`
- Redis cache pattern: SET with 300s TTL, GET + JSON.parse

## Database

- Migrations in `db/migrations/` — auto-run by Postgres init in Docker
- Numbered: `001_initial_schema.sql`, `002_seed_market_pairs.sql`, etc.
- All queries go in `shared/db/src/index.ts`
- Use `pool.query()` with parameterized queries ($1, $2, ...)

## Docker

- Each service has its own `Dockerfile` in its package directory
- Pattern: `FROM node:20-alpine`, copy workspace package.json files, `npm install --workspace=...`, copy source, `CMD ["npx", "--workspace=...", "tsx", "src/index.ts"]`
- `docker-compose.yml` defines all services; infrastructure services have healthchecks

## API

- All routes registered in `packages/api/src/routes.ts` via `registerRoutes(app)`
- On-demand computation modules in separate files (e.g. `backtest.ts`, `execution-sim.ts`)
- Route pattern: `app.get<{ Params: ...; Querystring: ... }>("/path", async (req, reply) => { ... })`

## Dashboard

- Next.js 14 with App Router
- All API client functions in `packages/dashboard/src/lib/api.ts`
- Navigation links in `packages/dashboard/src/components/Nav.tsx`
- Chart components use Recharts with dark theme (`#1a1a2e` background, `#2a2a3e` grid)
- CSS variables: `--bg-secondary`, `--border`, `--text-primary`, `--text-secondary`, `--text-muted`, `--accent-blue`, `--accent-green`, `--accent-red`, `--accent-yellow`
- Pages are `"use client"` components with `useState`/`useEffect`

## Commits

- Small, independently valid commits that compile without breaking existing functionality
- No `Co-Authored-By` lines in commit messages
- Format: `type(scope): description` (e.g. `feat(analytics): implement lead-lag engine`)

## Key Constants

- `TOPICS`: `raw-prices`, `normalized-prices`, `opportunities`
- `REDIS_KEYS`: `price:{platform}:{marketPairId}`, `spread:{marketPairId}`
- `PLATFORM_FEES`: polymarket 2% taker, kalshi ~7% taker
- `DEFAULT_SPREAD_THRESHOLD`: 0.03 (3%)
