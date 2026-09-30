import Parser from "rss-parser";
import type { ParseResult, RawDiscovery } from "./types";

const UA = "idea-radar-bot/1.0";

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent": UA,
  },
});

// Reddit lets one unauthenticated request per ~60 s window through from a runner's IP (x-ratelimit-used 1,
// remaining 0; measured from GitHub Actions 2026-09-30), so every Reddit feed after the first got 429. On 429,
// wait out the window (x-ratelimit-reset seconds) and retry, at most twice.
async function fetchRedditFeed(feedUrl: string): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(feedUrl, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15000) });
    if (res.status === 429 && attempt < 2) {
      const wait = Math.min(Number(res.headers.get("x-ratelimit-reset") ?? res.headers.get("retry-after")) || 60, 90);
      await new Promise((r) => setTimeout(r, (wait + 1) * 1000));
      continue;
    }
    if (!res.ok) throw new Error(`Status code ${res.status}`);
    return res.text();
  }
}

export async function parseRss(feedUrl: string): Promise<ParseResult> {
  const errors: string[] = [];
  const discoveries: RawDiscovery[] = [];

  try {
    const feed = /^https:\/\/(www\.|old\.)?reddit\.com\//.test(feedUrl)
      ? await parser.parseString(await fetchRedditFeed(feedUrl))
      : await parser.parseURL(feedUrl);

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
