#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-$HOME/projects/Prosper}"
API_DIR="$REPO_DIR/apps/api"
WEB_DIR="$REPO_DIR/apps/web"
API_NAME="prosper-api"
WEB_NAME="prosper-web"
API_URL="${API_URL:-http://127.0.0.1:3001}"
WEB_URL="${WEB_URL:-http://127.0.0.1:3000}"
LOCAL_ADMIN_EMAIL="${LOCAL_ADMIN_EMAIL:-admin@prosper.local}"
LOCAL_ADMIN_PASSWORD="${LOCAL_ADMIN_PASSWORD:-Prosper123!}"

log() {
  printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Commande requise absente: $1" >&2
    exit 1
  }
}

wait_http_ok() {
  local url="$1"
  local pattern="$2"
  local attempts="${3:-30}"
  local delay="${4:-2}"
  local body=""

  for _ in $(seq 1 "$attempts"); do
    body="$(curl -fsS "$url" 2>/dev/null || true)"
    if [[ -n "$body" ]] && grep -q "$pattern" <<<"$body"; then
      return 0
    fi
    sleep "$delay"
  done

  echo "Vérification HTTP échouée pour $url" >&2
  [[ -n "$body" ]] && echo "$body" >&2
  return 1
}

ensure_pm2() {
  if command -v pm2 >/dev/null 2>&1; then
    log "pm2 déjà disponible"
    return 0
  fi

  log "Installation de pm2"
  npm install -g pm2
}

ensure_env_files() {
  if [[ ! -f "$API_DIR/.env" ]]; then
    cp "$API_DIR/.env.example" "$API_DIR/.env"
  fi

  if [[ ! -f "$WEB_DIR/.env" ]]; then
    cp "$WEB_DIR/.env.example" "$WEB_DIR/.env"
  fi
}

prepare_dependencies() {
  log "Installation des dépendances"
  cd "$REPO_DIR"
  pnpm install --frozen-lockfile || pnpm install
}

prepare_database() {
  log "Migration Prisma + génération client"
  cd "$API_DIR"
  set -a
  source .env
  set +a
  pnpm prisma migrate deploy
  pnpm prisma generate
}

build_apps() {
  log "Build API"
  cd "$API_DIR"
  pnpm build

  log "Build Web"
  cd "$WEB_DIR"
  pnpm build
}

restart_processes() {
  log "Redémarrage des process pm2"
  pm2 delete "$API_NAME" >/dev/null 2>&1 || true
  pm2 delete "$WEB_NAME" >/dev/null 2>&1 || true

  pm2 start bash \
    --name "$API_NAME" \
    --time \
    -- -lc "cd '$API_DIR' && set -a && source .env && set +a && exec node dist/index.js"

  pm2 start bash \
    --name "$WEB_NAME" \
    --time \
    -- -lc "cd '$WEB_DIR' && if [[ ! -f .env ]]; then cp .env.example .env; fi && exec pnpm exec vite preview --host 127.0.0.1 --port 3000"

  pm2 save >/dev/null 2>&1 || true
}

bootstrap_local_user() {
  log "Bootstrap du compte local"
  local response

  response="$(curl -sS -X POST "$API_URL/api/auth/register" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$LOCAL_ADMIN_EMAIL\",\"password\":\"$LOCAL_ADMIN_PASSWORD\"}" || true)"

  if grep -q '"accessToken"' <<<"$response"; then
    log "Compte local créé: $LOCAL_ADMIN_EMAIL"
    return 0
  fi

  if grep -q 'User already exists' <<<"$response"; then
    log "Compte local déjà présent: $LOCAL_ADMIN_EMAIL"
    return 0
  fi

  echo "Réponse inattendue lors du bootstrap utilisateur: $response" >&2
  return 1
}

show_status() {
  log "Statut final"
  pm2 status
  printf '\nAPI : %s\n' "$API_URL"
  printf 'WEB : %s\n' "$WEB_URL"
  printf 'Login local : %s / %s\n' "$LOCAL_ADMIN_EMAIL" "$LOCAL_ADMIN_PASSWORD"
}

main() {
  need_cmd node
  need_cmd npm
  need_cmd pnpm
  need_cmd curl
  need_cmd psql

  [[ -d "$REPO_DIR/.git" ]] || {
    echo "Repo introuvable: $REPO_DIR" >&2
    exit 1
  }

  ensure_pm2
  ensure_env_files
  prepare_dependencies
  prepare_database
  build_apps
  restart_processes

  log "Vérification health API"
  wait_http_ok "$API_URL/api/health" '"ok":true'

  log "Vérification front"
  wait_http_ok "$WEB_URL" '<html'

  bootstrap_local_user
  show_status
}

main "$@"