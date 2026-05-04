import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db-server";
import { newsletterSubscribers } from "@/db/schema";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = body.email;

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const db = getDb();

  await db
    .insert(newsletterSubscribers)
    .values({ email, active: true })
    .onConflictDoNothing();

  return NextResponse.json({ ok: true });
}
