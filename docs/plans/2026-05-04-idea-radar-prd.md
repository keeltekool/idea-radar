# Idea Radar — PRD

> Date: 2026-05-04
> Status: Draft — awaiting approval

## Problem

Solo AI builder (15+ shipped projects) running out of project ideas. Feeling stuck, not expanding fast enough. Needs systematic discovery of what other indie builders are shipping — not to copy, but to find new territory.

## Solution

Three-stage intelligence pipeline that scrapes 7 sources for indie builder projects, AI-filters for quality, AI-curates with a growth-compass scorer against a Builder Profile, and delivers accepted ideas to a dashboard + personal newsletter.

## Architecture — Clone of EUDI Wallet Tracker

The engine is a 1:1 analog of the EUDI Wallet Tracker pipeline. Same patterns, same contracts, adapted for a different domain.

### Pipeline

```
Sources (7 feeds — see Source Config below)
  → Fetch (LCC loop, every 2-3 days + manual keyword trigger)
  → Deduplicate (URL hash)
  → Store as "pending"

Pre-filter (keyword gate, zero AI cost)
  → Required terms hit? Blocked terms absent?
  → Survivors proceed, rest dropped silently

AI Pass (single combined filter+curate, Claude)
  → "Real shipped indie project?" — NO → reject (one word)
  → YES → score against Builder Profile:
    - Feasibility (1-10): can you build this with your stack?
    - Novelty (1-10): how different from existing projects?
    - Stretch (1-10): does this push into new territory?
  → Composite score, threshold 7+
  → "Why this matters for YOU" summary
  → Mark accepted/rejected

Newsletter (Brevo, triggered after curation)
  → Top accepted ideas → personal email

Dashboard (separate Vercel deployment, externally designed)
  → Progressive tabs + Builder Profile + feedback
```

### Critical Design Principle

The Builder Profile is a **growth compass, not a comfort zone enforcer.** It tells the AI "here's where I've been" so it can recognize what's genuinely NEW territory. High feasibility + high novelty + high stretch = sweet spot. The scoring should actively favor ideas OUTSIDE the user's existing portfolio domains.

Serendipity wildcards: 1-2 slots per batch reserved for low-feasibility, high-stretch ideas. Labeled distinctly.

## Source Config

### Pre-filter Keywords

**Required** (at least one): `ai`, `built`, `ship`, `launch`, `saas`, `side project`, `indie`, `solo`, `tool`, `app`, `platform`, `dashboard`, `automat`

**Blocked** (instant reject): `tutorial`, `course`, `beginner`, `how to`, `introduction`, `getting started`, `boilerplate`, `template`, `awesome-list`, `cheat sheet`, `interview prep`

### Source URLs

#### 1. Product Hunt
```
https://api.producthunt.com/v2/api/graphql
```
- Auth: OAuth token (free developer app)
- Query: `posts(order: NEWEST, first: 50)`
- Rate limit: 450 req/15min free tier
- Returns: name, tagline, description, topics, votesCount, website

#### 2. GitHub Search API
```
https://api.github.com/search/repositories?q=created:>DATE+stars:>20+language:TypeScript&sort=stars&order=desc&per_page=50
https://api.github.com/search/repositories?q=created:>DATE+stars:>20+language:Python&sort=stars&order=desc&per_page=50
```
- Auth: gh token (already authenticated)
- Shift DATE back 3 days each run
- Rate limit: 30 req/min authenticated

#### 3. Hacker News — Show HN
```
https://hn.algolia.com/api/v1/search?query=&tags=show_hn&hitsPerPage=50&numericFilters=created_at_i>UNIX_TIMESTAMP
```
- No auth. Free.
- Set UNIX_TIMESTAMP to 3 days ago each run
- Pre-filter: points > 5

#### 4. Dev.to
```
https://dev.to/api/articles?tag=showdev&per_page=50&state=rising
https://dev.to/api/articles?tag=sideproject&per_page=50&top=7
https://dev.to/api/articles?tag=ai&per_page=50&top=7
```
- No auth for public endpoints
- Rate limit: 30 req/30sec

#### 5. Reddit
```
https://www.reddit.com/r/SideProject/new.json?limit=50&t=week
https://www.reddit.com/r/webdev/search.json?q=flair:Showoff+Saturday&sort=new&restrict_sr=1&limit=50
https://www.reddit.com/r/nextjs/new.json?limit=50&t=week
```
- .json suffix = no OAuth needed
- May need Cloudflare Worker proxy (datacenter IP blocking)
- Pre-filter: score > 3

#### 6. Lobsters
```
https://lobste.rs/newest.rss
https://lobste.rs/t/show.rss
```
- Pure RSS. No auth. Low volume, high quality.

#### 7. Medium
```
https://medium.com/feed/tag/side-project
https://medium.com/feed/tag/indie-hacking
https://medium.com/feed/tag/ai-tools
https://medium.com/feed/tag/buildinpublic
```
- RSS feeds. No auth. Excerpt only (paywall).

## Data Model (Neon — own instance)

