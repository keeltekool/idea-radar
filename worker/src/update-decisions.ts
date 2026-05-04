/**
 * Takes JSON curation decisions from stdin and writes them to Neon.
 * Claude Code in the LCC loop pipes scored decisions here.
 *
 * Expected input format:
 * {
 *   "decisions": [
 *     { "id": 1, "status": "accepted", "feasibility": 8, "novelty": 9, "stretch": 7, "composite": 8.2, "summary": "...", "categories": ["saas"], "isWildcard": false },
 *     { "id": 2, "status": "rejected", "reason": "tutorial" }
 *   ]
 * }
 */
import { config } from "dotenv";
config({ path: "../../.env.local" });

import { createDb } from "../../src/db/index";
import { discoveries } from "../../src/db/schema";
import { eq } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

type Decision = {
  id: number;
  status: "accepted" | "rejected";
  feasibility?: number;
  novelty?: number;
  stretch?: number;
  composite?: number;
  summary?: string;
  categories?: string[];
  reason?: string;
  isWildcard?: boolean;
};

async function main() {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const input = Buffer.concat(chunks).toString("utf-8");

  let decisions: Decision[];
  try {
    const parsed = JSON.parse(input);
    decisions = parsed.decisions;
  } catch {
    console.error("Invalid JSON input");
    process.exit(1);
  }

  if (!decisions || decisions.length === 0) {
    console.log("No decisions to process.");
    process.exit(0);
  }

  const db = createDb(DATABASE_URL!);

  let accepted = 0;
  let rejected = 0;
  let errors = 0;

  for (const d of decisions) {
    try {
      if (d.status === "accepted") {
        await db
          .update(discoveries)
          .set({
            status: "accepted",
            feasibilityScore: d.feasibility || null,
            noveltyScore: d.novelty || null,
            stretchScore: d.stretch || null,
            compositeScore: d.composite || null,
            summary: d.summary || null,
            categories: d.categories || [],
            isWildcard: d.isWildcard || false,
          })
          .where(eq(discoveries.id, d.id));
        accepted++;
      } else {
        await db
          .update(discoveries)
          .set({
            status: "rejected",
            rejectionReason: d.reason || "Below threshold",
          })
          .where(eq(discoveries.id, d.id));
        rejected++;
      }
    } catch (err) {
      console.error(`Failed to update discovery ${d.id}:`, err);
      errors++;
    }
  }

  console.log(
    JSON.stringify({ accepted, rejected, errors, total: decisions.length })
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
