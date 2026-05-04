/**
 * Takes synthesized builder profile markdown from stdin and saves to Neon.
 * Claude Code generates the profile, pipes it here.
 *
 * Expected input: { "content": "# Builder Profile\n...", "projectCount": 15 }
 */
import { config } from "dotenv";
config({ path: "../../.env.local" });

import { createDb } from "../../src/db/index";
import { builderProfile } from "../../src/db/schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

async function main() {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const input = Buffer.concat(chunks).toString("utf-8");

  let data: { content: string; projectCount: number };
  try {
    data = JSON.parse(input);
  } catch {
    console.error("Invalid JSON input");
    process.exit(1);
  }

  const db = createDb(DATABASE_URL!);

  await db.insert(builderProfile).values({
    content: data.content,
    projectCount: data.projectCount,
  });

  console.log(
    JSON.stringify({
      saved: true,
      projectCount: data.projectCount,
      generatedAt: new Date().toISOString(),
    })
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
