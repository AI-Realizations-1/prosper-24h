#!/usr/bin/env bash
set -euo pipefail

# Autopilot release script for Prosper.
# Flow:
# 1) Validate local and GitHub prerequisites
# 2) Trigger and watch staging deploy
# 3) Smoke-test staging health endpoint
# 4) Run K6 load tests (auth + studies)
# 5) Trigger and watch production deploy (optional)

REPO_DIR="${REPO_DIR:-$HOME/projects/Prosper}"
OWNER_REPO="${OWNER_REPO:-emi5650/Prosper}"
MAIN_BRANCH="${MAIN_BRANCH:-main}"
STAGING_BASE_URL="${STAGING_BASE_URL:-https://staging.prosper.example.com}"
DEPLOY_PRODUCTION="${DEPLOY_PRODUCTION:-false}"
STRICT_SECRETS="${STRICT_SECRETS:-true}"
FORCE_PUSH_TRIGGER="${FORCE_PUSH_TRIGGER:-false}"

required_staging_secrets=(
  DATABASE_URL
  JWT_SECRET
  JWT_REFRESH_SECRET
  CORS_ORIGIN
  CSRF_SECRET
  DEPLOY_SSH_HOST
  DEPLOY_SSH_USER
  DEPLOY_SSH_KEY
  DEPLOY_TARGET_PATH
)

optional_staging_secrets=(
  GPG_BACKUP_RECIPIENT
  SFTP_HOST
  SFTP_USER
  SFTP_TARGET_PATH
  E2E_EMAIL
  E2E_PASSWORD
  E2E_API_TOKEN
)

required_production_secrets=(
  DATABASE_URL
  JWT_SECRET
  JWT_REFRESH_SECRET
  CORS_ORIGIN
  CSRF_SECRET
  DEPLOY_SSH_HOST
  DEPLOY_SSH_USER
  DEPLOY_SSH_KEY
  DEPLOY_TARGET_PATH
)

optional_production_secrets=(
  GPG_BACKUP_RECIPIENT
  SFTP_HOST
  SFTP_USER
  SFTP_TARGET_PATH
)

log() { printf "\n[%s] %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
fail() { echo "ERROR: $*" >&2; exit 1; }

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Commande requise absente: $1"
}

gh_secret_names_for_env() {
  local env_name="$1"
  gh api "repos/${OWNER_REPO}/environments/${env_name}/secrets" --paginate \
    | jq -r '.secrets[].name' 2>/dev/null || true
}

ensure_environment_exists() {
  local env_name="$1"
  gh api --method PUT "repos/${OWNER_REPO}/environments/${env_name}" >/dev/null
}

