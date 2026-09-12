# Idea Radar Pipeline — Loop Prompt

## Goal
Scrape 14 consumer-product sources, keyword-filter noise, score survivors against the Builder Profile's GROWTH GAPS, and curate discoveries that PUSH the builder into unfamiliar domains or LEVEL UP their revenue potential.

## Working Directory
`C:\Users\Kasutaja\Claude_Projects\idea-radar`

## Steps

### Step 1: Scrape all sources
```bash
cd C:\Users\Kasutaja\Claude_Projects\idea-radar && npx tsx worker/src/run-scrape.ts
```
Fetches from 14 active consumer-product sources (Product Hunt, HN Show/Launch, Dev.to, Reddit, Medium, Kicktraq, YouTube) and stores raw items as "pending" in Neon.

### Step 2: Pre-filter (keyword gate)
```bash
cd C:\Users\Kasutaja\Claude_Projects\idea-radar && npx tsx worker/src/pre-filter.ts
```
Marks items as "relevant" or "irrelevant" based on consumer-product keyword matching. No AI needed.

### Step 3: Read relevant discoveries for scoring
```bash
cd C:\Users\Kasutaja\Claude_Projects\idea-radar && npx tsx worker/src/ai-pass.ts
```
Outputs JSON with all relevant discoveries + Builder Profile + past feedback.

### Step 4: Score each discovery (YOU are the AI scorer) — TWO LANES

**GATE (both lanes):** Is this a real shipped product/tool/service? If NO (essay, tutorial, opinion, news, library, framework, dev-infra) → reject with a one-word reason.

If YES, assign to the lane where it scores strongest. Score on that lane's three axes (1-10 each).

**THE BUILDER'S COMFORT ZONE (penalize these):**
The builder has 45+ projects. These patterns are OVERREPRESENTED and get a -2 penalty on novelty/stretch:
- Aggregators / scrapers / feed readers (EUDI, Athlon, HankeRadar, Idea Radar, VAIB-X)
- Price trackers / comparison tools (Hinnavaht, Sinu Aed, PriceHNTR)
- Dashboard / admin UIs (LCC, Launchpad, Spordipaev)
- Estonian-market utilities (Keeletark, Kalkulaator, Energiatark)

**THE BUILDER'S GROWTH GAPS (reward these with +2 on novelty/stretch):**
- Health / wellness / fitness (only GymPal)
- Education / learning (only Skill4Win)
- Creative tools / content creation (zero)
- Marketplace / platform with transactions (only Rental Business Kit)
- Social / community features (zero)
- E-commerce / subscription commerce (zero)
- Gaming / interactive entertainment (only WHO DIS)
- Mobile-first / native experiences (mostly web)
- Products with recurring revenue / paid users (almost zero — SongDrop has Stripe but no paying users)

**LANE A — PUSH** (`track: "novel"`) — unfamiliar domains, maximum growth:
- **Feasibility**: Can the builder build this with Next.js/Tailwind/Vercel/Neon/Claude/Stripe/Clerk? (1-10)
- **Novelty**: How different from the builder's 45+ existing projects? Apply comfort zone penalties and growth gap bonuses. (1-10)
- **Stretch**: Does this push into a genuinely unfamiliar domain, business model, or interaction pattern? (1-10)
- Composite = (feasibility × 0.2) + (novelty × 0.4) + (stretch × 0.4). Threshold = 7.0.
- Summary: 2 sentences — name the GROWTH GAP this fills and what existing skill transfers. Include a domain tag (HEALTH, EDUCATION, CREATIVE, MARKETPLACE, SOCIAL, E-COMMERCE, GAMING, MOBILE).

**LANE B — LEVEL UP** (`track: "familiar"`) — proven revenue in adjacent markets:
- **Traction**: How popular/validated? Revenue numbers, user counts, upvotes. Proven paying market = HIGH. (1-10)
- **Relevance**: How well does the builder's existing stack and skills apply? (1-10)
- **Improvability**: Concrete angle — Estonian market gap, sharper UX, missing feature, price undercut? (1-10)
- Composite = (traction × 0.3) + (relevance × 0.35) + (improvability × 0.35). Threshold = 7.0.
- Summary: 2 sentences — name the REVENUE ANGLE and what existing project is the skeleton.

For BOTH lanes: assign 1-3 domain categories. Note revenue signal if visible (MRR, pricing tier, "free").

**BALANCE — soft 50/50.** Target ~equal counts per lane. Thin lane lowers bar to ~6.5.

**Wildcards (one per lane):** highest-stretch PUSH reject + highest-traction LEVEL UP reject get promoted (`isWildcard: true`).

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

### Step 7: Generate Builder Memo
Generate a ~800-1200 word coaching brief grounded in this run's accepted discoveries and the Builder Profile. Structure:
1. **What Came In** — raw numbers (sources, filtered, accepted by lane)
2. **Patterns You Are Stuck In** — name the comfort zone patterns this run reveals
3. **Direct Callouts** — every accepted discovery linked, with lane label (PUSH/LEVEL UP)
4. **The Gap** — the single biggest growth gap between skill level and portfolio
5. **One Concrete Suggestion** — one specific product to build next, with why and how

Write the memo as JSON and pipe to `save-memo.ts`:
```bash
cd C:\Users\Kasutaja\Claude_Projects\idea-radar && npx tsx worker/src/save-memo.ts < _memo.json
```

### Step 8: Trigger newsletter (if configured)
If CRON_SECRET and RESEND_API_KEY are set:
```bash
curl -s -H "Authorization: Bearer <CRON_SECRET>" https://idea-radar-topaz.vercel.app/api/newsletter/send
```

## Completion
Log a summary: sources scraped, items found, pre-filter survivors, accepted count **split by lane (PUSH / LEVEL UP)**, rejected count, wildcard count. Report this to the Loop Control Center.
