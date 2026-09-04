-- Initial schema for prediction spread scanner

CREATE TABLE IF NOT EXISTS market_pairs (
  id SERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  polymarket_market_id TEXT NOT NULL,
  kalshi_market_id TEXT NOT NULL,
  resolves_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (polymarket_market_id, kalshi_market_id)
);

CREATE TABLE IF NOT EXISTS price_snapshots (
  id BIGSERIAL PRIMARY KEY,
  market_pair_id INTEGER NOT NULL REFERENCES market_pairs(id),
  platform TEXT NOT NULL CHECK (platform IN ('polymarket', 'kalshi')),
  platform_market_id TEXT NOT NULL,
  implied_probability DOUBLE PRECISION NOT NULL,
  best_bid DOUBLE PRECISION NOT NULL,
  best_ask DOUBLE PRECISION NOT NULL,
  midpoint DOUBLE PRECISION NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_snapshots_pair_time ON price_snapshots (market_pair_id, captured_at DESC);
CREATE INDEX idx_snapshots_platform ON price_snapshots (platform, market_pair_id);

CREATE TABLE IF NOT EXISTS opportunities (
  id BIGSERIAL PRIMARY KEY,
  market_pair_id INTEGER NOT NULL REFERENCES market_pairs(id),
  detected_at TIMESTAMPTZ NOT NULL,
  polymarket_prob DOUBLE PRECISION NOT NULL,
  kalshi_prob DOUBLE PRECISION NOT NULL,
  spread DOUBLE PRECISION NOT NULL,
  fee_adjusted_spread DOUBLE PRECISION NOT NULL,
  still_open BOOLEAN NOT NULL DEFAULT TRUE,
  closed_at TIMESTAMPTZ,
  cheaper_platform TEXT NOT NULL CHECK (cheaper_platform IN ('polymarket', 'kalshi'))
);

CREATE INDEX idx_opportunities_pair ON opportunities (market_pair_id, detected_at DESC);
CREATE INDEX idx_opportunities_open ON opportunities (still_open) WHERE still_open = TRUE;

CREATE TABLE IF NOT EXISTS resolutions (
  id SERIAL PRIMARY KEY,
  market_pair_id INTEGER NOT NULL REFERENCES market_pairs(id) UNIQUE,
  outcome TEXT NOT NULL CHECK (outcome IN ('yes', 'no')),
  polymarket_final_prob DOUBLE PRECISION,
  kalshi_final_prob DOUBLE PRECISION,
  resolved_at TIMESTAMPTZ NOT NULL
);