check_env_secrets() {
  local env_name="$1"
  shift
  local -a required=("$@")
  local existing missing

  existing="$(gh_secret_names_for_env "$env_name")"
  missing=()

  for s in "${required[@]}"; do
    if ! grep -qx "$s" <<<"$existing"; then
      missing+=("$s")
    fi
  done

  if [[ ${#missing[@]} -gt 0 ]]; then
    echo "Secrets manquants pour l'environment ${env_name}: ${missing[*]}"
    if [[ "$STRICT_SECRETS" == "true" ]]; then
      fail "Secrets incomplets pour ${env_name}."
    fi
  else
    log "Secrets ${env_name}: OK"
  fi
}

report_optional_secrets() {
  local env_name="$1"
  shift
  local -a optional=("$@")
  local existing missing

  existing="$(gh_secret_names_for_env "$env_name")"
  missing=()

  for s in "${optional[@]}"; do
    if ! grep -qx "$s" <<<"$existing"; then
      missing+=("$s")
    fi
  done

  if [[ ${#missing[@]} -gt 0 ]]; then
    log "Secrets optionnels absents pour ${env_name}: ${missing[*]}"
  fi
}

has_env_secret() {
  local env_name="$1"
  local secret_name="$2"
  gh_secret_names_for_env "$env_name" | grep -qx "$secret_name"
}

latest_run_id_for_workflow() {
  local workflow_file="$1"
  gh run list -R "$OWNER_REPO" --workflow "$workflow_file" --limit 20 \
    --json databaseId,status,createdAt \
    | jq -r 'sort_by(.createdAt) | last | .databaseId // empty'
}

trigger_staging() {
  log "Déclenchement staging"

  if gh workflow run deploy-staging.yml -R "$OWNER_REPO" --ref "$MAIN_BRANCH" >/dev/null 2>&1; then
    log "deploy-staging.yml déclenché via workflow_dispatch"
    return 0
  fi

  if [[ "$FORCE_PUSH_TRIGGER" != "true" ]]; then
    fail "deploy-staging.yml n'accepte pas workflow_dispatch. Relancer avec FORCE_PUSH_TRIGGER=true pour déclencher via commit vide sur main."
  fi

  log "Fallback push trigger activé (commit vide)"
  cd "$REPO_DIR"
  git fetch origin "$MAIN_BRANCH"
  git checkout "$MAIN_BRANCH"
  git pull --ff-only origin "$MAIN_BRANCH"

  if ! git diff --quiet || ! git diff --cached --quiet; then
    fail "Arbre Git non propre. Commiter/stasher avant FORCE_PUSH_TRIGGER=true."
  fi

  git commit --allow-empty -m "chore: trigger staging deploy autopilot $(date '+%Y-%m-%d %H:%M:%S')"
  git push origin "$MAIN_BRANCH"
}

watch_workflow() {
  local workflow_file="$1"
  local run_id=""
  local tries=0

  while [[ -z "$run_id" && $tries -lt 30 ]]; do
    run_id="$(latest_run_id_for_workflow "$workflow_file")"
    tries=$((tries + 1))
    [[ -z "$run_id" ]] && sleep 5
  done

  [[ -z "$run_id" ]] && fail "Impossible de récupérer un run ID pour ${workflow_file}."

  log "Suivi run ${workflow_file} #${run_id}"
  gh run watch "$run_id" -R "$OWNER_REPO" --exit-status
}

smoke_staging() {
  log "Smoke test staging"
  local health_url="${STAGING_BASE_URL%/}/api/health"
  local body

  body="$(curl -fsS "$health_url")"
  echo "$body" | grep -q '"ok":true' || fail "Healthcheck KO: $body"
  log "Healthcheck OK: $health_url"
}

run_k6_scenario() {
  local scenario="$1"
  log "Déclenchement K6 scenario=${scenario}"

  gh workflow run load-test.yml -R "$OWNER_REPO" \
    -f base_url="$STAGING_BASE_URL" \
    -f scenario="$scenario"

  watch_workflow load-test.yml
}

trigger_production() {
  log "Déclenchement production"
  local sha

  sha="$(gh api repos/${OWNER_REPO}/branches/${MAIN_BRANCH} --jq '.commit.sha')"
  gh workflow run deploy-production.yml -R "$OWNER_REPO" -f sha="$sha"

  log "deploy-production.yml lancé pour sha=${sha}"
  watch_workflow deploy-production.yml
}

main() {
  need_cmd git
  need_cmd gh
  need_cmd jq
  need_cmd curl

  gh auth status >/dev/null 2>&1 || fail "gh auth non initialisé. Lancer: gh auth login"

  [[ -d "$REPO_DIR/.git" ]] || fail "Repo introuvable: $REPO_DIR"

  log "Création/validation des environments GitHub"
  ensure_environment_exists staging
  ensure_environment_exists production

  log "Vérification secrets GitHub Environments"
  check_env_secrets staging "${required_staging_secrets[@]}"
  report_optional_secrets staging "${optional_staging_secrets[@]}"

  if [[ "$DEPLOY_PRODUCTION" == "true" ]]; then
    check_env_secrets production "${required_production_secrets[@]}"
    report_optional_secrets production "${optional_production_secrets[@]}"
  fi

  trigger_staging
  watch_workflow deploy-staging.yml
  smoke_staging

  run_k6_scenario auth

  if has_env_secret staging E2E_API_TOKEN; then
    run_k6_scenario studies
  else
    log "E2E_API_TOKEN absent: scénario K6 studies ignoré (auth exécuté)."
  fi

  if [[ "$DEPLOY_PRODUCTION" == "true" ]]; then
    trigger_production
  else
    log "DEPLOY_PRODUCTION=false -> production non déclenchée"
  fi

  log "Autopilot terminé avec succès"
}

main "$@"
