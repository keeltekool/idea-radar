import { discoveries } from "../../src/db/schema";
import { hashUrl, hashContent } from "../../src/lib/hash";
import { validateDiscovery } from "../../src/lib/validate";
import type { Database } from "../../src/db/index";
import type { RawDiscovery } from "./parsers/types";

type StoreResult = {
  inserted: number;
  duplicates: number;
  invalid: number;
};

export async function deduplicateAndStore(
  db: Database,
  sourceId: number,
  rawDiscoveries: RawDiscovery[]
): Promise<StoreResult> {
  let inserted = 0;
  let duplicates = 0;
  let invalid = 0;

  for (const raw of rawDiscoveries) {
    const validation = validateDiscovery(raw);
    if (!validation.valid) {
      invalid++;
      continue;
    }

    const urlHash = hashUrl(raw.url);
    const contentHash = hashContent(raw.title, raw.description);

    try {
      const result = await db
        .insert(discoveries)
        .values({
          sourceId,
          url: raw.url,
          urlHash,
          contentHash,
          title: raw.title,
          description: raw.description || null,
          author: raw.author || null,
          techStack: raw.techStack || [],
          stars: raw.stars || null,
          upvotes: raw.upvotes || null,
          publishedAt: raw.publishedAt || null,
          status: "pending",
        })
        .onConflictDoNothing({ target: discoveries.urlHash });

      if (result.rowCount && result.rowCount > 0) {
        inserted++;
      } else {
        duplicates++;
      }
    } catch {
      duplicates++;
    }
  }

  return { inserted, duplicates, invalid };
}
