#!/bin/bash
# Fresh Migration Script for World Bus Architecture
# This script drops the existing database and creates a fresh schema

set -e

echo "=== Fresh Migration: World Bus Clean Slate ==="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo -e "${RED}Error: Run this script from the repository root${NC}"
  exit 1
fi

# Load environment variables
if [ -f ".env" ]; then
  set -a
  source .env
  set +a
fi

DOCKER_COMPOSE=(docker compose -f config/docker/docker-compose.yml)

echo -e "${YELLOW}Step 1: Stopping Docker services...${NC}"
"${DOCKER_COMPOSE[@]}" down 2>/dev/null || true

echo -e "${YELLOW}Step 2: Removing database volume...${NC}"
docker volume rm arcwindsurf_pgdata 2>/dev/null || echo "Volume not found (OK)"

echo -e "${YELLOW}Step 3: Starting fresh database...${NC}"
"${DOCKER_COMPOSE[@]}" up -d db redis
echo "Waiting for database to be ready..."

# Wait for PostgreSQL to be ready
for i in {1..30}; do
  if "${DOCKER_COMPOSE[@]}" exec -T db pg_isready -U postgres >/dev/null 2>&1; then
    echo -e "${GREEN}Database is ready!${NC}"
    break
  fi
  if [ $i -eq 30 ]; then
    echo -e "${RED}Database failed to start${NC}"
    exit 1
  fi
  echo "Waiting... ($i/30)"
  sleep 1
done

echo -e "${YELLOW}Step 4: Running fresh migrations...${NC}"
pnpm --filter @minimal-rpg/db run db:migrate:fresh

echo -e "${YELLOW}Step 5: Verifying tables...${NC}"
TABLE_COUNT=$("${DOCKER_COMPOSE[@]}" exec -T db psql -U postgres -d minirpg -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")
echo -e "${GREEN}Created${TABLE_COUNT}tables${NC}"

echo ""
echo -e "${GREEN}=== Fresh migration complete! ===${NC}"
echo ""
echo "Tables created:"
"${DOCKER_COMPOSE[@]}" exec -T db psql -U postgres -d minirpg -c "\dt"

echo ""
echo "Next steps:"
echo "  1. Start all services: docker compose -f config/docker/docker-compose.yml up -d"
echo "  2. Begin web package refactoring (see dev-docs/FRESH_MIGRATION_PLAN.md)"
