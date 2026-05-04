import type { ParseResult, RawDiscovery } from "./types";

export async function parseReddit(
  sourceUrl: string,
  config: Record<string, unknown>
): Promise<ParseResult> {
  const errors: string[] = [];
  const discoveries: RawDiscovery[] = [];

  const minScore = (config.minScore as number) || 3;

  const jsonUrl = sourceUrl.endsWith(".json")
    ? sourceUrl
    : `${sourceUrl}.json`;

  const finalUrl = jsonUrl.includes("?")
    ? `${jsonUrl}&limit=50&t=week`
    : `${jsonUrl}?limit=50&t=week`;

  try {
    const res = await fetch(finalUrl, {
      headers: {
        "User-Agent": "idea-radar-bot/1.0 (personal project discovery tool)",
      },
    });

    if (!res.ok) {
      return {
        discoveries: [],
        errors: [`Reddit ${res.status}: ${res.statusText} for ${sourceUrl}`],
      };
    }

    const data = await res.json();

    const listing = Array.isArray(data) ? data[0] : data;
    const posts = listing?.data?.children || [];

    for (const child of posts) {
      const post = child.data;
      if (!post || post.stickied) continue;
      if ((post.score || 0) < minScore) continue;

      const postUrl = post.url_overridden_by_dest || post.url || `https://reddit.com${post.permalink}`;

      discoveries.push({
        title: post.title,
        url: postUrl,
        description: post.selftext
          ? post.selftext.slice(0, 500)
          : undefined,
        author: post.author || undefined,
        publishedAt: post.created_utc
          ? new Date(post.created_utc * 1000)
          : undefined,
        upvotes: post.score,
      });
    }
  } catch (err) {
    errors.push(
      `Reddit fetch error: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  return { discoveries, errors };
}
