#!/usr/bin/env bash
# ==============================================================================
# MAXZONE ISP-ERP — Unified Lifecycle Management CLI
# ==============================================================================

set -e
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load .env if present
if [ -f "$ROOT_DIR/.env" ]; then
  export $(grep -v '^#' "$ROOT_DIR/.env" | xargs)
fi

PID_DIR="$ROOT_DIR/.run"
mkdir -p "$PID_DIR" "$ROOT_DIR/logs"

case "$1" in
  dev-db)
    echo "🐘 Launching local PostgreSQL & Redis..."
    mkdir -p "$ROOT_DIR/deploy"
    docker compose -f "$ROOT_DIR/deploy/docker-compose.dev.yml" up -d
    echo "✅ Development database is ready on localhost:5432 and Redis on 6379!"
    ;;

  dev-down)
    echo "🛑 Stopping local dev databases..."
    docker compose -f "$ROOT_DIR/deploy/docker-compose.dev.yml" down
    ;;

  dev-start)
    echo "🚀 Starting Maxzone Development Stack..."
    # 1. Start databases
    docker compose -f "$ROOT_DIR/deploy/docker-compose.dev.yml" up -d
    
    # 2. Build and launch Go backend
    echo "📦 Compiling and starting Go Backend API..."
    cd "$ROOT_DIR/backend"
    go build -o "$ROOT_DIR/bin/maxzone-server" cmd/server/main.go
    setsid -f "$ROOT_DIR/bin/maxzone-server" >> "$ROOT_DIR/logs/backend.log" 2>&1
    sleep 1
    pgrep -f "$ROOT_DIR/bin/maxzone-server" > "$PID_DIR/backend.pid" || true
    echo "✅ Go Backend running on http://localhost:8080 (PID: $(cat "$PID_DIR/backend.pid" 2>/dev/null || echo "active"))"

    # 3. Start Next.js frontend
    echo "🌐 Starting Next.js Frontend..."
    cd "$ROOT_DIR/frontend"
    setsid -f ./node_modules/.bin/next start -p 3000 >> "$ROOT_DIR/logs/frontend.log" 2>&1
    sleep 1
    pgrep -f "next-server" > "$PID_DIR/frontend.pid" || true
    echo "✅ Next.js Frontend running on http://localhost:3000 (PID: $(cat "$PID_DIR/frontend.pid" 2>/dev/null || echo "active"))"
    echo "🎉 Maxzone is live at http://localhost:3000!"
    ;;

  dev-stop)
    echo "🛑 Stopping Maxzone development servers..."
    if [ -f "$PID_DIR/backend.pid" ]; then
      kill $(cat "$PID_DIR/backend.pid") 2>/dev/null || true
      rm -f "$PID_DIR/backend.pid"
      echo "🛑 Go Backend stopped."
    fi
    if [ -f "$PID_DIR/frontend.pid" ]; then
      kill $(cat "$PID_DIR/frontend.pid") 2>/dev/null || true
      rm -f "$PID_DIR/frontend.pid"
      echo "🛑 Next.js Frontend stopped."
    fi
    pkill -f "maxzone-server" 2>/dev/null || true
    pkill -f "next-server" 2>/dev/null || true
    echo "✅ Development servers stopped."
    ;;

  dev-status)
    echo "=== MAXZONE SYSTEM STATUS ==="
    # Check DB
    docker exec maxzone-dev-db pg_isready -U "${DB_USER:-maxzone_user}" -d "${DB_NAME:-maxzone_db}" 2>/dev/null && echo "🟢 PostgreSQL: ONLINE" || echo "🔴 PostgreSQL: OFFLINE"
    # Check Redis
    docker exec maxzone-dev-redis redis-cli -a "${REDIS_PASSWORD:-redis_secret}" ping 2>/dev/null | grep PONG && echo "🟢 Redis: ONLINE" || echo "🔴 Redis: OFFLINE"
    # Check API
    curl -s http://localhost:8080/api/v1/health | grep '"status":"UP"' && echo "🟢 Go Backend: ONLINE (http://localhost:8080)" || echo "🔴 Go Backend: OFFLINE"
    # Check Web
    curl -s -I http://localhost:3000 | grep -E "200 OK|304 Not Modified" && echo "🟢 Frontend Web: ONLINE (http://localhost:3000)" || echo "🔴 Frontend Web: OFFLINE"
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
    docker exec -t maxzone-dev-db pg_dump -U "${DB_USER:-maxzone_user}" "${DB_NAME:-maxzone_db}" | gzip > "$BACKUP_FILE" || \
    docker exec -t maxzone-db pg_dump -U "${DB_USER:-maxzone_user}" "${DB_NAME:-maxzone_db}" | gzip > "$BACKUP_FILE"
    echo "✅ Backup successfully created at $BACKUP_FILE."
    ;;

  test)
    echo "🧪 Running full system automated tests..."
    if [ -d "$ROOT_DIR/backend" ]; then
      cd "$ROOT_DIR/backend" && go test -v ./internal/...
    else
      echo "Backend directory not yet initialized."
    fi
    ;;

  *)
    echo "Usage: ./maxzone.sh {dev-start|dev-stop|dev-status|dev-db|dev-down|start|stop|restart|logs [service]|backup|test}"
    exit 1
    ;;
esac
