# YouTube Radar — Build Plan

Spec: `docs/SPEC-youtube-radar.md`
Phases: 5, each with a verification gate.

## Phase 1: Schema + Sources (DB foundation)

1. Create `src/db/schema-youtube.ts` — `youtube_videos` table, `youtube_memos` table, new `youtube` source type enum
2. Run `npx drizzle-kit push` to migrate
3. Seed the 20 YouTube tutorial channel sources into the `sources` table with `type: "youtube"`
4. Deactivate existing 5 YouTube sources from main radar (Marc Lou, Fireship, Pieter Levels, Simon Grimm, Will Kwan)
5. Wire into Tracker Admin (EUDI) as project "Idea Radar YouTube" — add `DATABASE_URL_IDEARADAR_YT` env or reuse existing `DATABASE_URL_IDEARADAR`, add schema file
6. Install `youtube-transcript` npm package (for transcript fetching on Vercel)

**Gate:** Sources visible in Tracker Admin under "Idea Radar YouTube" project. `youtube_videos` table exists in Neon. Main radar YouTube sources deactivated.

## Phase 2: Scraper + GH Actions

1. Write `worker/src/youtube-scrape.ts` — YouTube RSS parser that extracts ALL metadata (videoId, title, full description, thumbnail, views, ratings, published date, channel name/ID). No 500-char truncation.
2. Create `.github/workflows/youtube-scrape.yml` — Sunday 14:00 UTC cron + manual dispatch
3. Test locally: run scraper, verify videos stored in DB with full metadata
4. Push, set GH secrets if needed, trigger manual workflow_dispatch

**Gate:** Run the scraper. Videos in DB with view counts, full descriptions, thumbnails. Verify in Tracker Admin that items appear.

## Phase 3: Loop API + Transcript endpoint

1. Create `src/app/api/youtube-loop/route.ts`:
   - GET `op=get-pending` — returns pending videos + Builder Profile
   - GET `op=status` — health check
   - POST `op=score-decisions` — write AI scores, takeaways, build suggestions
   - POST `op=save-memo` — store coaching brief
   - POST `op=pull-transcript` — fetch transcript via youtube-transcript npm, clean VTT, store in DB, return text
   - POST `op=send-newsletter` — render visual email with thumbnails, send via Resend
2. Create `src/app/api/youtube/videos/route.ts` — public GET for dashboard
3. Create `src/app/api/youtube/videos/[id]/feedback/route.ts` — PASS/SPARKED

**Gate:** `GET /api/youtube-loop?op=status` returns correct counts. `POST op=pull-transcript` returns a real transcript for a known videoId. Score-decisions writes to DB.

## Phase 4: Dashboard UI

1. Create `src/app/components/radar-switcher.tsx` — dropdown in header, switches between Main Radar / YouTube Radar / EE Watch
2. Wire switcher into the existing header/nav component
3. Create `src/app/youtube/page.tsx` — YouTube Radar dashboard (memo hero, curated/filtered/all tabs, video cards)
4. Create `src/app/components/youtube-card.tsx` — video card with thumbnail, title, channel, views, score, verdict, takeaway, build suggestion, tags, feedback
5. Create `src/app/youtube/memos/page.tsx` — YouTube memos page
6. Wire MEMOS nav link to be contextual (main radar → /memo, YouTube → /youtube/memos)

**Gate:** Full browser verification at 1440px and 375px. Radar switcher works. YouTube Radar shows empty state ("YouTube Radar starts Sunday"). All tabs render. Video cards display correctly with real data (manually insert a test row if needed).

## Phase 5: Cloud routine + Newsletter + End-to-end

1. Write `loop/youtube-radar-pipeline.md` — full prompt/instructions for the cloud routine (scoring criteria, transcript analysis, newsletter generation)
2. Create cloud routine via `/schedule` — Sunday 17:00 UTC, Opus 5
3. Run the full pipeline manually once: scrape → score → transcripts → memo → newsletter
4. Verify newsletter email arrives with thumbnails and sections
5. Verify dashboard shows scored videos with takeaways and build suggestions
6. Update STACK.md, RESUME-HERE.md, project memory

**Gate:** Email received. Dashboard shows scored videos. Memos page shows coaching brief. End-to-end works.
