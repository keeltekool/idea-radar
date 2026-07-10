/**
 * EE AI Builders Watch — scrape orchestrator.
 * Run: npx tsx worker/src/watch/run-watch.ts
 *
 * Per player: BFS from seed pages (depth ≤2, cap 25 pages/player, same
 * domain), plain HTTPS fetch, extract → normalize → hash → classify.
 * Snapshots insert only on new/changed. Discovered pages become new sources
 * (discovered_by='crawl'). Thin pages (<400 chars) get needs_render=true —
 * CF Browser Rendering fallback is deferred until the flag count proves it
 * necessary. Writes scripts/output/watch-changes-<runId>.json; last stdout
 * line is the RunSummary JSON.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import {
  scrapeRuns,
  snapshots,
  sources,
  watchPlayers,
} from "../../../src/db/schema-watch";
import {
  classifyChange,
  extractLinks,
  guessTheme,
  htmlToText,
  normalizeText,
} from "./extract";

const db = drizzle(neon(process.env.DATABASE_URL_EEWATCH!));

const MAX_PAGES_PER_PLAYER = 25;
const MAX_DEPTH = 2;
const THIN_TEXT_CHARS = 400;
const SPACING_MS = 1200;
const FETCH_TIMEOUT_MS = 20000;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface FetchResult {
  ok: boolean;
  status?: number;
  html?: string;
  error?: string;
}

async function fetchPage(url: string): Promise<FetchResult> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept-Language": "et,en;q=0.8" },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return { ok: false, status: res.status, error: `HTTP ${res.status}` };
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("html")) return { ok: false, status: res.status, error: `non-HTML: ${ct}` };
    return { ok: true, status: res.status, html: await res.text() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

interface ChangeRecord {
  sourceId: number;
  player: string;
  url: string;
  theme: string;
  status: "new" | "changed" | "failed";
  prevHash: string | null;
  newHash: string | null;
  thin: boolean;
  error?: string;
  contentMd?: string;
}

async function main() {
  let players = await db.select().from(watchPlayers).where(eq(watchPlayers.active, true));
  const allSources = await db.select().from(sources).where(eq(sources.active, true));
  if (allSources.length === 0) {
    console.error("No active sources — seed via admin first.");
    process.exit(1);
  }

  // Auto-register admin-added competitors: a source whose competitor has no
  // player row would otherwise be silently skipped by the loops below. New
  // players start as 'unclassified' with no linkedin_url — the attended
  // enrichment step of the loop run names/classifies them and fills LinkedIn.
  const knownSlugs = new Set(players.map((p) => p.slug));
  const orphanSlugs = [...new Set(allSources.map((s) => s.competitor))].filter(
    (slug) => !knownSlugs.has(slug),
  );
  const registered: string[] = [];
  for (const slug of orphanSlugs) {
    const firstUrl = allSources.find((s) => s.competitor === slug)!.url;
    const domain = new URL(firstUrl).hostname.replace(/^www\./, "");
    const [created] = await db
      .insert(watchPlayers)
      .values({ slug, name: slug, archetype: "unclassified", domain })
      .onConflictDoNothing({ target: watchPlayers.slug })
      .returning();
    if (created) {
      players = [...players, created];
      registered.push(slug);
    }
  }
  if (registered.length > 0) {
    console.log(`auto-registered players: ${registered.join(", ")}`);
  }

  const [run] = await db
    .insert(scrapeRuns)
    .values({ status: "running" })
    .returning({ id: scrapeRuns.id });

  const changes: ChangeRecord[] = [];
  let scraped = 0;
  let failed = 0;
  let discovered = 0;
  const errors: Array<{ url: string; error: string }> = [];

  for (const player of players) {
    const playerSources = allSources.filter((s) => s.competitor === player.slug);
    if (playerSources.length === 0) continue;

    // BFS state: known URLs for this player (normalized, no trailing slash)
    const norm = (u: string) => u.replace(/\/$/, "");
    const known = new Map(playerSources.map((s) => [norm(s.url), s]));
    const queue: Array<{ url: string; depth: number; sourceRow: typeof playerSources[number] | null }> =
      playerSources.map((s) => ({ url: s.url, depth: 0, sourceRow: s }));
    let pageBudget = MAX_PAGES_PER_PLAYER;

    while (queue.length > 0 && pageBudget > 0) {
      const { url, depth, sourceRow } = queue.shift()!;
      pageBudget--;

      const result = await fetchPage(url);
      await sleep(SPACING_MS);

      // Resolve or create the source row
      let row = sourceRow;
      if (!row) {
        const [created] = await db
          .insert(sources)
          .values({
            competitor: player.slug,
            url,
            theme: guessTheme(url),
            discoveredBy: "crawl",
          })
          .onConflictDoNothing({ target: sources.url })
          .returning();
        if (!created) continue; // raced/duplicate
        row = created;
        discovered++;
      }

      if (!result.ok || !result.html) {
        failed++;
        errors.push({ url, error: result.error ?? "unknown" });
        await db
          .update(sources)
          .set({
            lastScrapedAt: new Date(),
            lastStatus: result.error ?? "failed",
            failCount: (row.failCount ?? 0) + 1,
          })
          .where(eq(sources.id, row.id));
        changes.push({
          sourceId: row.id, player: player.slug, url, theme: row.theme,
          status: "failed", prevHash: row.lastContentHash ?? null, newHash: null,
          thin: false, error: result.error,
        });
        continue;
      }

      const text = normalizeText(htmlToText(result.html));
      const thin = text.length < THIN_TEXT_CHARS;
      const { status, newHash } = classifyChange(row.lastContentHash, text);
      scraped++;

      if (status !== "unchanged") {
        await db
          .insert(snapshots)
          .values({ sourceId: row.id, contentMd: text, contentHash: newHash })
          .onConflictDoNothing();
        changes.push({
          sourceId: row.id, player: player.slug, url, theme: row.theme,
          status, prevHash: row.lastContentHash ?? null, newHash, thin,
          contentMd: text,
        });
      }

      await db
        .update(sources)
        .set({
          lastScrapedAt: new Date(),
          lastStatus: thin ? "thin" : "ok",
          lastContentHash: newHash,
          needsRender: thin,
          failCount: 0,
        })
        .where(eq(sources.id, row.id));

      // Discovery: enqueue unseen same-domain links
      if (depth < MAX_DEPTH) {
        for (const link of extractLinks(result.html, url)) {
          if (known.has(norm(link))) continue;
          if (known.size >= MAX_PAGES_PER_PLAYER) break;
          known.set(norm(link), null as never);
          queue.push({ url: link, depth: depth + 1, sourceRow: null });
        }
      }
    }
    console.log(
      `[${player.slug}] pages: ${MAX_PAGES_PER_PLAYER - pageBudget}, known now: ${known.size}`,
    );
  }

  const changesDetected = changes.filter((c) => c.status !== "failed").length;
  await db
    .update(scrapeRuns)
    .set({
      completedAt: new Date(),
      status: failed > 0 && scraped === 0 ? "failed" : "success",
      urlsScraped: scraped,
      urlsFailed: failed,
      changesDetected,
      errors: errors as never,
    })
    .where(eq(scrapeRuns.id, run.id));

  const outDir = join(process.cwd(), "scripts", "output");
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, `watch-changes-${run.id}.json`);
  writeFileSync(
    outFile,
    JSON.stringify({ runId: run.id, changes }, null, 1),
    "utf8",
  );

  console.log(
    JSON.stringify({
      runId: run.id,
      urlsScraped: scraped,
      urlsFailed: failed,
      changesDetected,
      pagesDiscovered: discovered,
      thinPages: changes.filter((c) => c.thin).length,
      playersRegistered: registered,
      outFile,
    }),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
