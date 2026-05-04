import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db-server";
import { discoveries } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const body = await req.json();

  const feedback = body.feedback;
  if (feedback !== "spark" && feedback !== "pass") {
    return NextResponse.json(
      { error: "feedback must be 'spark' or 'pass'" },
      { status: 400 }
    );
  }

  await db
    .update(discoveries)
    .set({ userFeedback: feedback })
    .where(eq(discoveries.id, parseInt(id)));

  return NextResponse.json({ ok: true });
}
