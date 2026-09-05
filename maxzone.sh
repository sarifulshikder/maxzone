#!/usr/bin/env bash
# ==============================================================================
# Maxzone ISP-ERP — Production management script
#
#   Usage:
#     ./maxzone.sh up          build + start the whole production stack (Caddy TLS)
#     ./maxzone.sh down        stop the stack (keeps data volumes)
#     ./maxzone.sh build       rebuild images only
#     ./maxzone.sh migrate     apply pending SQL migrations to the production DB
#     ./maxzone.sh status      container + health status
#     ./maxzone.sh logs [svc]  tail logs (default: all)
#     ./maxzone.sh restart     restart the stack
#     ./maxzone.sh test        run the full test suite (unit + vet) and health probes
#     ./maxzone.sh backup      dump the PostgreSQL database to ./backups/
# ==============================================================================
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${REPO_DIR}/deploy/docker-compose.yml"
COMPOSE="docker compose -f ${COMPOSE_FILE}"

# Load production secrets from deploy/.env (compose also reads it automatically)
ENV_FILE="${REPO_DIR}/deploy/.env"
if [ -f "${ENV_FILE}" ]; then
  set -a
  # shellcheck disable=SC1090
  . "${ENV_FILE}"
  set +a
fi

GO_IMG="golang:1.25"
GOMODCACHE="${MZ_GOMODCACHE:-$(mktemp -d /tmp/maxzone-gomod.XXXXXX)}"
GOCACHE="${MZ_GOCACHE:-$(mktemp -d /tmp/maxzone-gocache.XXXXXX)}"
GOMODCACHE_ABS="/gomodcache"
GOCACHE_ABS="/gocache"

# ---------------- helpers ----------------
gobackend_test() {
  echo "==> go vet ./... && go test ./… (backend)"
  docker run --rm \
    -v "${REPO_DIR}:/workspace" \
    -v "${GOMODCACHE}:${GOMODCACHE_ABS}" \
    -v "${GOCACHE}:${GOCACHE_ABS}" \
    -e "GOMODCACHE=${GOMODCACHE_ABS}" \
    -e "GOCACHE=${GOCACHE_ABS}" \
    -w /workspace/backend "${GO_IMG}" \
    sh -c "go vet ./... && go test ./..."
}

health_probe() {
  local url="${1}"
  local ok=0
  if command -v python3 >/dev/null 2>&1; then
    python3 - "$url" <<'PY' >/dev/null 2>&1 && ok=1
import sys, urllib.request
urllib.request.urlopen(sys.argv[1], timeout=8).read()
PY
  elif command -v curl >/dev/null 2>&1; then
    curl -sf "${url}" >/dev/null 2>&1 && ok=1
  fi
  if [ "${ok}" -eq 1 ]; then
    echo "==> ${url}  -> UP"
  else
    echo "==> ${url}  -> DOWN (unreachable)"
  fi
}

wait_for_postgres() {
  echo "==> Waiting for PostgreSQL to accept connections"
  for i in $(seq 1 60); do
    if ${COMPOSE} exec -T postgres pg_isready -U "${DB_USER:-maxzone_user}" -d "${DB_NAME:-maxzone_db}" >/dev/null 2>&1; then
      echo "==> PostgreSQL ready"
      return 0
    fi
    sleep 2
  done
  echo "❌ PostgreSQL not ready after 120s" >&2
  return 1
}

run_migrations() {
  echo "==> Applying pending migrations to the production database"
  ${COMPOSE} exec -T postgres psql -v ON_ERROR_STOP=1 -U "${DB_USER:-maxzone_user}" "${DB_NAME:-maxzone_db}" \
    -c "CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT NOW());" >/dev/null
  for f in "${REPO_DIR}"/backend/migrations/*.up.sql; do
    name="$(basename "${f}")"
    applied="$(${COMPOSE} exec -T postgres psql -tA -U "${DB_USER:-maxzone_user}" "${DB_NAME:-maxzone_db}" \
      -c "SELECT 1 FROM schema_migrations WHERE filename = '${name}';" | tr -d '[:space:]')"
    if [ "${applied}" = "1" ]; then
      echo "    - ${name} (already applied)"
      continue
    fi
    ${COMPOSE} exec -T postgres psql -v ON_ERROR_STOP=1 -U "${DB_USER:-maxzone_user}" "${DB_NAME:-maxzone_db}" -f - < "${f}"
    ${COMPOSE} exec -T postgres psql -U "${DB_USER:-maxzone_user}" "${DB_NAME:-maxzone_db}" \
      -c "INSERT INTO schema_migrations (filename) VALUES ('${name}');" >/dev/null
    echo "    - ${name}  ... OK"
  done
  echo "==> Migrations complete"
}

# ---------------- commands ----------------
case "${1:-help}" in
  up)
    echo "==> Building & starting the production stack"
    ${COMPOSE} up -d --build
    wait_for_postgres
    run_migrations
    echo "==> Restarting api+worker so first-boot seeds run after migrations"
    ${COMPOSE} restart api worker
    ${COMPOSE} up -d --wait
    echo "==> ✅ Stack is up — open http://${SITE_ADDRESS:-localhost}"
    ;;
  migrate)
    ${COMPOSE} up -d postgres
    wait_for_postgres
    run_migrations
    ;;
  down)
    echo "==> Stopping the production stack"
    exec ${COMPOSE} down
    ;;
  build)
    echo "==> Building images"
    exec ${COMPOSE} build
    ;;
  status)
    echo "==> Container status"
    ${COMPOSE} ps
    ;;
  logs)
    shift || true
    exec ${COMPOSE} logs -f "${@}"
    ;;
  restart)
    echo "==> Restarting the production stack"
    exec ${COMPOSE} restart
    ;;
  test)
    echo ""
    echo "▛╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌▜"
    echo "‖        MAXZONE TEST SUITE               ‖"
    echo "▙╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌▟"
    echo ""
    gobackend_test
    echo ""
    echo "==> Integration health probes"
    health_probe "http://127.0.0.1:8080/api/v1/health"
    health_probe "http://127.0.0.1:3000/"
    echo ""
    echo "✅ ALL AUTOMATED UNIT TESTS PASS"
    ;;
  backup)
    mkdir -p "${REPO_DIR}/backups"
    stamp="$(date +%Y%m%d_%H%M%S)"
    out="${REPO_DIR}/backups/maxzone_${stamp}.dump"
    echo "==> Backup → ${out}"
    ${COMPOSE} exec -T postgres \
      pg_dump -U "${DB_USER:-maxzone_user}" "${DB_NAME:-maxzone_db}" -Fc > "${out}"
    echo "==> Backup complete ($(du -h "${out}" | cut -f1))"
    ;;
  help|*)
    grep '^#' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
    ;;
esac