# Idea Radar — RESUME HERE

> Fresh-session entry point. Read top to bottom, then the "Read next" files in order.
> Settled decisions are settled — do not re-ask, do not re-litigate. Updated 2026-09-14.

## State

- **Prod URL:** https://idea-radar-topaz.vercel.app
- **Repo:** keeltekool/idea-radar
- **Last commit:** See `git log --oneline -5`
- **Tree:** clean after push
- **Deployed:** yes, Vercel auto-deploy

## What this project is (30 seconds)

Builder growth compass with two radars:

1. **Main Radar** — scrapes 20 non-YouTube consumer-product sources twice weekly (Mon/Thu), AI-scores discoveries using PUSH/LEVEL UP lanes with growth-gap bonuses, generates coaching memos and prose newsletter. Cloud routine Mon/Thu 04:00 UTC.

2. **YouTube Radar** (NEW, 2026-09-14) — scrapes 21 YouTube tutorial channels weekly (Sunday), extracts full metadata + transcripts via yt-dlp, AI analyzes what each video teaches and what to build from it, generates visual newsletter with thumbnails. Cloud routine Sunday 17:00 UTC.

Both radars share: same Neon DB, same Vercel deployment, same Resend newsletter subscriber list. Switcher dropdown in header toggles between Main Radar / YouTube Radar / EE Watch.

## Current state — done / undone

### Done (2026-09-14 session)
- YouTube Radar: schema, scraper, API, dashboard, newsletter, cloud routine — all built and deployed
- 21 YouTube tutorial channel sources seeded with channel IDs
- 315 videos scraped with full metadata (views, ratings, descriptions, thumbnails)
- 49+ transcripts pulled via yt-dlp
- GH Actions workflow for Sunday scrape + transcript pulling
- Cloud routine created (Opus 5, Sunday 17:00 UTC)
- Radar switcher dropdown (3-way: Main Radar / YouTube Radar / EE Watch)
- Main radar: 405 old garbage items purged, 6 news sources killed, pre-filter tightened
- Main radar newsletter rebuilt as prose coaching brief (not card dump)
- Main radar cloud routine updated to twice weekly (Mon/Thu)
- All 6 pages verified: 0 console errors, 0 failed requests

### Undone / pending
- **First YouTube Radar run** — cloud routine triggered, waiting for completion
- **Tracker Admin wiring** — wire YouTube Radar as project #6 in EUDI admin
- **Builder Profile rescan** — run scan-profile.ts (67 projects)
- **Portfolio update** — run /portfolio for Idea Radar entry
- **YouTube sources management** — user will amend the 21-channel list via Tracker Admin

## Cloud Routines

| Routine | Schedule | Model | ID |
|---------|----------|-------|-----|
| Main Radar Curation | Mon & Thu 04:00 UTC | Opus 5 | `trig_01F7P4x3PHq1YW7JuStN7HcW` |
| YouTube Radar Curation | Sunday 17:00 UTC | Opus 5 | `trig_01WFvdCPwdBqeaUbciNPX4tM` |

## Read next (in this order)
1. `STACK.md` — full services table, pipeline architecture, sources list, YouTube Radar section
2. `docs/SPEC-youtube-radar.md` — YouTube Radar spec (complete)
3. `docs/plans/2026-09-14-youtube-radar-plan.md` — build plan (5 phases)
4. `loop/idea-radar-pipeline.md` — main radar routine prompt
5. `loop/youtube-radar-pipeline.md` — YouTube radar routine prompt

## Critical context

1. **YouTube transcripts run in GH Actions (yt-dlp), not Vercel** — YouTube blocks datacenter IPs from fetching captions. GH Actions pulls transcripts and stores in DB. Cloud routine reads from DB.
2. **Main radar purged** — 405 old garbage items rejected, only 37 properly curated items remain.
3. **Newsletter is prose** — not card dumps. Main radar: sectioned coaching brief. YouTube: visual with thumbnails.
4. **Source types:** `youtube` type in sources table is for YouTube Radar only. Main radar orchestrator skips youtube-type sources.
5. **Resend BOM fix** — RESEND_API_KEY on Vercel had BOM corruption. The loop route strips non-ASCII from the key.
