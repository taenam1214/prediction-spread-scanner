-- Performance indices for dashboard query patterns

-- Speed up "latest N snapshots per market" queries
CREATE INDEX IF NOT EXISTS idx_snapshots_pair_platform_time
  ON price_snapshots (market_pair_id, platform, captured_at DESC);

-- Speed up opportunity feed ordering
CREATE INDEX IF NOT EXISTS idx_opportunities_detected
  ON opportunities (detected_at DESC);

-- Speed up category-filtered market queries
CREATE INDEX IF NOT EXISTS idx_pairs_category
  ON market_pairs (category) WHERE active = TRUE;
