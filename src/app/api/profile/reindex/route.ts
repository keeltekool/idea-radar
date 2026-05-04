import { NextResponse } from "next/server";
import { getDb } from "@/lib/db-server";
import { builderProfile } from "@/db/schema";
import { desc } from "drizzle-orm";

/**
 * Profile re-index is triggered from Claude Code sessions.
 * This route just returns current profile status.
 * Actual re-indexing happens via:
 *   npx tsx worker/src/scan-profile.ts → Claude synthesizes → npx tsx worker/src/save-profile.ts
 */
export async function GET() {
  const db = getDb();

  const [latest] = await db
    .select()
    .from(builderProfile)
    .orderBy(desc(builderProfile.generatedAt))
    .limit(1);

  return NextResponse.json({
    hasProfile: !!latest,
    projectCount: latest?.projectCount || 0,
    generatedAt: latest?.generatedAt?.toISOString() || null,
    message: latest
      ? "Profile exists. Trigger re-index from Claude Code session."
      : "No profile yet. Run scan-profile.ts from Claude Code to generate.",
  });
}
