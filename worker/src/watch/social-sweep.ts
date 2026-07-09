/**
 * EE AI Builders Watch — LinkedIn Social Sweep (attended step of every loop run).
 * Run: npx tsx worker/src/watch/social-sweep.ts --runId <N>
 *
 * Not-getting-caught rules (mandatory, do not relax):
 * - Real headed browser with the user's REAL session (.pw-profile persistent
 *   context). First run: a window opens, the user logs in once; the profile
 *   keeps the session for every later run.
 * - READ-ONLY forever: no likes, follows, connects, or messages.
 * - Randomized player order, human dwell (20–60s) with gentle scrolling.
 * - Hard abort on any challenge/checkpoint/captcha screen — the whole sweep
 *   stops immediately; the run continues on website data only.
 * - Cursor-gated: only posts newer than watch_players.last_seen_post_at are
 *   inserted (first sweep: newest MAX_POSTS_FIRST per player as baseline).
 *
 * ponytail: post extraction reads .feed-shared-update-v2 innerText and parses
 * relative timestamps — brittle to LinkedIn DOM changes; if extraction yields
 * zero posts on a logged-in page, the player is reported as "unparsed", never
 * guessed.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createRequire } from "node:module";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";

const require = createRequire(
  "C:/Users/Kasutaja/AppData/Roaming/npm/node_modules/playwright/package.json",
);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { chromium } = require("playwright");

const sql = neon(process.env.DATABASE_URL_EEWATCH!);

const MAX_POSTS_FIRST = 5;
const MAX_POSTS_PER_RUN = 10;
const DWELL_MIN_MS = 20000;
const DWELL_MAX_MS = 60000;
const LOGIN_WAIT_MS = 5 * 60 * 1000;

const runIdArg = process.argv.indexOf("--runId");
const runId = runIdArg > -1 ? Number(process.argv[runIdArg + 1]) : NaN;
if (!Number.isFinite(runId)) {
  console.error("Usage: npx tsx worker/src/watch/social-sweep.ts --runId <N>");
  process.exit(1);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const jitter = (min: number, max: number) =>
  min + Math.floor(Math.random() * (max - min));

function isChallenge(url: string): boolean {
  return /checkpoint|challenge|captcha|authwall|uas\/login-submit/i.test(url);
}

/** "3h" | "2d" | "1w" | "3mo" | "1y" (+ Estonian variants) → Date */
function parseRelativeDate(label: string): Date | null {
  const m = label.trim().match(/^(\d+)\s*(h|d|w|mo|y|t|p|n|k|a)/i);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  const ms: Record<string, number> = {
    h: 3600e3, t: 3600e3,          // hours (t = tundi)
    d: 86400e3, p: 86400e3,        // days (p = päeva)
    w: 604800e3, n: 604800e3,      // weeks (n = nädalat)
    mo: 2592000e3, k: 2592000e3,   // months (k = kuud)
    y: 31536000e3, a: 31536000e3,  // years (a = aastat)
  };
  if (!(unit in ms)) return null;
  return new Date(Date.now() - n * ms[unit]);
}

