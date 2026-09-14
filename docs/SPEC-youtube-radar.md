# YouTube Radar — SPEC

**One-line:** Weekly AI-analyzed digest of tutorial YouTube content, surfacing what to learn and what to build from it.
**Status:** SPEC — complete
**Owner:** egertv@gmail.com
**Lives inside:** Idea Radar (`idea-radar-topaz.vercel.app`)
**Target route:** `/youtube`

> This document is self-contained. Read top to bottom; every decision is captured here.

---

## 1. Why this exists

**The problem:** The owner follows ~20 AI/coding tutorial YouTubers. YouTube's algorithm buries their content under entertainment and news. Manually checking 20 channels weekly is unsustainable. The valuable content — step-by-step tutorials on how to build with AI tools — gets missed.

**Why existing solutions fail:**
- **YouTube subscriptions feed** — chronological firehose, no filtering, no analysis. Shows everything including shorts, community posts, off-topic content.
- **YouTube notifications** — per-video pings with zero context on whether the video is worth the time.
- **RSS readers** — show titles and descriptions but no analysis of what the video teaches or whether it's relevant to your stack.
- **The current Idea Radar** — scrapes YouTube RSS but only captures titles, truncates descriptions to 500 chars, throws away view counts and thumbnails. Scores videos the same as a Reddit post title. No transcript analysis.

**Why this approach works:** YouTube RSS feeds provide rich metadata for free (full descriptions with product links and chapters, view counts, rating counts, thumbnails). Auto-generated transcripts are downloadable via yt-dlp with no API key. Combined, the AI has 100x more material per item than any text-based source. A weekly cloud routine can score from metadata, pull transcripts selectively, and deliver a coaching brief that tells you what to watch, what to skip, and what to build from it.

**Who uses it:** Single user (the owner). Personal tool. No auth needed.

---

## 2. Design tenets

1. **Teach me, don't show me** — a video that demonstrates how to build something scores higher than one that discusses or reviews it. Tutorials over commentary.
2. **The transcript is the product** — the AI reads what the creator actually said and extracts what you'd learn. Titles and thumbnails are bait; transcripts are truth.
3. **10 is the target, not 3** — the scoring bar is "would watching this teach me something useful?" not "is this the single best video?" Quality floor, not quality ceiling.
4. **Build suggestion on every accepted video** — every video the radar surfaces comes with "here's what YOU could build using this technique." The radar exists to generate build ideas, not watch lists.
5. **Visual email, not a text dump** — the newsletter uses thumbnails, channel names, view counts. YouTube content is visual; the digest should be too.
6. **Metadata first, transcripts on demand** — the scrape stores everything the RSS gives. The cloud routine scores from metadata, then pulls transcripts only for the ~10-15 it wants to feature. Keeps the pipeline fast and cheap.

---

## 3. How it works

### The weekly cycle

**Sunday 14:00 UTC (17:00 Tallinn) — GH Actions scrape:**
1. Read YouTube sources from `sources` table (type `youtube`, active only)
2. For each channel, fetch RSS feed: `youtube.com/feeds/videos.xml?channel_id=XXX`
3. Extract ALL available metadata per video: videoId, title, full description (no truncation), thumbnail URL, view count, rating count, published date, channel name
4. Store in `youtube_videos` table with status `pending`
5. Deduplicate by videoId — skip videos already in DB

**Sunday 17:00 UTC (20:00 Tallinn) — Cloud routine (Opus 5):**
1. `GET /api/youtube-loop?op=get-pending` — fetch all pending videos + Builder Profile
2. **Gate check** on each video using metadata only (title + description + view count):
   - Is this a tutorial/build walkthrough? (YES = continue, NO = status `skipped`)
   - Score from metadata: relevance to builder's stack (1-10), teaching value (1-10), traction/views (1-10)
   - Composite = (relevance x 0.3) + (teaching x 0.4) + (traction x 0.3). Threshold: 5.5 (intentionally low — target ~10 accepted)
3. **Top ~10-15 videos:** pull transcripts via yt-dlp endpoint
4. **Deep analysis** on each transcript:
   - What tools/products are demonstrated
   - What technique is taught (specific, not generic)
   - 2-3 key takeaways
   - Build suggestion: what could the owner build with this technique
   - Topic tags (1-3)
