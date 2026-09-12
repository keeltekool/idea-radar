import { getDb } from "@/lib/db-server";
import {
  sources,
  discoveries,
  builderProfile,
  builderMemos,
  newsletterSubscribers,
} from "@/db/schema";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { passesPreFilter } from "@/lib/filter-terms";

/**
 * Loop API — token-guarded endpoints for the Idea Radar cloud routine.
 * Mirrors EUDI Wallet Tracker pattern: routine never needs DATABASE_URL,
 * all DB access goes through these endpoints with Bearer LOOP_TOKEN.
 *
 * GET ops: filter, get-relevant, status
 * POST ops: filter-decisions, score-decisions, update-rates, save-memo
 */

function unauthorized(req: Request) {
  const token = process.env.LOOP_TOKEN;
  if (!token)
    return NextResponse.json(
      { error: "LOOP_TOKEN not configured" },
      { status: 500 }
    );
  if (req.headers.get("authorization") !== `Bearer ${token}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}

async function sourceNameMap(db: ReturnType<typeof getDb>, ids: number[]) {
  if (ids.length === 0) return new Map<number, string>();
  const rows = await db
    .select({ id: sources.id, name: sources.name })
    .from(sources)
    .where(inArray(sources.id, ids));
  return new Map(rows.map((r) => [r.id, r.name]));
}

export async function GET(req: Request) {
  const denied = unauthorized(req);
  if (denied) return denied;

  const db = getDb();
  const url = new URL(req.url);
  const op = url.searchParams.get("op");

  try {
    // Return pending discoveries for the filter step
    if (op === "filter") {
      const pending = await db
        .select({
          id: discoveries.id,
          title: discoveries.title,
          description: discoveries.description,
          sourceId: discoveries.sourceId,
        })
        .from(discoveries)
        .where(eq(discoveries.status, "pending"))
        .limit(500);

      const names = await sourceNameMap(
        db,
        pending.map((p) => p.sourceId)
      );

      return NextResponse.json({
        count: pending.length,
        items: pending.map((p) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          source: names.get(p.sourceId) || "Unknown",
        })),
      });
    }

    // Return relevant discoveries + builder profile for AI scoring
    if (op === "get-relevant") {
      const relevant = await db
        .select({
          id: discoveries.id,
          title: discoveries.title,
          description: discoveries.description,
          url: discoveries.url,
          author: discoveries.author,
          upvotes: discoveries.upvotes,
          stars: discoveries.stars,
          sourceId: discoveries.sourceId,
        })
        .from(discoveries)
        .where(eq(discoveries.status, "relevant"))
        .limit(200);

      const names = await sourceNameMap(
        db,
        relevant.map((r) => r.sourceId)
      );

      const [profile] = await db
        .select({ content: builderProfile.content })
        .from(builderProfile)
        .orderBy(desc(builderProfile.generatedAt))
        .limit(1);

      return NextResponse.json({
        count: relevant.length,
        items: relevant.map((r) => ({
          ...r,
          sourceId: undefined,
          source: names.get(r.sourceId) || "Unknown",
        })),
        builderProfile: profile?.content || null,
      });
    }

    // Health check / status
    if (op === "status" || !op) {
      const [counts] = await db
        .select({
          total: sql<number>`count(*)::int`,
          pending: sql<number>`count(*) filter (where status = 'pending')::int`,
          relevant: sql<number>`count(*) filter (where status = 'relevant')::int`,
          accepted: sql<number>`count(*) filter (where status = 'accepted')::int`,
          rejected: sql<number>`count(*) filter (where status = 'rejected')::int`,
        })
        .from(discoveries);

      const [sourceCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(sources)
        .where(eq(sources.active, true));

      const [lastMemo] = await db
        .select({
          id: builderMemos.id,
          generatedAt: builderMemos.generatedAt,
          discoveryCount: builderMemos.discoveryCount,
        })
        .from(builderMemos)
        .orderBy(desc(builderMemos.generatedAt))
        .limit(1);

      return NextResponse.json({
        status: "ok",
        sources: sourceCount.count,
        discoveries: counts,
        lastMemo: lastMemo || null,
      });
    }

    return NextResponse.json({ error: `Unknown op: ${op}` }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const denied = unauthorized(req);
  if (denied) return denied;

  const db = getDb();

  try {
    const body = await req.json();
    const { op } = body;

    // Write filter decisions (relevant / irrelevant)
    if (op === "filter-decisions") {
      const decisions: { id: number; status: string }[] = body.decisions || [];
      let relevant = 0;
      let irrelevant = 0;

      for (const d of decisions) {
        if (d.status !== "relevant" && d.status !== "irrelevant") continue;
        await db
          .update(discoveries)
          .set({ status: d.status as "relevant" | "irrelevant" })
          .where(eq(discoveries.id, d.id));
        if (d.status === "relevant") relevant++;
        else irrelevant++;
      }

      return NextResponse.json({ relevant, irrelevant, total: relevant + irrelevant });
    }

    // Apply pre-filter server-side (alternative to routine doing it)
    if (op === "run-filter") {
      const pending = await db
        .select({
          id: discoveries.id,
          title: discoveries.title,
          description: discoveries.description,
        })
        .from(discoveries)
        .where(eq(discoveries.status, "pending"));

      let relevant = 0;
      let irrelevant = 0;

      for (const item of pending) {
        const passes = passesPreFilter(item.title, item.description);
        await db
          .update(discoveries)
          .set({ status: passes ? "relevant" : "irrelevant" })
          .where(eq(discoveries.id, item.id));
        if (passes) relevant++;
        else irrelevant++;
      }

      return NextResponse.json({ total: pending.length, relevant, irrelevant });
    }

    // Write AI scoring decisions (accepted / rejected with scores)
    if (op === "score-decisions") {
      const decisions: {
        id: number;
        status: "accepted" | "rejected";
        track?: "novel" | "familiar";
        feasibility?: number;
        novelty?: number;
        stretch?: number;
        traction?: number;
        relevance?: number;
        improvability?: number;
        composite?: number;
        summary?: string;
        categories?: string[];
        isWildcard?: boolean;
        reason?: string;
      }[] = body.decisions || [];

      let accepted = 0;
      let rejected = 0;

      for (const d of decisions) {
        if (d.status === "accepted") {
          await db
            .update(discoveries)
            .set({
              status: "accepted",
              track: d.track || "novel",
              feasibilityScore: d.feasibility ?? null,
              noveltyScore: d.novelty ?? null,
              stretchScore: d.stretch ?? null,
              tractionScore: d.traction ?? null,
              relevanceScore: d.relevance ?? null,
              improvabilityScore: d.improvability ?? null,
              compositeScore: d.composite ?? null,
              summary: d.summary || null,
              categories: d.categories || [],
              isWildcard: d.isWildcard || false,
            })
            .where(eq(discoveries.id, d.id));
          accepted++;
        } else {
          await db
            .update(discoveries)
            .set({
              status: "rejected",
              rejectionReason: d.reason || "rejected",
            })
            .where(eq(discoveries.id, d.id));
          rejected++;
        }
      }

      return NextResponse.json({ accepted, rejected, total: accepted + rejected });
    }

    // Recalculate per-source acceptance rates
    if (op === "update-rates") {
      const activeSources = await db
        .select({ id: sources.id })
        .from(sources)
        .where(eq(sources.active, true));

      for (const source of activeSources) {
        const [total] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(discoveries)
          .where(eq(discoveries.sourceId, source.id));

        const [accepted] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(discoveries)
          .where(
            and(
              eq(discoveries.sourceId, source.id),
              eq(discoveries.status, "accepted")
            )
          );

        const rate =
          total.count > 0 ? (accepted.count / total.count) * 100 : null;

        await db
          .update(sources)
          .set({ acceptanceRate: rate })
          .where(eq(sources.id, source.id));
      }

      return NextResponse.json({ updated: activeSources.length });
    }

    // Save a builder memo
    if (op === "save-memo") {
      const { content, discoveryCount } = body as {
        content: string;
        discoveryCount: number;
        op: string;
      };

      if (!content) {
        return NextResponse.json(
          { error: "content required" },
          { status: 400 }
        );
      }

      const [memo] = await db
        .insert(builderMemos)
        .values({ content, discoveryCount: discoveryCount || 0 })
        .returning({ id: builderMemos.id });

      return NextResponse.json({ saved: true, memoId: memo.id });
    }

    // Send newsletter — AI-written coaching brief, not a link dump
    if (op === "send-newsletter") {
      const resendKey = (process.env.RESEND_API_KEY || "")
        .split("")
        .filter((c) => c.charCodeAt(0) < 128)
        .join("")
        .trim();
      if (!resendKey) {
        return NextResponse.json(
          { error: "RESEND_API_KEY not configured" },
          { status: 500 }
        );
      }

      const nl = body.newsletter as {
        subject: string;
        paragraphs: string[];
        stats: { total: number; accepted: number; push: number; levelUp: number };
        references: { title: string; url: string }[];
      };

      if (!nl?.paragraphs?.length) {
        return NextResponse.json(
          { error: "newsletter requires paragraphs" },
          { status: 400 }
        );
      }

      const esc = (s: string) =>
        s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

      const linkify = (text: string, refs: { title: string; url: string }[]) => {
        let html = esc(text);
        for (const ref of refs) {
          const escaped = esc(ref.title);
          html = html.replace(
            escaped,
            `<a href="${esc(ref.url)}" style="color:#4B6344;text-decoration:underline">${escaped}</a>`
          );
        }
        return html;
      };

      const bodyHtml = nl.paragraphs
        .map((p) =>
          `<p style="font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.75;color:#C8C4BC;margin:0 0 20px">${linkify(p, nl.references || [])}</p>`
        )
        .join("\n");

      const renderHtml = (unsubUrl: string) =>
        `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#0d0d0d;margin:0;padding:0">
<div style="max-width:540px;margin:0 auto;padding:48px 24px">

<p style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;color:#F9F8F6;text-align:center;margin:0 0 4px;letter-spacing:-0.5px">Idea Radar</p>
<p style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#75726A;text-align:center;margin:0 0 36px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">Growth Compass</p>

<div style="border-top:1px solid #2a2a2a;margin:0 0 32px"></div>

<div style="background:#111;padding:10px 16px;margin:0 0 28px;text-align:center">
<span style="color:#75726A;font-size:9px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;letter-spacing:1.5px;text-transform:uppercase">${nl.stats.total} screened &middot; ${nl.stats.accepted} scored &middot; ${nl.stats.push} push &middot; ${nl.stats.levelUp} level up</span>
</div>

${bodyHtml}

<div style="text-align:center;margin:32px 0 0">
<a href="https://idea-radar-topaz.vercel.app" style="display:inline-block;background:#4B6344;color:#F9F8F6;font-size:11px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:14px 40px;text-decoration:none">Open the Radar</a>
</div>

<div style="border-top:1px solid #1a1a1a;margin:36px 0 0;padding:20px 0 0;text-align:center">
<p style="color:#444;font-size:10px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;margin:0">Twice weekly from Idea Radar</p>
<p style="margin:6px 0 0"><a href="${esc(unsubUrl)}" style="color:#444;font-size:10px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;text-decoration:underline">Unsubscribe</a></p>
</div>

</div></body></html>`;

      const subs = await db
        .select()
        .from(newsletterSubscribers)
        .where(eq(newsletterSubscribers.active, true));

      if (subs.length === 0) {
        return NextResponse.json({ sent: 0, reason: "No active subscribers" });
      }

      let sent = 0;
      const errs: string[] = [];

      for (const sub of subs) {
        const unsubUrl = `https://idea-radar-topaz.vercel.app/api/newsletter/unsubscribe?email=${encodeURIComponent(sub.email)}`;
        const html = renderHtml(unsubUrl);

        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Idea Radar <onboarding@resend.dev>",
              to: sub.email,
              subject: nl.subject,
              html,
            }),
          });

          if (!res.ok) {
            const errBody = await res.text();
            errs.push(`${sub.email}: ${res.status} ${errBody}`);
          } else {
            sent++;
          }
        } catch (e) {
          errs.push(`${sub.email}: ${String(e)}`);
        }
      }

      return NextResponse.json({
        sent,
        errors: errs.length,
        total: subs.length,
        ...(errs.length > 0 && { errorDetails: errs }),
      });
    }

    return NextResponse.json({ error: `Unknown op: ${op}` }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
