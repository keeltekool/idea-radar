import type { ParseResult, RawDiscovery } from "./types";

export async function parseGitHub(
  config: Record<string, unknown>
): Promise<ParseResult> {
  const token = process.env.GITHUB_TOKEN;
  const errors: string[] = [];
  const discoveries: RawDiscovery[] = [];
  const seenUrls = new Set<string>();

  const language = (config.language as string) || "TypeScript";
  const minStars = (config.minStars as number) || 20;
  const daysBack = (config.daysBack as number) || 3;
  const limit = (config.limit as number) || 50;

  const since = new Date();
  since.setDate(since.getDate() - daysBack);
  const sinceStr = since.toISOString().split("T")[0];

  const q = `created:>${sinceStr} stars:>${minStars} language:${language}`;
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=${limit}`;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "idea-radar-bot",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(url, { headers });

    if (!res.ok) {
      return {
        discoveries: [],
        errors: [`GitHub API ${res.status}: ${res.statusText}`],
      };
    }

    const data = await res.json();
    const items = data?.items || [];

    for (const repo of items) {
      if (seenUrls.has(repo.html_url)) continue;
      seenUrls.add(repo.html_url);

      discoveries.push({
        title: repo.full_name,
        url: repo.html_url,
        description: repo.description || undefined,
        author: repo.owner?.login || undefined,
        publishedAt: repo.created_at ? new Date(repo.created_at) : undefined,
        techStack: repo.topics || [],
        stars: repo.stargazers_count,
      });
    }
  } catch (err) {
    errors.push(
      `GitHub fetch error: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  return { discoveries, errors };
}
