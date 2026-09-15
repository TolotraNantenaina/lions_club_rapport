#!/usr/bin/env bash
set -euo pipefail

# ── Remote server ──────────────────────────────────────────
REMOTE_HOST="185.225.232.151"
REMOTE_PORT="6622"
REMOTE_USER="lions"
REMOTE_BASE="/home/lions/LIONS_CLUB_RAPPORT/public"

# ── Local project root ────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOCAL_BASE="$(cd "${SCRIPT_DIR}/.." && pwd)/public"

echo "Syncing from ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PORT} …"

# 1. clubs.json
echo "→ clubs.json"
scp -P "${REMOTE_PORT}" \
  "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_BASE}/data/clubs.json" \
  "${LOCAL_BASE}/data/clubs.json"

# 2. clubsIcons/ (entire directory, delete remote-deleted files)
echo "→ clubsIcons/"
rsync -avz --delete \
  -e "ssh -p ${REMOTE_PORT}" \
  "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_BASE}/clubsIcons/" \
  "${LOCAL_BASE}/clubsIcons/"

echo "Done. $(ls "${LOCAL_BASE}/clubsIcons/" | wc -l | tr -d ' ') logos synced."
