import { NextResponse } from "next/server";
import { getDb } from "@/lib/db-server";
import { builderProfile } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  const db = getDb();

  const [latest] = await db
    .select()
    .from(builderProfile)
    .orderBy(desc(builderProfile.generatedAt))
    .limit(1);

  if (!latest) {
    return NextResponse.json({
      content: "No builder profile generated yet. Click 'Re-index My Portfolio' to create one.",
      generatedAt: null,
      projectCount: 0,
    });
  }

  return NextResponse.json(latest);
}
