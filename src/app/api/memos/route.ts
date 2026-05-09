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
