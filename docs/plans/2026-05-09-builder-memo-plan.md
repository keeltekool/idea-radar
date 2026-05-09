# Builder Memo Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a coaching memo as pipeline Step 7 — after each discovery run, Claude generates a ~500-word blunt brief grounded in that run's accepted discoveries + builder profile, stored in Neon, displayed on a new `/memo` page with history and a preview card on the dashboard.

**Architecture:** New `builder_memos` DB table, `save-memo.ts` worker script (reads memo JSON from stdin, writes to Neon), two API routes, one new page, one dashboard card component, nav update. Follows existing patterns: worker scripts use `createDb` with dotenv, API routes use `getDb`, pages use client-side fetch + Header/Footer wrapper.

**Tech Stack:** Drizzle ORM, Neon Postgres, Next.js (App Router), React, Tailwind, react-markdown.

---

### Task 1: Add `builderMemos` table to schema

**Files:**
- Modify: `src/db/schema.ts`

**Step 1: Add the table definition**

Add after the `scrapeRuns` table (around line 110):

```typescript
export const builderMemos = pgTable("builder_memos", {
  id: serial("id").primaryKey(),
  scrapeRunId: integer("scrape_run_id"),
  content: text("content").notNull(),
  discoveryCount: integer("discovery_count").notNull().default(0),
  generatedAt: timestamp("generated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
```

**Step 2: Push schema to Neon**

Run: `cd C:/Users/Kasutaja/Claude_Projects/idea-radar && npx drizzle-kit push`
Expected: table `builder_memos` created successfully.

**Step 3: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat: add builder_memos table to schema"
```

---

### Task 2: Create `save-memo.ts` worker script

**Files:**
- Create: `worker/src/save-memo.ts`

**Step 1: Write the script**

Follow the exact pattern of `update-decisions.ts` — read JSON from stdin, write to Neon.

```typescript
import { config } from "dotenv";
config({ path: "../../.env.local" });

import { createDb } from "../../src/db/index";
import { builderMemos } from "../../src/db/schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

type MemoInput = {
  scrapeRunId: number | null;
  content: string;
  discoveryCount: number;
};

