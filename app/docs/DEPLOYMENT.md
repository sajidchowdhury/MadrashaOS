# MadrashaOS — Deployment Guide

> Complete step-by-step guide to deploy MadrashaOS on a fresh server.

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | ≥ 20 | JavaScript runtime |
| Bun | ≥ 1.1 | Package manager + script runner |
| Docker | any | Runs PostgreSQL 16 in a container |
| Git | any | Clone the repository |

## Quick Start (5 minutes)

```bash
# 1. Clone
git clone https://github.com/sajidchowdhury/MadrashaOS.git
cd MadrashaOS/app

# 2. Install dependencies
bun install

# 3. Configure environment
cp .env.example .env
# Edit .env: set DATABASE_URL, NEXTAUTH_SECRET (openssl rand -base64 32)
nano .env

# 4. Start PostgreSQL
bun run db:up

# 5. Generate Prisma client + migrate + seed
bunx prisma generate
bunx prisma migrate deploy
bun run db:seed

# 6. Start dev server
bun run dev
```

Open **http://localhost:3000** — login with `admin@madrashaos.org` / `password123`.

## One-Command Setup

```bash
bun run db:setup    # Docker up + migrate + seed + generate
bun run dev
```

## Production Deployment

### Step 1: Build

```bash
bun run build
```

This creates a standalone build in `.next/standalone/`. Verify it succeeds (54 routes compiled).

### Step 2: Configure Environment

Edit `.env` for production:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@db-host:5432/madrashaos?schema=public"
NEXTAUTH_URL="https://your-domain.org"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"

# Notifications (see .env.example for full setup)
NOTIFICATION_PROVIDER="resend"
RESEND_API_KEY="sk_..."
EMAIL_FROM="MadrashaOS <no-reply@your-domain.org>"
```

### Step 3: Run Migrations

```bash
bunx prisma migrate deploy
```

### Step 4: Seed (first install only)

```bash
bun run db:seed
```

**Important:** Change all 8 default passwords immediately after first login.

### Step 5: Start Production Server

```bash
bun run start
```

Or with PM2:

```bash
pm2 start "bun run start" --name madrashaos
pm2 save
pm2 startup
```

### Step 6: Reverse Proxy (Caddy)

```Caddyfile
your-domain.org {
    reverse_proxy localhost:3000
}
```

```bash
caddy start
```

Caddy automatically provisions SSL certificates via Let's Encrypt.

## Docker Compose (PostgreSQL only)

The included `docker-compose.yml` runs PostgreSQL 16:

```bash
bun run db:up       # Start PostgreSQL
bun run db:down     # Stop (keeps data)
bun run db:logs     # View logs
bun run db:studio   # Open Prisma Studio at localhost:5555
```

Credentials: `madrasha:madrasha@madrashaos` (matches `.env`).

## Backups

### Manual Backup (via UI)

Navigate to `/backup` → "Run Backup Now". This executes `pg_dump` and stores the result in `backups/`.

### Scheduled Backup (via Cron)

```bash
# Add to crontab (daily at 2 AM):
0 2 * * * /path/to/madrashaos/app/scripts/backup.sh
```

The script (`scripts/backup.sh`) creates a compressed SQL dump with 30-day retention.

### Restore

```bash
gunzip < backups/madrashaos_YYYYMMDD_HHMMSS.sql.gz | psql "$DATABASE_URL"
```

## Health Check

```bash
bun run scripts/healthcheck.ts
```

Checks: DB connection, API responding, auth working. Exits 0 (healthy) or 1 (unhealthy).

## Update / Upgrade

```bash
git pull origin main
bun install
bunx prisma migrate deploy
bun run build
pm2 restart madrashaos  # or: bun run start
```

## Rollback

```bash
git checkout <previous-commit-hash>
bunx prisma migrate deploy
pm2 restart madrashaos
```

## Environment Variables

See `.env.example` for the complete list with documentation. Key vars:

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Yes | — | JWT signing secret (generate with `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Yes | `http://localhost:3000` | Public URL of the app |
| `NOTIFICATION_PROVIDER` | No | `console` | Email provider: `console` / `smtp` / `resend` |
| `PAYMENT_DEFAULT_PROVIDER` | No | `manual` | Payment gateway: `manual` / `bkash` / `sslcommerz` (v2) |

## Default Login Credentials

| Email | Password | Role |
|-------|----------|------|
| `admin@madrashaos.org` | `password123` | Administrator |
| `principal@madrashaos.org` | `password123` | Authority (Principal) |
| `accounts@madrashaos.org` | `password123` | Accountant |
| `bilal@madrashaos.org` | `password123` | Teacher |
| `store@madrashaos.org` | `password123` | Storekeeper |
| `omar.parent@example.com` | `password123` | Guardian |
| `fatima@student.madrashaos.org` | `password123` | Student |
| `superadmin@madrashaos.org` | `password123` | Super Admin |

**⚠ Change all passwords on first login.**
