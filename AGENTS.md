# AGENTS.md — Lions Club Rapport

## What this is

Next.js 14 + Tailwind CSS client app for generating Lions Club meeting reports (French UI). Exports to JPG via html2canvas.

## Commands

```bash
npm install          # install deps
npm run dev          # dev server → http://localhost:3009
npm run build        # production build
npm run start        # serves on port 3009 (NOT 3000)
npm run lint         # Next.js lint
```

**No unit tests exist.** Only k6 load tests in `tests/load/` (run separately with k6).

## Deployment

Docker Compose on port 3009:

```bash
npm run deploy          # docker compose up -d --build (--pull via script)
npm run docker:up       # docker compose up -d --build
npm run docker:down     # docker compose down
npm run docker:logs     # docker compose logs -f
```

Data directories (`public/data`, `public/clubsIcons`) are bind-mounted — changes visible without rebuild.

Server data sync (cron): `./scripts/sync-public-git.sh`

Build publishing to orphan branch: `npm run publish:build`

## Architecture

- **`app/page.js`** — main form + preview + JPG export (client component)
- **`app/parametre/page.js`** — admin/import page (XLSX club import, logo upload)
- **`app/components/preview.js`** — report page rendering with fixed dimensions (1240×1740px)
- **`app/components/formulaire.js`** — meeting form with club search autocomplete
- **`lib/`** — shared logic: Excel parsing, club data validation, logo optimization, server storage
- **`app/api/import/`** — API routes for XLSX and logo import
- **`public/data/clubs.json`** — club data (source of truth for club list)
- **`public/clubsIcons/`** — club logo images

## Key quirks

- App is entirely in French
- Preview renders at fixed 1240×1740px with page overflow detection
- Clubs data loaded via `useClubsData` hook (offline-first with Service Worker)
- Build ID injected as `NEXT_PUBLIC_BUILD_ID` env var at build time
- `/clubsIcons/:path*` rewrites to API route for dynamic logo serving
- `npm run logos:optimize` resizes club logos via sharp
- No TypeScript — pure JS throughout
