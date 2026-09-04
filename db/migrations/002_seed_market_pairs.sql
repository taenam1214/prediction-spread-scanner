-- Seed curated market pairs
-- These are manually mapped equivalent markets across Polymarket and Kalshi.
-- Platform market IDs are illustrative — replace with real IDs before production use.

INSERT INTO market_pairs (label, category, polymarket_market_id, kalshi_market_id, resolves_at) VALUES
  ('Fed Rate Decision Sep 2025 - Hold',     'economics', 'poly_fed_hold_sep25',     'FEDWATCH-25SEP-HOLD',   '2025-09-17T18:00:00Z'),
  ('Fed Rate Decision Sep 2025 - 25bp Cut', 'economics', 'poly_fed_cut25_sep25',    'FEDWATCH-25SEP-CUT25',  '2025-09-17T18:00:00Z'),
  ('US CPI Above 3% for Aug 2025',          'economics', 'poly_cpi_above3_aug25',   'CPI-25AUG-A3.0',       '2025-09-10T12:30:00Z'),
  ('Bitcoin Above $100k by EOY 2025',       'crypto',    'poly_btc_100k_eoy25',     'BTC-25DEC-100K',       '2025-12-31T23:59:59Z'),
  ('S&P 500 Above 6000 by EOY 2025',        'markets',   'poly_sp500_6000_eoy25',   'SP500-25DEC-6000',     '2025-12-31T23:59:59Z'),
  ('NFL Super Bowl LX Champion - Chiefs',    'sports',    'poly_nfl_sb60_chiefs',    'NFL-SB60-KC',          '2026-02-08T23:59:59Z'),
  ('NBA Finals 2026 Champion - Celtics',     'sports',    'poly_nba_finals26_bos',   'NBA-FINALS26-BOS',     '2026-06-20T23:59:59Z'),
  ('US Unemployment Above 4.5% Sep 2025',   'economics', 'poly_unemp_45_sep25',     'UNEMP-25SEP-A4.5',    '2025-10-03T12:30:00Z')
ON CONFLICT (polymarket_market_id, kalshi_market_id) DO NOTHING;
