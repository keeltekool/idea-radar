import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { desc } from "drizzle-orm";
import { Header } from "../../components/header";
import { Footer } from "../../components/footer";
import { getWatchDb } from "@/db/watch";
import { watchMemos } from "@/db/schema-watch";

export const dynamic = "force-dynamic";

function fmt(d: Date | null): string {
  if (!d) return "";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function WatchMemosPage() {
  const db = getWatchDb();
  const memos = await db
    .select()
    .from(watchMemos)
    .orderBy(desc(watchMemos.createdAt))
    .limit(50);

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
        <h1 className="font-serif italic text-3xl text-ink mt-4 mb-8">
          Watch Memos
        </h1>

        {memos.length === 0 ? (
          <div className="border border-stone-border bg-cream px-6 py-12 text-center text-sm text-body">
            No memos yet — each loop run ends with one.
          </div>
        ) : (
          <div className="space-y-4">
            {memos.map((m, i) => (
              <details
                key={m.id}
                open={i === 0}
                className="border border-stone-border bg-white group"
              >
                <summary className="cursor-pointer px-6 py-4 text-sm font-semibold text-ink list-none flex items-baseline justify-between hover:bg-cream transition-colors">
                  <span>Run #{m.runId} — {fmt(m.createdAt)}</span>
                  <span className="text-[11px] text-slate group-open:hidden">
                    expand
                  </span>
                </summary>
                <div className="px-6 pb-6 prose prose-sm max-w-none prose-headings:font-sans prose-headings:text-ink prose-p:text-body prose-li:text-body prose-strong:text-ink">
                  <ReactMarkdown>{m.contentMd}</ReactMarkdown>
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
