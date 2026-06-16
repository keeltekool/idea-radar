# Idea Radar Pipeline — Loop Prompt

## Goal
Scrape 15 indie builder sources, keyword-filter noise, score survivors against the Builder Profile for feasibility/novelty/stretch, and update the Neon DB with curated discoveries.

## Working Directory
`C:\Users\Kasutaja\Claude_Projects\idea-radar`

## Steps

### Step 1: Scrape all sources
```bash
cd C:\Users\Kasutaja\Claude_Projects\idea-radar\worker\src && npx tsx run-scrape.ts
```
This fetches from all 15 active sources (Product Hunt, GitHub, HN, Dev.to, Reddit, Lobsters, Medium) and stores raw items as "pending" in Neon. Log the output — note how many new discoveries were found.

### Step 2: Pre-filter (keyword gate)
```bash
cd C:\Users\Kasutaja\Claude_Projects\idea-radar\worker\src && npx tsx pre-filter.ts
```
This marks items as "relevant" or "irrelevant" based on required/blocked keyword matching. No AI needed. Log the counts (total, relevant, irrelevant).

### Step 3: Read relevant discoveries for scoring
```bash
cd C:\Users\Kasutaja\Claude_Projects\idea-radar\worker\src && npx tsx ai-pass.ts
```
This outputs JSON to stdout with all relevant discoveries + the Builder Profile + past feedback. Read the output carefully.

### Step 4: Score each discovery (YOU are the AI scorer) — TWO LANES

First, the gate: **Is this a real shipped product/tool by an indie builder?** If NO (essay, tutorial, opinion piece, launch diary, marketing, news) → reject with a one-word reason. The gate is the same for both lanes — noise stays out.

If YES, decide which **lane** it belongs to and score it on that lane's three axes (1-10 each). Pick the lane where the item is genuinely strong; if it fits both, choose the lane where it scores higher.

**LANE A — NOVEL** (`track: "novel"`) — expansion, distance from the portfolio:
- **Feasibility**: Can the builder realistically build something similar with Next.js/Tailwind/Vercel/Neon/Claude API?
- **Novelty**: How different is this from the builder's existing 41 projects? HIGH = good (new territory).
- **Stretch**: Does this push into genuinely unfamiliar domain or tech? HIGH = good.
- Composite = (feasibility × 0.2) + (novelty × 0.4) + (stretch × 0.4). Threshold = 7.0.
- Summary: 1-2 sentences on GROWTH — why this is new territory worth entering.

**LANE B — FAMILIAR** (`track: "familiar"`) — inspiration, "I could do this better":
- **Traction**: How popular/validated is it? Weigh HN upvotes, GitHub stars, Dev.to upvotes. Recognizable, proven demand = HIGH.
- **Relevance**: How close is it to the builder's existing domains & stack? HIGH = good (this is the OPPOSITE of novelty — familiarity is the point here).
- **Improvability**: Is there an obvious angle to do it better — sharper UX, Estonian-market fit, a missing feature, better taste? HIGH = good.
- Composite = (traction × 0.3) + (relevance × 0.35) + (improvability × 0.35). Threshold = 7.0.
- Summary: 1-2 sentences on THE ANGLE — concretely, what you'd do better/differently than they did.

For BOTH lanes: assign 1-3 domain categories.

**BALANCE — soft 50/50.** Aim for roughly equal counts per lane each run (target ~8-12 each). If one lane is thin after honest scoring, lower that lane's bar slightly (down to ~6.5) to surface the best available rather than padding the other lane. Never accept noise to hit a number.

**Wildcards (one per lane):** among scored REJECTS, mark the highest-**stretch** novel reject AND the highest-**traction** familiar reject as wildcards (`isWildcard: true, status: "accepted"`, with that lane's `track` and scores).

### Step 5: Write decisions to DB
Format decisions as JSON, write to a file, and pipe it in (PowerShell/Windows-safe — do NOT use the `echo | cd` form):
```bash
cd C:\Users\Kasutaja\Claude_Projects\idea-radar\worker\src && npx tsx update-decisions.ts < _decisions.json
```
Each decision is one of:
- Novel: `{"id":N,"status":"accepted","track":"novel","feasibility":N,"novelty":N,"stretch":N,"composite":N,"summary":"...","categories":["..."],"isWildcard":false}`
- Familiar: `{"id":N,"status":"accepted","track":"familiar","traction":N,"relevance":N,"improvability":N,"composite":N,"summary":"...","categories":["..."],"isWildcard":false}`
- Rejected: `{"id":N,"status":"rejected","reason":"one-word"}`

Clean up `_decisions.json` after the run.

### Step 6: Update acceptance rates
```bash
cd C:\Users\Kasutaja\Claude_Projects\idea-radar\worker\src && npx tsx update-acceptance-rates.ts
```

### Step 7: Trigger newsletter (if configured)
If CRON_SECRET and BREVO_API_KEY are set in .env.local:
```bash
curl -s -H "Authorization: Bearer $(grep CRON_SECRET C:\Users\Kasutaja\Claude_Projects\idea-radar\.env.local | cut -d= -f2)" https://idea-radar-topaz.vercel.app/api/newsletter/send
```

## Completion
Log a summary: sources scraped, items found, pre-filter survivors, accepted count **split by lane (novel / familiar)**, rejected count, wildcard count. Report this to the Loop Control Center.

> The Builder Memo (separate step, see project memory) should also report the novel/familiar split and reflect on the mix.
