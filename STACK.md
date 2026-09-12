# Idea Radar — Stack

> Last updated: 2026-09-12

## Services

| Service | Purpose | Env Vars |
|---------|---------|----------|
| **Neon** | Postgres DB (sources, discoveries, builder_profile, builder_memos, scrape_runs) | `DATABASE_URL` |
| **Neon (ee-ai-watch)** | EE AI Builders Watch DB — watch_* tables + admin-compatible sources/snapshots/scrape_runs | `DATABASE_URL_EEWATCH` |
| **Vercel** | Next.js dashboard hosting + Loop API | `LOOP_TOKEN`, `CRON_SECRET` |
| **GitHub Actions** | Bi-weekly scraper (1st & 15th, 06:00 UTC) + pre-filter | `DATABASE_URL`, `GH_API_TOKEN` (GH secrets) |
| **Resend** | Newsletter email delivery (pending API key setup) | `RESEND_API_KEY` |
| **Loop Control Center** | FALLBACK — manual loops intact | `LCC_API_KEY`, `EEWATCH_LCC_LOOP_ID` |
| **GitHub** | `GITHUB_TOKEN` for GitHub Search API source | `GITHUB_TOKEN` |

## Brand

- **Background:** `#F9F8F6` (Warm White / Canvas)
- **Secondary:** `#F1EFEA` (Cream)
- **Borders:** `#E5E1DA` (Soft Stone)
- **Text:** `#24241F` (Ink), `#45443E` (Body), `#75726A` (Slate)
- **Accents:** `#4B6344` (Olive/Push lane), `#B07B2E` (Ochre/Level Up lane)
- **Display font:** Newsreader (serif) · **Body:** Plus Jakarta Sans

## Auth

- Dashboard: public, no auth (personal tool)
- Admin: via Tracker Admin (eudi-wallet-tracker.vercel.app/admin), password gate
- Loop API: Bearer LOOP_TOKEN

## Pipeline (automated bi-weekly + cloud routine)

```
GitHub Actions (1st & 15th, 06:00 UTC):
  1. Scrape 31 active sources → pending discoveries in Neon
  2. Pre-filter (keyword gate) → relevant/irrelevant

Cloud routine (1st & 15th, 07:00 Tallinn, after GH Actions):
  3. GET /api/loop?op=get-relevant → read items + builder profile
  4. AI scores each discovery (PUSH/LEVEL UP lanes, growth compass criteria)
  5. POST /api/loop op=score-decisions → write accepted/rejected + scores
  6. POST /api/loop op=update-rates → recalculate source acceptance rates
  7. POST /api/loop op=save-memo → generate and store builder memo

Manual fallback: worker scripts in worker/src/ (run-scrape, pre-filter, ai-pass, etc.)
```

## Sources (31 active from 8 platforms)

| Platform | Sources | Count |
|----------|---------|-------|
| Product Hunt | RSS feed (no auth needed) | 1 |
| Hacker News | Show HN, Launch HN, Ask HN (Algolia API) | 3 |
| YouTube | Greg Isenberg, Marc Lou, Fireship, Pieter Levels, Simon Grimm, Will Kwan, Startup School | 6 (est.) |
| Reddit | r/SideProject, r/InternetIsBeautiful, r/microsaas, r/indiebiz, r/AppIdeas, r/buildinpublic, r/startups, r/EntrepreneurRideAlong, r/imadethis | 9 |
| Dev.to | showdev, sideproject | 2 |
| Medium | buildinpublic, indie-hacking, saas, side-project | 4 |
| Kickstarter | Kicktraq Technology, Kicktraq Design | 2 |
| TechCrunch | Startups feed | 1 |
| Y Combinator | Blog | 1 |
| Changelog | Podcast feed | 1 |

7 developer-technical sources deactivated (GitHub Trending, Lobsters, Dev.to ai, r/webdev, r/nextjs, Medium ai-tools + 7 more filler).

## Scoring — Growth Compass (PUSH / LEVEL UP)

