# Idea Radar Pipeline — Loop Prompt

## Goal
Scrape 31 consumer-product sources (Mon & Thu), filter noise (Jev gate), score survivors against the Builder Profile's GROWTH GAPS, and curate discoveries that PUSH the builder into unfamiliar domains or LEVEL UP their craft.

## Working Directory
`C:\Users\Kasutaja\Claude_Projects\idea-radar`

## Steps

### Step 1: Scrape all sources
```bash
cd C:\Users\Kasutaja\Claude_Projects\idea-radar && npx tsx worker/src/run-scrape.ts
```
Fetches from 14 active consumer-product sources (Product Hunt, HN Show/Launch, Dev.to, Reddit, Medium, Kicktraq, YouTube) and stores raw items as "pending" in Neon.

### Step 2: Pre-filter (Jev gate, keyword fallback)
```bash
cd C:\Users\Kasutaja\Claude_Projects\idea-radar && npx tsx worker/src/pre-filter.ts
```
Marks items as "relevant" or "irrelevant". Jev (TypeSafe decision model, `worker/src/jev-gate.ts`) scores each item against the Builder Profile and keeps it at `jev_score` ≥ 0.215. If `TYPESAFE_API_KEY` is missing or a call fails, that item falls back to the keyword gate (`src/lib/filter-terms.ts`); the summary line reports `keywordFallback`. Evidence and thresholds: `Claude_Projects/jev/KNOWLEDGE.md` §11.

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
- Estonian-market utilities (Kalkulaator, Energiatark)

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

### Writing rules (memo AND newsletter — read before Steps 7 and 8)
The reader skims this on a phone between other things. Every line must make sense on its own and point at something to look at or do. If a line needs the line before it to make sense, rewrite it.

- **Blocks, not paragraphs.** Every section is short lines. One idea per line, max ~20 words per line. Never write a paragraph of more than 2 sentences.
- **Plain words.** Write it the way you'd text a friend who builds software. Digits for all numbers ("43", never "Forty-three").
- **Every discovery mentioned answers three things:** what it is, which lane (PUSH / LEVEL UP), what building it would teach.
- **Bold** only the one name per line that matters (an item title, the product to build).
- **Banned:** storytelling openers, rhetorical setups and reveals ("Read that the right way:", "That is the move you keep…", "You are not X. You are Y."), "not X, it's Y" contrasts, dramatic one-line closers, metaphors, em-dash chains, preamble ("This week we scored…"), a recap at the end, the words "honest", "genuinely", "quietly", "the real story".
- Keep every section name and its job as defined below. Only the form is fixed here, not the analysis: the insight, the pattern, the gap and the build suggestion stay as sharp as before.

Bad (old style, never again):
> Forty-three discoveries cleared the PUSH lane at the full 7.0 bar without strain. LEVEL UP needed the lowered 6.5 bar to reach 29. Read that the right way: the market is not short of things that would stretch you — your portfolio is short of things that genuinely fit, because fit now means another aggregator.

Good:
> - 43 PUSH at the full 7.0 bar. LEVEL UP needed the bar lowered to 6.5 to reach 29.
> - Plenty out there would stretch you. Little fits your stack without being another aggregator.
> - Top tags: new-interaction 18, creative-tools 18, AI 17.

### Step 7: Generate Builder Memo
A coaching brief grounded in this run's accepted discoveries and the Builder Profile, written in Markdown under the Writing rules above. Bullets under every heading; length follows the content. Sections (keep these exact headings):
1. `## What Came In` — 3-5 bullets: raw numbers (sources, filtered, accepted by lane, rejected and why, wildcards)
2. `## Patterns You Are Stuck In` — 2-4 bullets: the comfort-zone patterns this run reveals, each with counts and 2-3 example items
3. `## Direct Callouts` — every accepted discovery, one bullet each, under `### PUSH` and `### LEVEL UP` subheadings: `- [Title](url) — what it is, in under 12 words`. Mark wildcards with `(wildcard)`.
4. `## The Gap` — first line names the single biggest growth gap in one sentence, then 2-3 bullets of evidence from the profile and this run
5. `## One Concrete Suggestion` — `**Product name**: what it is, one line`, then `- Why:` 1-2 bullets (which missing skill it forces), then `- How:` 3 numbered first steps, then where to ship it

Write the memo as JSON and pipe to `save-memo.ts`:
```bash
cd C:\Users\Kasutaja\Claude_Projects\idea-radar && npx tsx worker/src/save-memo.ts < _memo.json
```

### Step 8: Generate and send newsletter

The newsletter is a **coaching brief**: what the scoring revealed about the builder's growth, written under the Writing rules above. Discoveries support the analysis; titles are auto-linked by the API.

**Format of every `text` field:** separate lines with `\n`. A line starting with `- ` renders as a bullet. `**x**` renders bold. Each line renders as its own row, so write rows, not prose.

**Sections (keep these labels, in this order):**
1. **The signal** — 2-3 bullets. The sharpest insight from this run: a number, a contrast, the thing that should make the builder uncomfortable. Lead with it.
2. **The pattern** — 2-4 bullets. What domains keep appearing, what keeps getting rejected, what the comfort zone looks like from the data. Counts and 2-3 example items per bullet.
3. **What stood out** — 3-5 bullets, one per discovery: `- **Exact Title** (PUSH) — what it is. Teaches: what building it would teach you.` Pick the discoveries that matter most for growth.
4. **The gap** — first line: the single biggest hole between portfolio and market, one sentence. Then 1-3 bullets of evidence.
5. **Build this** — first line: `**Product name**: what it is, one line.` Then `- Why: …` (the growth gap it closes), then numbered first steps `1. …`, `2. …`, `3. …` on their own lines, then where to ship it.
6. **Second look** (optional) — 1-2 bullets: a wildcard or reject that deserved another look, and why in one line.

Generate this JSON and POST it:

```json
{
  "op": "send-newsletter",
  "newsletter": {
    "subject": "<Short, specific subject — name the insight, not the count>",
    "stats": { "total": <screened>, "accepted": <scored>, "push": <push>, "levelUp": <levelUp> },
    "sections": [
      { "label": "The signal", "text": "- <line>\n- <line>\n- <line>" },
      { "label": "The pattern", "text": "- <line>\n- <line>" },
      { "label": "What stood out", "text": "- **<Exact Title>** (PUSH) — <what it is>. Teaches: <skill>.\n- ..." },
      { "label": "The gap", "text": "<one sentence>\n- <evidence>\n- <evidence>" },
      { "label": "Build this", "text": "**<Name>**: <what it is>.\n- Why: <gap it closes>\n1. <step>\n2. <step>\n3. <step>\nShip at <where>." },
      { "label": "Second look", "text": "- **<Exact Title>** — <why, one line>" }
    ],
    "references": [
      { "title": "<exact discovery title as used in sections>", "url": "<url>" },
      { "title": "<another>", "url": "<url>" }
    ]
  }
}
```

```bash
curl -s -X POST -H "Authorization: Bearer <LOOP_TOKEN>" -H "Content-Type: application/json" -d @newsletter.json "https://idea-radar-topaz.vercel.app/api/loop"
```

The API auto-links discovery titles, wraps it in a branded dark-theme email, and sends to all subscribers. Discovery titles in `references` must match exactly how they appear in the sections.

## Completion
Log a summary: sources scraped, items found, pre-filter survivors, accepted count **split by lane (PUSH / LEVEL UP)**, rejected count, wildcard count. Report this to the Loop Control Center.
