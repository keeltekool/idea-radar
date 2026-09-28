import { config } from "dotenv";
config({ path: "../../.env.local" });

import { createDb } from "../../src/db/index";
import { discoveries, sources, builderProfile } from "../../src/db/schema";
import { desc, eq } from "drizzle-orm";
import { passesPreFilter } from "../../src/lib/filter-terms";
import { jevScore, JEV_THRESHOLD } from "./jev-gate";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}
const TYPESAFE_API_KEY = process.env.TYPESAFE_API_KEY; // absent → keyword gate for every item (rollback path)
const CONCURRENCY = 5; // TypeSafe allows 1,200 requests/min; ~0.3 s per call

async function main() {
  const db = createDb(DATABASE_URL!);

  const pending = await db
    .select({
      id: discoveries.id,
      title: discoveries.title,
      description: discoveries.description,
      stars: discoveries.stars,
      upvotes: discoveries.upvotes,
      source: sources.name,
    })
    .from(discoveries)
    .leftJoin(sources, eq(sources.id, discoveries.sourceId))
    .where(eq(discoveries.status, "pending"));

  // Jev judges each item against the same Builder Profile the scoring routine reads (ai-pass.ts).
  const [profile] = await db.select({ content: builderProfile.content }).from(builderProfile).orderBy(desc(builderProfile.generatedAt)).limit(1);

  let relevant = 0;
  let irrelevant = 0;
  let keywordFallback = 0;
  // A null score already means 4 failed attempts, so treat Jev as down for the rest of the run instead of
  // paying the retry budget per item (the job has a 10-minute cap).
  let jevDown = !TYPESAFE_API_KEY || !profile;

  const queue = [...pending];
  async function worker() {
    while (queue.length) {
      const item = queue.shift()!;
      const score = jevDown ? null : await jevScore(TYPESAFE_API_KEY!, profile.content, item);
      if (score === null) {
        jevDown = true;
        keywordFallback++;
      }
      const passes = score === null ? passesPreFilter(item.title, item.description) : score >= JEV_THRESHOLD;

      await db
        .update(discoveries)
        .set({ status: passes ? "relevant" : "irrelevant", jevScore: score })
        .where(eq(discoveries.id, item.id));

      if (passes) relevant++;
      else irrelevant++;
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  if (TYPESAFE_API_KEY && keywordFallback > 0) {
    console.log(`::warning::Jev gate failed; ${keywordFallback} of ${pending.length} items used the keyword gate`);
  }
  console.log(
    JSON.stringify({
      total: pending.length,
      relevant,
      irrelevant,
      keywordFallback,
    })
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
