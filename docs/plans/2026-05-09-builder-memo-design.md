# Builder Memo — Design

> Approved: 2026-05-09

## What it is

A personalized coaching brief generated as the final pipeline step (Step 7) after every discovery run. Blunt tone, ~500 words, grounded in that run's accepted discoveries. Stored in DB with full history.

## Data model

New `builder_memos` table:

| Column | Type | Purpose |
|--------|------|---------|
| `id` | serial PK | |
| `scrape_run_id` | integer | Links to the run that produced it |
| `content` | text | Markdown memo body |
| `discovery_count` | integer | Accepted discoveries this memo covers |
| `generated_at` | timestamp | When memo was generated |

## Pipeline integration (Step 7)

After `update-acceptance-rates.ts`, Claude generates the memo in-session (same pattern as scoring). Inputs:

- Accepted discoveries from this run (titles, summaries, scores, URLs, tech stacks)
- Builder Profile from DB
- Past feedback history (sparks/passes)
- Active project list (from profile)

Output piped to `worker/src/save-memo.ts` which writes to Neon.

## Memo structure (every run)

1. **What came in** — 2-3 sentence summary of run landscape
2. **Patterns You're Missing** — what builders are doing that you aren't (tech, distribution, monetization). Each pattern gets a full paragraph with linked examples.
3. **Direct callouts** — EVERY accepted discovery gets 3-5 sentences with a clickable markdown link `[title](url)`. Describe what they built, how, and why it maps to the builder profile. Group wildcards separately.
4. **The gap** — honest assessment of where you're stuck vs. where the field moves
5. **One concrete suggestion** — one specific "try this next" with reasoning and link to the discovery that inspired it

## Memo rules (MANDATORY)

- **Clickable links:** Every referenced discovery MUST include a markdown link `[title](url)` using the discovery's actual URL. NEVER use bare ID references like `(id:123)`.
- **Length:** 800-1200 words minimum. Go deep — this is a coaching brief, not a summary.
- **Grounded:** Every sentence references either a specific discovery (with link) or the builder profile. Zero generic motivational filler.
- **Tone:** Blunt, direct, no hedging.

## Frontend

- **`/memo` page** — reverse-chronological list, each memo expandable, date + discovery count
- **Dashboard card** — "Latest Memo" preview (~100 words + date), links to `/memo`
- Nav: Dashboard | **Memos** | Profile | Newsletter

## API

- `GET /api/memos` — list all memos (paginated)
- `GET /api/memos/[id]` — single memo

## Constraints

- No email delivery (newsletter is separate)
- No AI-generated action items or task lists — one suggestion only
- No generic motivational filler — every sentence references a discovery or builder profile
