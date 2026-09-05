# Maxzone — Production Deployment

Self-hosted ISP-ERP stack: **PostgreSQL+PostGIS / Redis / Go API / Go worker / Next.js standalone / Caddy (auto-SSL)**.

```
Client ─▶ Caddy :80/:443 ── /api/* ─▶ api:8080
              (auto-SSL)   └─ other ─▶ frontend:3000
                                                  │
                      postgres ─◀─ api / worker ──┴── redis
```

## Prerequisites

- A Linux host with **Docker Engine** (`daemon` + CLI) and the **Compose v2 plugin** (`docker compose version`).
- A public domain whose DNS **A record** points at the host (for automatic HTTPS).
- Ports **80** and **443** reachable from the internet and not used by another service.

## Quick start

```bash
cd deploy
cp .env.example .env          # then edit .env with real values
nano .env
../maxzone.sh up
```

`maxzone.sh up` builds the images, starts the stack, waits for PostgreSQL, applies any **pending** migrations (tracked in a `schema_migrations` table), restarts `api`+`worker` so first-boot user seeds run, and waits until every container is healthy.

On first boot the API seeds the demo users automatically. Passwords come from `.env`:

| Username | Role       | Env var                  | Example default |
|----------|------------|--------------------------|-----------------|
| admin    | SUPER_ADMIN | `INITIAL_ADMIN_PASSWORD` | `Maxzone@2026`  |
| support  | SUPPORT    | `SUPPORT_PASSWORD`       | `Support@2026`  |
| field    | FIELD_TECH | `FIELD_TECH_PASSWORD`    | `Field@2026`    |

> Change every password in `.env` before going live.

## Configuration (`.env`)

| Variable | Meaning | Notes |
|----------|---------|-------|
| `SITE_ADDRESS` | Public origin for Caddy | Real domain `maxzone.example.com` → ACME auto-SSL; or `http://127.0.0.1` for plain-HTTP testing |
| `APP_URL` / `FRONTEND_URL` | Browser-facing base URLs used by CORS | Default `https://${SITE_ADDRESS}`; override if staging behind another terminator |
| `DB_PASSWORD` / `REDIS_PASSWORD` | Database/cache secrets | Strong random values |
| `JWT_SECRET` | Session signing key | `openssl rand -hex 32` — changing it logs everyone out |
| `INITIAL_ADMIN_PASSWORD` | First super-admin password | Seeded on the API's first boot |
| `WORKER_ENABLE_INVOICES` | `true` = auto-generate monthly invoices on the 1st | Default `false` |
| `ACME_EMAIL` | Cert expiry notices from Let's Encrypt | |

## Operations

```bash
./maxzone.sh status      # container + health state
./maxzone.sh logs api    # follow logs (any service name)
./maxzone.sh migrate     # apply pending migrations manually
./maxzone.sh restart     # restart all containers
./maxzone.sh backup      # pg_dump (custom format) into ./backups/
./maxzone.sh test        # go vet + unit tests + live health probes
./maxzone.sh down        # stop the stack (data volumes are kept)
```

`./maxzone.sh backup` writes `backups/maxzone_<timestamp>.dump` (git-ignored). To restore on a fresh stack:

```bash
docker compose -f deploy/docker-compose.yml exec -T postgres pg_restore \
  -U "$DB_USER" -d "$DB_NAME" --clean --if-exists backups/maxzone_<timestamp>.dump
```

## Upgrading

```bash
git pull                    # fetch new code + migrations
./maxzone.sh build          # rebuild images (migrations still pending)
./maxzone.sh up             # restarts stack, applies new migrations automatically
```

## Notes / gotchas

- Migrations live in `backend/migrations/*.up.sql` and are applied **in order**; applied filenames are recorded in the `schema_migrations` table so re-runs only apply what's new.
- The `api` and `frontend` containers are **not** published to the host — all traffic enters through Caddy. Only `80`/`443` are exposed.
- Demo/ONLINE walkthrough data lives in the migrations seeds; delete it in a clean production environment if undesired.
- `.env` is git-ignored — never commit real credentials.