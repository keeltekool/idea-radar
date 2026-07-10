// EE AI Builders Watch — click-through verification of every /watch user flow.
// Usage: node scripts/check-watch-flows.mjs [baseUrl]
// Real browser, both viewports; exits non-zero on any failure.
import { createRequire } from "node:module";
const require = createRequire(
  "C:/Users/Kasutaja/AppData/Roaming/npm/node_modules/playwright/package.json",
);
const { chromium } = require("playwright");

const BASE = process.argv[2] ?? "https://idea-radar-topaz.vercel.app";
const browser = await chromium.launch();
const failures = [];
const consoleErrors = [];

async function flow(viewport, label) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(`[${label}] ${m.text()}`);
  });

  const step = async (name, fn) => {
    try {
      await fn();
      console.log(`  ok: ${name}`);
    } catch (e) {
      failures.push(`[${label}] ${name}: ${e.message.split("\n")[0]}`);
      console.log(`  FAIL: ${name}`);
    }
  };

  console.log(`\n--- ${label} (${viewport.width}px)`);

  await step("dashboard loads with real data", async () => {
    await page.goto(`${BASE}/watch`, { waitUntil: "networkidle" });
    const body = await page.locator("body").innerText();
    if (!body.includes("EE AI Builders Watch")) throw new Error("title missing");
    if (!/\d[\s\S]{0,4}players/i.test(body) || !/\d[\s\S]{0,4}pages/i.test(body))
      throw new Error("stats missing");
    if (body.includes("No runs yet")) throw new Error("still shows empty state");
  });

  await step("nav contains EE Watch (desktop only)", async () => {
    if (viewport.width < 768) return; // nav hidden on mobile (existing app pattern)
    const nav = await page.locator("nav").innerText();
    if (!nav.includes("EE WATCH") && !nav.includes("EE Watch"))
      throw new Error("nav item missing");
  });

  await step("archetype filter narrows the grid", async () => {
    const before = await page.locator("ul.grid li").count();
    await page.getByRole("button", { name: "Agency", exact: true }).click();
    await page.waitForTimeout(300);
    const after = await page.locator("ul.grid li").count();
    if (!(after > 0 && after < before)) throw new Error(`filter: ${before} -> ${after}`);
    await page.getByRole("button", { name: "All", exact: true }).click();
  });

  await step("player card click → detail page", async () => {
    await page.locator("ul.grid li a").first().click();
    await page.waitForURL("**/watch/player/**");
    const body = await page.locator("body").innerText();
    if (!/signal profile/i.test(body)) throw new Error("signal profile section missing");
    if (!/tracked pages/i.test(body)) throw new Error("tracked pages missing");
  });

  await step("memos page renders latest memo", async () => {
    await page.goto(`${BASE}/watch/memos`, { waitUntil: "networkidle" });
    const body = await page.locator("body").innerText();
    if (!body.includes("Watch Memos")) throw new Error("title missing");
    if (body.includes("No memos yet")) throw new Error("no memo found");
  });

  await step("brief page expands a section", async () => {
    await page.goto(`${BASE}/watch/brief`, { waitUntil: "networkidle" });
    const summaries = page.locator("details summary");
    if ((await summaries.count()) < 5) throw new Error("too few sections");
    await summaries.nth(3).click();
    await page.waitForTimeout(200);
    const open = await page.locator("details[open]").count();
    if (open < 3) throw new Error("section did not expand");
  });

  await step("no horizontal body scroll", async () => {
    const overflow = await page.evaluate(
      () => document.body.scrollWidth > window.innerWidth + 1,
    );
    if (overflow) throw new Error("body scrolls horizontally");
  });

  await page.screenshot({
    path: `${process.env.SCRATCH_DIR ?? "."}/watch-${viewport.width}.png`,
  });
  await ctx.close();
}

await flow({ width: 1440, height: 900 }, "desktop");
await flow({ width: 375, height: 812 }, "mobile");

const realConsole = consoleErrors.filter((e) => !e.includes("favicon"));
if (realConsole.length) failures.push(...realConsole.map((e) => `console: ${e}`));

await browser.close();
if (failures.length) {
  console.error(`\nFAILURES (${failures.length}):\n` + failures.join("\n"));
  process.exit(1);
}
console.log("\nPASS: all /watch flows, both viewports, no console errors");
