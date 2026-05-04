/**
 * Reads relevant (pre-filtered) discoveries from Neon for the curation loop.
 * Outputs JSON to stdout — Claude Code in the LCC loop does the actual AI scoring.
 */
import { config } from "dotenv";
config({ path: "../../.env.local" });

import { createDb } from "../../src/db/index";
import { discoveries, sources, builderProfile } from "../../src/db/schema";
import { eq, desc, inArray } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

async function main() {
  const db = createDb(DATABASE_URL!);

  const relevant = await db
    .select({
      id: discoveries.id,
      title: discoveries.title,
      url: discoveries.url,
      description: discoveries.description,
      author: discoveries.author,
      techStack: discoveries.techStack,
      stars: discoveries.stars,
      upvotes: discoveries.upvotes,
      sourceId: discoveries.sourceId,
      publishedAt: discoveries.publishedAt,
    })
    .from(discoveries)
    .where(eq(discoveries.status, "relevant"))
    .limit(100);

  if (relevant.length === 0) {
    console.log(JSON.stringify({ count: 0, discoveries: [], profile: null }));
    process.exit(0);
  }

  // Get source names
  const sourceIds = [...new Set(relevant.map((d) => d.sourceId))];
  const allSources = await db
    .select({ id: sources.id, name: sources.name })
    .from(sources)
    .where(inArray(sources.id, sourceIds));
  const sourceMap = new Map(allSources.map((s) => [s.id, s.name]));

  // Get latest builder profile
  const profileRows = await db
    .select({ content: builderProfile.content })
    .from(builderProfile)
    .orderBy(desc(builderProfile.generatedAt))
    .limit(1);

  // Get past feedback for context
  const sparkRows = await db
    .select({ title: discoveries.title })
    .from(discoveries)
    .where(eq(discoveries.userFeedback, "spark"))
    .limit(20);

  const passRows = await db
    .select({ title: discoveries.title })
    .from(discoveries)
    .where(eq(discoveries.userFeedback, "pass"))
    .limit(20);

  const output = relevant.map((d) => ({
    id: d.id,
    title: d.title,
    url: d.url,
    description: d.description,
    source: sourceMap.get(d.sourceId) || "Unknown",
    author: d.author || null,
    techStack: d.techStack || [],
    stars: d.stars,
    upvotes: d.upvotes,
    publishedAt: d.publishedAt ? d.publishedAt.toISOString() : null,
  }));

  console.log(
    JSON.stringify({
      count: output.length,
      discoveries: output,
      profile: profileRows[0]?.content || null,
      feedback: {
        sparks: sparkRows.map((r) => r.title),
        passes: passRows.map((r) => r.title),
      },
    })
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
