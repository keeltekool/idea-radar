import { config } from "dotenv";
config({ path: "../../.env.local" });

import { createDb } from "../../src/db/index";
import { sources } from "../../src/db/schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const SEED_SOURCES = [
  {
    name: "Product Hunt",
    url: "https://api.producthunt.com/v2/api/graphql",
    type: "producthunt" as const,
    config: { limit: 50 },
  },
  {
    name: "GitHub Trending (TypeScript)",
    url: "https://api.github.com/search/repositories",
    type: "github" as const,
    config: { language: "TypeScript", minStars: 20, daysBack: 3, limit: 50 },
  },
  {
    name: "GitHub Trending (Python)",
    url: "https://api.github.com/search/repositories",
    type: "github" as const,
    config: { language: "Python", minStars: 20, daysBack: 3, limit: 50 },
  },
  {
    name: "Hacker News Show HN",
    url: "https://hn.algolia.com/api/v1/search",
    type: "hackernews" as const,
    config: { daysBack: 3, minPoints: 5, limit: 50 },
  },
  {
    name: "Dev.to showdev",
    url: "https://dev.to/api/articles",
    type: "devto" as const,
    config: { tag: "showdev", limit: 50 },
  },
  {
    name: "Dev.to sideproject",
    url: "https://dev.to/api/articles",
    type: "devto" as const,
    config: { tag: "sideproject", limit: 50, topDays: 7 },
  },
  {
    name: "Dev.to ai",
    url: "https://dev.to/api/articles",
    type: "devto" as const,
    config: { tag: "ai", limit: 50, topDays: 7 },
  },
  {
    name: "Reddit r/SideProject",
    url: "https://www.reddit.com/r/SideProject/new.json",
    type: "reddit" as const,
    config: { minScore: 3 },
  },
  {
    name: "Reddit r/webdev",
    url: "https://www.reddit.com/r/webdev/search.json?q=flair:Showoff+Saturday&sort=new&restrict_sr=1",
    type: "reddit" as const,
    config: { minScore: 3 },
  },
  {
    name: "Reddit r/nextjs",
    url: "https://www.reddit.com/r/nextjs/new.json",
    type: "reddit" as const,
    config: { minScore: 3 },
  },
  {
    name: "Lobsters Show",
    url: "https://lobste.rs/t/show.rss",
    type: "rss" as const,
    config: { feedUrl: "https://lobste.rs/t/show.rss" },
  },
  {
    name: "Medium side-project",
    url: "https://medium.com/feed/tag/side-project",
    type: "rss" as const,
    config: { feedUrl: "https://medium.com/feed/tag/side-project" },
  },
  {
    name: "Medium indie-hacking",
    url: "https://medium.com/feed/tag/indie-hacking",
    type: "rss" as const,
    config: { feedUrl: "https://medium.com/feed/tag/indie-hacking" },
  },
  {
    name: "Medium ai-tools",
    url: "https://medium.com/feed/tag/ai-tools",
    type: "rss" as const,
    config: { feedUrl: "https://medium.com/feed/tag/ai-tools" },
  },
  {
    name: "Medium buildinpublic",
    url: "https://medium.com/feed/tag/buildinpublic",
    type: "rss" as const,
    config: { feedUrl: "https://medium.com/feed/tag/buildinpublic" },
  },
];

async function main() {
  const db = createDb(DATABASE_URL!);

  console.log(`[seed] Inserting ${SEED_SOURCES.length} sources...`);

  for (const source of SEED_SOURCES) {
    await db
      .insert(sources)
      .values(source)
      .onConflictDoNothing();
    console.log(`[seed] + ${source.name}`);
  }

  console.log("[seed] Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
