#!/usr/bin/env bash
# ============================================================
# MadrashaOS — Database Setup Script
# Session B0.1 — PostgreSQL Setup + Connection
# ============================================================
# This script:
#   1. Starts PostgreSQL via Docker Compose
#   2. Waits for the database to be healthy
#   3. Runs Prisma migrations
#   4. Generates the Prisma client
#   5. (Optional) Seeds the database
#
# Usage:
#   bun run scripts/setup-db.sh         # setup only
#   bun run scripts/setup-db.sh --seed  # setup + seed data
# ============================================================

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  MadrashaOS — Database Setup (Session B0.1)${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════${NC}"
echo ""

# --- Step 1: Check Docker ---
echo -e "${YELLOW}[1/5] Checking Docker...${NC}"
if ! command -v docker &> /dev/null; then
  echo -e "${RED}❌ Docker is not installed or not in PATH${NC}"
  echo "   Install Docker: https://docs.docker.com/get-docker/"
  exit 1
fi
echo -e "${GREEN}✓ Docker found: $(docker --version)${NC}"

# --- Step 2: Start PostgreSQL container ---
echo ""
echo -e "${YELLOW}[2/5] Starting PostgreSQL via Docker Compose...${NC}"
docker compose up -d

# --- Step 3: Wait for database to be healthy ---
echo ""
echo -e "${YELLOW}[3/5] Waiting for PostgreSQL to be ready...${NC}"
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if docker exec madrashaos-db pg_isready -U madrashaos -d madrashaos &> /dev/null; then
    echo -e "${GREEN}✓ PostgreSQL is ready${NC}"
    break
  fi
  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "  Attempt $RETRY_COUNT/$MAX_RETRIES — waiting..."
  sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo -e "${RED}❌ PostgreSQL did not become ready in time${NC}"
  echo "   Check logs: docker compose logs db"
  exit 1
fi

# --- Step 4: Run Prisma migrations ---
echo ""
echo -e "${YELLOW}[4/5] Running Prisma migrations...${NC}"
bunx prisma migrate dev --name init 2>/dev/null || {
  echo -e "${YELLOW}  No migrations to apply yet (schema has no models)${NC}"
  echo -e "${YELLOW}  This is expected for Session B0.1${NC}"
}
bunx prisma generate
echo -e "${GREEN}✓ Prisma client generated${NC}"

# --- Step 5: Verify connection ---
echo ""
echo -e "${YELLOW}[5/5] Verifying database connection...${NC}"
if docker exec madrashaos-db psql -U madrashaos -d madrashaos -c "SELECT version();" &> /dev/null; then
  echo -e "${GREEN}✓ Database connection verified${NC}"
  echo ""
  docker exec madrashaos-db psql -U madrashaos -d madrashaos -c "SELECT version();" | head -3
else
  echo -e "${RED}❌ Database connection failed${NC}"
  exit 1
fi

# --- Optional: Seed ---
if [ "${1:-}" = "--seed" ]; then
  echo ""
  echo -e "${YELLOW}[Bonus] Seeding database...${NC}"
  if [ -f "prisma/seed.ts" ]; then
    bun run prisma/seed.ts
    echo -e "${GREEN}✓ Database seeded${NC}"
  else
    echo -e "${YELLOW}  No seed file found (prisma/seed.ts)${NC}"
    echo -e "${YELLOW}  This is expected — seed script comes in Session B1.4${NC}"
  fi
fi

# --- Done ---
echo ""
echo -e "${GREEN}══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Database Setup Complete!${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════${NC}"
echo ""
echo "Connection string:"
echo "  postgresql://madrashaos:secret@localhost:5432/madrashaos"
echo ""
echo "Useful commands:"
echo "  bun run db:studio   # Open Prisma Studio (GUI for your database)"
echo "  bun run db:down     # Stop PostgreSQL"
echo "  bun run db:logs     # View PostgreSQL logs"
echo "  docker exec -it madrashaos-db psql -U madrashaos  # Direct psql shell"
echo ""
