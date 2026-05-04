import { NextResponse } from "next/server";
import { readdirSync, readFileSync, existsSync } from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import { getDb } from "@/lib/db-server";
import { builderProfile } from "@/db/schema";

const PROJECTS_DIR = "C:\\Users\\Kasutaja\\Claude_Projects";

export async function GET() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not set" },
      { status: 500 }
    );
  }

  const db = getDb();
  const anthropic = new Anthropic();

  const entries = readdirSync(PROJECTS_DIR, { withFileTypes: true });
  const projects: { name: string; stackMd: string }[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const stackPath = path.join(PROJECTS_DIR, entry.name, "STACK.md");
    if (!existsSync(stackPath)) continue;
    projects.push({
      name: entry.name,
      stackMd: readFileSync(stackPath, "utf-8").slice(0, 2000),
    });
  }

  const summaries = projects
    .map((p) => `## ${p.name}\n${p.stackMd}`)
    .join("\n\n---\n\n");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `Analyze this solo AI builder's ${projects.length} projects and generate a structured profile with sections: Tech Stack Frequency, Domain Coverage, Build Patterns, Negative Space (what they HAVEN'T built). Be concise, facts only.\n\n${summaries}`,
      },
    ],
  });

  const content =
    response.content[0].type === "text"
      ? response.content[0].text
      : "Generation failed";

  await db.insert(builderProfile).values({
    content,
    projectCount: projects.length,
  });

  return NextResponse.json({
    projectCount: projects.length,
    generatedAt: new Date().toISOString(),
  });
}
