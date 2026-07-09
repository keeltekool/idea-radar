/**
 * Report an EE AI Builders Watch run to Loop Control Center.
 * Usage: npx tsx worker/src/watch/lcc-report.ts --runId 1 --status success \
 *          --urlsScraped 300 --urlsFailed 4 --changesDetected 12 --memo true
 * Requires EEWATCH_LCC_LOOP_ID and LCC_API_KEY in .env.local (full UUID —
 * a truncated loop id 500s).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i += 2) {
  args.set(process.argv[i].replace(/^--/, ""), process.argv[i + 1]);
}

const loopId = process.env.EEWATCH_LCC_LOOP_ID;
const apiKey = process.env.LCC_API_KEY;
if (!loopId || !apiKey) {
  console.error("EEWATCH_LCC_LOOP_ID and LCC_API_KEY required in .env.local");
  process.exit(1);
}

const body = {
  status: args.get("status") ?? "success",
  summary:
    `Watch run #${args.get("runId")}: ${args.get("urlsScraped") ?? "?"} pages scraped, ` +
    `${args.get("urlsFailed") ?? "0"} failed, ${args.get("changesDetected") ?? "0"} changes, ` +
    `memo=${args.get("memo") ?? "false"}`,
};

async function main() {
  const res = await fetch(
    `https://loop-control-center.vercel.app/api/loops/${loopId}/runs`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    },
  );
  console.log(JSON.stringify({ status: res.status, body: await res.text() }));
  if (!res.ok) process.exit(1);
}

main();