5. `POST /api/youtube-loop op=score-decisions` — write scores, takeaways, build suggestions
6. `POST /api/youtube-loop op=save-memo` — coaching brief about this week's YouTube landscape
7. `POST /api/youtube-loop op=send-newsletter` — visual digest with thumbnails

### The user experience

1. Opens Idea Radar, clicks the radar switcher in the header
2. Selects "YouTube Radar" from the dropdown (alongside "Main Radar" and "EE Watch")
3. Full view swap — YouTube Radar has its own:
   - Memo hero card (latest YouTube coaching brief)
   - Curated/Filtered/All tabs
   - Video cards with thumbnails, scores, takeaways, build suggestions
   - Memos page
4. Curated tab shows accepted videos sorted by score, with full AI analysis
5. Filtered tab shows videos that passed the metadata gate (before transcript analysis)
6. All tab shows every video from every source, newest first
7. Sunday evening: email arrives with the week's coaching brief

---

## 4. Screens & pages

### 4a. Radar Switcher (header component, shared across all views)

**Purpose:** Switch between Main Radar, YouTube Radar, and EE Watch.

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Idea Radar  PERSONAL INTELLIGENCE    [▼ YouTube Radar]  MEMOS  │
│                                       ┌──────────────┐ PROFILE │
│                                       │ Main Radar   │ NEWS..  │
│                                       │ YouTube ✓    │         │
│                                       │ EE Watch     │         │
│                                       └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

- Dropdown trigger replaces the current DASHBOARD link
- Shows current radar name + down arrow
- Click opens popover with three options
- Current selection has a checkmark
- MEMOS, PROFILE, NEWSLETTER links stay — they're contextual to the active radar
- EE WATCH moves from its separate header button into the switcher

**States:**
- Default: Main Radar selected (backward compatible)
- YouTube Radar selected: all sub-pages (`/youtube`, `/youtube/memos`) serve YouTube content
- EE Watch selected: existing `/watch` routes

### 4b. YouTube Radar — Dashboard (`/youtube`)

**Purpose:** The main view. Show the latest YouTube coaching brief and scored videos.

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ MEMO · 14 SEPT 2026 · 12 VIDEOS                        │
│                                                         │
│ "Cole Medin walked through building MCP servers in      │
│  20 minutes. Three channels this week covered the       │
│  same pattern: local-first AI tools..."                 │
│                                                         │
│ Read the full memo →                                    │
├─────────────────────────────────────────────────────────┤
│ 20 sources · 47 videos                                  │
│                                                         │
│ [CURATED]  [FILTERED]  [ALL]     [Search] [Source ▼]   │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [THUMBNAIL]  Title of the video                     │ │
│ │              Cole Medin · 45K views · 2d ago        │ │
│ │                                                     │ │
│ │  ★ 8.2  WATCH                                      │ │
│ │                                                     │ │
│ │  Takeaway: Shows how to build MCP servers with      │ │
│ │  Claude Code. Full tool definition → test → deploy. │ │
│ │                                                     │ │
│ │  Build: An MCP server that wraps your Neon DBs      │ │
│ │  with natural language queries.                     │ │
│ │                                                     │ │
│ │  AI · MCP · CLAUDE-CODE          [PASS] [SPARKED]   │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [THUMBNAIL]  Next video...                          │ │
│ │              ...                                    │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Video card elements (Curated tab):**
- Thumbnail (16:9, from RSS `media:thumbnail`, links to YouTube video)
- Title (links to YouTube video)
- Channel name, view count (formatted: "45K"), relative date ("2d ago")
- Score badge (composite, colored by value)
- Verdict: WATCH or SKIP (green/grey)
- Takeaway: 1-2 sentences, what you'd learn
- Build suggestion: 1-2 sentences, what to build with this
- Topic tags (1-3, pill badges)
- Feedback buttons: PASS / SPARKED

**Video card elements (All tab — unscored):**
- Thumbnail, title, channel, view count, date
- No score, no takeaway, no build suggestion
- Status badge: pending / scored / skipped

**Video card elements (Filtered tab — metadata-gated, pre-transcript):**
- Same as All tab but only videos that passed the metadata gate
- Shows metadata score if available

**States:**
- **Empty (first visit, no data):** "YouTube Radar starts Sunday. 20 channels configured." with link to Tracker Admin.
- **Loading:** Skeleton cards with thumbnail placeholder
- **No results for filter:** "No videos match your search."

