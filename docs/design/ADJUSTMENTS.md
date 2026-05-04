# Design Adjustments — Stitch Output → Actual Build

> Assessed: 2026-05-04
> Based on: PRD `docs/plans/2026-05-04-idea-radar-prd.md`
> Decision: All adjustments approved by user

## KEEP AS-IS

- [x] Design system (colors, typography, spacing, elevation, shapes) → straight into `tailwind.config.ts`
- [x] Logo (radar icon from `idea_radar_logo/screen.png`)
- [x] Builder Profile page layout (bento sidebar + markdown render + re-index button)
- [x] Newsletter page layout (subscription management + archive grid)
- [x] Curated card design (score pills, composite circle, "Why this matters" box, feedback buttons, tech tags, wildcard badge)
- [x] Newsreader + Plus Jakarta Sans font pairing
- [x] Warm minimalism: no shadows, tonal layers, 1px hairline borders

## TRIM (overscoped by Stitch)

- [ ] **Remove sidebar navigation** on dashboard → replace with EUDI-style top tab nav (All / Filtered / Curated)
- [ ] **Remove "New Analysis" button** → pipeline triggered via LCC/slash command, not UI
- [ ] **Remove Settings icon** from header → no settings page in PRD
- [ ] **Remove Notifications icon** from header → no notification system
- [ ] **Remove profile avatar / user icon** → no auth, no user system
- [ ] **Remove "Daily Highlights" toggle** on newsletter → one cadence only (tied to curation runs)
- [ ] **Remove footer links** (System Status, API, Privacy Policy) → simplify to "Idea Radar" + last scan timestamp
- [ ] **Remove all `dark:` class variants** → light mode only for v1
- [ ] **Fix score scale** → Stitch shows 88/94 (out of 100), PRD uses 1-10
- [ ] **Fix score pill colors** → use design system semantics: `#4B6344` (olive/high), `#D9A05B` (ochre/mid), `#929292` (slate/low), NOT generic Tailwind green/blue/red
- [ ] **Fix dummy source badges** → replace "ArXiv" with actual sources (Product Hunt, GitHub, HN, Dev.to, Reddit, Lobsters, Medium)
- [ ] **Fix sort options** → "High Score / Newest / Trending" becomes "Score / Newest / Novelty / Stretch"

## ADD (missing from Stitch)

- [ ] **"All Discoveries" tab view** — simpler card: title + description + source badge + date + status pill
- [ ] **"Filtered" tab view** — same simpler card, showing `relevant` status items only
- [ ] **Source dropdown filter** — "All sources" + individual source options
- [ ] **Category filter pills** — horizontal pill bar below search
- [ ] **"Sparked something" label** on feedback button (Stitch used generic thumbs up/down, PRD says "Sparked something ✦" / "Pass")
