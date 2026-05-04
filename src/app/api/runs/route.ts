import { NextResponse } from "next/server";
import { getDb } from "@/lib/db-server";
import { scrapeRuns } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  const db = getDb();
  const rows = await db
    .select()
    .from(scrapeRuns)
    .orderBy(desc(scrapeRuns.startedAt))
    .limit(20);
  return NextResponse.json(rows);
}