async function main() {
  const players = (await sql`
    SELECT slug, name, linkedin_url, last_seen_post_at
    FROM watch_players
    WHERE active AND linkedin_url IS NOT NULL AND archetype <> 'self'
  `) as Array<{ slug: string; name: string; linkedin_url: string; last_seen_post_at: string | null }>;

  if (players.length === 0) {
    console.log(JSON.stringify({ postsCaptured: 0, note: "no players with linkedin_url" }));
    return;
  }

  // Randomized order every run
  players.sort(() => Math.random() - 0.5);

  const ctx = await chromium.launchPersistentContext(
    join(process.cwd(), ".pw-profile"),
    { headless: false, viewport: { width: 1366, height: 850 } },
  );
  const page = ctx.pages()[0] ?? (await ctx.newPage());

  let captured = 0;
  const perPlayer: Record<string, number | string> = {};
  let aborted: string | null = null;

  try {
    // Session check — first run requires a one-time manual login.
    await page.goto("https://www.linkedin.com/feed/", { waitUntil: "domcontentloaded" });
    if (/login|authwall|signup/i.test(page.url())) {
      console.log("LOGIN REQUIRED — log into LinkedIn in the opened window (waiting up to 5 min)...");
      const deadline = Date.now() + LOGIN_WAIT_MS;
      while (Date.now() < deadline && /login|authwall|signup|checkpoint/i.test(page.url())) {
        await sleep(3000);
      }
      if (/login|authwall|signup/i.test(page.url())) {
        throw new Error("login-timeout: user did not complete LinkedIn login in 5 min");
      }
      console.log("Login detected — session saved to .pw-profile.");
    }

    for (const player of players) {
      if (aborted) break;
      const activityUrl =
        player.linkedin_url.replace(/\/$/, "") + "/recent-activity/all/";
      await page.goto(activityUrl, { waitUntil: "domcontentloaded" });
      await sleep(jitter(3000, 6000));

      if (isChallenge(page.url())) {
        aborted = `challenge screen at ${player.slug} — sweep aborted`;
        break;
      }

      // Human-paced dwell with gentle scrolling
      const dwellEnd = Date.now() + jitter(DWELL_MIN_MS, DWELL_MAX_MS);
      while (Date.now() < dwellEnd) {
        await page.mouse.wheel(0, jitter(250, 700));
        await sleep(jitter(1200, 3200));
        if (isChallenge(page.url())) break;
      }
      if (isChallenge(page.url())) {
        aborted = `challenge screen at ${player.slug} — sweep aborted`;
        break;
      }

      const rawPosts: string[] = await page
        .locator(".feed-shared-update-v2")
        .allInnerTexts()
        .catch(() => []);

      if (rawPosts.length === 0) {
        perPlayer[player.slug] = "unparsed (0 post containers)";
        continue;
      }

      const cursor = player.last_seen_post_at
        ? new Date(player.last_seen_post_at)
        : null;
      const cap = cursor ? MAX_POSTS_PER_RUN : MAX_POSTS_FIRST;
      let inserted = 0;
      let newestSeen: Date | null = cursor;

      for (const raw of rawPosts.slice(0, cap * 2)) {
        if (inserted >= cap) break;
        const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
        // Relative timestamp is typically within the first lines ("3d •", "1w •")
        const dateLine = lines.find((l) => /^\d+\s*(h|d|w|mo|y|t|p|n|k|a)\b/i.test(l));
        const postedAt = dateLine ? parseRelativeDate(dateLine) : null;
        if (cursor && postedAt && postedAt <= cursor) continue;

        // Body: longest line block after boilerplate; conservative but honest.
        const text = lines
          .filter((l) => l.length > 40 && !/followers|reposted|comment|like|jälgijat/i.test(l))
          .slice(0, 4)
          .join(" ")
          .slice(0, 2000);
        if (!text) continue;

        await sql`
          INSERT INTO watch_posts (player_slug, run_id, posted_at, text, source)
          VALUES (${player.slug}, ${runId}, ${postedAt}, ${text}, 'linkedin')
        `;
        inserted++;
        captured++;
        if (postedAt && (!newestSeen || postedAt > newestSeen)) newestSeen = postedAt;
      }

      if (newestSeen) {
        await sql`
          UPDATE watch_players SET last_seen_post_at = ${newestSeen.toISOString()}
          WHERE slug = ${player.slug}
        `;
      }
      perPlayer[player.slug] = inserted;
    }
  } finally {
    await ctx.close();
  }

  await sql`
    UPDATE scrape_runs SET posts_captured = ${captured}, social_sweep_ran = ${!aborted}
    WHERE id = ${runId}
  `;

  console.log(JSON.stringify({ runId, postsCaptured: captured, perPlayer, aborted }));
  if (aborted) process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
