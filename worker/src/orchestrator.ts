import { eq } from "drizzle-orm";
import { sources, scrapeRuns } from "../../src/db/schema";
import type { ScrapeError } from "../../src/db/schema";
import type { Database } from "../../src/db/index";
import { parseSource } from "./parsers/index";
import { deduplicateAndStore } from "./store";

export async function runScrape(db: Database): Promise<void> {
  console.log(`[scrape] Starting scrape run at ${new Date().toISOString()}`);

  const [run] = await db
    .insert(scrapeRuns)
    .values({ status: "running" })
    .returning({ id: scrapeRuns.id });

  let totalDiscoveries = 0;
  let sourcesScraped = 0;
  const errors: ScrapeError[] = [];

  try {
    const activeSources = await db
      .select()
      .from(sources)
      .where(eq(sources.active, true));

    console.log(`[scrape] Found ${activeSources.length} active sources`);

    for (const source of activeSources) {
      console.log(`[scrape] Processing: ${source.name} (${source.type})`);

      try {
        const result = await parseSource({
          type: source.type,
          url: source.url,
          config: (source.config as Record<string, unknown>) || {},
        });

        if (result.errors.length > 0) {
          console.warn(
            `[scrape] ${source.name}: ${result.errors.join(", ")}`
          );
          errors.push({
            sourceId: source.id,
            sourceName: source.name,
            error: result.errors.join("; "),
          });
        }

        if (result.discoveries.length > 0) {
          const storeResult = await deduplicateAndStore(
            db,
            source.id,
            result.discoveries
          );
          console.log(
            `[scrape] ${source.name}: ${storeResult.inserted} new, ${storeResult.duplicates} dupes, ${storeResult.invalid} invalid`
          );
          totalDiscoveries += storeResult.inserted;
        } else if (result.errors.length === 0) {
          console.log(`[scrape] ${source.name}: 0 discoveries found`);
        }

        await db
          .update(sources)
          .set({
            lastScrapedAt: new Date(),
            lastProjectCount: result.discoveries.length,
          })
          .where(eq(sources.id, source.id));

        sourcesScraped++;

        await new Promise((r) => setTimeout(r, 1000));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[scrape] ${source.name} FAILED: ${message}`);
        errors.push({
          sourceId: source.id,
          sourceName: source.name,
          error: message,
        });
      }
    }

    await db
      .update(scrapeRuns)
      .set({
        completedAt: new Date(),
        status:
          errors.length > 0 && sourcesScraped === 0 ? "failed" : "success",
        sourcesScraped,
        discoveriesFound: totalDiscoveries,
        errors,
      })
      .where(eq(scrapeRuns.id, run.id));

    console.log(
      `[scrape] Complete: ${sourcesScraped} sources, ${totalDiscoveries} new discoveries, ${errors.length} errors`
    );
  } catch (err) {
    await db
      .update(scrapeRuns)
      .set({
        completedAt: new Date(),
        status: "failed",
        sourcesScraped,
        discoveriesFound: totalDiscoveries,
        errors: [
          ...errors,
          {
            sourceId: 0,
            sourceName: "orchestrator",
            error: err instanceof Error ? err.message : String(err),
          },
        ],
      })
      .where(eq(scrapeRuns.id, run.id));

    console.error(`[scrape] Fatal error: ${err}`);
    throw err;
  }
}
