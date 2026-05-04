import { config } from "dotenv";
config({ path: "../../.env.local" });

import { execSync } from "child_process";
import path from "path";

const workerDir = path.resolve(__dirname);

function run(script: string, label: string) {
  console.log(`\n=== ${label} ===`);
  const output = execSync(`npx tsx ${path.join(workerDir, script)}`, {
    cwd: path.resolve(workerDir, "../.."),
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
    timeout: 300000,
  });
  console.log(output.trim());
  return output.trim();
}

async function main() {
  console.log(`[pipeline] Starting full pipeline at ${new Date().toISOString()}`);

  run("worker/src/run-scrape.ts", "SCRAPE");
  run("worker/src/pre-filter.ts", "PRE-FILTER");
  run("worker/src/ai-pass.ts", "AI PASS");
  run("worker/src/update-acceptance-rates.ts", "ACCEPTANCE RATES");

  // Trigger newsletter
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "https://idea-radar.vercel.app";
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    try {
      const res = await fetch(`${baseUrl}/api/newsletter/send`, {
        headers: { Authorization: `Bearer ${cronSecret}` },
      });
      const data = await res.json();
      console.log(`\n=== NEWSLETTER ===\n${JSON.stringify(data)}`);
    } catch (err) {
      console.error("Newsletter trigger failed (pipeline still succeeded):", err);
    }
  } else {
    console.log("\nCRON_SECRET not set, skipping newsletter trigger");
  }

  console.log(`\n[pipeline] Complete at ${new Date().toISOString()}`);
}

main().catch((err) => {
  console.error("Fatal pipeline error:", err);
  process.exit(1);
});
