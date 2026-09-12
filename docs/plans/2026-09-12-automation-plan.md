# Idea Radar Automation & Newsletter Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Idea Radar fully automated: bi-weekly scrape via GitHub Actions, AI scoring via cloud routine through token-guarded /api/loop endpoints (EUDI pattern), Resend newsletter.

**Architecture:** GitHub Actions scrapes 31 sources bi-weekly (1st & 15th) + runs pre-filter. Cloud routine calls /api/loop endpoints for AI scoring + memo. Newsletter triggers after scoring via Resend. /api/loop uses `getDb()` from `src/lib/db-server.ts` — no worker imports, fully serverless-safe.

**Tech Stack:** Next.js 16, Drizzle ORM, @neondatabase/serverless, Resend (fetch), GitHub Actions, Anthropic cloud routine

---

### Task 1: Shared filter terms module

**Files:**
- Create: `src/lib/filter-terms.ts`
- Modify: `worker/src/pre-filter.ts` — import from shared module

**Step 1: Verify shared module exists**

`src/lib/filter-terms.ts` was already created this session. Verify it exports `REQUIRED_TERMS`, `BLOCKED_TERMS`, and `passesPreFilter`.

**Step 2: Update worker pre-filter to use shared module**

Modify `worker/src/pre-filter.ts` — replace inline term arrays with import from `@/src/lib/filter-terms`.

Note: worker scripts use relative paths (`../../src/lib/filter-terms`), not `@/` aliases.

**Step 3: Verify pre-filter still works**

Run: `cd worker/src && npx tsx pre-filter.ts`
Expected: JSON output with total/relevant/irrelevant counts (may be 0 if no pending items).

**Step 4: Commit**

```bash
git add src/lib/filter-terms.ts worker/src/pre-filter.ts
git commit -m "refactor: extract filter terms to shared module"
```

---

### Task 2: Serverless-safe /api/loop route

**Files:**
- Create: `src/app/api/loop/route.ts` (replace the broken one)

**Architecture (mirroring EUDI exactly):**
- GET ops: `filter` (return pending items), `get-relevant` (return relevant items + builder profile for AI scoring), `status` (health check)
- POST ops: `filter-decisions` (write filter results), `score-decisions` (write AI scoring results), `update-rates` (recalculate acceptance rates), `save-memo` (store builder memo)
- Auth: `Bearer LOOP_TOKEN` on every request
- DB: `getDb()` from `src/lib/db-server.ts` — NO worker script imports
- Pre-filter logic uses `passesPreFilter()` from shared module

**Step 1: Write the loop route**

GET endpoints (data retrieval for the cloud routine):
- `op=filter` — returns pending discoveries for filter step. Routine reads them, applies pre-filter, posts back decisions.
- `op=get-relevant` — returns relevant discoveries + latest builder profile for AI scoring
- `op=status` — returns source count, discovery counts by status, last run info

POST endpoints (write-back from the cloud routine):
- `op=filter-decisions` — body: `{ decisions: [{ id, status: "relevant"|"irrelevant" }] }`. Updates discovery status.
- `op=score-decisions` — body: `{ decisions: [{ id, status, track, scores..., summary, categories, isWildcard }] }`. Updates accepted/rejected with all score columns.
- `op=update-rates` — recalculates per-source acceptance rates
- `op=save-memo` — body: `{ content, discoveryCount }`. Inserts into builder_memos.

**Step 2: Build and verify route compiles**

Run: `npx next build`
Expected: `/api/loop` listed as `ƒ (Dynamic)`

**Step 3: Commit**

```bash
git add src/app/api/loop/route.ts
git commit -m "feat: add /api/loop route — EUDI-pattern token-guarded endpoints for cloud routine"
```

---

### Task 3: Add LOOP_TOKEN to environment

**Step 1: Generate token**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Step 2: Add to .env.local**

Append `LOOP_TOKEN=<generated>` to `.env.local`

**Step 3: Add to Vercel**

