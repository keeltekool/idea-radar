import type { ParseResult, RawDiscovery } from "./types";

export async function parseHackerNews(
  config: Record<string, unknown>
): Promise<ParseResult> {
  const errors: string[] = [];
  const discoveries: RawDiscovery[] = [];

  const daysBack = (config.daysBack as number) || 3;
  const minPoints = (config.minPoints as number) || 5;
  const limit = (config.limit as number) || 50;

  const since = Math.floor(
    (Date.now() - daysBack * 24 * 60 * 60 * 1000) / 1000
  );

  const url = `https://hn.algolia.com/api/v1/search?query=&tags=show_hn&hitsPerPage=${limit}&numericFilters=created_at_i>${since}`;

  try {
    const res = await fetch(url);

    if (!res.ok) {
      return {
        discoveries: [],
        errors: [`HN Algolia API ${res.status}: ${res.statusText}`],
      };
    }

    const data = await res.json();
    const hits = data?.hits || [];

    for (const hit of hits) {
      if ((hit.points || 0) < minPoints) continue;

      const projectUrl = hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;

      discoveries.push({
        title: (hit.title || "").replace(/^Show HN:\s*/i, ""),
        url: projectUrl,
        description: hit.story_text
          ? hit.story_text.slice(0, 500)
          : undefined,
        author: hit.author || undefined,
        publishedAt: hit.created_at ? new Date(hit.created_at) : undefined,
        upvotes: hit.points,
      });
    }
  } catch (err) {
    errors.push(
      `HN fetch error: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  return { discoveries, errors };
}
