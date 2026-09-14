import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db-server";
import { youtubeMemos } from "@/db/schema-youtube";
import { desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const db = getDb();
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20");

  const memos = await db
    .select()
    .from(youtubeMemos)
    .orderBy(desc(youtubeMemos.generatedAt))
    .limit(limit);

  return NextResponse.json({ items: memos });
}
