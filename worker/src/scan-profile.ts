import { config } from "dotenv";
config({ path: "../../.env.local" });

import { readdirSync, readFileSync, existsSync } from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import { createDb } from "../../src/db/index";
import { builderProfile } from "../../src/db/schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is required");
  process.exit(1);
}

const PROJECTS_DIR = "C:\\Users\\Kasutaja\\Claude_Projects";

const anthropic = new Anthropic();

function scanProjects(): { name: string; stackMd: string; deps: string[] }[] {
  const projects: { name: string; stackMd: string; deps: string[] }[] = [];

  const entries = readdirSync(PROJECTS_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const projectDir = path.join(PROJECTS_DIR, entry.name);
    const stackPath = path.join(projectDir, "STACK.md");
    const pkgPath = path.join(projectDir, "package.json");

    const hasStack = existsSync(stackPath);
    const hasPkg = existsSync(pkgPath);

    if (!hasStack && !hasPkg) continue;

    let stackMd = "";
    let deps: string[] = [];

    if (hasStack) {
      stackMd = readFileSync(stackPath, "utf-8");
    }

    if (hasPkg) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
        deps = [
          ...Object.keys(pkg.dependencies || {}),
          ...Object.keys(pkg.devDependencies || {}),
        ];
      } catch {
        // ignore malformed package.json
      }
    }

    projects.push({ name: entry.name, stackMd, deps });
  }

  return projects;
}

async function generateProfile(
  projects: { name: string; stackMd: string; deps: string[] }[]
): Promise<string> {
  const projectSummaries = projects
    .map((p) => {
      const depsStr =
        p.deps.length > 0
          ? `\nKey dependencies: ${p.deps.slice(0, 20).join(", ")}`
          : "";
      return `## ${p.name}\n${p.stackMd.slice(0, 2000)}${depsStr}`;
    })
    .join("\n\n---\n\n");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `You are analyzing a solo AI builder's project portfolio to create a structured profile. This profile will be used to score new project ideas for NOVELTY and GROWTH potential — the builder wants to EXPAND, not repeat.

Here are all ${projects.length} projects:

${projectSummaries}

Generate a structured markdown profile with EXACTLY these sections:

# Builder Profile

## Tech Stack Frequency
List technologies with project counts. Most used first.

## Domain Coverage
List domains/verticals this builder has worked in, with project examples.

## Build Patterns
List recurring architecture patterns (e.g., "scraper + cron + dashboard").

## Negative Space
List what this builder has NOT built yet — domains, tech, patterns that are ABSENT from the portfolio. This is the most important section. Be thorough. Think about: mobile apps, real-time features, marketplaces, hardware/IoT, games, social features, browser extensions, desktop apps, CLI tools, public APIs, payment-centric products, education platforms, media/video, e-commerce, etc.

Be concise. No fluff. Facts only.`,
      },
    ],
  });

  return response.content[0].type === "text"
    ? response.content[0].text
    : "Profile generation failed";
}

async function main() {
  const db = createDb(DATABASE_URL!);

  console.log(`[profile] Scanning projects in ${PROJECTS_DIR}...`);
  const projects = scanProjects();
  console.log(`[profile] Found ${projects.length} projects with STACK.md or package.json`);

  console.log("[profile] Generating profile via Claude Sonnet...");
  const content = await generateProfile(projects);

  await db.insert(builderProfile).values({
    content,
    projectCount: projects.length,
  });

  console.log(`[profile] Profile saved. ${projects.length} projects analyzed.`);
  console.log("\n" + content);
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