**Data shape per video card:**
```json
{
  "id": 1,
  "videoId": "aspmNhKAFMc",
  "title": "How to Build MCP Servers with Claude Code",
  "description": "Full description with links...",
  "thumbnailUrl": "https://i2.ytimg.com/vi/aspmNhKAFMc/hqdefault.jpg",
  "viewCount": 45200,
  "ratingCount": 1230,
  "channelName": "Cole Medin",
  "publishedAt": "2026-09-12T17:00:00Z",
  "status": "accepted",
  "score": 8.2,
  "verdict": "watch",
  "takeaway": "Shows how to build MCP servers...",
  "buildSuggestion": "An MCP server that wraps...",
  "tags": ["ai", "mcp", "claude-code"],
  "transcript": "...(stored but not displayed on card)...",
  "sourceName": "Cole Medin YouTube"
}
```

### 4c. YouTube Radar — Memos (`/youtube/memos`)

**Purpose:** History of weekly YouTube coaching briefs.

**Layout:** Same as existing `/memo` page structure — expandable memo cards ordered newest first. Each memo has date, video count badge, and the full coaching brief content.

**Memo content structure:**
- What came in (video counts, channels active)
- Patterns (what topics dominated this week)
- Direct callouts (specific videos with why they matter)
- The technique of the week (one skill worth learning)
- Build suggestion

### 4d. YouTube Radar — Newsletter email

**Purpose:** Sunday evening email with the week's YouTube coaching brief.

**Layout:**
```
┌─────────────────────────────────────────┐
│       Idea Radar                        │
│     YOUTUBE RADAR                       │
│ ─────────────────────────────────────── │
│                                         │
│  47 screened · 12 scored · Sunday run   │
│                                         │
│  THE SIGNAL                             │
│  ───────────────────────────────────    │
│  Three channels covered local-first     │
│  AI tools this week...                  │
│                                         │
│  WATCH THESE                            │
│  ───────────────────────────────────    │
│  ┌─────────┐ Title                      │
│  │THUMBNAIL│ Cole Medin · 45K views     │
│  │         │ Takeaway: ...              │
│  └─────────┘ Build: ...                 │
│                                         │
│  ┌─────────┐ Title                      │
│  │THUMBNAIL│ Channel · 12K views        │
│  │         │ Takeaway: ...              │
│  └─────────┘ Build: ...                 │
│                                         │
│  SKIP THESE                             │
│  ───────────────────────────────────    │
│  Video Title — why it's not worth it    │
│  Video Title — covers old ground        │
│                                         │
│  THE TECHNIQUE                          │
│  ───────────────────────────────────    │
│  This week's skill: building MCP        │
│  servers...                             │
│                                         │
│  BUILD THIS                             │
│  ───────────────────────────────────    │
│  An MCP server that wraps your Neon     │
│  databases with NL queries...           │
│                                         │
│       [OPEN YOUTUBE RADAR]              │
│                                         │
│  Twice weekly from Idea Radar           │
│  Unsubscribe                            │
└─────────────────────────────────────────┘
```

**Sections:**
- Header: "Idea Radar / YouTube Radar" branding
- Stats bar: videos screened, scored, run date
- **THE SIGNAL** — sharpest pattern from this week
- **WATCH THESE** — 4-6 videos with thumbnail, title, channel, views, takeaway, build suggestion
- **SKIP THESE** — 2-3 videos that looked relevant but aren't worth the time, with one-line reason
- **THE TECHNIQUE** — one specific technique worth learning this week
- **BUILD THIS** — one concrete product idea from the tutorials
- CTA button: "Open YouTube Radar"
- Footer: unsubscribe

**Data contract (sent by cloud routine):**
```json
{
  "op": "send-newsletter",
  "newsletter": {
    "subject": "Cole Medin showed how to build MCP servers in 20 minutes",
    "stats": { "total": 47, "scored": 12 },
    "sections": [
      { "label": "The signal", "text": "Three channels..." },
      { "label": "Watch these", "videos": [
        {
          "title": "How to Build MCP Servers",
          "url": "https://youtube.com/watch?v=xxx",
          "thumbnailUrl": "https://i2.ytimg.com/vi/xxx/hqdefault.jpg",
          "channel": "Cole Medin",
          "views": "45K",
          "takeaway": "...",
          "buildSuggestion": "..."
        }
      ]},
      { "label": "Skip these", "items": [
        { "title": "Video title", "reason": "Covers ground from 2 weeks ago" }
      ]},
      { "label": "The technique", "text": "Building MCP servers..." },
      { "label": "Build this", "text": "An MCP server that wraps..." }
    ]
  }
}
```

