# Idea Radar — Implementation Plan

> Date: 2026-05-04
> PRD: `docs/plans/2026-05-04-idea-radar-prd.md`
> Design assets: `docs/design/` (pending — external AI output)

---

## Phase Overview

| Phase | What | Depends on | Repo |
|-------|------|-----------|------|
| **1** | Project scaffold + Neon DB + schema | Nothing | `idea-radar` |
| **2** | Source parsers (7 fetchers) | Phase 1 | `idea-radar` |
| **3** | Pipeline scripts (pre-filter + AI pass + store) | Phase 2 | `idea-radar` |
| **4** | Builder Profile scanner | Phase 1 | `idea-radar` |
| **5** | API routes (JSON endpoints for frontend) | Phase 3 | `idea-radar` |
| **6** | Newsletter (Brevo) | Phase 3 | `idea-radar` |
| **7** | Admin federation (project #3) | Phase 1 | `eudi-wallet-tracker` |
| **8** | LCC loop registration | Phase 3 | Loop Control Center |
| **9** | Frontend (from external design) | Phase 5 + design assets | `idea-radar` |
| **10** | E2E verification + deploy | All phases | Both repos |

---

## Phase 1: Project Scaffold + Neon DB + Schema

### 1.1 Initialize Next.js project
```
cd C:\Users\Kasutaja\Claude_Projects\idea-radar
npx create-next-app@latest . --typescript --tailwind --app --src-dir --eslint
```
- Tailwind configured
- `src/` directory structure
- App Router

### 1.2 Initialize Git + GitHub
```
git init
gh repo create idea-radar --public --source=.
```

### 1.3 Create Neon instance
- New Neon project: `idea-radar`
- Save connection string to `.env.local` as `DATABASE_URL`

### 1.4 Install dependencies
```
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit dotenv
```

### 1.5 DB schema — `src/db/schema.ts`

Adapted from EUDI's schema. Key differences noted inline:

```typescript
import {
  pgTable, pgEnum, serial, text, timestamp,
  boolean, integer, jsonb, real, varchar, uniqueIndex,
} from "drizzle-orm/pg-core";

// Enums
export const sourceTypeEnum = pgEnum("source_type", [
  "producthunt", "github", "hackernews", "devto", "reddit", "rss"
]);

export const discoveryStatusEnum = pgEnum("discovery_status", [
  "pending", "relevant", "irrelevant", "accepted", "rejected"
]);

export const userFeedbackEnum = pgEnum("user_feedback", [
  "spark", "pass"
]);

export const scrapeRunStatusEnum = pgEnum("scrape_run_status", [
  "running", "success", "failed"
]);

// Sources — same shape as EUDI, adapted type enum
export const sources = pgTable("sources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  type: sourceTypeEnum("type").notNull(),
  config: jsonb("config").default({}),
  active: boolean("active").notNull().default(true),
  lastScrapedAt: timestamp("last_scraped_at", { withTimezone: true }),
  lastProjectCount: integer("last_project_count"),
  acceptanceRate: real("acceptance_rate"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow().$onUpdate(() => new Date()),
});

// Discoveries — analog of EUDI articles
export const discoveries = pgTable("discoveries", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id").notNull(),
  url: text("url").notNull(),
  urlHash: varchar("url_hash", { length: 64 }).notNull(),
  contentHash: varchar("content_hash", { length: 64 }),
  title: text("title").notNull(),
  description: text("description"),
  author: text("author"),
  techStack: text("tech_stack").array().default([]),
  stars: integer("stars"),
  upvotes: integer("upvotes"),
  status: discoveryStatusEnum("status").notNull().default("pending"),
  feasibilityScore: real("feasibility_score"),
  noveltyScore: real("novelty_score"),
  stretchScore: real("stretch_score"),
  compositeScore: real("composite_score"),
  summary: text("summary"),
  categories: text("categories").array().default([]),
  rejectionReason: text("rejection_reason"),
  isWildcard: boolean("is_wildcard").notNull().default(false),
  userFeedback: userFeedbackEnum("user_feedback"),
  scrapedAt: timestamp("scraped_at", { withTimezone: true }).notNull().defaultNow(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("discoveries_url_hash_idx").on(table.urlHash)
]);

// Builder Profile
export const builderProfile = pgTable("builder_profile", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  projectCount: integer("project_count"),
});

// Scrape Runs — identical to EUDI
export const scrapeRuns = pgTable("scrape_runs", {
  id: serial("id").primaryKey(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  status: scrapeRunStatusEnum("status").notNull().default("running"),
  sourcesScraped: integer("sources_scraped").default(0),
  discoveriesFound: integer("discoveries_found").default(0),
  preFilterDropped: integer("pre_filter_dropped").default(0),
  aiAccepted: integer("ai_accepted").default(0),
  aiRejected: integer("ai_rejected").default(0),
  errors: jsonb("errors").default([]),
});

// Newsletter Subscribers
export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  subscribedAt: timestamp("subscribed_at", { withTimezone: true }).notNull().defaultNow(),
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
  active: boolean("active").notNull().default(true),
});
```

### 1.6 DB connection — `src/db/index.ts`
Clone from EUDI verbatim:
```typescript
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export function createDb(databaseUrl: string) {
  const sql = neon(databaseUrl);
  return drizzle({ client: sql, schema });
}

export type Database = ReturnType<typeof createDb>;
```

### 1.7 Utility libs — `src/lib/`
Clone from EUDI:
- `hash.ts` — `hashUrl()`, `hashContent()` (identical)
- `validate.ts` — adapt `validateArticle()` → `validateDiscovery()` (require title + url)

### 1.8 Push schema to Neon
```
npm run db:push
```

### 1.9 Drizzle config — `drizzle.config.ts`
Standard Neon setup pointing to `DATABASE_URL`.

**Checkpoint: schema visible in Drizzle Studio, empty tables in Neon.**

---

## Phase 2: Source Parsers (7 Fetchers)

### File structure
```
worker/
  src/
    parsers/
      types.ts          — RawDiscovery + ParseResult types
      index.ts          — router (switch on source type)
      producthunt.ts    — Product Hunt GraphQL
      github.ts         — GitHub Search API
      hackernews.ts     — HN Algolia API
      devto.ts          — Dev.to REST API
      reddit.ts         — Reddit JSON endpoints
      rss.ts            — Generic RSS (Lobsters + Medium)
    store.ts            — deduplicateAndStore() — clone from EUDI
    orchestrator.ts     — main scrape loop — clone from EUDI
    run-scrape.ts       — CLI entry point
    seed.ts             — seed initial sources
```

### 2.1 Types — `worker/src/parsers/types.ts`
```typescript
export type RawDiscovery = {
  title: string;
  url: string;
  description?: string;
  author?: string;
  publishedAt?: Date;
  techStack?: string[];
  stars?: number;
  upvotes?: number;
};

export type ParseResult = {
  discoveries: RawDiscovery[];
  errors: string[];
};
```

### 2.2 Product Hunt parser — `worker/src/parsers/producthunt.ts`
- GraphQL query to `https://api.producthunt.com/v2/api/graphql`
- Query: `posts(order: NEWEST, first: 50)` with fields: `name, tagline, description, topics { edges { node { name } } }, votesCount, website`
- Auth: Bearer token from `PRODUCTHUNT_TOKEN` env var
- Map topics to `techStack`
- Map `votesCount` to `upvotes`

### 2.3 GitHub parser — `worker/src/parsers/github.ts`
- Two requests:
  - `https://api.github.com/search/repositories?q=created:>{3_DAYS_AGO}+stars:>20+language:TypeScript&sort=stars&order=desc&per_page=50`
  - Same for `language:Python`
- Auth: `GITHUB_TOKEN` env var (or `gh auth token` piped)
- Map `topics` to `techStack`, `stargazers_count` to `stars`
- Deduplicate across both language queries before returning

### 2.4 Hacker News parser — `worker/src/parsers/hackernews.ts`
- `https://hn.algolia.com/api/v1/search?query=&tags=show_hn&hitsPerPage=50&numericFilters=created_at_i>{UNIX_3_DAYS_AGO}`
- No auth
- Filter: `points > 5` (skip dead posts)
- Map `points` to `upvotes`

### 2.5 Dev.to parser — `worker/src/parsers/devto.ts`
- Three endpoints:
  - `https://dev.to/api/articles?tag=showdev&per_page=50&state=rising`
  - `https://dev.to/api/articles?tag=sideproject&per_page=50&top=7`
  - `https://dev.to/api/articles?tag=ai&per_page=50&top=7`
- No auth (optional API key for rate limits: `DEVTO_API_KEY`)
- Map `tag_list` to `techStack`, `public_reactions_count` to `upvotes`
- Deduplicate across three tag queries

### 2.6 Reddit parser — `worker/src/parsers/reddit.ts`
- Three endpoints:
  - `https://www.reddit.com/r/SideProject/new.json?limit=50&t=week`
  - `https://www.reddit.com/r/webdev/search.json?q=flair:Showoff+Saturday&sort=new&restrict_sr=1&limit=50`
  - `https://www.reddit.com/r/nextjs/new.json?limit=50&t=week`
- No OAuth (`.json` suffix)
- Filter: `score > 3`
- Map `score` to `upvotes`
- Set User-Agent header (Reddit blocks default Node UA)
- **Gotcha:** if datacenter IP blocked, route through Cloudflare Worker proxy (use `worker-proxy` skill when building)

### 2.7 RSS parser — `worker/src/parsers/rss.ts`
- Clone EUDI's `rss.ts` directly
- Used for Lobsters (`https://lobste.rs/t/show.rss`) and Medium feeds
- Install `rss-parser` package (same as EUDI)

### 2.8 Router — `worker/src/parsers/index.ts`
```typescript
import type { ParseResult } from "./types";
// ... import all parsers

type SourceInput = {
  type: "producthunt" | "github" | "hackernews" | "devto" | "reddit" | "rss";
  url: string;
  config: Record<string, any>;
};

export async function parseSource(source: SourceInput): Promise<ParseResult> {
  switch (source.type) {
    case "producthunt": return parseProductHunt(source.config);
    case "github":      return parseGitHub(source.config);
    case "hackernews":  return parseHackerNews(source.config);
    case "devto":       return parseDevTo(source.config);
    case "reddit":      return parseReddit(source.url, source.config);
    case "rss":         return parseRss(source.config.feedUrl || source.url);
    default:            return { discoveries: [], errors: [`Unknown type: ${(source as any).type}`] };
  }
}
```

### 2.9 Store — `worker/src/store.ts`
Clone EUDI's `store.ts`. Replace `articles` → `discoveries`, `RawArticle` → `RawDiscovery`. Add `description`, `techStack`, `stars`, `upvotes` to insert. Same `onConflictDoNothing` on `urlHash`.

### 2.10 Orchestrator — `worker/src/orchestrator.ts`
Clone EUDI's `orchestrator.ts`. Replace `articles` → `discoveries`, `articlesFound` → `discoveriesFound`. Same sequential processing with 1s polite delay.

### 2.11 Seed sources — `worker/src/seed.ts`
Insert all 7 sources (with sub-feeds as separate source rows where applicable):

| name | type | url/config |
|------|------|-----------|
| Product Hunt | producthunt | GraphQL endpoint in config |
| GitHub Trending (TypeScript) | github | language: TypeScript in config |
| GitHub Trending (Python) | github | language: Python in config |
| Hacker News Show HN | hackernews | Algolia endpoint in config |
| Dev.to showdev | devto | tag: showdev in config |
| Dev.to sideproject | devto | tag: sideproject in config |
| Dev.to ai | devto | tag: ai in config |
| Reddit r/SideProject | reddit | subreddit URL |
| Reddit r/webdev | reddit | subreddit URL |
| Reddit r/nextjs | reddit | subreddit URL |
| Lobsters Show | rss | `https://lobste.rs/t/show.rss` |
| Medium side-project | rss | `https://medium.com/feed/tag/side-project` |
| Medium indie-hacking | rss | `https://medium.com/feed/tag/indie-hacking` |
| Medium ai-tools | rss | `https://medium.com/feed/tag/ai-tools` |
| Medium buildinpublic | rss | `https://medium.com/feed/tag/buildinpublic` |

Total: **15 source rows** from 7 platforms.

### 2.12 Run entry point — `worker/src/run-scrape.ts`
Clone EUDI's `run-scrape.ts`. Loads env, creates DB, calls orchestrator.

**Checkpoint: `cd worker && npx tsx src/run-scrape.ts` fetches from all 15 sources, stores pending discoveries in Neon. Verify via Drizzle Studio.**

---

## Phase 3: Pipeline Scripts (Pre-filter + AI Pass)

### File structure
```
worker/
  src/
    pre-filter.ts       — keyword gate (no AI)
    ai-pass.ts          — combined filter+curate (Claude API)
    update-decisions.ts — write AI decisions to Neon (clone of EUDI update-articles.ts)
    run-pipeline.ts     — CLI: pre-filter → AI pass → update → newsletter trigger
```

### 3.1 Pre-filter — `worker/src/pre-filter.ts`
- Reads `pending` discoveries from Neon
- Applies keyword gate:
  - Required terms: `ai`, `built`, `ship`, `launch`, `saas`, `side project`, `indie`, `solo`, `tool`, `app`, `platform`, `dashboard`, `automat`
  - Blocked terms: `tutorial`, `course`, `beginner`, `how to`, `introduction`, `getting started`, `boilerplate`, `template`, `awesome-list`, `cheat sheet`, `interview prep`
- Matching is case-insensitive on `title + description`
- Survivors marked `relevant`, rest marked `irrelevant`
- Returns count of survivors for the AI pass
- Outputs JSON to stdout (same contract as EUDI `filter.ts`)

### 3.2 AI Pass — `worker/src/ai-pass.ts`
- Reads `relevant` discoveries from Neon
- Loads latest `builder_profile` content from Neon
- For each discovery, calls Claude (Haiku) with prompt:

```
You are scoring indie builder projects for a solo developer.

BUILDER PROFILE:
{builderProfile}

PAST FEEDBACK (if any):
Projects marked "spark": {sparkList}
Projects marked "pass": {passList}

PROJECT TO EVALUATE:
Title: {title}
Description: {description}
Tech stack: {techStack}
Source: {source}
Stars/upvotes: {popularity}

TASKS:
1. Is this a real shipped product by an indie builder or small team? If NO, respond: {"status":"rejected","reason":"<one word>"}
2. If YES, score on three axes (1-10 each):
   - feasibility: Can the builder realistically build this with Next.js/Tailwind/Vercel/Neon/Claude API?
   - novelty: How different is this from the builder's existing projects? (HIGH = good)
   - stretch: Does this push the builder into genuinely new territory? (HIGH = good)
3. Write a 1-2 sentence "why this matters" summary focused on GROWTH, not similarity.
4. Assign domain categories.
5. Composite = (feasibility * 0.2) + (novelty * 0.4) + (stretch * 0.4)

Respond as JSON:
{"status":"accepted","feasibility":N,"novelty":N,"stretch":N,"composite":N,"summary":"...","categories":["..."]}
```

- Weighting: novelty and stretch weighted 2x over feasibility (growth compass, not comfort zone)
- Threshold: composite >= 7 to accept
- After all items scored: pick 1-2 items with highest stretch but below threshold → mark as wildcard (`isWildcard: true`, status: `accepted`)
- Outputs JSON decisions to stdout

### 3.3 Update decisions — `worker/src/update-decisions.ts`
Clone EUDI's `update-articles.ts`. Reads JSON from stdin. Writes scores, summaries, categories, status to `discoveries` table. Adds `feasibilityScore`, `noveltyScore`, `stretchScore`, `compositeScore`, `isWildcard`.

### 3.4 Update acceptance rates — `worker/src/update-acceptance-rates.ts`
After decisions written:
- For each source, calculate `accepted / total * 100`
- Update `sources.acceptanceRate`
- Log sources below 5% as warnings

### 3.5 Pipeline runner — `worker/src/run-pipeline.ts`
Runs the full sequence:
1. Pre-filter (keyword gate)
2. AI pass (Claude scoring)
3. Update decisions (write to Neon)
4. Update acceptance rates
5. Trigger newsletter (same pattern as EUDI `update-living-doc.ts`)

Entry point for LCC loop and manual trigger.

**Checkpoint: `cd worker && npx tsx src/run-pipeline.ts` processes pending discoveries through full pipeline. Verify accepted/rejected counts in Drizzle Studio. Check scores look reasonable.**

---

## Phase 4: Builder Profile Scanner

### 4.1 Scanner script — `worker/src/scan-profile.ts`
- Reads all `C:\Users\Kasutaja\Claude_Projects\*/STACK.md` files via glob
- Reads `package.json` from each project directory (if exists)
- Builds structured profile:

```markdown
# Builder Profile

Generated: {timestamp}
Projects scanned: {count}

## Tech Stack Frequency
- Next.js: 12 projects
- Tailwind: 15 projects
- Neon: 8 projects
- Supabase: 2 projects
- Drizzle ORM: 10 projects
...

## Domain Coverage
- Competitive intelligence (Allekirjoitus, EUDI Tracker)
- Data aggregation / price tracking (Sinu Aed, TrackID Radar)
- AI-powered utilities (ApplyKit, Trump Roast Lab)
- Identity / eGov (EUDI Wallet, SK e-Seal)
- Music / DJ tools (DJ Recall, CrateDig, TrackID)
- Energy (Energiatark)
- Content feeds (FeedBoard Pro, SOEL)
- Rental/business tools (Rental Business Kit)
...

## Build Patterns
- Scraper + Vercel cron + Neon DB + dashboard
- AI-powered content processing pipelines
- Admin panels with source management
- Newsletter/digest systems (Brevo)
- Loop Control Center scheduled agents
...

## Negative Space (NOT yet built)
- Mobile-first applications
- Real-time collaboration tools
- Marketplace / two-sided platforms
- Hardware / IoT integration
- Social features / user-to-user interaction
- Game mechanics / gamification
- Payment processing as core (not just Stripe links)
- Browser extensions
- Desktop applications (Electron/Tauri)
- CLI tools for other developers
- Public APIs / developer tools
...
```

- Uses Claude (Sonnet) to synthesize STACK.md contents into the structured profile — a single API call with all STACK.md contents concatenated
- Writes result to `builder_profile` table in Neon

### 4.2 API route for re-index trigger — `app/api/profile/reindex/route.ts`
- GET handler (Vercel cron compatible)
- Runs the scanner
- Returns `{ projectCount, generatedAt }`

**Checkpoint: run scanner, verify profile in Drizzle Studio. Read it — does it accurately describe your portfolio?**

---

## Phase 5: API Routes

### File structure
```
app/
  api/
    discoveries/
      route.ts          — GET: list discoveries with filters (status, source, sort)
    discoveries/[id]/
      route.ts          — GET: single discovery detail
    discoveries/[id]/feedback/
      route.ts          — POST: set userFeedback (spark/pass)
    profile/
      route.ts          — GET: current builder profile
    profile/reindex/
      route.ts          — GET: trigger re-index (Phase 4.2)
    sources/
      route.ts          — GET: list sources with acceptance rates
    runs/
      route.ts          — GET: list scrape runs
    newsletter/
      send/route.ts     — GET: trigger newsletter send
      subscribe/route.ts — POST: subscribe email
      unsubscribe/route.ts — GET: unsubscribe
```

All routes return JSON. No auth (personal tool). Standard patterns cloned from EUDI.

### Query parameters for `GET /api/discoveries`:
- `status` — filter by status (pending, relevant, accepted, rejected, all)
- `source` — filter by sourceId
- `sort` — newest, score, novelty, stretch
- `search` — text search on title + description
- `category` — filter by category tag
- `page` + `limit` — pagination

**Checkpoint: hit each endpoint with curl/browser. Verify JSON shapes match the PRD spec and the external design prompt's API response shape.**

---

## Phase 6: Newsletter (Brevo)

### 6.1 Create Brevo API key
- New API key scoped to `idea-radar` project
- Save to `.env.local` as `BREVO_API_KEY`
- Set `BREVO_SENDER_EMAIL` (same sender as other projects or new one)

### 6.2 Newsletter lib — `src/lib/newsletter.ts`
Clone from EUDI. Adapt template:
- Subject: "Idea Radar — {count} new discoveries"
- Body: top accepted ideas with:
  - Title + link
  - Composite score (bold)
  - Feasibility / Novelty / Stretch breakdown
  - "Why this matters" summary
  - Source badge
  - Wildcard items marked with special label

### 6.3 Send route — `app/api/newsletter/send/route.ts`
- GET handler (Vercel cron convention)
- Guarded by `CRON_SECRET` Bearer token
- Fetches latest accepted discoveries (since last send)
- Renders email via Brevo API
- Returns `{ sent: N, errors: N }`

### 6.4 Subscribe/unsubscribe routes
Clone from EUDI verbatim. Same shape.

### 6.5 Newsletter page — `app/newsletter/page.tsx`
Subscribe form + archive. Clone EUDI pattern, restyle per design assets.

**Checkpoint: trigger `GET /api/newsletter/send` with auth header. Check inbox for email. Verify formatting.**

---

## Phase 7: Admin Federation

Changes to `eudi-wallet-tracker` repo:

### 7.1 Schema copy — `src/db/schema-idearadar.ts`
Copy of `idea-radar/src/db/schema.ts` for type-safe admin queries. Same pattern as `schema-allekirjoitus.ts`. Comment at top: "DO NOT run migrations from this file."

### 7.2 Update connections — `src/lib/db/connections.ts`
```typescript
// Add to imports
import * as idearadarSchema from "../../db/schema-idearadar";

// Add to ProjectId type
export type ProjectId = "eudi" | "allekirjoitus" | "idearadar";

// Add to ENV_VAR_BY_PROJECT
const ENV_VAR_BY_PROJECT: Record<ProjectId, string> = {
  eudi: "DATABASE_URL",
  allekirjoitus: "DATABASE_URL_ALLEKIRJOITUS",
  idearadar: "DATABASE_URL_IDEARADAR",
};

// Add to SCHEMA_BY_PROJECT
const SCHEMA_BY_PROJECT = {
  eudi: eudiSchema,
  allekirjoitus: allekirjoitusSchema,
  idearadar: idearadarSchema,
} as const;
```

### 7.3 Update project context — `src/lib/project-context.ts`
```typescript
const KNOWN_PROJECTS: readonly ProjectId[] = ["eudi", "allekirjoitus", "idearadar"] as const;
```

### 7.4 Update project switcher component
Add "Idea Radar" option to the admin dropdown.

### 7.5 Environment variable
Add `DATABASE_URL_IDEARADAR` to EUDI's Vercel env vars (pointing to idea-radar's Neon instance).

