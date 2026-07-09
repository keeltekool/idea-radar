import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { asc } from "drizzle-orm";
import { Header } from "../../components/header";
import { Footer } from "../../components/footer";
import { getWatchDb } from "@/db/watch";
import { watchBrief } from "@/db/schema-watch";

export const dynamic = "force-dynamic";

const SECTION_TITLE: Record<string, string> = {
  meta: "Scan status",
  "why-this-exists": "Why this brief exists",
  "field-overview": "The field at a glance",
  archetypes: "The five archetypes",
  "common-weaknesses": "Common weaknesses — your openings",
  "dangerous-competitor": "The one dangerous competitor",
  "strategic-conclusion": "Strategic conclusion",
  "recent-changes": "Recent changes",
  changelog: "Changelog",
};

export default async function FieldBriefPage() {
  const db = getWatchDb();
  const sections = await db
    .select()
    .from(watchBrief)
    .orderBy(asc(watchBrief.position));

  return (
    <>
      <Header />
      <main className="flex-1 max-w-[820px] mx-auto px-5 md:px-10 py-8 md:py-10 w-full">
        <Link
          href="/watch"
          className="text-[12px] text-slate hover:text-ink transition-colors"
        >
          ← EE AI Builders Watch
        </Link>
        <h1 className="font-serif italic text-3xl text-ink mt-4 mb-2">
          Field Brief
        </h1>
        <p className="text-sm text-body mb-8">
          The living map of the Estonian AI builder field. Neon-operative;
          every scan applies surgical, source-cited edits.
        </p>

        {sections.length === 0 ? (
          <div className="border border-stone-border bg-cream px-6 py-12 text-center text-sm text-body">
            Brief not seeded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {sections.map((s, i) => (
              <details
                key={s.id}
                open={i <= 1}
                className="border border-stone-border bg-white group"
              >
                <summary className="cursor-pointer px-6 py-4 text-sm font-semibold text-ink list-none flex items-baseline justify-between hover:bg-cream transition-colors">
                  <span>{SECTION_TITLE[s.section] ?? s.section}</span>
                  <span className="text-[11px] text-slate group-open:hidden">
                    expand
                  </span>
                </summary>
                <div className="px-6 pb-6 prose prose-sm max-w-none overflow-x-auto prose-headings:font-sans prose-headings:text-ink prose-p:text-body prose-li:text-body prose-strong:text-ink prose-table:text-[13px]">
                  <ReactMarkdown>{s.contentMd}</ReactMarkdown>
                </div>
              </details>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