---

## 5. Data model

### youtube_videos table

| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| videoId | varchar(20) UNIQUE | YouTube video ID |
| sourceId | integer FK → sources | Which channel |
| title | text | |
| description | text | Full, no truncation |
| thumbnailUrl | text | 480x360 from RSS |
| viewCount | integer | From RSS media:statistics |
| ratingCount | integer | From RSS media:starRating |
| channelName | text | |
| channelId | text | YouTube channel ID |
| publishedAt | timestamptz | Video publish date |
| status | enum | pending, filtered, accepted, skipped |
| score | real | Composite score (nullable) |
| verdict | text | "watch" or "skip" (nullable) |
| takeaway | text | AI-written (nullable) |
| buildSuggestion | text | AI-written (nullable) |
| tags | text[] | Topic tags |
| transcript | text | Full VTT transcript, cleaned (nullable) |
| extractedTools | text[] | Products/tools mentioned (nullable) |
| userFeedback | enum | spark, pass (nullable) |
| scrapedAt | timestamptz | When GH Actions found it |
| scoredAt | timestamptz | When cloud routine scored it (nullable) |

### youtube_memos table

| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| content | text | Full memo markdown |
| videoCount | integer | Videos scored in this run |
| generatedAt | timestamptz | |

### sources table (existing, new entries)

20 YouTube tutorial channel rows with:
- `type`: "youtube" (new enum value)
- `active`: true
- `config`: `{ channelId: "UCxxx", feedUrl: "youtube.com/feeds/videos.xml?channel_id=UCxxx" }`

Federated into Tracker Admin as project "Idea Radar YouTube" (new project entry).

---

## 6. User flows

### Primary flow (weekly cycle)
```
Sunday 14:00 UTC: GH Actions scrape
  → 20 channels fetched
  → ~40-60 new videos stored as pending
  → 3 hours pass
Sunday 17:00 UTC: Cloud routine
  → Reads pending videos + Builder Profile
  → Gate: ~25-30 pass metadata check
  → Transcript pull for top ~15
  → Deep analysis → ~10 accepted with takeaways
  → Memo saved
  → Newsletter sent to inbox
Sunday evening: User reads email
  → Sees 4-6 WATCH recommendations with thumbnails
  → Clicks through to YouTube for 1-2 videos
  → Opens radar dashboard to browse all scored videos
```

### Secondary flow (manual browsing)
```
User opens /youtube anytime
  → Curated tab: scored videos from latest + previous runs
  → Clicks a video card → opens YouTube in new tab
  → Clicks SPARKED on a card → feedback saved
  → Clicks Memos tab → reads coaching briefs history
```

### First-time / empty state
```
User opens /youtube before first run
  → Memo hero hidden (no memos)
  → "YouTube Radar starts Sunday. 20 channels configured."
  → All tab shows nothing (no scrape yet)
```

---

## 7. Architecture & tech stack

**Inherited from Idea Radar (no new dependencies):**
- Next.js (App Router) on Vercel
- Tailwind CSS
- Neon PostgreSQL + Drizzle ORM
- Resend for email
- TypeScript throughout

**New infrastructure:**
- GH Actions workflow: `.github/workflows/youtube-scrape.yml` (Sunday 14:00 UTC)
- Cloud routine: new Anthropic routine, Sunday 17:00 UTC, Opus 5
- Vercel API route: `/api/youtube-loop` (GET + POST, token-guarded)
- Tracker Admin: new project entry "Idea Radar YouTube" on EUDI admin

**External services:**
- YouTube RSS feeds (no API key, no auth, free)
- `youtube-transcript` npm package on Vercel for transcript fetching (pure JS, no yt-dlp binary needed). Cloud routine calls `POST /api/youtube-loop op=pull-transcript` per video → Vercel endpoint fetches auto-captions via YouTube's internal API → stores cleaned transcript in DB → returns to routine. Transcripts stripped of VTT timestamps, deduped, line-broken at natural pauses.

