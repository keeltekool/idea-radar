import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db-server";
import { builderMemos } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  const [memo] = await db
    .select()
    .from(builderMemos)
    .where(eq(builderMemos.id, parseInt(id)));

  if (!memo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(memo);
}
