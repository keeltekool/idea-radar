# EE AI Builders Watch — loop run book (`run loop ee-ai-watch`)

Manual-only loop, ~2×/month, attended. All analysis in-session — NO paid LLM APIs.
Working dir: `C:\Users\Kasutaja\Claude_Projects\idea-radar`. Spec: `EE-AI-Influencers-Watcher/SPEC.md`.

## Binding rules

1. **Substantive or silent.** Classify every changed page SUBSTANTIVE (new/removed offer, pricing shift, new claimed metric, new named client, positioning rewrite, event announcement) vs COSMETIC (wording shuffles, nav, cookie text, testimonial rotation). COSMETIC is never stored or reported.
2. **Empty run is a valid outcome.** No substantive changes → short honest memo, no invented trends.
3. **Baseline absorption:** `status="new"` snapshots (new sources) update signal profiles, never the change log.
4. **Field Brief edits are surgical** — touch only stale sentences, cite source URLs. Never regenerate.
5. **Social Sweep is optional and attended** — ASK the user before running it; abort instantly on any LinkedIn challenge/captcha screen.

## Steps

1. **Scrape:** `npx tsx worker/src/watch/run-watch.ts` — last stdout line is RunSummary JSON (`runId`, `outFile`, counts). Non-zero exit → print error verbatim, STOP.
2. **Social Sweep (ask first; skip = fine):** headed Playwright `.pw-profile`, LinkedIn recent-activity per player with a `linkedin_url`, randomized order, 20–60s dwell, read-only, posts newer than `watch_players.last_seen_post_at` → insert `watch_posts` rows, update cursor. Abort-on-challenge mandatory.
3. **Analyze:** read `outFile` changes with `status="changed"` (contentMd is normalized text; pull prior snapshot from `snapshots` by prevHash for diffing). Classify per rule 1. For substantive: insert `watch_changes` rows (runId, playerSlug, sourceId, change_type: new_page|content|pricing|metrics|positioning|removed|social, summary, impact, sourceUrl). `status="new"` pages from crawl discovery: treat as new_page changes ONLY if they represent a real new offering (a brand-new course page = substantive; a paginated blog index = not).
4. **Signal profiles:** for players with substantive changes or new posts, regenerate the profile via `npx tsx worker/src/watch/digest.ts <slug>` and write `{runId, profiles:[...]}` → `npx tsx worker/src/watch/save-signals.ts < _signals.json`. Include `diffSummary` vs the prior profile.
5. **Field Brief:** apply surgical edits to `watch_brief` sections in Neon for substantive changes (update the relevant archetype/player mentions; prepend dated entries to `recent-changes`, cap 10/run; update `meta` timestamp line every run).
6. **Watch Memo** (~500 words): What Changed (websites) → What They're Saying (LinkedIn; omit with a one-line note if sweep skipped) → Field Trends → You vs. Them (ground in the `egert-builds` self-row + Field Brief) → One Concrete Suggestion. Save: `npx tsx worker/src/watch/save-watch-memo.ts < _memo.json` (`{runId, contentMd}`).
7. **Deploy check:** frontend reads Neon at request time — no redeploy needed. Verify https://idea-radar-topaz.vercel.app/watch renders the new memo (quick browser check).
8. **Report to LCC:** `npx tsx worker/src/watch/lcc-report.ts --runId N --status success --urlsScraped N --urlsFailed N --changesDetected N --memo true`.
9. **Summary to user:** runId, pages ok/failed/thin, substantive changes by player, memo headline, LCC status.

## Failure modes

- Scraper exit ≠ 0 → STOP, error verbatim, nothing fabricated.
- Single-page failures → logged in run row, `fail_count` increments; 3+ consecutive fails → flag for admin review in summary.
- Many `thin` pages (needs_render=true) → note in summary; consider enabling the CF Browser Rendering fallback (token needed).
- LCC POST fails → log, continue, mention in summary.