**Key file additions:**
```
src/db/schema-youtube.ts          — youtube_videos, youtube_memos tables
src/app/youtube/page.tsx           — YouTube Radar dashboard
src/app/youtube/memos/page.tsx     — YouTube memos page
src/app/api/youtube-loop/route.ts  — Loop API (get-pending, score-decisions, save-memo, send-newsletter, pull-transcript)
src/app/components/youtube-card.tsx — Video card component
src/app/components/radar-switcher.tsx — Header dropdown
worker/src/youtube-scrape.ts       — GH Actions YouTube scraper
.github/workflows/youtube-scrape.yml — Sunday cron
loop/youtube-radar-pipeline.md     — Cloud routine prompt/instructions
```

---

## 8. API routes

### `/api/youtube-loop` (token-guarded, Bearer LOOP_TOKEN)

| Method | Op | Purpose | Request | Response |
|--------|----|---------|---------|----------|
| GET | get-pending | Videos for scoring | — | `{ count, videos[], builderProfile }` |
| GET | status | Health check | — | `{ sources, videos: {total, pending, accepted, skipped}, lastMemo }` |
| POST | score-decisions | Write AI scores | `{ decisions: [{id, status, score, verdict, takeaway, buildSuggestion, tags, transcript, extractedTools}] }` | `{ accepted, skipped, total }` |
| POST | save-memo | Store coaching brief | `{ content, videoCount }` | `{ saved, memoId }` |
| POST | send-newsletter | Render + send email | `{ newsletter: {subject, stats, sections} }` | `{ sent, errors, total }` |
| POST | pull-transcript | Get transcript for one video | `{ videoId }` | `{ videoId, transcript, length }` |

### `/api/youtube/videos` (public, no auth)

| Method | Purpose | Params | Response |
|--------|---------|--------|----------|
| GET | List videos for dashboard | status, source, search, sort, limit, page | `{ items[], total, page }` |

### `/api/youtube/videos/[id]/feedback` (public)

| Method | Purpose | Body | Response |
|--------|---------|------|----------|
| POST | Save user feedback | `{ feedback: "spark" \| "pass" }` | `{ ok }` |

---

## 9. Auth & access model

No authentication. Public dashboard, personal tool. Loop API is token-guarded (Bearer LOOP_TOKEN, same token as main radar). Tracker Admin access via existing EUDI admin password gate.

---

## 10. Responsive & device strategy

**Primary device:** Desktop (1440px). The email is read on mobile (375px).

**Dashboard:**
- Desktop: thumbnail left, text right (horizontal card)
- Mobile (< 768px): thumbnail top, text below (stacked card). Thumbnail full-width.

**Newsletter email:**
- Single-column, 540px max-width
- Thumbnails scale to full column width on mobile
- All inline styles (email-safe)

---

## 11. Constraints & exclusions

- **No YouTube Data API v3** — RSS gives enough metadata. API key adds complexity for marginal gain (tags, exact like count). Can add later.
- **No video embedding** — cards link to YouTube. No in-app playback.
- **No comments analysis** — transcript + description is enough signal.
- **No multi-language transcripts** — English auto-captions only.
- **No subscriber count per channel** — RSS doesn't provide it, not needed for video-level scoring.
- **No real-time scraping** — weekly batch only. No "check now" button.
- **No transcript storage optimization** — full transcript in a text column. If storage becomes an issue, move to R2. Not now.
- **No separate newsletter subscription** — same subscriber list as main radar. Different branding: header "Idea Radar / YouTube Radar", footer "Weekly from YouTube Radar". Same sender address.
- **The 20-channel list is a starting point** — the owner will add/remove via Tracker Admin. The system handles any count.
- **No date filtering on scrape** — store everything in the RSS not already in DB. Dedupe by videoId. Age irrelevant; if the radar hasn't seen it, it's new.
- **Accept fewer than 10 if quality isn't there** — ~10 is a target, not a quota. 6 good videos beats 10 padded ones.
- **Status flow**: pending → skipped (gate fail) or pending → filtered (gate pass, pre-transcript) → accepted (transcript confirms) or skipped (transcript says no). The Filtered tab shows the intermediate state.
- **Existing 5 YouTube sources** (Marc Lou, Fireship, Pieter Levels, Simon Grimm, Will Kwan): deactivated from main radar, added to YouTube Radar source list (merged with the curated 20, deduped).

---

## 12. Open decisions

None. All decisions locked. Grill pass complete.
