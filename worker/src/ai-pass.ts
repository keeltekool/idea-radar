import { config } from "dotenv";
config({ path: "../../.env.local" });

import Anthropic from "@anthropic-ai/sdk";
import { createDb } from "../../src/db/index";
import { discoveries, builderProfile } from "../../src/db/schema";
import { eq, desc } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is required");
  process.exit(1);
}

const anthropic = new Anthropic();

type AiDecision = {
  id: number;
  status: "accepted" | "rejected";
  feasibilityScore?: number;
  noveltyScore?: number;
  stretchScore?: number;
  compositeScore?: number;
  summary?: string;
  categories?: string[];
  rejectionReason?: string;
  isWildcard?: boolean;
};

async function scoreDiscovery(
  title: string,
  description: string | null,
  techStack: string[],
  source: string,
  popularity: number | null,
  profile: string,
  feedback: { sparks: string[]; passes: string[] }
): Promise<Omit<AiDecision, "id">> {
  const feedbackSection =
    feedback.sparks.length > 0 || feedback.passes.length > 0
      ? `\nPAST FEEDBACK:\nSparked interest: ${feedback.sparks.join(", ") || "none yet"}\nPassed on: ${feedback.passes.join(", ") || "none yet"}`
      : "";

  const prompt = `You are scoring indie builder projects for a solo developer who wants to EXPAND into new territory.

BUILDER PROFILE:
${profile}
${feedbackSection}

PROJECT TO EVALUATE:
Title: ${title}
Description: ${description || "No description"}
Tech stack: ${techStack.length > 0 ? techStack.join(", ") : "Unknown"}
Source: ${source}
Popularity: ${popularity || "Unknown"}

TASKS:
1. Is this a real shipped product or meaningful project by an indie builder or small team? If NO (tutorial, template, list, enterprise product, abandoned repo), respond ONLY with: {"status":"rejected","reason":"<one word>"}
2. If YES, score on three axes (1-10 each):
   - feasibility: Can the builder realistically build something similar with Next.js/Tailwind/Vercel/Neon/Claude API?
   - novelty: How different is this from the builder's existing 15+ projects? (HIGH = good, means NEW territory)
   - stretch: Does this push the builder into genuinely unfamiliar domain or tech? (HIGH = good)
3. Write a 1-2 sentence "why this matters" focused on GROWTH potential, not similarity to existing work.
4. Assign 1-3 domain categories.
5. Composite = (feasibility * 0.2) + (novelty * 0.4) + (stretch * 0.4)

CRITICAL: Score NOVELTY and STRETCH high when the project is DIFFERENT from the builder's portfolio. The goal is expansion, not comfort.

Respond as valid JSON only, no markdown:
{"status":"accepted","feasibility":N,"novelty":N,"stretch":N,"composite":N,"summary":"...","categories":["..."]}`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  try {
    const parsed = JSON.parse(text.trim());

    if (parsed.status === "rejected") {
      return {
        status: "rejected",
        rejectionReason: parsed.reason || "Not a shipped indie project",
      };
    }

    return {
      status: "accepted",
      feasibilityScore: parsed.feasibility,
      noveltyScore: parsed.novelty,
      stretchScore: parsed.stretch,
      compositeScore: parsed.composite,
      summary: parsed.summary,
      categories: parsed.categories || [],
    };
  } catch {
    return {
      status: "rejected",
      rejectionReason: "AI response parse error",
    };
  }
}

async function main() {
  const db = createDb(DATABASE_URL!);

  const profileRows = await db
    .select({ content: builderProfile.content })
    .from(builderProfile)
    .orderBy(desc(builderProfile.generatedAt))
    .limit(1);

  const profile =
    profileRows[0]?.content || "No builder profile generated yet. Score based on general indie builder patterns.";

  const sparkRows = await db
    .select({ title: discoveries.title })
    .from(discoveries)
    .where(eq(discoveries.userFeedback, "spark"))
    .limit(20);

  const passRows = await db
    .select({ title: discoveries.title })
    .from(discoveries)
    .where(eq(discoveries.userFeedback, "pass"))
    .limit(20);

  const feedback = {
    sparks: sparkRows.map((r) => r.title),
    passes: passRows.map((r) => r.title),
  };

  const relevant = await db
    .select()
    .from(discoveries)
    .where(eq(discoveries.status, "relevant"))
    .limit(100);

  if (relevant.length === 0) {
    console.log(JSON.stringify({ total: 0, accepted: 0, rejected: 0, wildcards: 0 }));
    process.exit(0);
  }

  console.log(`[ai-pass] Scoring ${relevant.length} discoveries...`);

  const decisions: AiDecision[] = [];
  let accepted = 0;
  let rejected = 0;

  for (const item of relevant) {
    try {
      const result = await scoreDiscovery(
        item.title,
        item.description,
        item.techStack || [],
        `source-${item.sourceId}`,
        item.upvotes || item.stars,
        profile,
        feedback
      );

      const decision: AiDecision = { id: item.id, ...result };

      if (
        result.status === "accepted" &&
        result.compositeScore !== undefined &&
        result.compositeScore >= 7
      ) {
        decision.status = "accepted";
      } else if (result.status === "accepted") {
        decision.status = "rejected";
        decision.rejectionReason = `Below threshold: composite ${result.compositeScore?.toFixed(1)}`;
      }

      decisions.push(decision);

      if (decision.status === "accepted") accepted++;
      else rejected++;

      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      console.error(`[ai-pass] Error scoring ${item.title}: ${err}`);
      decisions.push({
        id: item.id,
        status: "rejected",
        rejectionReason: "Scoring error",
      });
      rejected++;
    }
  }

  // Wildcard selection: highest stretch among rejected items that were actually scored
  const scoredRejected = decisions.filter(
    (d) =>
      d.status === "rejected" &&
      d.stretchScore !== undefined &&
      d.stretchScore >= 7
  );
  scoredRejected.sort((a, b) => (b.stretchScore || 0) - (a.stretchScore || 0));

  const wildcards = scoredRejected.slice(0, 2);
  for (const wc of wildcards) {
    wc.status = "accepted";
    wc.isWildcard = true;
    accepted++;
    rejected--;
  }

  // Write all decisions to DB
  for (const d of decisions) {
    await db
      .update(discoveries)
      .set({
        status: d.status,
        feasibilityScore: d.feasibilityScore || null,
        noveltyScore: d.noveltyScore || null,
        stretchScore: d.stretchScore || null,
        compositeScore: d.compositeScore || null,
        summary: d.summary || null,
        categories: d.categories || [],
        rejectionReason: d.rejectionReason || null,
        isWildcard: d.isWildcard || false,
      })
      .where(eq(discoveries.id, d.id));
  }

  console.log(
    JSON.stringify({
      total: relevant.length,
      accepted,
      rejected,
      wildcards: wildcards.length,
    })
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
