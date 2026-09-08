-- Lead-lag analysis results
CREATE TABLE IF NOT EXISTS lead_lag_results (
    id BIGSERIAL PRIMARY KEY,
    market_pair_id INTEGER NOT NULL REFERENCES market_pairs(id),
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    leader VARCHAR(20) NOT NULL CHECK (leader IN ('polymarket', 'kalshi')),
    lag_ms INTEGER NOT NULL,
    correlation DOUBLE PRECISION NOT NULL,
    sample_size INTEGER NOT NULL,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_lag_market_pair
    ON lead_lag_results (market_pair_id, computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_lag_computed
    ON lead_lag_results (computed_at DESC);

-- Liquidity snapshots
CREATE TABLE IF NOT EXISTS liquidity_snapshots (
    id BIGSERIAL PRIMARY KEY,
    market_pair_id INTEGER NOT NULL REFERENCES market_pairs(id),
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('polymarket', 'kalshi')),
    spread_bps DOUBLE PRECISION NOT NULL,
    depth_score DOUBLE PRECISION NOT NULL,
    liquidity_index DOUBLE PRECISION NOT NULL,
    best_bid DOUBLE PRECISION NOT NULL,
    best_ask DOUBLE PRECISION NOT NULL,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_liquidity_market_platform
    ON liquidity_snapshots (market_pair_id, platform, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_liquidity_captured
    ON liquidity_snapshots (captured_at DESC);
