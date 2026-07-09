/**
 * Insert the Watch Memo for a run.
 * Usage: npx tsx worker/src/watch/save-watch-memo.ts < memo.json
 * Input: { "runId": 1, "contentMd": "..." }
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { watchMemos } from "../../../src/db/schema-watch";

const db = drizzle(neon(process.env.DATABASE_URL_EEWATCH!));

async function main() {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  const input: { runId: number; contentMd: string } = JSON.parse(
    Buffer.concat(chunks).toString("utf8"),
  );

  if (!input.runId || !input.contentMd) {
    console.error("runId and contentMd required");
    process.exit(1);
  }

  const [memo] = await db
    .insert(watchMemos)
    .values({ runId: input.runId, contentMd: input.contentMd })
    .returning({ id: watchMemos.id });

  console.log(JSON.stringify({ memoId: memo.id }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
