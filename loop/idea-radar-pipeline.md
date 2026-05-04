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

### Step 4: Score each discovery (YOU are the AI scorer)
For each discovery in the output, evaluate:
1. **Is this a real shipped product by an indie builder?** If NO → reject with one-word reason.
2. If YES, score on three axes (1-10 each):
   - **Feasibility**: Can this builder realistically build something similar with Next.js/Tailwind/Vercel/Neon/Claude API?
   - **Novelty**: How different is this from the builder's existing 41 projects? HIGH = good (new territory)
   - **Stretch**: Does this push into genuinely unfamiliar domain or tech? HIGH = good
3. Write a 1-2 sentence "why this matters" summary focused on GROWTH, not similarity.
4. Assign 1-3 domain categories.
5. Composite = (feasibility × 0.2) + (novelty × 0.4) + (stretch × 0.4). Threshold = 7.0.

CRITICAL: Score NOVELTY and STRETCH high when the project is DIFFERENT from the portfolio. The goal is expansion, not comfort.

After scoring all items, pick 1-2 items with highest stretch among rejected items that were actually scored → mark as wildcards (isWildcard: true, status: accepted).

### Step 5: Write decisions to DB
Format decisions as JSON and pipe to update-decisions.ts:
```bash
echo '{"decisions":[...]}' | cd C:\Users\Kasutaja\Claude_Projects\idea-radar\worker\src && npx tsx update-decisions.ts
```
Each decision: `{"id":N,"status":"accepted","feasibility":N,"novelty":N,"stretch":N,"composite":N,"summary":"...","categories":["..."],"isWildcard":false}` or `{"id":N,"status":"rejected","reason":"one-word"}`

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
Log a summary: sources scraped, items found, pre-filter survivors, accepted count, rejected count, wildcard count. Report this to the Loop Control Center.
