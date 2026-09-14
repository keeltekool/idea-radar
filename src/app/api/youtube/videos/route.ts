import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db-server";
import { youtubeVideos } from "@/db/schema-youtube";
import { sources } from "@/db/schema";
import { eq, desc, sql, inArray } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const db = getDb();
  const params = req.nextUrl.searchParams;

  const status = params.get("status");
  const sourceId = params.get("source");
  const sort = params.get("sort") || "newest";
  const search = params.get("search");
  const page = parseInt(params.get("page") || "1");
  const limit = parseInt(params.get("limit") || "50");
  const offset = (page - 1) * limit;

  const conditions: ReturnType<typeof eq>[] = [];

  if (status && status !== "all") {
    conditions.push(
      eq(youtubeVideos.status, status as "pending" | "filtered" | "accepted" | "skipped")
    );
  }

  if (sourceId) {
    conditions.push(eq(youtubeVideos.sourceId, parseInt(sourceId)));
  }

  if (search) {
    conditions.push(
      sql`(${youtubeVideos.title} ILIKE ${"%" + search + "%"} OR ${youtubeVideos.description} ILIKE ${"%" + search + "%"})`
    );
  }

  const orderBy =
    sort === "score"
      ? desc(youtubeVideos.score)
      : sort === "views"
        ? desc(youtubeVideos.viewCount)
        : desc(youtubeVideos.publishedAt);

  const where =
    conditions.length > 0 ? sql.join(conditions, sql` AND `) : undefined;

  const rows = await db
    .select({
      id: youtubeVideos.id,
      videoId: youtubeVideos.videoId,
      title: youtubeVideos.title,
      description: youtubeVideos.description,
      thumbnailUrl: youtubeVideos.thumbnailUrl,
      viewCount: youtubeVideos.viewCount,
      ratingCount: youtubeVideos.ratingCount,
      channelName: youtubeVideos.channelName,
      publishedAt: youtubeVideos.publishedAt,
      status: youtubeVideos.status,
      score: youtubeVideos.score,
      verdict: youtubeVideos.verdict,
      takeaway: youtubeVideos.takeaway,
      buildSuggestion: youtubeVideos.buildSuggestion,
      tags: youtubeVideos.tags,
      extractedTools: youtubeVideos.extractedTools,
      userFeedback: youtubeVideos.userFeedback,
      sourceId: youtubeVideos.sourceId,
      scoredAt: youtubeVideos.scoredAt,
    })
    .from(youtubeVideos)
    .where(where)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(youtubeVideos)
    .where(where);

  return NextResponse.json({
    items: rows,
    total: Number(countRow?.count || 0),
    page,
    limit,
  });
}
