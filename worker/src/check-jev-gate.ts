/**
 * Self-check for the Jev pre-filter gate (live API, 3 calls, < $0.001).
 * Run: cd worker/src && npx tsx check-jev-gate.ts (dotenv resolves ../../.env.local from the cwd)
 */
import { config } from "dotenv";
config({ path: "../../.env.local" });

import assert from "node:assert/strict";
import { createDb } from "../../src/db/index";
import { builderProfile } from "../../src/db/schema";
import { desc } from "drizzle-orm";
import { jevScore, JEV_THRESHOLD, type GateItem } from "./jev-gate";

// Two real Idea Radar items, inlined so a purged DB row can't break the check.
const BUILT: GateItem = {
  title: "I built a private “where did I see that page?”", // Opus accepted (7.6)
  description: "Local-first, on-device search over your own browsing history. No cloud, no account, no tracking. And the whole thing — idea, research…\nContinue reading on Medium »",
  source: "Medium buildinpublic",
  stars: null,
  upvotes: null,
};
const ARTICLE: GateItem = {
  title: "Custom Software vs Off-the-Shelf Software: Which Is Better for Your Business?",
  description: "When a business reaches a pivotal growth stage, technology decisions quickly move from minor administrative tasks to core strategic…\nContinue reading on Medium »",
  source: "Medium saas",
  stars: null,
  upvotes: null,
};

async function main() {
  const db = createDb(process.env.DATABASE_URL!);
  const [{ content: profile }] = await db.select({ content: builderProfile.content }).from(builderProfile).orderBy(desc(builderProfile.generatedAt)).limit(1);

  assert.equal(await jevScore("apikey_invalid", profile, BUILT), null, "a rejected key must return null (keyword fallback)");

  const key = process.env.TYPESAFE_API_KEY!;
  const built = await jevScore(key, profile, BUILT);
  const article = await jevScore(key, profile, ARTICLE);
  console.log({ built, article, threshold: JEV_THRESHOLD });
  assert.ok(built !== null && built >= JEV_THRESHOLD, "a shipped product must pass");
  assert.ok(article !== null && article < JEV_THRESHOLD, "a generic article must be dropped");
  console.log("jev-gate: all checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
