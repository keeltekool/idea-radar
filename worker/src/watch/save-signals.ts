/**
 * Insert per-player signal profiles for a run.
 * Usage: npx tsx worker/src/watch/save-signals.ts < signals.json
 * Input: { "runId": 1, "profiles": [{ "playerSlug": "...", "signals": {...}, "diffSummary": "..." }] }
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { watchSignals, type SignalProfile } from "../../../src/db/schema-watch";

const db = drizzle(neon(process.env.DATABASE_URL_EEWATCH!));

type Input = {
  runId: number;
  profiles: Array<{
    playerSlug: string;
    signals: SignalProfile;
    diffSummary?: string;
  }>;
};

async function main() {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  const input: Input = JSON.parse(Buffer.concat(chunks).toString("utf8"));

  if (!input.runId || !Array.isArray(input.profiles)) {
    console.error("runId and profiles[] required");
    process.exit(1);
  }

  let inserted = 0;
  for (const p of input.profiles) {
    if (!p.playerSlug || !p.signals) continue;
    await db.insert(watchSignals).values({
      playerSlug: p.playerSlug,
      runId: input.runId,
      signals: p.signals,
      diffSummary: p.diffSummary ?? null,
    });
    inserted++;
  }
  console.log(JSON.stringify({ inserted }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
