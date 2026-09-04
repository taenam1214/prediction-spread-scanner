#!/usr/bin/env bash
set -euo pipefail

echo "=== Prediction Spread Scanner — Local Setup ==="
echo ""

# 1. Start infrastructure
echo "Starting infrastructure (Redpanda, Postgres, Redis)..."
docker compose up -d redpanda postgres redis
echo "Waiting for services to be healthy..."
sleep 5

# 2. Wait for Postgres
until docker compose exec -T postgres pg_isready -U scanner -d spread_scanner > /dev/null 2>&1; do
  echo "  Waiting for Postgres..."
  sleep 2
done
echo "Postgres is ready."

# 3. Wait for Redpanda
until docker compose exec -T redpanda rpk cluster health > /dev/null 2>&1; do
  echo "  Waiting for Redpanda..."
  sleep 2
done
echo "Redpanda is ready."

# 4. Install dependencies
echo ""
echo "Installing npm dependencies..."
npm install

# 5. Seed historical data
echo ""
echo "Seeding historical data..."
npx tsx scripts/seed-historical-data.ts

echo ""
echo "=== Setup complete! ==="
echo ""
echo "Next steps:"
echo "  docker compose up -d           # Start all services"
echo "  open http://localhost:3000      # Dashboard"
echo "  open http://localhost:8080      # Redpanda Console"
echo ""
