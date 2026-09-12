# Idea Radar — RESUME HERE

> Fresh-session entry point. Read top to bottom, then the "Read next" files in order.
> Settled decisions are settled — do not re-ask, do not re-litigate. Updated 2026-09-12.

## State

- **Prod URL:** https://idea-radar-topaz.vercel.app
- **Repo:** keeltekool/idea-radar
- **Last commit:** `2db3eb0` — GH Actions + newsletter migration
- **Tree:** clean after push
- **Deployed:** yes, Vercel auto-deploy

## What this project is (30 seconds)

Builder growth compass — scrapes 31 consumer-product sources bi-weekly, AI-scores discoveries for growth potential using PUSH/LEVEL UP lanes with comfort-zone penalties and growth-gap bonuses, generates coaching memos. Dashboard with dark memo hero, full-width discovery cards with score strips, domain tags. Source management via federated EUDI admin.

## Current state — done / undone

### Done (2026-09-12 session)
- Source overhaul: 7 developer sources deactivated, 16 consumer sources added (31 active total)
- Keyword filter retuned for consumer products + growth domains
- Scoring criteria rewritten: PUSH/LEVEL UP lanes, comfort-zone penalties, growth-gap bonuses
- UI redesign: PUSH/LEVEL UP tabs, dark memo hero, full-width cards with score strips, domain tags
- `/api/loop` route built — EUDI pattern, token-guarded (GET: filter, get-relevant, status; POST: filter-decisions, run-filter, score-decisions, update-rates, save-memo)
- LOOP_TOKEN + CRON_SECRET generated and added to .env.local + Vercel
- GitHub Actions workflow: `.github/workflows/scrape.yml` — bi-weekly 1st & 15th, 06:00 UTC
- GH secrets set: DATABASE_URL, GH_API_TOKEN
- Newsletter migrated from Brevo to Resend (send route rewritten, env vars cleaned)
- STACK.md fully updated
- Plan saved: `docs/plans/2026-09-12-automation-plan.md`

### Undone / pending
- **Resend API key** — user must create key named `idea-radar` at resend.com, then add to .env.local + Vercel as `RESEND_API_KEY`
- **Cloud routine setup** — bi-weekly (1st & 15th, 07:00 Tallinn, Opus 5). Use `/schedule`. Prompt should read from `loop/idea-radar-pipeline.md` Steps 3-7. Token: LOOP_TOKEN from .env.local. Endpoint: `https://idea-radar-topaz.vercel.app/api/loop`
- **First full curation pass** — 98 relevant items sitting in DB from the test scrape. Need AI scoring with new growth compass criteria.
- **Builder Profile rescan** — run `scan-profile.ts` (67 projects found), synthesize with growth-gap framing, save via `save-profile.ts`
- **GH Actions verification** — second run was triggered, check if it succeeded (may need `channel_binding` stripped from DATABASE_URL secret)
- **Loop endpoint live test** — verify `GET /api/loop?op=status` returns 200 with correct token
- **Portfolio update** — run `/portfolio` for Idea Radar entry

## Read next (in this order)
1. `STACK.md` — full services table, pipeline architecture, sources list, gotchas
2. `loop/idea-radar-pipeline.md` — the full pipeline prompt with scoring criteria
3. `docs/plans/2026-09-12-automation-plan.md` — the 8-task implementation plan
4. `docs/plans/2026-09-12-resurrection-plan.md` — the strategic plan (sources, scoring, UI)

## Critical context that must not be lost

1. **Sources are in Neon, managed via federated EUDI admin** — not hardcoded. EUDI admin at `eudi-wallet-tracker.vercel.app/admin` has Idea Radar as project #3.
2. **Scoring penalizes comfort zone** — aggregators, trackers, dashboards, Estonian utilities get -2 on novelty/stretch. Growth gaps (health, education, creative, multiplayer, social, gaming, mobile, hardware) get +2.
3. **This is NOT a business tool** — no revenue signals, no MRR badges, no market analysis. It's a builder inspiration tool. "What cool things are people building that make you go I want to build something like that."
4. **PUSH lane = what new skill would this teach you.** LEVEL UP lane = what craft angle would make yours better. NOT "what market to enter" or "what revenue opportunity."
5. **EUDI pattern for loop endpoints** — cloud routine calls token-guarded /api/loop, DB never leaves Vercel. Scrape happens on GitHub Actions (separate from routine).
6. **The user wants to be pushed into unfamiliar domains** — they are stuck building the same patterns (scrape→filter→display). The tool should fight that tendency.
7. **Newsletter is Resend** (Brevo deprecated globally). API key not yet created for this project.
8. **Reddit RSS** — use `.rss` endpoint, not `.json`. JSON endpoints return 403/429 from datacenter IPs.
9. **Product Hunt** — switched from GraphQL API (needed auth token) to RSS feed (no auth needed).

## Gotchas from this session

- Worker scripts use `config({ path: "../../.env.local" })` — must run from `worker/src/` directory or the env vars don't load
- GitHub Actions: DATABASE_URL secret had invalid format on first attempt — re-set with `gh secret set --body` (not piped)
- Vercel env vars added between deploys need a new deploy (empty commit) to take effect
- The design canvas went through 3 iterations — revenue signals were wrong framing, same-layout-with-relabels was lazy. Final approved version: full-width cards with score strip, tabs instead of columns, dark memo hero.
- Reddit rate limiting: rapid sequential requests to multiple subreddits get 429. 1.5s delay between sources in the scraper helps.

## Pending owner items
- [ ] Create Resend API key named `idea-radar` at resend.com → add to .env.local + Vercel as RESEND_API_KEY
- [ ] Set up cloud routine via `/schedule` (1st & 15th, 07:00 Tallinn, Opus 5, prompt from pipeline.md)
- [ ] Run first full curation pass with new scoring (98 items waiting)
- [ ] Review dashboard at https://idea-radar-topaz.vercel.app after curation

## The continuation prompt (paste into the fresh window)

```
Continue the Idea Radar resurrection build. Read C:\Users\Kasutaja\Claude_Projects\idea-radar\RESUME-HERE.md first and follow it exactly — settled decisions are settled, do not re-ask them.

Mission: Complete the remaining items — (1) set up the bi-weekly cloud routine via /schedule following EUDI pattern (prompt from loop/idea-radar-pipeline.md, endpoint https://idea-radar-topaz.vercel.app/api/loop, LOOP_TOKEN from .env.local), (2) run the first full curation pass on the 98 relevant items using the growth compass scoring, (3) rescan Builder Profile from 67 projects with growth-gap framing, (4) verify GH Actions scrape works end-to-end, (5) portfolio update.

The user needs to create a Resend API key for the newsletter — prompt them for it. Sources: STACK.md for architecture, loop/idea-radar-pipeline.md for scoring criteria. Gates: loop endpoint returns 200, GH Actions scrape succeeds, dashboard shows scored discoveries. Go.
```
