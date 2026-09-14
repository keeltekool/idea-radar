import { NextResponse } from "next/server";
import { getDb } from "@/lib/db-server";
import { sources } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET() {
  const db = getDb();
  const rows = await db
    .select()
    .from(sources)
    .where(sql`${sources.type} != 'youtube'`);
  return NextResponse.json(rows);
}
