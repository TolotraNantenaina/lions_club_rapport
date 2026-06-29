#!/usr/bin/env bash
#
# Commit et push automatique des données clubs (public/data, public/clubsIcons)
# si des fichiers ont changé. À lancer via cron sur le serveur où tourne Docker.
#
# Variables optionnelles :
#   GIT_REMOTE=igy          remote Git à utiliser
#   GIT_BRANCH=dev          branche cible
#   SYNC_PUBLIC_DRY_RUN=1     simule sans commit/push
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

REMOTE="${GIT_REMOTE:-igy}"
BRANCH="${GIT_BRANCH:-dev}"
LOCK_FILE="${TMPDIR:-/tmp}/lions-club-sync-public.lock"
SYNC_PATHS=(public/data public/clubsIcons)

log() {
  printf '[sync-public] %s\n' "$*"
}

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  log "Erreur : ce dossier n'est pas un dépôt Git."
  exit 1
fi

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  log "Synchronisation déjà en cours, abandon."
  exit 0
fi

HAS_CHANGES=0

for path in "${SYNC_PATHS[@]}"; do
  if [[ ! -e "$path" ]]; then
    continue
  fi

  if ! git diff --quiet HEAD -- "$path" 2>/dev/null; then
    HAS_CHANGES=1
    break
  fi

  if [[ -n "$(git ls-files --others --exclude-standard "$path")" ]]; then
    HAS_CHANGES=1
    break
  fi
done

if [[ "$HAS_CHANGES" -eq 0 ]]; then
  log "Aucune modification dans ${SYNC_PATHS[*]}."
  exit 0
fi

log "Modifications détectées, préparation du commit…"
git add -- "${SYNC_PATHS[@]}"

if git diff --cached --quiet; then
  log "Rien à committer après git add."
  exit 0
fi

COMMIT_MSG="chore(data): sync public clubs $(date -u +"%Y-%m-%d %H:%M UTC")"

if [[ "${SYNC_PUBLIC_DRY_RUN:-0}" == "1" ]]; then
  log "[dry-run] Commit qui aurait été créé : $COMMIT_MSG"
  git diff --cached --stat
  exit 0
fi

git commit -m "$COMMIT_MSG"
log "Commit créé : $COMMIT_MSG"

git push "$REMOTE" "HEAD:$BRANCH"
log "Push effectué vers $REMOTE/$BRANCH."
