import { config } from "dotenv";
config({ path: "../../.env.local" });

import { createDb } from "../../src/db/index";
import { sources, discoveries } from "../../src/db/schema";
import { eq, sql } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

async function main() {
  const db = createDb(DATABASE_URL!);

  const allSources = await db.select({ id: sources.id, name: sources.name }).from(sources);

  for (const source of allSources) {
    const [totalRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(discoveries)
      .where(eq(discoveries.sourceId, source.id));

    const [acceptedRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(discoveries)
      .where(
        sql`${discoveries.sourceId} = ${source.id} AND ${discoveries.status} = 'accepted'`
      );

    const total = Number(totalRow?.count || 0);
    const accepted = Number(acceptedRow?.count || 0);
    const rate = total > 0 ? (accepted / total) * 100 : null;

    await db
      .update(sources)
      .set({ acceptanceRate: rate })
      .where(eq(sources.id, source.id));

    if (rate !== null && rate < 5 && total >= 10) {
      console.warn(
        `[rates] WARNING: ${source.name} acceptance rate ${rate.toFixed(1)}% — consider tightening pre-filter`
      );
    }
  }

  console.log("[rates] Acceptance rates updated.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
