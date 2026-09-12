# Idea Radar Pipeline — Loop Prompt

## Goal
Scrape 31 consumer-product sources (Mon & Thu), keyword-filter noise, score survivors against the Builder Profile's GROWTH GAPS, and curate discoveries that PUSH the builder into unfamiliar domains or LEVEL UP their craft.

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
- Multiplayer / realtime / collaborative (zero)
- Social / community features (zero)
- Gaming / interactive entertainment (only WHO DIS)
- Mobile-first / native experiences (mostly web)
- Hardware integration / IoT / physical world (zero)
- New interaction patterns: drag-and-drop builders, canvas editors, voice UI, AR/spatial, generative art

**LANE A — PUSH** (`track: "novel"`) — unfamiliar domains, new skills to learn:
- **Feasibility**: Can the builder build this with Next.js/Tailwind/Vercel/Neon/Claude? (1-10)
- **Novelty**: How different from the builder's 45+ existing projects? Apply comfort zone penalties and growth gap bonuses. (1-10)
- **Stretch**: Does this push into a genuinely unfamiliar domain, tech, or interaction pattern? (1-10)
- Composite = (feasibility × 0.2) + (novelty × 0.4) + (stretch × 0.4). Threshold = 7.0.
- Summary: 2 sentences — what makes this COOL and what NEW SKILL would building it teach you?

**LANE B — LEVEL UP** (`track: "familiar"`) — "I could build this better":
- **Traction**: How popular/validated? Upvotes, stars, user excitement. People clearly want this = HIGH. (1-10)
- **Relevance**: How well does the builder's existing stack and skills apply? (1-10)
- **Improvability**: Is there an obvious angle to do it better — sharper UX, missing feature, different audience, better taste? (1-10)
- Composite = (traction × 0.3) + (relevance × 0.35) + (improvability × 0.35). Threshold = 7.0.
- Summary: 2 sentences — what's the CRAFT ANGLE? What would you do differently and why would it be better?

For BOTH lanes: assign 1-3 domain categories.

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

### Step 8: Generate and send newsletter

The newsletter is a **coaching brief**, not a link list. You are writing 4-6 paragraphs to a builder who reads this to understand what the scoring revealed about their growth trajectory. Discoveries are inline citations supporting your analysis — never the main event.

**Voice:** Direct, specific, no filler. Name the pattern, name the gap, name the product. Reference discoveries by title inline (the API auto-links them).

**Structure your paragraphs like this:**
1. Open with the sharpest insight from this run — a pattern, a contrast, a number that should make the builder uncomfortable. No "this week we scored..." preamble.
2. Name the pattern the scoring reveals — what domains keep appearing, what keeps getting rejected, what the comfort zone looks like from the data.
3. Pick 2-3 discoveries and explain WHY they matter — not what they are, but what building something like them would teach. Weave the discovery titles into prose naturally.
4. Name the gap — the single biggest hole between the builder's portfolio and where the market is going.
5. One concrete suggestion — a specific product to build, with the growth-gap rationale.
6. (Optional) A wildcard or a contrarian take — something from the rejects that deserved a second look.

Generate this JSON and POST it:

```json
{
  "op": "send-newsletter",
  "newsletter": {
    "subject": "<Short, specific subject — name the insight, not the count>",
    "stats": { "total": <screened>, "accepted": <scored>, "push": <push>, "levelUp": <levelUp> },
    "paragraphs": [
      "<paragraph 1 — the hook insight>",
      "<paragraph 2 — the pattern>",
      "<paragraph 3 — discoveries as evidence, titles inline>",
      "<paragraph 4 — the gap>",
      "<paragraph 5 — the build suggestion>"
    ],
    "references": [
      { "title": "<exact discovery title as used in paragraphs>", "url": "<url>" },
      { "title": "<another>", "url": "<url>" }
    ]
  }
}
```

```bash
curl -s -X POST -H "Authorization: Bearer <LOOP_TOKEN>" -H "Content-Type: application/json" -d @newsletter.json "https://idea-radar-topaz.vercel.app/api/loop"
```

The API auto-links discovery titles in the prose, wraps it in a branded dark-theme email, and sends to all subscribers. Discovery titles in `references` must match exactly how they appear in the paragraphs.

## Completion
Log a summary: sources scraped, items found, pre-filter survivors, accepted count **split by lane (PUSH / LEVEL UP)**, rejected count, wildcard count. Report this to the Loop Control Center.
