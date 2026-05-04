import type { ParseResult, RawDiscovery } from "./types";

export async function parseDevTo(
  config: Record<string, unknown>
): Promise<ParseResult> {
  const errors: string[] = [];
  const discoveries: RawDiscovery[] = [];
  const seenUrls = new Set<string>();

  const tag = (config.tag as string) || "showdev";
  const limit = (config.limit as number) || 50;
  const topDays = (config.topDays as number) || 7;

  const endpoint =
    tag === "showdev"
      ? `https://dev.to/api/articles?tag=${tag}&per_page=${limit}&state=rising`
      : `https://dev.to/api/articles?tag=${tag}&per_page=${limit}&top=${topDays}`;

  const headers: Record<string, string> = {
    "User-Agent": "idea-radar-bot",
  };
  if (process.env.DEVTO_API_KEY) {
    headers["api-key"] = process.env.DEVTO_API_KEY;
  }

  try {
    const res = await fetch(endpoint, { headers });

    if (!res.ok) {
      return {
        discoveries: [],
        errors: [`Dev.to API ${res.status}: ${res.statusText}`],
      };
    }

    const articles = await res.json();

    for (const article of articles) {
      if (seenUrls.has(article.url)) continue;
      seenUrls.add(article.url);

      discoveries.push({
        title: article.title,
        url: article.url,
        description: article.description || undefined,
        author: article.user?.name || article.user?.username || undefined,
        publishedAt: article.published_at
          ? new Date(article.published_at)
          : undefined,
        techStack: article.tag_list || [],
        upvotes: article.public_reactions_count || 0,
      });
    }
  } catch (err) {
    errors.push(
      `Dev.to fetch error: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  return { discoveries, errors };
}