Two lanes with comfort-zone penalties and growth-gap bonuses:
- **PUSH** (track: "novel") — unfamiliar domains, new skills. Scores: Feasibility, Novelty, Stretch.
- **LEVEL UP** (track: "familiar") — "I could build this better." Scores: Traction, Relevance, Improvability.
- **Comfort zone penalty (-2):** aggregators, trackers, dashboards, Estonian utilities
- **Growth gap bonus (+2):** health, education, creative tools, multiplayer/realtime, social, gaming, mobile-first, hardware/IoT, new interaction patterns
- Full criteria in `loop/idea-radar-pipeline.md`

## Admin (Federated — Tracker Admin project #3)

Shared admin at `eudi-wallet-tracker.vercel.app/admin` with project switcher.
- `DATABASE_URL_IDEARADAR` env var on EUDI Vercel
- `schema-idearadar.ts` in EUDI repo
- Source table with type badges, acceptance rates, bulk actions

## EE AI Builders Watch (`/watch` tab — separate product, same app)

Estonian AI trainer/agency competitive tracker. Spec: `EE-AI-Influencers-Watcher/SPEC.md`.
- Own Neon (`ee-ai-watch`), schema owner `src/db/schema-watch.ts` + `drizzle.config.watch.ts`
- Admin = Tracker Admin project #5 "EE AI Builders Watch"
- Run: `run loop ee-ai-watch` → executes `loop/ee-ai-watch-pipeline.md`
- Routes: `/watch`, `/watch/player/[slug]`, `/watch/memos`, `/watch/brief`

## Dev

```bash
npm run dev                                    # Next.js on port 3000
cd worker/src && npx tsx run-scrape.ts         # Manual scrape
cd worker/src && npx tsx pre-filter.ts         # Keyword pre-filter
cd worker/src && npx tsx ai-pass.ts            # Read relevant for scoring
cd worker/src && npx tsx update-decisions.ts   # Write scored decisions (stdin)
cd worker/src && npx tsx update-acceptance-rates.ts
cd worker/src && npx tsx scan-profile.ts       # Scan STACK.md files
cd worker/src && npx tsx save-profile.ts       # Save profile (stdin)
cd worker/src && npx tsx save-memo.ts          # Save memo (stdin JSON)
npx drizzle-kit push                           # Push schema to Neon
```

## Deploy

- **Dashboard:** auto-deploys on push to `master` via Vercel
- **Scrape:** GitHub Actions bi-weekly (1st & 15th) or manual `workflow_dispatch`
- **Pipeline scoring:** Cloud routine bi-weekly (pending setup) or manual via Claude Code

## Gotchas

| Gotcha | Fix |
|--------|-----|
| Neon `channel_binding=require` breaks Drizzle | Strip from connection string, use `sslmode=require` only |
| Reddit rate limits from datacenter IPs (429) | Use RSS format (.rss), 1.5s delay between sources |
| Product Hunt RSS works without auth token | Switched from GraphQL API to RSS — no token needed |
| Medium RSS feeds inconsistent | Treat as Tier 2, title+excerpt only (paywall) |
| GitHub Search API rate limit | `GITHUB_TOKEN` in .env.local + GH_API_TOKEN secret |
| Worker scripts use relative dotenv paths | Run from `worker/src/` or use `--cwd` |
| Loop API needs LOOP_TOKEN in Vercel | Generated and set 2026-09-12 |

## Post-Deploy Smoke Tests

1. Load `/` — Radar tab shows PUSH/LEVEL UP lanes with scored discoveries
2. Click "All" — raw firehose visible
3. Click "Filtered" — relevant items visible
4. Navigate to `/profile` — Builder Profile renders
5. Navigate to `/newsletter` — subscribe form renders
6. Tracker Admin → switch to "Idea Radar" — 31 sources visible
7. Feedback buttons (Sparked/Pass) update DB
8. Navigate to `/memo` — memos page renders with history
9. Dashboard shows dark memo hero card (if memos exist)
10. `GET /api/loop?op=status` with Bearer LOOP_TOKEN → returns source/discovery counts

## Pending Items

- **Resend API key** — user creates key named `idea-radar` in Resend dashboard, adds to .env.local + Vercel
- **Cloud routine** — set up via `/schedule` (bi-weekly 1st & 15th, 07:00 Tallinn, Opus 5)
- **Builder Profile rescan** — run `scan-profile.ts` + synthesize with growth-gap framing (67 projects)
