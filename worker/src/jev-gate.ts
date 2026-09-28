/**
 * Jev pre-filter gate (TypeSafe AI's decision model). Replaces the keyword gate; the keyword gate stays as the fallback.
 * Questions, model and threshold are the ones measured in the backtest (Claude_Projects/jev/KNOWLEDGE.md §11,
 * 2026-09-28): Opus reads ~41% fewer items per run and gets ~+33% accept-worthy finds.
 * Returns null on any API failure so the caller can fall back to keywords.
 */
const API = "https://api.typesafe.ai/v1/systemone";
// JEV_THRESHOLD was fitted together with MODEL, the QUESTIONS text and the score formula in jevScore().
// Editing any of the four invalidates it: re-fit in Claude_Projects/jev/eval first.
const MODEL = "jev-1.13.0";
export const JEV_THRESHOLD = 0.215;

const QUESTIONS = {
  built: {
    type: "noul",
    instructions: "Is the subject of `item` a specific product, app, tool or service that someone has built and launched or is launching?",
    criteria: {
      true: "A concrete built thing is the subject: a launched app, SaaS, website, tool, open-source project, side project or MVP someone made.",
      false: "The subject is not a built product: an essay, opinion or personal story, a tutorial or course, news or a funding announcement, a general article, a question or discussion prompt, an idea with no build, spam or noise.",
    },
  },
  dev_infra: {
    type: "noul",
    instructions: "Is `item` mainly about a developer library, framework, package, SDK, CLI or infrastructure tool, rather than a product for end users or businesses?",
  },
  fit: {
    type: "noul",
    instructions: "Would `item` give the builder described in `profile` a concrete product idea, feature or approach they could rebuild, improve on or learn from for their own web apps?",
    criteria: {
      true: "Something the builder could realistically build or borrow from with their stack and in their kind of domains.",
      false: "Nothing concrete to take: unrelated to building web products, or out of reach (hardware, deep research, large enterprise systems).",
    },
  },
};

export interface GateItem {
  title: string;
  description: string | null;
  source: string | null;
  stars: number | null;
  upvotes: number | null;
}

/** built × fit × (1 − dev_infra), or null when Jev can't answer. */
export async function jevScore(apiKey: string, profile: string, d: GateItem): Promise<number | null> {
  const item = { title: d.title, description: d.description ?? "", source: d.source ?? "", stars: d.stars ?? undefined, upvotes: d.upvotes ?? undefined };
  const body = JSON.stringify({ model: MODEL, state: { profile, item }, questions: QUESTIONS });
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt) await new Promise((s) => setTimeout(s, 500 * 2 ** attempt));
    try {
      const r = await fetch(API, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body,
        signal: AbortSignal.timeout(8_000), // normal call ~0.3 s
      });
      if (r.ok) {
        const { answers: a } = await r.json();
        return a.built.noul * a.fit.noul * (1 - a.dev_infra.noul);
      }
      if (r.status !== 429 && r.status < 500) return null; // bad key or request: retrying won't help
    } catch {
      // timeout or network error: retry
    }
  }
  return null;
}
