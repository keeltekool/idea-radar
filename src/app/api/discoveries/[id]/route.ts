import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db-server";
import { discoveries, sources } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  const [row] = await db
    .select()
    .from(discoveries)
    .where(eq(discoveries.id, parseInt(id)));

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [source] = await db
    .select({ name: sources.name, type: sources.type })
    .from(sources)
    .where(eq(sources.id, row.sourceId));

  return NextResponse.json({
    ...row,
    sourceName: source?.name || "Unknown",
    sourceType: source?.type || "unknown",
  });
}
