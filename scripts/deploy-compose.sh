#!/usr/bin/env bash
#
# Déploiement serveur avec Docker Compose.
# Remplace l'ancien workflow : docker build + docker run ...
#
# Usage :
#   ./scripts/deploy-compose.sh
#   ./scripts/deploy-compose.sh --pull    # git pull avant build
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

DO_PULL=0
for arg in "$@"; do
  case "$arg" in
    --pull) DO_PULL=1 ;;
    -h|--help)
      echo "Usage: $0 [--pull]"
      exit 0
      ;;
  esac
done

log() {
  printf '[deploy-compose] %s\n' "$*"
}

if ! command -v docker >/dev/null 2>&1; then
  log "Erreur : docker n'est pas installé."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  log "Erreur : docker compose n'est pas disponible."
  exit 1
fi

mkdir -p public/data public/clubsIcons

if [[ "$DO_PULL" -eq 1 ]]; then
  log "git pull…"
  git pull
fi

# Ancien conteneur lancé avec docker run (même nom)
if docker ps -a --format '{{.Names}}' | grep -qx 'lions-club-rapport'; then
  log "Arrêt et suppression de l'ancien conteneur lions-club-rapport…"
  docker stop lions-club-rapport >/dev/null 2>&1 || true
  docker rm lions-club-rapport >/dev/null 2>&1 || true
fi

log "Build et démarrage via docker compose…"
docker compose up -d --build

log "État du service :"
docker compose ps

log "Logs récents :"
docker compose logs --tail=20

log "Terminé. App sur http://localhost:3009 (ou via le reverse proxy configuré)."
