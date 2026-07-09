# Idea Radar — Stack

> Last updated: 2026-07-09

## Services

| Service | Purpose | Env Vars |
|---------|---------|----------|
| **Neon** | Postgres DB (sources, discoveries, builder_profile, builder_memos, scrape_runs) | `DATABASE_URL` |
| **Neon (ee-ai-watch)** | EE AI Builders Watch DB — watch_* tables + admin-compatible sources/snapshots/scrape_runs | `DATABASE_URL_EEWATCH` |
| **Vercel** | Next.js dashboard hosting | — |
| **Loop Control Center** | Pipeline loops (manual trigger; EE Watch loop `d79880d8…`) | `LCC_API_KEY`, `EEWATCH_LCC_LOOP_ID` |
| **GitHub** | `GITHUB_TOKEN` for GitHub Search API source | `GITHUB_TOKEN` |

## Brand

- **Background:** `#F9F8F6` (Warm White / Canvas)
- **Secondary:** `#F1EFEA` (Cream)
- **Borders:** `#E5E1DA` (Soft Stone)
- **Text:** `#2D2D2D` (Ink), `#555555` (Body)
- **Accents:** `#4B6344` (Olive/high novelty), `#D9A05B` (Ochre/mid), `#929292` (Slate/low)
- **Display font:** Newsreader (serif) · **Body:** Plus Jakarta Sans

## Auth

- Dashboard: public, no auth (personal tool)
- Admin: via Tracker Admin (eudi-wallet-tracker.vercel.app/admin), password gate

## Pipeline (manual trigger — "run idea-radar" in Claude Code)

```
1. npx tsx worker/src/run-scrape.ts    → fetch from 15 sources → pending
2. npx tsx worker/src/pre-filter.ts    → keyword gate → relevant/irrelevant
3. npx tsx worker/src/ai-pass.ts       → read relevant + Builder Profile → stdout
4. Claude Code scores (feasibility/novelty/stretch, threshold 7.0)
5. pipe JSON → npx tsx worker/src/update-decisions.ts → write to Neon
6. npx tsx worker/src/update-acceptance-rates.ts
7. Claude Code generates coaching memo (see docs/plans/2026-05-09-builder-memo-design.md for rules) → pipe JSON → npx tsx worker/src/save-memo.ts
```

## Sources (15 feeds from 7 platforms)

| Source | Type | Count |
|--------|------|-------|
| Product Hunt | producthunt | 1 (PARKED — needs token) |
| GitHub Search API | github | 2 (TypeScript + Python) |
| Hacker News Show HN | hackernews | 1 |
| Dev.to | devto | 3 (showdev, sideproject, ai) |
| Reddit | reddit | 3 (r/SideProject, r/webdev, r/nextjs) |
| Lobsters | rss | 1 |
| Medium | rss | 4 (side-project, indie-hacking, ai-tools, buildinpublic) |

## Admin (Federated — Tracker Admin project #3)

Shared admin at `eudi-wallet-tracker.vercel.app/admin` with project switcher.
- `DATABASE_URL_IDEARADAR` env var on EUDI Vercel
- `schema-idearadar.ts` in EUDI repo
- Source table with type badges, acceptance rates, bulk actions

## EE AI Builders Watch (`/watch` tab — separate product, same app)

Estonian AI trainer/agency competitive tracker. Spec: `EE-AI-Influencers-Watcher/SPEC.md`.
- Own Neon (`ee-ai-watch`), schema owner `src/db/schema-watch.ts` + `drizzle.config.watch.ts` (`npx drizzle-kit push --config drizzle.config.watch.ts`)
- Admin = Tracker Admin project #5 "EE AI Builders Watch" (`schema-eewatch.ts` copy in EUDI repo)
- Run: `run loop ee-ai-watch` → executes `loop/ee-ai-watch-pipeline.md` (LCC DB prompt = source of truth)
- Pipeline scripts in `worker/src/watch/` (run-watch, digest, save-signals, save-watch-memo, lcc-report, selfcheck)
- Routes: `/watch`, `/watch/player/[slug]`, `/watch/memos`, `/watch/brief` — read Neon at request time, no redeploy per run

## Dev

```bash
npm run dev                                    # Next.js on port 3000
cd worker/src && npx tsx run-scrape.ts         # Manual scrape
cd worker/src && npx tsx pre-filter.ts         # Keyword pre-filter
cd worker/src && npx tsx ai-pass.ts            # Read relevant for scoring
cd worker/src && npx tsx update-decisions.ts   # Write scored decisions (stdin)
cd worker/src && npx tsx update-acceptance-rates.ts  # Recalculate rates
cd worker/src && npx tsx scan-profile.ts       # Scan STACK.md files
cd worker/src && npx tsx save-profile.ts       # Save profile (stdin)
cd worker/src && npx tsx save-memo.ts           # Save memo (stdin JSON)
cd worker/src && npx tsx seed.ts               # Re-seed sources
npx drizzle-kit push                           # Push schema to Neon
npx drizzle-kit studio                         # Drizzle Studio
```

## Deploy

- **Dashboard:** auto-deploys on push to `master` via Vercel
- **Pipeline:** manually triggered by user in Claude Code session ("run idea-radar")

## Gotchas

| Gotcha | Fix |
|--------|-----|
| Neon `channel_binding=require` breaks Drizzle | Strip from connection string, use `sslmode=require` only |
| Reddit blocks datacenter IPs | May need Cloudflare Worker proxy in future |
| Product Hunt API needs OAuth token | PARKED — create at producthunt.com/v2/oauth/applications |
| Medium RSS feeds inconsistent | Treat as Tier 2, title+excerpt only (paywall) |
| GitHub Search API rate limit (unauthenticated) | Must set `GITHUB_TOKEN` in .env.local |
| Pipeline is NOT a single script | Claude Code orchestrates steps directly (EUDI pattern) |
| Builder Profile re-index only from Claude Code | API route returns status only, scan+synthesize via CLI |

## Post-Deploy Smoke Tests

1. Load `/` — Curated tab shows scored discoveries
2. Click "All Discoveries" — raw firehose visible
3. Click "Filtered" — relevant items visible
4. Navigate to `/profile` — Builder Profile renders
5. Navigate to `/newsletter` — subscribe form renders
6. Tracker Admin → switch to "Idea Radar" — 15 sources visible
7. Feedback buttons (Sparked/Pass) update DB
8. Navigate to `/memo` — memos page renders with history
9. Dashboard shows "Latest Builder Memo" card (if memos exist)

## Parked Items

- **Product Hunt token** — create at producthunt.com/v2/oauth/applications
- **Brevo newsletter** — new API key at app.brevo.com + CRON_SECRET
