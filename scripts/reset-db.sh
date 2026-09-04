#!/usr/bin/env bash
set -euo pipefail

echo "Resetting database..."
docker compose exec -T postgres psql -U scanner -d spread_scanner -c "
  TRUNCATE price_snapshots, opportunities, resolutions CASCADE;
"
echo "Tables truncated. Re-seeding..."
npx tsx scripts/seed-historical-data.ts
echo "Done."
