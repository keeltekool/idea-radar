import Parser from "rss-parser";
import type { ParseResult, RawDiscovery } from "./types";

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent": "idea-radar-bot/1.0",
  },
});

export async function parseRss(feedUrl: string): Promise<ParseResult> {
  const errors: string[] = [];
  const discoveries: RawDiscovery[] = [];

  try {
    const feed = await parser.parseURL(feedUrl);

    for (const item of feed.items || []) {
      if (!item.title || !item.link) continue;

      discoveries.push({
        title: item.title,
        url: item.link,
        description: item.contentSnippet
          ? item.contentSnippet.slice(0, 500)
          : undefined,
        author: item.creator || item.author || undefined,
        publishedAt: item.isoDate ? new Date(item.isoDate) : undefined,
      });
    }
  } catch (err) {
    errors.push(
      `RSS fetch error for ${feedUrl}: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  return { discoveries, errors };
}