async function main() {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const input = Buffer.concat(chunks).toString("utf-8");

  let memo: MemoInput;
  try {
    memo = JSON.parse(input);
  } catch {
    console.error("Invalid JSON input");
    process.exit(1);
  }

  if (!memo.content) {
    console.error("Memo content is required");
    process.exit(1);
  }

  const db = createDb(DATABASE_URL!);

  const [inserted] = await db
    .insert(builderMemos)
    .values({
      scrapeRunId: memo.scrapeRunId || null,
      content: memo.content,
      discoveryCount: memo.discoveryCount || 0,
    })
    .returning({ id: builderMemos.id });

  console.log(JSON.stringify({ saved: true, id: inserted.id }));
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
```

**Step 2: Verify it compiles**

Run: `cd C:/Users/Kasutaja/Claude_Projects/idea-radar && npx tsx worker/src/save-memo.ts <<< '{"content":"test","discoveryCount":0}'`
Expected: `{"saved":true,"id":1}` (or similar ID)

**Step 3: Delete the test row**

Run quick cleanup in Drizzle Studio or via a one-off query.

**Step 4: Commit**

```bash
git add worker/src/save-memo.ts
git commit -m "feat: add save-memo.ts worker script"
```

---

### Task 3: Create API routes

**Files:**
- Create: `src/app/api/memos/route.ts`
- Create: `src/app/api/memos/[id]/route.ts`

**Step 1: Write the list endpoint**

`GET /api/memos` — returns all memos, newest first, paginated.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db-server";
import { builderMemos } from "@/db/schema";
import { desc, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const db = getDb();
  const params = req.nextUrl.searchParams;
  const page = parseInt(params.get("page") || "1");
  const limit = parseInt(params.get("limit") || "20");
  const offset = (page - 1) * limit;

  const rows = await db
    .select()
    .from(builderMemos)
    .orderBy(desc(builderMemos.generatedAt))
    .limit(limit)
    .offset(offset);

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(builderMemos);

  return NextResponse.json({
    items: rows,
    total: Number(countRow?.count || 0),
    page,
    limit,
  });
}
```

**Step 2: Write the single memo endpoint**

`GET /api/memos/[id]` — returns one memo by ID.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db-server";
import { builderMemos } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const memoId = parseInt(id);

  const [memo] = await db
    .select()
    .from(builderMemos)
    .where(eq(builderMemos.id, memoId));

  if (!memo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(memo);
}
```

**Step 3: Verify both compile**

Run: `cd C:/Users/Kasutaja/Claude_Projects/idea-radar && npx next build`
Expected: build succeeds with no type errors.

**Step 4: Commit**

```bash
git add src/app/api/memos/route.ts src/app/api/memos/\[id\]/route.ts
git commit -m "feat: add memo API routes (list + detail)"
```

---

### Task 4: Create `/memo` page

**Files:**
- Create: `src/app/memo/page.tsx`

**Step 1: Write the page**

Follow the profile page pattern: Header + Footer wrapper, client component, fetch from API, render list with expandable items. Use ReactMarkdown for memo content. Design tokens from STACK.md (Newsreader serif headings, Plus Jakarta Sans body, ink/body/slate/cream/stone-border palette).

```typescript
"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Header } from "../components/header";
import { Footer } from "../components/footer";

type Memo = {
  id: number;
  scrapeRunId: number | null;
  content: string;
  discoveryCount: number;
  generatedAt: string;
};

export default function MemoPage() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/memos?limit=50")
      .then((r) => r.json())
      .then((data) => {
        setMemos(data.items || []);
        setLoading(false);
        if (data.items?.length > 0) {
          setExpandedId(data.items[0].id);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <>
      <Header />
      <main className="flex-1 max-w-[1280px] mx-auto px-10 py-10 w-full">
        <div className="pb-6 mb-10 border-b border-stone-border">
          <h1 className="font-serif text-[40px] font-medium tracking-[-0.02em] text-ink">
            Builder Memos
          </h1>
          <p className="text-body text-lg mt-1">
            Coaching briefs generated after each discovery run.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate">Loading...</div>
        ) : memos.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-serif text-2xl text-ink mb-2">No memos yet</p>
            <p className="text-body text-sm">
              Run the discovery pipeline to generate your first coaching memo.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {memos.map((memo) => {
              const isExpanded = expandedId === memo.id;
              return (
                <article
                  key={memo.id}
                  className="bg-white border border-stone-border rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : memo.id)}
                    className="w-full flex items-center justify-between p-6 text-left hover:bg-cream transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-serif text-xl text-ink">
                        {formatDate(memo.generatedAt)}
                      </span>
                      <span className="bg-cream text-slate text-[13px] font-semibold px-2 py-1 rounded border border-stone-border">
                        {memo.discoveryCount} discoveries
                      </span>
                    </div>
                    <span className="material-symbols-outlined text-slate text-xl">
                      {isExpanded ? "expand_less" : "expand_more"}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="px-6 pb-6 pt-0 border-t border-stone-border">
                      <article className="prose prose-stone max-w-none prose-headings:font-serif prose-headings:font-medium prose-p:text-body prose-li:text-body prose-strong:text-ink prose-a:text-ink prose-a:underline pt-6">
                        <ReactMarkdown>{memo.content}</ReactMarkdown>
                      </article>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
```

**Step 2: Verify it renders**

Run: `cd C:/Users/Kasutaja/Claude_Projects/idea-radar && npm run dev`
Navigate to `http://localhost:3000/memo` — should show "No memos yet" empty state.

**Step 3: Commit**

```bash
git add src/app/memo/page.tsx
git commit -m "feat: add /memo page with expandable history"
```

---

### Task 5: Add "Latest Memo" preview card to dashboard

**Files:**
- Create: `src/app/components/latest-memo-card.tsx`
- Modify: `src/app/components/dashboard-content.tsx`

**Step 1: Create the card component**

```typescript
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Memo = {
  id: number;
  content: string;
  discoveryCount: number;
  generatedAt: string;
};

export function LatestMemoCard() {
  const [memo, setMemo] = useState<Memo | null>(null);

  useEffect(() => {
    fetch("/api/memos?limit=1")
      .then((r) => r.json())
      .then((data) => {
        if (data.items?.length > 0) setMemo(data.items[0]);
      })
      .catch(() => {});
  }, []);

  if (!memo) return null;

  const preview = memo.content.slice(0, 300).replace(/[#*_]/g, "");
  const date = new Date(memo.generatedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Link href="/memo" className="block mb-8">
      <div className="bg-white border border-stone-border rounded-lg p-6 hover:bg-cream transition-colors">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink">
            Latest Builder Memo
          </h3>
          <span className="text-[11px] text-slate uppercase tracking-wider">
            {date} · {memo.discoveryCount} discoveries
          </span>
        </div>
        <p className="text-body text-sm line-clamp-3">{preview}...</p>
        <span className="text-ink text-[13px] font-semibold mt-3 inline-block hover:underline">
          Read full memo →
        </span>
      </div>
    </Link>
  );
}
```

**Step 2: Add it to the dashboard**

In `dashboard-content.tsx`, import `LatestMemoCard` and render it above the tab bar (before the `<div className="flex gap-1 mb-8">` block, around line 140):

```typescript
import { LatestMemoCard } from "./latest-memo-card";
```

Add in JSX before the tab bar:

```tsx
<LatestMemoCard />
```

**Step 3: Verify it renders**

Dev server should show no card when there are no memos (returns null). After a pipeline run, it should show the preview.

**Step 4: Commit**

```bash
git add src/app/components/latest-memo-card.tsx src/app/components/dashboard-content.tsx
git commit -m "feat: add latest memo preview card to dashboard"
```

---

### Task 6: Add "Memos" to header navigation

**Files:**
- Modify: `src/app/components/header.tsx`

**Step 1: Add nav item**

Update `NAV_ITEMS` array (line 7) to include Memos between Dashboard and Profile:

```typescript
const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/memo", label: "Memos" },
  { href: "/profile", label: "Profile" },
  { href: "/newsletter", label: "Newsletter" },
];
```

**Step 2: Verify**

Check that nav renders correctly, active state works on `/memo` page.

**Step 3: Commit**

```bash
git add src/app/components/header.tsx
git commit -m "feat: add Memos nav item to header"
```

---

### Task 7: Update STACK.md with pipeline Step 7 and new page

**Files:**
- Modify: `STACK.md`

**Step 1: Update pipeline section**

Add Step 7 after step 6 in the pipeline code block:

```
7. Claude Code generates ~500-word coaching memo → pipe JSON → npx tsx worker/src/save-memo.ts
```

**Step 2: Update smoke tests**

Add after test 7:

```
8. Navigate to `/memo` — memos page renders with history
9. Dashboard shows "Latest Builder Memo" card (if memos exist)
```

**Step 3: Update dev commands**

Add:

```bash
cd worker/src && npx tsx save-memo.ts          # Save memo (stdin JSON)
```

**Step 4: Commit**

```bash
git add STACK.md
git commit -m "docs: update STACK.md with memo pipeline step and smoke tests"
```

---

## Verification Checklist

After all tasks complete:

1. `npx drizzle-kit push` — schema has `builder_memos` table
2. `curl http://localhost:3000/api/memos` — returns `{"items":[],"total":0,"page":1,"limit":20}`
3. `echo '{"content":"Test memo","discoveryCount":5}' | npx tsx worker/src/save-memo.ts` — saves successfully
4. `curl http://localhost:3000/api/memos` — returns the test memo
5. `/memo` page — shows the test memo, expandable
6. Dashboard — shows "Latest Builder Memo" preview card
7. Header nav — "Memos" link present, active state works
8. Delete test memo, verify empty states render correctly
9. Full browser check via chrome-devtools MCP: load `/`, `/memo`, `/profile` — no console errors

## Pipeline Integration Note

Step 7 is NOT a script that calls Claude API. During the pipeline run, Claude Code (the session) generates the memo text directly, then pipes it as JSON to `save-memo.ts`. The memo generation prompt inputs are:
- Accepted discoveries from this run (titles, summaries, scores, URLs, tech stacks)
- Builder Profile from DB
- Past feedback (sparks/passes)
- Active project list from profile

This follows the same pattern as Step 4 (scoring) — Claude IS the AI layer.