```powershell
$tmp = "$env:LOCALAPPDATA\Temp\loop_token.txt"
Set-Content -Path $tmp -Value '<generated>' -NoNewline -Encoding utf8
Push-Location 'C:\Users\Kasutaja\Claude_Projects\idea-radar'
cmd /c "vercel env add LOOP_TOKEN production < `"$tmp`""
Pop-Location
Remove-Item $tmp -Force
```

**Step 4: Test the endpoint**

Push first, wait for deploy, then:
```bash
curl -s -H "Authorization: Bearer <TOKEN>" "https://idea-radar-topaz.vercel.app/api/loop?op=status"
```
Expected: `{ "status": "ok", "sources": 31, ... }`

**Step 5: Commit (push only, no code changes)**

---

### Task 4: GitHub Actions scrape workflow

**Files:**
- Create: `.github/workflows/scrape.yml`

**Step 1: Write the workflow**

Bi-weekly cron (1st and 15th, 06:00 UTC). Runs `worker/src/run-scrape.ts` then `worker/src/pre-filter.ts`. Mirrors EUDI's `.github/workflows/scrape.yml` exactly.

Needs secrets: `DATABASE_URL`, `GITHUB_TOKEN` (for GitHub Search API source).

**Step 2: Commit and push**

```bash
git add .github/workflows/scrape.yml
git commit -m "feat: add bi-weekly GitHub Actions scrape workflow (1st & 15th)"
git push
```

**Step 3: Verify in GitHub**

Check GitHub Actions tab — workflow should appear. Test with manual `workflow_dispatch` trigger.

---

### Task 5: Migrate newsletter from Brevo to Resend

**Files:**
- Modify: `src/app/api/newsletter/send/route.ts` — replace Brevo API with Resend
- Modify: `.env.example` if exists — update var names

**Step 1: Rewrite send route**

Replace Brevo fetch with Resend fetch (same pattern as EUDI and WHO DIS migrations):
- `POST https://api.resend.com/emails`
- Header: `Authorization: Bearer ${process.env.RESEND_API_KEY}`
- Body: `{ from: "Idea Radar <onboarding@resend.dev>", to, subject, html }`
- Remove BREVO_API_KEY and BREVO_SENDER_EMAIL references

Improve the email template:
- Match the app's editorial design (ink bg, olive accent, Newsreader serif feel)
- Show PUSH and LEVEL UP discoveries separately
- Include Builder Memo excerpt
- Domain tags on each discovery

**Step 2: Create Resend API key (user action)**

User creates key named `idea-radar` in Resend dashboard.

**Step 3: Wire env vars**

- Add `RESEND_API_KEY` to `.env.local` + Vercel
- Add `CRON_SECRET` to `.env.local` + Vercel (if not already set)
- Remove `BREVO_API_KEY` and `BREVO_SENDER_EMAIL` from Vercel

**Step 4: Test send**

```bash
node -e "/* test email to egertv@gmail.com */"
```

**Step 5: Build and deploy**

Run: `npx next build` — verify clean
Push to GitHub — Vercel auto-deploys

**Step 6: Commit**

```bash
git add src/app/api/newsletter/send/route.ts
git commit -m "migrate newsletter from Brevo to Resend"
```

---

### Task 6: Cloud routine setup

**Step 1: Design the routine prompt**

The cloud routine runs bi-weekly (1st and 15th). It calls the /api/loop endpoints:
1. GET `?op=get-relevant` — reads all relevant discoveries + builder profile
2. Claude scores each discovery using the growth compass criteria (from loop/idea-radar-pipeline.md Step 4)
3. POST `op=score-decisions` — writes accepted/rejected with scores
4. POST `op=update-rates` — recalculates source acceptance rates
5. POST `op=save-memo` — generates and saves builder memo

The routine prompt includes:
- The full scoring criteria (PUSH/LEVEL UP lanes, comfort zone penalties, growth gap bonuses)
- The builder profile (fetched from the endpoint)
- Instructions for generating the builder memo

**Step 2: Create the routine**

Use `/schedule` or `claude.ai/code/routines` to create:
- Name: `Idea Radar Pipeline`
- Schedule: 1st and 15th, 07:00 Tallinn (runs AFTER GitHub Actions scrape at 06:00 UTC)
- Model: claude-opus-5
- Prompt: full pipeline with endpoint URLs and LOOP_TOKEN

**Step 3: Verify first run**

Trigger manually. Check:
- Discoveries scored in Neon
- Builder memo generated
- Dashboard shows new curated content

---

### Task 7: End-to-end verification

**Step 1: Trigger full pipeline manually**

1. Run GitHub Actions workflow (manual dispatch)
2. Wait for scrape + filter to complete
3. Trigger cloud routine manually
4. Check dashboard at https://idea-radar-topaz.vercel.app

**Step 2: Visual verification**

Run: `node ~/.claude/scripts/verify-deploy.mjs https://idea-radar-topaz.vercel.app / /memo /profile`
At 1440px and 375px.

**Step 3: Verify newsletter**

Trigger: `GET /api/newsletter/send` with CRON_SECRET
Check: email lands in egertv@gmail.com

---

### Task 8: Wrap-up

- Update STACK.md (sources count, services table, gotchas)
- Update project memory (`project_idea_radar.md`)
- Update MEMORY.md index line
- Update migration tracker (Brevo → Resend done for Idea Radar)
- Update portfolio
- Final commit + push
