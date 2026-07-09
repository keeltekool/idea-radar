# EE AI Builders Watch — Phase 1: Schema + Seeding + Admin Federation

Master spec: `C:\Users\Kasutaja\Claude_Projects\EE-AI-Influencers-Watcher\SPEC.md` (approved 2026-07-09).
This plan covers Phase 1 only. Phases 2–7 get their own plan docs when they start.

## Architecture decision locked during grounding

`watch_*` tables live in a **dedicated Neon project `ee-ai-watch`** — NOT idea-radar's Neon as the spec first drafted. Reason: the federated Tracker Admin maps one project → one Neon → one `sources` table (`connections.ts` in eudi-wallet-tracker). Idea Radar's DB already serves its own `sources` (15 feeds) as admin project `idearadar`; mixing watch pages in would collide. The Allekirjoitus/Athlon pattern (own Neon, admin-compatible schema, `DATABASE_URL_<PROJECT>` env var + schema copy in eudi repo) is proven — we follow it. Idea-radar frontend reads the watch DB via `DATABASE_URL_EEWATCH`.

## Tasks

1. **Neon**: `neonctl projects create --name ee-ai-watch --region-id aws-eu-central-1 --org-id org-dry-grass-20178337`; pooled connection string → idea-radar `.env.local` as `DATABASE_URL_EEWATCH` (+ Vercel env later with frontend phase).
2. **Schema** (`idea-radar/src/db/schema-watch.ts`, authoritative DDL owner; pushed with `drizzle.config.watch.ts`):
   - Admin-compatible trio, allekirjoitus column shapes: `sources` (competitor = player slug, theme = page type: home|services|pricing|blog|about|other, url uq, active, last_scraped_at, last_status, last_content_hash), `snapshots` (source_id, content_md, content_hash, uq(source_id, content_hash)), `scrape_runs` (status, urls_scraped, urls_failed, changes_detected, brief_updated, lcc_run_id, errors jsonb, + posts_captured int, social_sweep_ran bool).
   - Watch-specific: `watch_players` (slug uq, name, archetype, domain, linkedin_url, fb_url, last_seen_post_at, active), `watch_changes` (run_id, player_slug, source_id null, change_type, summary, impact, prev_hash, new_hash, source_url), `watch_signals` (player_slug, run_id, signals jsonb, diff_summary), `watch_posts` (player_slug, run_id, posted_at, text, engagement jsonb, url, source), `watch_memos` (run_id, content_md), `watch_brief` (section slug, content_md, position, updated_at).
   - `sources.competitor` references player slug informally (no FK — admin creates sources freely; pipeline joins on slug).
3. **Player research**: web-search official domains for the 8 long-tail players + LinkedIn slugs for all 23; merge with the two source files; fix the `eesti.ai/tiim`+`seppo.ai` paste bug; egert.ai fork page = player #0 (`archetype: self`).
4. **Seed** (`worker/src/watch/seed-players.ts`): insert players + one `sources` row per known page (home + obvious services/pricing/blog pages; crawl discovers the rest in Phase 2).
5. **Admin federation** (eudi-wallet-tracker repo): add `eewatch` to `ProjectId`/env-var/schema maps, `schema-eewatch.ts` copy, project-switcher label "EE AI Builders Watch", `DATABASE_URL_EEWATCH` in eudi `.env.local` + Vercel. Commit → push → auto-deploy → verify switcher + source table renders the seeded pages (Playwright, 375+1440).
6. **Field Brief seed** (`worker/src/watch/seed-brief.ts`): split `01-estonian-ai-market-analysis.md` into `watch_brief` sections (exec-summary, archetype A–F, per-player, openings, recent-changes placeholder, changelog).

## Exit criteria

- New Neon live with full schema; `SELECT count(*) FROM watch_players` = 23 (+player #0 = 24 rows).
- Tracker Admin shows "EE AI Builders Watch" project with all seeded sources, healthy switcher round-trip, verified in browser both viewports.
- `watch_brief` populated; idea-radar builds clean with the new schema file (no frontend routes yet — Phase 6).
- Both repos committed + pushed; eudi admin auto-deployed via GitHub.
