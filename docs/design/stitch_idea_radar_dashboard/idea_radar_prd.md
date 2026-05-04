# Idea Radar — Personal Inspiration Discovery Tool

## PURPOSE
This app surfaces interesting indie builder projects from 7 sources (Product Hunt, GitHub, Hacker News, Dev.to, Reddit, Lobsters, Medium). A backend AI pipeline scores each project against the user's own builder portfolio.

## SCREENS/VIEWS
1. **MAIN DASHBOARD** (default view) — 3 tab navigation:
   - "All Discoveries" — raw firehose, all statuses. Basic cards. Count badge.
   - "Filtered" — items that passed AI quality gate but aren't yet scored.
   - "Curated" — AI-scored 7+ items only. Enriched cards with full scoring.
2. **BUILDER PROFILE** page:
   - User's auto-generated portfolio summary (tech stack, domains, patterns, negative space).
   - "Re-index My Portfolio" button.
   - Last indexed timestamp.
   - Markdown render of the profile.
3. **NEWSLETTER** page:
   - Subscribe/manage page.
   - Archive of past newsletter sends.

## CARD DESIGN — "Curated" Tab
- Project title (clickable)
- One-line description
- Source badge (with icon)
- Author name
- Three score pills: Feasibility, Novelty, Stretch (1-10, color-coded)
- Composite score (prominent)
- "Why this matters for YOU" — AI-generated relevance summary
- Tech stack tags
- Category/domain tags
- Feedback buttons: "Sparked something ✦" and "Pass"
- "Wildcard" badge (visually distinct)
- Published date

## DESIGN DIRECTION
- **Vibe:** Private intelligence dashboard, personal tool, clean, minimal.
- **Visuals:** Generous whitespace, no shadows, tonal shifts/borders for depth.
- **Theme:** Warm, readable light theme (default).
- **Typography:** Serif/distinctive display font for headings, clean sans-serif for body.
- **Layout:** Desktop-primary, mobile-responsive.

## TECH CONSTRAINTS
- Next.js + Tailwind CSS.
- Data from JSON API routes.
- Server-rendered.
