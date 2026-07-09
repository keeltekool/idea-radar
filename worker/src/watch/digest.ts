/**
 * Print a condensed per-player digest of the latest snapshots so the
 * in-session analysis never has to load full page dumps.
 * Usage: npx tsx worker/src/watch/digest.ts [playerSlug ...]
 * Default: all players. Per page: URL + theme + first N chars of content.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_EEWATCH!);
const CHARS_HOME = 1600;
const CHARS_OTHER = 600;

async function main() {
  const only = process.argv.slice(2);
  const players = (await sql`
    SELECT slug, name, archetype FROM watch_players WHERE active ORDER BY id
  `) as Array<{ slug: string; name: string; archetype: string }>;

  for (const p of players) {
    if (only.length && !only.includes(p.slug)) continue;
    const pages = (await sql`
      SELECT s.url, s.theme, s.last_status,
             (SELECT sn.content_md FROM snapshots sn
              WHERE sn.source_id = s.id ORDER BY sn.scraped_at DESC LIMIT 1) AS content
      FROM sources s WHERE s.competitor = ${p.slug} AND s.active
      ORDER BY CASE s.theme WHEN 'home' THEN 0 WHEN 'services' THEN 1 WHEN 'pricing' THEN 2 ELSE 3 END, s.id
    `) as Array<{ url: string; theme: string; last_status: string | null; content: string | null }>;

    console.log(`\n===== ${p.slug} (${p.archetype}) — ${p.name} =====`);
    for (const pg of pages) {
      const cap = pg.theme === "home" || pg.theme === "services" ? CHARS_HOME : CHARS_OTHER;
      const body = (pg.content ?? "").replace(/\n+/g, " ¶ ").slice(0, cap);
      console.log(`\n--- [${pg.theme}] ${pg.url} (${pg.last_status ?? "?"})`);
      console.log(body || "(no snapshot)");
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
