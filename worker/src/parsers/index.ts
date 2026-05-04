import { parseProductHunt } from "./producthunt";
import { parseGitHub } from "./github";
import { parseHackerNews } from "./hackernews";
import { parseDevTo } from "./devto";
import { parseReddit } from "./reddit";
import { parseRss } from "./rss";
import type { ParseResult } from "./types";

type SourceInput = {
  type: "producthunt" | "github" | "hackernews" | "devto" | "reddit" | "rss";
  url: string;
  config: Record<string, unknown>;
};

export async function parseSource(source: SourceInput): Promise<ParseResult> {
  switch (source.type) {
    case "producthunt":
      return parseProductHunt(source.config);
    case "github":
      return parseGitHub(source.config);
    case "hackernews":
      return parseHackerNews(source.config);
    case "devto":
      return parseDevTo(source.config);
    case "reddit":
      return parseReddit(source.url, source.config);
    case "rss":
      return parseRss((source.config as { feedUrl?: string }).feedUrl || source.url);
    default:
      return {
        discoveries: [],
        errors: [`Unknown parser type: ${(source as { type: string }).type}`],
      };
  }
}

export type { ParseResult, RawDiscovery } from "./types";
