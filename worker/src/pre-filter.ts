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

const REQUIRED_TERMS = [
  "ai",
  "built",
  "ship",
  "launch",
  "saas",
  "side project",
  "sideproject",
  "indie",
  "solo",
  "tool",
  "app",
  "platform",
  "dashboard",
  "automat",
  "startup",
  "maker",
  "developer tool",
  "open source",
];

const BLOCKED_TERMS = [
  "tutorial",
  "course",
  "beginner",
  "how to",
  "introduction to",
  "getting started",
  "boilerplate",
  "template repo",
  "awesome-list",
  "cheat sheet",
  "interview prep",
  "learn ",
  "roadmap to",
  "study guide",
];

function passesPreFilter(title: string, description: string | null): boolean {
  const text = `${title} ${description || ""}`.toLowerCase();

  const hasBlocked = BLOCKED_TERMS.some((term) => text.includes(term));
  if (hasBlocked) return false;

  const hasRequired = REQUIRED_TERMS.some((term) => text.includes(term));
  return hasRequired;
}

async function main() {
  const db = createDb(DATABASE_URL!);

  const pending = await db
    .select({
      id: discoveries.id,
      title: discoveries.title,
      description: discoveries.description,
    })
    .from(discoveries)
    .where(eq(discoveries.status, "pending"));

  if (pending.length === 0) {
    console.log(JSON.stringify({ total: 0, relevant: 0, irrelevant: 0 }));
    process.exit(0);
  }

  let relevant = 0;
  let irrelevant = 0;

  for (const item of pending) {
    const passes = passesPreFilter(item.title, item.description);

    await db
      .update(discoveries)
      .set({ status: passes ? "relevant" : "irrelevant" })
      .where(eq(discoveries.id, item.id));

    if (passes) relevant++;
    else irrelevant++;
  }

  console.log(
    JSON.stringify({
      total: pending.length,
      relevant,
      irrelevant,
    })
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