### `sources`
| Column | Type | Notes |
|--------|------|-------|
| id | serial | PK |
| name | text | e.g. "Product Hunt" |
| url | text | API endpoint or RSS URL |
| type | enum | `producthunt`, `github`, `hackernews`, `devto`, `reddit`, `rss` |
| config | jsonb | API-specific params, pre-filter keywords |
| active | boolean | default true |
| lastScrapedAt | timestamp | |
| lastProjectCount | integer | |
| acceptanceRate | real | calculated after each run |

### `discoveries`
| Column | Type | Notes |
|--------|------|-------|
| id | serial | PK |
| sourceId | integer | FK to sources |
| url | text | project URL |
| urlHash | varchar(64) | dedup key |
| title | text | |
| description | text | |
| author | text | |
| techStack | text[] | detected from tags/topics |
| stars / upvotes | integer | raw popularity signal |
| status | enum | `pending → relevant → rejected → accepted` |
| feasibilityScore | real | 1-10 |
| noveltyScore | real | 1-10 |
| stretchScore | real | 1-10 |
| compositeScore | real | weighted combo |
| summary | text | "Why this matters for YOU" |
| categories | text[] | domain tags |
| rejectionReason | text | |
| isWildcard | boolean | serendipity pick |
| userFeedback | enum | `null`, `spark`, `pass` |
| scrapedAt | timestamp | |
| publishedAt | timestamp | |

### `builder_profile`
| Column | Type | Notes |
|--------|------|-------|
| id | serial | PK |
| content | text | full profile markdown |
| generatedAt | timestamp | |
| projectCount | integer | |

### `scrape_runs`
Same shape as EUDI.

## Noise Mitigation

### Layer 1: Keyword pre-filter (free)
Required/blocked term matching on title + description. Kills 60-70% before AI.

### Layer 2: Single AI pass
Combined filter+curate. Rejects = ~200 tokens. Accepts = ~500 tokens. ~$0.50/run with Haiku.

### Layer 3: Source acceptance tracking
`acceptanceRate` on sources table. Below 5% after 5 runs = flagged for review.

## Expected Volume Per Run
```
~200 raw items fetched
→ ~60-70 survive pre-filter
→ ~10-15 accepted by AI (threshold 7+)
→ + 1-2 wildcard stretch picks
→ Newsletter + dashboard
```

## Repo / Change Map

| What | Where | Type |
|------|-------|------|
| Frontend + API routes + worker pipeline | `idea-radar` (NEW repo) | New project |
| Admin federation (project #3) | `eudi-wallet-tracker` repo | Add schema + switcher option |
| LCC loop registration | Loop Control Center | New loop config |
| Neon DB | New Neon instance | `idea-radar` project |
| Brevo newsletter | `idea-radar` .env.local | New API key |

## Builder Profile Scanner

Reads `C:\Users\Kasutaja\Claude_Projects\*/STACK.md` + `package.json`. Generates:
- Tech stack frequency (Next.js: 12, Neon: 8, Tailwind: all...)
- Domain coverage (competitive intel, e-commerce, music/DJ, identity/eGov, energy, satire...)
- Patterns (scraper+cron+dashboard, AI utilities, data aggregation...)
- Negative space — what hasn't been built (mobile, real-time collab, marketplaces, hardware, games, social...)

Stored in `builder_profile` table. Triggered manually via UI button. Fed into every curation prompt.

## Feedback Loop

`userFeedback` column on discoveries: `spark` (this resonated) or `pass` (not for me). Fed into future curation prompts as training signal. Optional — v2 feature if v1 scoring is too noisy.

## Admin (Federated — EUDI project #3)

Changes to `eudi-wallet-tracker` repo:
- `schema-idearadar.ts` — Drizzle schema for Idea Radar tables
- `DATABASE_URL_IDEARADAR` env var
- `"idearadar"` option in project switcher cookie/dropdown
- Same admin features: source table, health badges, run history, bulk actions

Extra admin features for Idea Radar:
- Builder Profile viewer + "Re-index" trigger button
- Acceptance rate column in source table

## Newsletter (Brevo)

- Separate API key (per-project convention)
- Triggered after curation completes
- Content: top accepted ideas with composite scores + "why it matters" summaries + links
- One subscriber: user

## LCC Integration

- Loop registered in Loop Control Center
- Cadence: every 2-3 days (configurable)
- Manual trigger: keyword/slash command from Claude Code
- Pipeline per run: fetch → pre-filter → AI pass → newsletter (sequential)

## Frontend (Separate Vercel Deployment)

- Brand new project, own repo, own Vercel deploy
- Designed externally via Claude Design / Google Stitch (prompt provided separately)
- Consumes JSON API routes from `idea-radar` backend
- NOT a reskin of EUDI — own identity, own brand

## Stack

- Next.js (latest) + Tailwind
- Neon (Drizzle ORM)
- Vercel (hosting + cron if needed)
- Claude API (Haiku for filter/curate — cost-effective)
- Brevo (newsletter)
- LCC (scheduling)
- GitHub Actions (scraper, if Vercel cron insufficient for 7 sources)
