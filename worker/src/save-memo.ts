import { config } from "dotenv";
config({ path: "../../.env.local" });

import { createDb } from "../../src/db/index";
import { builderMemos } from "../../src/db/schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

type MemoInput = {
  scrapeRunId: number | null;
  content: string;
  discoveryCount: number;
};

async function main() {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const input = Buffer.concat(chunks).toString("utf-8");

  let memo: MemoInput;
  try {
    memo = JSON.parse(input);
  } catch {
    console.error("Invalid JSON input");
    process.exit(1);
  }

  if (!memo.content) {
    console.error("Memo content is required");
    process.exit(1);
  }

  const db = createDb(DATABASE_URL!);

  const [inserted] = await db
    .insert(builderMemos)
    .values({
      scrapeRunId: memo.scrapeRunId || null,
      content: memo.content,
      discoveryCount: memo.discoveryCount || 0,
    })
    .returning({ id: builderMemos.id });

  console.log(JSON.stringify({ saved: true, id: inserted.id }));
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
