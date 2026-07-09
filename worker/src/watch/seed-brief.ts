/**
 * EE AI Builders Watch — seed the living Field Brief from docs/field-brief-seed.md
 * (copy of EE-AI-Influencers-Watcher/01-estonian-ai-market-analysis.md, July 2026).
 *
 * Splits on level-2 headings into watch_brief sections. Idempotent: skips any
 * section slug that already exists — after the first seed, Neon is the operative
 * source (EUDI living_doc pattern) and this script must never overwrite it.
 * Run: npx tsx worker/src/watch/seed-brief.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { watchBrief } from "../../../src/db/schema-watch";

const db = drizzle(neon(process.env.DATABASE_URL_EEWATCH!));

const SLUG_BY_HEADING: Record<string, string> = {
  "Why this document exists": "why-this-exists",
  "The field at a glance (14 players)": "field-overview",
  "The five archetypes (and where each is weak)": "archetypes",
  "What the whole market has in common (every weakness = Egert's opening)":
    "common-weaknesses",
  "The one genuinely dangerous competitor": "dangerous-competitor",
  "Strategic conclusion (feeds directly into the offer page)":
    "strategic-conclusion",
};

async function main() {
  const raw = readFileSync(
    join(process.cwd(), "docs", "field-brief-seed.md"),
    "utf8",
  );

  // Split on level-2 headings; chunk 0 is the doc preamble (title + intro note).
  const chunks = raw.split(/\n(?=## )/);
  const rows: Array<{ section: string; contentMd: string; position: number }> =
    [];

  rows.push({
    section: "meta",
    contentMd:
      "> **Last scan run:** never — baseline pending.\n\n_Seeded from 01-estonian-ai-market-analysis.md (July 2026). Neon is the operative source from here on; scan runs apply surgical edits only._",
    position: 0,
  });

  let pos = 1;
  for (const chunk of chunks.slice(1)) {
    const heading = chunk.match(/^## (.+)$/m)?.[1]?.trim() ?? "";
    const slug = SLUG_BY_HEADING[heading];
    if (!slug) continue; // separator-only or unknown chunks are skipped
    rows.push({ section: slug, contentMd: chunk.trim(), position: pos++ });
  }

  rows.push({
    section: "recent-changes",
    contentMd:
      "## Recent Changes\n\n*No scan-driven changes yet. Baseline compiled July 2026; first scan pending.*",
    position: pos++,
  });
  rows.push({
    section: "changelog",
    contentMd: `## Changelog\n\n- ${new Date().toISOString().slice(0, 10)} — Field Brief seeded from the July 2026 market analysis (14 core players + long tail).`,
    position: pos++,
  });

  let inserted = 0;
  for (const row of rows) {
    const res = await db
      .insert(watchBrief)
      .values(row)
      .onConflictDoNothing({ target: watchBrief.section })
      .returning({ id: watchBrief.id });
    inserted += res.length;
  }

  console.log(JSON.stringify({ sections: rows.length, inserted }));
  if (inserted !== rows.length) {
    console.log(
      "Some sections already existed and were left untouched (expected on re-run).",
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
