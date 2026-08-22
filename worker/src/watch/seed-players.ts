/**
 * EE AI Builders Watch — seed players + their tracked pages (sources).
 * Idempotent: upsert-by-slug / skip-by-url. Run: npx tsx worker/src/watch/seed-players.ts
 *
 * Seed pages are the known entry points only — the Phase 2 crawler discovers
 * the rest (depth 2, cap 25/player) and inserts them with discovered_by='crawl'.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sources, watchPlayers, type Archetype } from "../../../src/db/schema-watch";

const db = drizzle(neon(process.env.DATABASE_URL_EEWATCH!));

interface SeedPlayer {
  slug: string;
  name: string;
  archetype: Archetype;
  domain: string;
  pages: Array<[url: string, theme: string, purpose?: string]>;
}

const PLAYERS: SeedPlayer[] = [
  // #0 — self. The memo's "You vs. Them" tracks Egert's own public state the same way.
  {
    slug: "egert-builds", name: "Egert (nordic-portfolio / egert.ai fork)", archetype: "self",
    domain: "nordic-portfolio.vercel.app",
    pages: [["https://nordic-portfolio.vercel.app", "home"]],
  },
  // Core field (from 01-estonian-ai-market-analysis.md, July 2026)
  {
    slug: "amperly", name: "Amperly", archetype: "agency", domain: "amperly.com",
    pages: [["https://amperly.com/", "home"]],
  },
  {
    slug: "kei-olbrei", name: "Kei Olbrei (vaibkood.ee / keivibes.com)", archetype: "coach-community", domain: "vaibkood.ee",
    pages: [
      ["https://www.vaibkood.ee/", "home"],
      ["https://www.vaibkood.ee/minust", "about"],
      ["https://www.keivibes.com/", "other", "Secondary personal brand site"],
    ],
  },
  {
    slug: "productory", name: "Productory", archetype: "corp-trainer", domain: "productory.ai",
    pages: [["https://www.productory.ai/et/", "home"], ["https://www.productory.ai/en/", "other", "EN version"]],
  },
  {
    slug: "kodulabor", name: "Kodulabor", archetype: "lab", domain: "kodulabor.ee",
    pages: [["https://www.kodulabor.ee/et", "home"]],
  },
  {
    slug: "ai-eesti", name: "AI Eesti", archetype: "agency", domain: "aieesti.ee",
    pages: [
      ["https://aieesti.ee/", "home"],
      ["https://aieesti.ee/et/meist", "about"],
      ["https://aieesti.ee/ai-koolitused/ai-masterclass/", "services"],
    ],
  },
  {
    slug: "non-tech-ai-advisory", name: "Non-Tech AI Advisory (Teet Torimel)", archetype: "corp-trainer", domain: "nontechaiadvisory.com",
    pages: [["https://nontechaiadvisory.com/", "home"]],
  },
  {
    slug: "marika-juusu", name: "Marika Juusu (vaibkoodimine.ee)", archetype: "coach-community", domain: "vaibkoodimine.ee",
    pages: [["https://vaibkoodimine.ee/", "home"], ["https://vaibkoodimine.ee/kontakt/", "about"]],
  },
  {
    slug: "human-intellect", name: "Human Intellect (Helen Anijalg)", archetype: "contrarian", domain: "h-intellect.ee",
    pages: [["https://h-intellect.ee/", "home"]],
  },
  {
    slug: "agentify", name: "Agentify", archetype: "agency", domain: "agentify.ee",
    pages: [["https://agentify.ee/", "home"], ["https://agentify.ee/meist", "about"]],
  },
  {
    slug: "kasulik-ai", name: "Kasulik.ai (Kristo Peterson)", archetype: "solo-trainer", domain: "kasulik.ai",
    pages: [["https://kasulik.ai/", "home"]],
  },
  {
    slug: "ai-turundus", name: "AI Turundus", archetype: "corp-trainer", domain: "aiturundus.ee",
    pages: [["https://www.aiturundus.ee/", "home"], ["https://www.aiturundus.ee/post/claude-skills-sinu-isiklik-ai-ekspert-kes-ei-unusta-kunagi", "blog", "Blog entry point — crawler follows to blog index"]],
  },
  {
    slug: "tehisintellekt-ee", name: "Tehisintellekt.ee (Eneli Eljand)", archetype: "corp-trainer", domain: "tehisintellekt.ee",
    pages: [["https://tehisintellekt.ee/", "home"]],
  },
  {
    slug: "seppo-ai", name: "Indrek Seppo (Seppo AI)", archetype: "solo-trainer", domain: "seppo.ai",
    pages: [["https://seppo.ai/", "home"]],
  },
  // Long tail (analysis doc §long-tail; Empler dropped — US SaaS, not an Estonian player)
  {
    slug: "ai-treening", name: "AI Treening", archetype: "corp-trainer", domain: "aitreening.ee",
    pages: [["https://aitreening.ee/", "home"], ["https://aitreening.ee/koolitused/ai-arendajatele", "services", "Claude Code / agentic dev course — direct overlap with Egert"]],
  },
  {
    slug: "ai-akadeemia", name: "AI Akadeemia", archetype: "school", domain: "aiakadeemia.ee",
    pages: [["https://aiakadeemia.ee/", "home"], ["https://aiakadeemia.ee/ai-koolitus/", "services"]],
  },
  {
    slug: "oixio", name: "OIXIO", archetype: "corp-trainer", domain: "oixio.eu",
    pages: [
      ["https://oixio.eu/et/advisory/ai-koolitused-ja-rakendamine/", "services"],
      ["https://oixio.eu/et/oixio-digital/tehisintellekt-ai/", "services", "AI solutions arm"],
    ],
  },
  {
    slug: "ux-estonia", name: "UX Estonia", archetype: "school", domain: "uxestonia.ee",
    pages: [
      ["https://uxestonia.ee/", "home"],
      ["https://uxestonia.ee/koolitused", "services"],
      ["https://uxestonia.ee/koolitused/vibe-coding-ehk-vaibkoodimine-koolitus", "services"],
    ],
  },
  // Removed 2026-07-10 (owner decision — not AI builders / off-topic drift):
  // taltech (university, crawl drifted to campus news), bcs-koolitus + veebikool
  // (broad IT-course schools, AI a fraction of catalog), eesti-ai (gov program,
  // context-only). Do not re-add without owner sign-off.

  // Added 2026-08-22 — new entrants research batch
  {
    slug: "pragmatiq-ai", name: "PragmatiqAI (Andres Gavriljuk)", archetype: "corp-trainer", domain: "pragmatiqai.com",
    pages: [
      ["https://pragmatiqai.com/", "home"],
      ["https://pragmatiqai.com/about", "about"],
    ],
  },
  {
    slug: "ivar-berg", name: "Ivar Berg", archetype: "solo-trainer", domain: "ivarberg.com",
    pages: [["https://ivarberg.com/", "home"]],
  },
  {
    slug: "ai-agentuur", name: "AI Agentuur (Heikki Mägi)", archetype: "agency", domain: "aiagentuur.ee",
    pages: [
      ["https://aiagentuur.ee/", "home"],
      ["https://aiagentuur.ee/meist", "about"],
    ],
  },
  {
    slug: "aipowerment", name: "AIPowerment (Sandra Reivik & Gerlyn Tiigemäe)", archetype: "coach-community", domain: "aipowerment.ee",
    pages: [
      ["https://aipowerment.ee/", "home"],
      ["https://aipowerment.ee/podcast", "blog"],
    ],
  },
  {
    slug: "katriin-mangus", name: "Katriin Mangus", archetype: "solo-trainer", domain: "katriinmangus.ee",
    pages: [
      ["https://katriinmangus.ee/", "home"],
      ["https://katriinmangus.ee/claude-intensiivkursus/", "services"],
    ],
  },
  {
    slug: "ai-abc", name: "AI-ABC (Oliver Loit)", archetype: "solo-trainer", domain: "ai-abc.ee",
    pages: [
      ["https://www.ai-abc.ee/", "home"],
      ["https://www.ai-abc.ee/eng", "other", "EN version"],
    ],
  },
  {
    slug: "jane-helandi", name: "Jane Helandi (JS Koolitused)", archetype: "solo-trainer", domain: "linkedin.com",
    pages: [["https://www.linkedin.com/in/janehelandi/", "about"]],
  },
  {
    slug: "gerlyn-tiigemae", name: "Gerlyn Tiigemäe", archetype: "solo-trainer", domain: "gerlyntiigemae.com",
    pages: [
      ["https://gerlyntiigemae.com/", "home"],
    ],
  },
];

async function main() {
  let playersInserted = 0;
  let pagesInserted = 0;

  for (const p of PLAYERS) {
    const res = await db
      .insert(watchPlayers)
      .values({ slug: p.slug, name: p.name, archetype: p.archetype, domain: p.domain })
      .onConflictDoNothing({ target: watchPlayers.slug })
      .returning({ id: watchPlayers.id });
    playersInserted += res.length;

    for (const [url, theme, purpose] of p.pages) {
      const sres = await db
        .insert(sources)
        .values({ competitor: p.slug, url, theme, purpose: purpose ?? null, discoveredBy: "seed" })
        .onConflictDoNothing({ target: sources.url })
        .returning({ id: sources.id });
      pagesInserted += sres.length;
    }
  }

  console.log(
    JSON.stringify({ players: PLAYERS.length, playersInserted, pagesInserted }),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
