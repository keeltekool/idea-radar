import { config } from "dotenv";
config({ path: "../../.env.local" });

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { sources } from "../../src/db/schema";
import { youtubeVideos } from "../../src/db/schema-youtube";
import { eq } from "drizzle-orm";
import Parser from "rss-parser";

const parser = new Parser({
  timeout: 15000,
  headers: { "User-Agent": "idea-radar-bot/1.0" },
  customFields: {
    item: [
      ["media:group", "mediaGroup"],
      ["yt:videoId", "ytVideoId"],
      ["yt:channelId", "ytChannelId"],
    ],
  },
});

interface MediaGroup {
  "media:description"?: string[];
  "media:thumbnail"?: { $: { url: string } }[];
  "media:community"?: {
    "media:starRating"?: { $: { count: string } }[];
    "media:statistics"?: { $: { views: string } }[];
  }[];
}

function extractFromMediaGroup(mg: MediaGroup | undefined) {
  if (!mg) return { description: null, thumbnailUrl: null, viewCount: null, ratingCount: null };

  const desc = mg["media:description"]?.[0] || null;
  const thumb = mg["media:thumbnail"]?.[0]?.$?.url || null;
  const community = mg["media:community"]?.[0];
  const views = community?.["media:statistics"]?.[0]?.$?.views;
  const ratings = community?.["media:starRating"]?.[0]?.$?.count;

  return {
    description: typeof desc === "string" ? desc : null,
    thumbnailUrl: thumb,
    viewCount: views ? parseInt(views, 10) : null,
    ratingCount: ratings ? parseInt(ratings, 10) : null,
  };
}

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  const ytSources = await db
    .select()
    .from(sources)
    .where(eq(sources.type, "youtube" as any));

  const activeSources = ytSources.filter((s) => s.active);
  console.log(`${activeSources.length} active YouTube sources`);

  let totalNew = 0;
  let totalSkipped = 0;
  let errors = 0;

  for (const source of activeSources) {
    const feedUrl = (source.config as any)?.feedUrl || source.url;
    try {
      const feed = await parser.parseURL(feedUrl);
      let newCount = 0;

      for (const item of feed.items || []) {
        const videoId = (item as any).ytVideoId || item.link?.match(/v=([^&]+)/)?.[1];
        if (!videoId || !item.title) continue;

        // Dedupe
        const existing = await db
          .select({ id: youtubeVideos.id })
          .from(youtubeVideos)
          .where(eq(youtubeVideos.videoId, videoId));

        if (existing.length > 0) {
          totalSkipped++;
          continue;
        }

        const media = extractFromMediaGroup((item as any).mediaGroup as MediaGroup);

        await db.insert(youtubeVideos).values({
          videoId,
          sourceId: source.id,
          title: item.title,
          description: media.description || (item as any).contentSnippet || null,
          thumbnailUrl: media.thumbnailUrl || `https://i2.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          viewCount: media.viewCount,
          ratingCount: media.ratingCount,
          channelName: source.name.replace(" YouTube", ""),
          channelId: (item as any).ytChannelId || (source.config as any)?.channelId || null,
          publishedAt: item.isoDate ? new Date(item.isoDate) : null,
          status: "pending",
        });

        newCount++;
        totalNew++;
      }

      // Update last scraped
      await db
        .update(sources)
        .set({ lastScrapedAt: new Date() })
        .where(eq(sources.id, source.id));

      console.log(`  ${source.name}: ${newCount} new, ${(feed.items || []).length - newCount} skipped`);
    } catch (err) {
      console.error(`  ${source.name}: ERROR — ${err instanceof Error ? err.message : String(err)}`);
      errors++;
    }

    // Rate limit
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(`\nDone: ${totalNew} new videos, ${totalSkipped} duplicates, ${errors} errors`);
}

main().catch(console.error);
