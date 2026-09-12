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

  const tags = (config.tags as string) || "show_hn";
  const query = (config.query as string) || "";
  const url = `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(query)}&tags=${tags}&hitsPerPage=${limit}&numericFilters=created_at_i>${since},points>${minPoints}`;

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
      const projectUrl = hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;

      discoveries.push({
        title: (hit.title || "").replace(/^(Show HN|Launch HN):\s*/i, ""),
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
