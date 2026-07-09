# EE AI Builders Watch — Phases 2–6: Engine, Baseline Run, Frontend

Master spec: `EE-AI-Influencers-Watcher/SPEC.md`. Phase 1 done (see phase1 plan doc).

## Phase 2 — Snapshot engine (`worker/src/watch/`)

- `extract.ts` — pure functions: HTML→readable text (strip script/style/nav/footer/header/svg/form blocks, then tags, decode entities), same-origin link extraction, conservative normalize (collapse whitespace, strip date-only noise), sha256 hash, change classification (Allekirjoitus shape). Regex-based, no new deps (`ponytail:` ceiling noted; upgrade path = cheerio).
- `run-watch.ts` — orchestrator: BFS crawl per player from seed pages (depth ≤2, cap 25 pages/player, same-domain, asset/anchor/mailto filtered), fetch plain HTTPS (UA header, 20s timeout, ~1.2s spacing), thin-text pages (<400 chars) flagged `needs_render` (CF fallback deferred until needed), snapshot insert only when hash new/changed, sources.last_* updates, discovered pages inserted as new sources, `scrape_runs` row, `scripts/output/watch-changes-<runId>.json`, final `RunSummary` JSON line.
- `selfcheck.ts` — assert-based check of extract/normalize/classify.

## Phase 3 — Baseline analysis (in-session, no paid API)

- `digest.ts` — prints condensed per-player digest (page list + first ~1200 chars of home/services text) so Claude never loads full page dumps.
- Claude writes per-player signal profiles (offer, pricingVisible, claimedMetrics, namedClients, events, positioning) → `save-signals.ts < signals.json`.
- Baseline Watch Memo (~500 words, "Baseline captured" format) → `save-watch-memo.ts < memo.json`.
- Field Brief `meta` section timestamp updated (baseline absorbed). Body sections untouched on baseline (they were seeded from the analysis doc 3 days old — still current).

## Phase 5 — LCC loop

Register `ee-ai-watch` loop in Loop Control Center (manual-only), prompt = runbook `loop/ee-ai-watch-pipeline.md` mirrored to LCC DB. `lcc-report.ts` posts run results (idea-radar pattern, full UUID).

## Phase 6 — Frontend `/watch` tab (idea-radar)

Routes per SPEC §4: `/watch` (stats, memo preview, changes feed, player grid + archetype filter), `/watch/player/[slug]`, `/watch/memos`, `/watch/brief`. Server components reading the watch DB via `DATABASE_URL_EEWATCH` (`src/db/watch.ts` client). Nav gains "EE Watch". Mobile-first 375px + deliberate 1440px. Deploy via GitHub push; verify-deploy.mjs all routes both viewports + click-through.

## Exit criteria

- Baseline run: every active source scraped or explicitly failed; snapshots + run row + changes JSON exist; summary honest about failures/thin pages.
- 22 signal profiles + baseline memo in DB.
- `/watch` live on idea-radar-topaz.vercel.app, populated with real data, verified in browser both viewports, zero console errors.
- LCC loop registered + baseline run reported.
