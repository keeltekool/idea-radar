import { getDb } from "@/lib/db-server";
import {
  sources,
  discoveries,
  builderProfile,
  builderMemos,
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

    return NextResponse.json({ error: `Unknown op: ${op}` }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
