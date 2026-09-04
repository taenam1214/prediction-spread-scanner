#!/usr/bin/env bash
# Quick status check for all services

echo "=== Service Health Check ==="
echo ""

check() {
  local name=$1
  local url=$2
  if curl -sf "$url" > /dev/null 2>&1; then
    echo "  ✓ $name"
  else
    echo "  ✗ $name (unreachable)"
  fi
}

echo "Infrastructure:"
check "Postgres" "localhost:5432"
check "Redis" "localhost:6379"
check "Redpanda" "http://localhost:18082/brokers"
check "Redpanda Console" "http://localhost:8080"

echo ""
echo "Application:"
check "API" "http://localhost:3001/health"
check "Dashboard" "http://localhost:3000"

echo ""
echo "Docker containers:"
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "  docker compose not running"
echo ""
