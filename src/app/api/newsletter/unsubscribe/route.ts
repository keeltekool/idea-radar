import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db-server";
import { newsletterSubscribers } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const db = getDb();

  await db
    .update(newsletterSubscribers)
    .set({ active: false, unsubscribedAt: new Date() })
    .where(eq(newsletterSubscribers.email, email));

  return NextResponse.json({ ok: true, message: "Unsubscribed" });
}