### 7.6 Admin UI adaptations
The admin source table, run history, and bulk actions work generically across projects. Two Idea Radar-specific additions:
- **Builder Profile viewer** — read-only markdown render + "Re-index" button (calls idea-radar's `/api/profile/reindex`)
- **Acceptance rate column** in source table (already in schema)

**Checkpoint: deploy EUDI with changes. Switch to "Idea Radar" in admin. Verify source table shows seeded sources. Run history empty. Builder Profile page renders.**

---

## Phase 8: LCC Loop Registration

### 8.1 Register loop in Loop Control Center
- Project ID: `idea-radar`
- Loop name: `idea-radar-pipeline`
- Cadence: every 2-3 days (configurable)
- Command: runs the full pipeline (`run-pipeline.ts`)
- Manual trigger keyword/slash command

### 8.2 Create skill or slash command for manual trigger
- `/idea-radar` or keyword trigger via LCC
- Runs: fetch → pre-filter → AI pass → update → newsletter

**Checkpoint: trigger loop manually. Verify full pipeline executes. Check Neon for results.**

---

## Phase 9: Frontend

**Blocked on:** design assets from Claude Design / Google Stitch (Track A).

### 9.1 Implement pages from design
Once design assets land in `docs/design/`:
- `app/page.tsx` — main dashboard with 3 tabs (All / Filtered / Curated)
- `app/curated/page.tsx` — curated tab (may be tab within main or separate route)
- `app/filtered/page.tsx` — filtered tab
- `app/profile/page.tsx` — Builder Profile view + Re-index button
- `app/newsletter/page.tsx` — subscribe + archive
- `app/components/` — shared components (DiscoveryCard, ScorePills, SourceBadge, FeedbackButtons, SearchBar, FilterBar)

### 9.2 Card component variants
- **Curated card** (rich): title, description, 3 scores, composite, summary, source badge, tech tags, categories, feedback buttons, wildcard badge
- **Basic card** (All/Filtered): title, description, source badge, date, status pill

### 9.3 Interactions
- Search bar (client-side filter or API query param)
- Source dropdown filter
- Sort selector (newest, score, novelty, stretch)
- Category filter pills
- Feedback buttons (spark/pass) — `POST /api/discoveries/{id}/feedback`
- Re-index button — `GET /api/profile/reindex`

### 9.4 Deploy to Vercel
```
vercel --prod
```
Custom domain if desired: `idea-radar.vercel.app`

**Checkpoint: open in browser via chrome-devtools MCP. Navigate all tabs. Click feedback buttons. Trigger re-index. Verify newsletter page. Check mobile responsiveness.**

---

## Phase 10: E2E Verification + Deploy

### 10.1 Full pipeline test
1. Trigger scrape: `cd worker && npx tsx src/run-scrape.ts`
2. Verify pending discoveries in Neon
3. Trigger pipeline: `cd worker && npx tsx src/run-pipeline.ts`
4. Verify pre-filter dropped items (irrelevant count)
5. Verify AI-scored items (accepted/rejected counts, scores look reasonable)
6. Verify newsletter sent (check inbox)
7. Open dashboard — curated tab shows accepted items with scores

### 10.2 Admin verification
1. Open EUDI admin → switch to Idea Radar
2. Source table shows all 15 sources with health badges
3. Run history shows completed run
4. Builder Profile viewer shows generated profile

### 10.3 LCC verification
1. Trigger via LCC keyword
2. Full pipeline runs autonomously
3. Newsletter arrives

### 10.4 Smoke test checklist
- [ ] Dashboard loads, all 3 tabs render
- [ ] Curated cards show scores + summaries + source badges
- [ ] Wildcard items visually distinct
- [ ] Search filters results
- [ ] Source dropdown filters by source
- [ ] Sort works (newest, score, novelty, stretch)
- [ ] Feedback buttons (spark/pass) update DB
- [ ] Builder Profile page renders markdown
- [ ] Re-index button triggers scan, updates profile
- [ ] Newsletter page renders, subscribe form works
- [ ] Newsletter send delivers email with curated ideas
- [ ] Admin federation: Idea Radar project in switcher
- [ ] Admin: source table, run history, builder profile viewer
- [ ] LCC loop triggers on schedule
- [ ] LCC manual trigger works

### 10.5 STACK.md + memory update
- Create `idea-radar/STACK.md`
- Update global STACK.md
- Update MEMORY.md with project entry
- Commit all

---

## Build Order Summary

```
Phase 1  [~1hr]   Scaffold + DB + schema
Phase 2  [~3hr]   7 source parsers + orchestrator + seed
Phase 3  [~2hr]   Pre-filter + AI pass + pipeline runner
Phase 4  [~1hr]   Builder Profile scanner
Phase 5  [~1hr]   API routes
Phase 6  [~1hr]   Newsletter (Brevo)
Phase 7  [~1hr]   Admin federation (EUDI repo)
Phase 8  [~30min] LCC loop registration
Phase 9  [BLOCKED] Frontend (awaiting design assets)
Phase 10 [~1hr]   E2E verification

Total engine (phases 1-8): ~10hr
Frontend (phase 9): depends on design complexity
```

Phases 1-8 can be built NOW without the design assets. Phase 9 starts when you paste the design output into `docs/design/`.
