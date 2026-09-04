-- Store backtest run results for historical comparison

CREATE TABLE IF NOT EXISTS backtest_runs (
  id SERIAL PRIMARY KEY,
  threshold DOUBLE PRECISION NOT NULL,
  total_opportunities INTEGER NOT NULL,
  hit_rate DOUBLE PRECISION NOT NULL,
  theoretical_pnl DOUBLE PRECISION NOT NULL,
  avg_spread DOUBLE PRECISION NOT NULL,
  avg_convergence_ms DOUBLE PRECISION NOT NULL,
  run_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_backtest_runs_time ON backtest_runs (run_at DESC);
