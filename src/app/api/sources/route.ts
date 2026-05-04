import { NextResponse } from "next/server";
import { getDb } from "@/lib/db-server";
import { sources } from "@/db/schema";

export async function GET() {
  const db = getDb();
  const rows = await db.select().from(sources);
  return NextResponse.json(rows);
}
