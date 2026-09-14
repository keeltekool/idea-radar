import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db-server";
import { youtubeVideos } from "@/db/schema-youtube";
import { eq } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const feedback = body.feedback as "spark" | "pass";

  if (!feedback || !["spark", "pass"].includes(feedback)) {
    return NextResponse.json({ error: "Invalid feedback" }, { status: 400 });
  }

  const db = getDb();
  await db
    .update(youtubeVideos)
    .set({ userFeedback: feedback })
    .where(eq(youtubeVideos.id, parseInt(id)));

  return NextResponse.json({ ok: true });
}
