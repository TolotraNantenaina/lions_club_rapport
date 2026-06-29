#!/usr/bin/env bash
#
# Publie un build Next.js prêt à lancer sur une branche orpheline build/<version>.
#
# Variables optionnelles :
#   GIT_REMOTE=igy                         remote Git (défaut : igy)
#   PUBLISH_BUILD_DRY_RUN=1                simule sans commit/push
#   PUBLISH_BUILD_SKIP_PUSH=1              commit local uniquement
#   PUBLISH_BUILD_WITHOUT_NODE_MODULES=1   branche plus légère (npm ci côté client)
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

REMOTE="${GIT_REMOTE:-igy}"
STAGE_DIR="${PUBLISH_BUILD_STAGE_DIR:-}"
ORIGINAL_BRANCH=""
BUILD_BRANCH=""
VERSION=""
STASHED=0

log() {
  printf '[publish-build] %s\n' "$*"
}

fail() {
  log "Erreur : $*"
  exit 1
}

restore_branch() {
  if [[ -n "$ORIGINAL_BRANCH" ]] && git rev-parse --verify "$ORIGINAL_BRANCH" >/dev/null 2>&1; then
    git checkout "$ORIGINAL_BRANCH" >/dev/null 2>&1 || true
  fi

  if [[ "$STASHED" -eq 1 ]]; then
    log "Restauration des changements locaux..."
    git stash pop >/dev/null || log "Attention : restaurez manuellement avec git stash pop."
    STASHED=0
  fi
}

stash_working_tree_if_needed() {
  if [[ -n "$(git status --porcelain)" ]]; then
    log "Mise de cote temporaire des changements locaux..."
    git stash push -u -m "publish-build autostash $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    STASHED=1
  fi
}

cleanup() {
  restore_branch

  if [[ -n "$STAGE_DIR" && -d "$STAGE_DIR" && "$STAGE_DIR" == /tmp/* ]]; then
    rm -rf "$STAGE_DIR"
  fi
}

trap cleanup EXIT

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  fail "ce dossier n'est pas un dépôt Git."
fi

if ! command -v node >/dev/null 2>&1; then
  fail "Node.js est requis."
fi

if ! command -v npm >/dev/null 2>&1; then
  fail "npm est requis."
fi

ORIGINAL_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
VERSION="$(node -p "require('./package.json').version")"
BUILD_BRANCH="build/$VERSION"
STAGE_DIR="${PUBLISH_BUILD_STAGE_DIR:-/tmp/lions-build-$VERSION-$$}"

stash_working_tree_if_needed

log "Version : $VERSION"
log "Branche cible : $BUILD_BRANCH"
log "Remote : $REMOTE"
log "Branche source : $ORIGINAL_BRANCH"

log "Build Next.js en cours..."
npm run build

log "Preparation du dossier de staging : ${STAGE_DIR}"
rm -rf "$STAGE_DIR"
mkdir -p "$STAGE_DIR/.next" "$STAGE_DIR/public"

rsync -a --exclude 'cache/' .next/ "$STAGE_DIR/.next/"
rsync -a public/ "$STAGE_DIR/public/"
cp package.json package-lock.json next.config.js "$STAGE_DIR/"

if [[ "${PUBLISH_BUILD_WITHOUT_NODE_MODULES:-0}" == "1" ]]; then
  log "Mode léger : node_modules exclu (npm ci requis côté client)."
else
  log "Installation des dependances production..."
  (
    cd "$STAGE_DIR"
    npm ci --omit=dev
  )
fi

log "Recuperation du remote ${REMOTE}..."
git fetch "${REMOTE}"

if git show-ref --verify --quiet "refs/heads/$BUILD_BRANCH"; then
  git branch -D "$BUILD_BRANCH" >/dev/null
fi

log "Creation de la branche orpheline ${BUILD_BRANCH}..."
git checkout --orphan "$BUILD_BRANCH"
git rm -rf . >/dev/null 2>&1 || true
git clean -fdx >/dev/null 2>&1 || true

rsync -a "$STAGE_DIR/" ./

git add -f .next/
git add -f public/
git add -f package.json package-lock.json next.config.js

if [[ "${PUBLISH_BUILD_WITHOUT_NODE_MODULES:-0}" != "1" ]]; then
  git add -f node_modules/
fi

NEXT_FILE_COUNT="$(git diff --cached --name-only | grep -c '^\.next/' || true)"

if [[ "$NEXT_FILE_COUNT" -eq 0 ]]; then
  fail "aucun fichier .next/ n'a ete ajoute au commit. Verifiez npm run build."
fi

log "${NEXT_FILE_COUNT} fichiers .next/ ajoutes au commit."

if git diff --cached --quiet; then
  fail "aucun fichier à committer sur $BUILD_BRANCH."
fi

COMMIT_MSG="build: release $VERSION"

if [[ "${PUBLISH_BUILD_DRY_RUN:-0}" == "1" ]]; then
  log "[dry-run] Commit qui aurait ete cree : $COMMIT_MSG"
  git diff --cached --stat | tail -20
  exit 0
fi

git commit -m "$COMMIT_MSG"
log "Commit créé : $COMMIT_MSG"

if [[ "${PUBLISH_BUILD_SKIP_PUSH:-0}" == "1" ]]; then
  log "Push ignoré (PUBLISH_BUILD_SKIP_PUSH=1)."
  log "Branche locale : $BUILD_BRANCH"
  exit 0
fi

git push -u "${REMOTE}" "${BUILD_BRANCH}" --force
log "Push effectue vers ${REMOTE}/${BUILD_BRANCH} (remplace la branche build existante le cas echeant)."
log "Recuperation client : git clone -b ${BUILD_BRANCH} <repo> && npm run start"
