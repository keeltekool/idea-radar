# Idea Radar Resurrection Plan
> 2026-09-12 — Growth compass overhaul

## Problem
Content too developer-technical. User builds consumer products but sources surface GitHub repos and CLI tools. Pipeline cold since June 2026. No automated routine. Newsletter dead (Brevo, no keys set).

## Goal
Push the user into unfamiliar domains. Penalize comfort zone. Surface consumer products, revenue-generating ideas, and creative interaction patterns — not more dashboards and trackers.

## Phase 1: Source Overhaul

**DROP (7 developer-technical sources):**
- GitHub Trending TypeScript
- GitHub Trending Python
- Lobsters Show
- Dev.to ai
- Reddit r/webdev
- Reddit r/nextjs
- Medium ai-tools

**KEEP (6 sources):**
- HN Show HN (good signal for shipped products)
- Reddit r/SideProject (consumer products)
- Dev.to showdev
- Dev.to sideproject
- Medium indie-hacking
- Medium buildinpublic

**ADD (3-4 confirmed working sources):**
- Product Hunt RSS (confirmed 200 OK, 50 items, no auth needed)
- YouTube Fireship (confirmed RSS, 15 entries — accessible tech/product coverage)
- HN Ask HN (Algolia API, product discovery angle)
- Reddit r/SideProject via RSS format (more reliable than JSON)

Target: ~12 high-quality sources, consumer-product weighted.

## Phase 2: Keyword Filter Retune
- Add consumer terms: `product`, `pricing`, `users`, `mvp`, `marketplace`, `booking`, `tracker`, `pwa`, `mobile`, `notification`, `subscription`, `revenue`, `customers`, `launched`
- Add growth-domain terms: `health`, `fitness`, `education`, `fintech`, `creative`, `marketplace`, `e-commerce`, `social`, `community`
- Expand blocked: `library`, `framework`, `package`, `npm`, `pip`, `docker`, `kubernetes`, `devops`, `infrastructure`, `benchmark`, `config`, `lint`

## Phase 3: Builder Profile Rescan
- Scan current 45+ projects from STACK.md files
- Synthesize with explicit GAP ANALYSIS: what domains, business models, and interaction patterns are missing
- The profile becomes the scoring rubric's negative space

## Phase 4: Scoring Rewrite
- Rename lanes: "PUSH" (was Novel) and "LEVEL UP" (was Familiar)
- PUSH lane: reward domains the user has NEVER touched (health, education, fintech, creative tools, marketplaces, social/community, gaming, mobile-first)
- LEVEL UP lane: reward products with proven revenue in adjacent domains — not "do it better" clones but "apply your stack to a paying market"
- Both lanes penalize: another tracker, another aggregator, another dashboard, another Estonian-market utility
- Wildcard stays: one stretch pick per lane

## Phase 5: UI Redesign
- /design canvas for approval
- Reframe dashboard from "discovery list" to "growth compass"
- Stronger visual hierarchy for the two lanes
- Better discovery cards (domain tags, revenue signal, why-this-matters prominence)
- Builder Memo as the centerpiece, not a sidebar card

## Phase 6: Fresh Run
- Scrape with new sources
- Full curation pass with new scoring
- Generate growth-oriented Builder Memo
- Verify dashboard renders well

## Phase 7: Cloud Routine
- Bi-weekly cloud routine (1st & 15th, like WHO DIS)
- Token-guarded /api/loop endpoints (EUDI pattern)
- Steps: scrape → pre-filter → AI score → write decisions → update rates → generate memo

## Phase 8: Resend Newsletter
- Migrate dead Brevo code to Resend
- Bi-weekly cadence synced with the routine
- Top discoveries + Builder Memo excerpt
- Only after quality is proven
