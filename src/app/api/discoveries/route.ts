import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db-server";
import { discoveries, sources } from "@/db/schema";
import { eq, desc, asc, sql, ilike, inArray } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const db = getDb();
  const params = req.nextUrl.searchParams;

  const status = params.get("status");
  const sourceId = params.get("source");
  const sort = params.get("sort") || "newest";
  const search = params.get("search");
  const category = params.get("category");
  const page = parseInt(params.get("page") || "1");
  const limit = parseInt(params.get("limit") || "50");
  const offset = (page - 1) * limit;

  const conditions: ReturnType<typeof eq>[] = [];

  if (status && status !== "all") {
    conditions.push(eq(discoveries.status, status as "pending" | "relevant" | "irrelevant" | "accepted" | "rejected"));
  }

  if (sourceId) {
    conditions.push(eq(discoveries.sourceId, parseInt(sourceId)));
  }

  if (search) {
    conditions.push(
      sql`(${discoveries.title} ILIKE ${"%" + search + "%"} OR ${discoveries.description} ILIKE ${"%" + search + "%"})`
    );
  }

  if (category) {
    conditions.push(sql`${category} = ANY(${discoveries.categories})`);
  }

  const orderBy =
    sort === "score"
      ? desc(discoveries.compositeScore)
      : sort === "novelty"
        ? desc(discoveries.noveltyScore)
        : sort === "stretch"
          ? desc(discoveries.stretchScore)
          : desc(discoveries.scrapedAt);

  const where =
    conditions.length > 0 ? sql.join(conditions, sql` AND `) : undefined;

  const rows = await db
    .select()
    .from(discoveries)
    .where(where)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(discoveries)
    .where(where);

  // Get source names for the response
  const sourceIds = [...new Set(rows.map((r) => r.sourceId))];
  const sourceMap = new Map<number, string>();
  if (sourceIds.length > 0) {
    const allSources = await db
      .select({ id: sources.id, name: sources.name, type: sources.type })
      .from(sources)
      .where(inArray(sources.id, sourceIds));
    for (const s of allSources) {
      sourceMap.set(s.id, s.name);
    }
  }

  const items = rows.map((r) => ({
    ...r,
    sourceName: sourceMap.get(r.sourceId) || "Unknown",
  }));

  return NextResponse.json({
    items,
    total: Number(countRow?.count || 0),
    page,
    limit,
  });
}
