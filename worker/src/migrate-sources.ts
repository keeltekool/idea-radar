import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../../.env.local") });

import { createDb } from "../../src/db/index";
import { sources } from "../../src/db/schema";
import { eq, inArray } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const DEACTIVATE = [
  "GitHub Trending (TypeScript)",
  "GitHub Trending (Python)",
  "Lobsters Show",
  "Dev.to ai",
  "Reddit r/webdev",
  "Reddit r/nextjs",
  "Medium ai-tools",
];

const NEW_SOURCES = [
  {
    name: "Product Hunt",
    url: "https://www.producthunt.com/feed",
    type: "rss" as const,
    config: { feedUrl: "https://www.producthunt.com/feed" },
  },
  {
    name: "HN Launch HN",
    url: "https://hn.algolia.com/api/v1/search_by_date",
    type: "hackernews" as const,
    config: { query: "Launch HN", tags: "story", daysBack: 14, minPoints: 5, limit: 30 },
  },
  {
    name: "Reddit r/InternetIsBeautiful",
    url: "https://www.reddit.com/r/InternetIsBeautiful/hot/.rss",
    type: "rss" as const,
    config: { feedUrl: "https://www.reddit.com/r/InternetIsBeautiful/hot/.rss" },
  },
  {
    name: "Reddit r/microsaas",
    url: "https://www.reddit.com/r/microsaas/hot/.rss",
    type: "rss" as const,
    config: { feedUrl: "https://www.reddit.com/r/microsaas/hot/.rss" },
  },
  {
    name: "Reddit r/indiebiz",
    url: "https://www.reddit.com/r/indiebiz/hot/.rss",
    type: "rss" as const,
    config: { feedUrl: "https://www.reddit.com/r/indiebiz/hot/.rss" },
  },
  {
    name: "Kicktraq Technology",
    url: "https://www.kicktraq.com/categories/technology/latest.rss",
    type: "rss" as const,
    config: { feedUrl: "https://www.kicktraq.com/categories/technology/latest.rss" },
  },
  {
    name: "Greg Isenberg YouTube",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCPjNBjflYl0-HQtUvOx0Ibw",
    type: "rss" as const,
    config: { feedUrl: "https://www.youtube.com/feeds/videos.xml?channel_id=UCPjNBjflYl0-HQtUvOx0Ibw" },
  },
];

async function main() {
  const db = createDb(DATABASE_URL!);

  // Deactivate developer-technical sources
  console.log("\n[migrate] Deactivating developer sources:");
  for (const name of DEACTIVATE) {
    const result = await db
      .update(sources)
      .set({ active: false })
      .where(eq(sources.name, name))
      .returning({ id: sources.id, name: sources.name });
    if (result.length > 0) {
      console.log(`  OFF: ${name}`);
    } else {
      console.log(`  SKIP: ${name} (not found)`);
    }
  }

  // Update existing Product Hunt to use RSS instead of GraphQL
  const [existingPH] = await db
    .select()
    .from(sources)
    .where(eq(sources.name, "Product Hunt"));
  if (existingPH) {
    await db
      .update(sources)
      .set({
        url: "https://www.producthunt.com/feed",
        type: "rss",
        config: { feedUrl: "https://www.producthunt.com/feed" },
        active: true,
      })
      .where(eq(sources.id, existingPH.id));
    console.log("\n[migrate] Updated Product Hunt: GraphQL → RSS (no auth needed)");
  }

  // Also update existing Reddit r/SideProject to use RSS
  const [existingRP] = await db
    .select()
    .from(sources)
    .where(eq(sources.name, "Reddit r/SideProject"));
  if (existingRP) {
    await db
      .update(sources)
      .set({
        url: "https://www.reddit.com/r/SideProject/hot/.rss",
        type: "rss",
        config: { feedUrl: "https://www.reddit.com/r/SideProject/hot/.rss" },
      })
      .where(eq(sources.id, existingRP.id));
    console.log("[migrate] Updated Reddit r/SideProject: JSON → RSS (more reliable)");
  }

  // Seed new sources (skip Product Hunt since we updated the existing one)
  const toSeed = NEW_SOURCES.filter(s => s.name !== "Product Hunt");
  console.log(`\n[migrate] Seeding ${toSeed.length} new sources:`);
  for (const source of toSeed) {
    await db
      .insert(sources)
      .values(source)
      .onConflictDoNothing();
    console.log(`  ADD: ${source.name}`);
  }

  // Summary
  const all = await db.select().from(sources);
  const active = all.filter(s => s.active);
  console.log(`\n[migrate] Done. ${active.length} active / ${all.length} total sources.`);
  console.log("Active sources:");
  for (const s of active.sort((a, b) => a.name.localeCompare(b.name))) {
    console.log(`  ${s.name} (${s.type})`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
