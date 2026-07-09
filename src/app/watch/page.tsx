import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import { getWatchDb } from "@/db/watch";
import {
  scrapeRuns,
  sources,
  watchChanges,
  watchMemos,
  watchPlayers,
} from "@/db/schema-watch";
import { PlayerGrid } from "./components/player-grid";
import { CHANGE_TYPE_LABEL } from "./components/labels";

export const dynamic = "force-dynamic";

function timeAgo(d: Date | null): string {
  if (!d) return "never";
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 60) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default async function WatchPage() {
  const db = getWatchDb();
  const [players, allSources, lastRuns, changes, latestMemo] =
    await Promise.all([
      db.select().from(watchPlayers).where(eq(watchPlayers.active, true)),
      db.select({ id: sources.id, competitor: sources.competitor }).from(sources),
      db.select().from(scrapeRuns).orderBy(desc(scrapeRuns.startedAt)).limit(1),
      db
        .select()
        .from(watchChanges)
        .orderBy(desc(watchChanges.createdAt))
        .limit(20),
      db.select().from(watchMemos).orderBy(desc(watchMemos.createdAt)).limit(1),
    ]);

  const lastRun = lastRuns[0] ?? null;
  const lastChangeByPlayer = new Map<string, Date>();
  for (const c of changes) {
    if (c.createdAt && !lastChangeByPlayer.has(c.playerSlug)) {
      lastChangeByPlayer.set(c.playerSlug, c.createdAt);
    }
  }

  const gridPlayers = players
    .filter((p) => p.archetype !== "self")
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      archetype: p.archetype,
      domain: p.domain,
      lastChangeAgo: timeAgo(lastChangeByPlayer.get(p.slug) ?? null),
      changed: lastChangeByPlayer.has(p.slug),
    }));

  const memo = latestMemo[0] ?? null;

  return (
    <>
      <Header />
      <main className="flex-1 max-w-[1280px] mx-auto px-5 md:px-10 py-8 md:py-10 w-full">
        {/* Masthead — the Watch is its own product; the band says so */}
        <div className="bg-olive-deep text-canvas px-6 md:px-10 py-8 md:py-12 mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <h1 className="font-serif italic text-[38px] md:text-[56px] leading-[1.05] text-canvas">
              EE AI Builders Watch
            </h1>
            <p className="text-[15px] text-canvas/75 mt-3 max-w-[52ch]">
              The Estonian AI trainer &amp; agency field, under continuous
              watch.
            </p>
          </div>
          <dl className="flex items-baseline gap-8 md:gap-10 shrink-0">
            {[
              [gridPlayers.length, "players"],
              [allSources.length, "pages"],
              [
                lastRun?.startedAt ? timeAgo(lastRun.startedAt) : "never",
                "last run",
              ],
            ].map(([value, label]) => (
              <div key={String(label)}>
                <dd className="font-serif text-[30px] md:text-[36px] text-canvas leading-none">
                  {value}
                </dd>
                <dt className="text-[11px] uppercase tracking-[0.1em] text-canvas/60 mt-2">
                  {label}
                </dt>
              </div>
            ))}
          </dl>
        </div>

        {lastRun === null ? (
          <div className="border border-stone-border bg-cream px-6 py-12 text-center text-sm text-body">
            No runs yet. Trigger{" "}
            <code className="font-mono text-ink">run loop ee-ai-watch</code> in
            Claude Code.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left column: memo preview + changes feed */}
            <div className="lg:col-span-7 space-y-8">
              {memo && (
                <section className="border border-stone-border bg-surface lift">
                  <div className="flex items-baseline justify-between px-6 pt-5 pb-3 border-b border-stone-border">
                    <h2 className="text-[13px] font-semibold uppercase tracking-[0.04em] text-olive-deep">
                      Latest Watch Memo
                    </h2>
                    <Link
                      href="/watch/memos"
                      className="text-[12px] font-semibold text-slate hover:text-ink transition-colors"
                    >
                      Read all →
                    </Link>
                  </div>
                  <p className="px-6 py-5 font-serif text-[17px] leading-[1.65] text-body line-clamp-5 whitespace-pre-line">
                    {memo.contentMd
                      .replace(/^#+\s.*$/gm, "")
                      .replace(/\*\*/g, "")
                      .trim()
                      .slice(0, 600)}
                  </p>
                </section>
              )}

              <section>
                <h2 className="text-[13px] font-semibold uppercase tracking-[0.04em] text-ink mb-4">
                  Recent changes
                </h2>
                {changes.length === 0 ? (
                  <div className="border border-stone-border bg-cream px-6 py-8">
                    <p className="font-serif text-[17px] text-ink">
                      Baseline captured{" "}
                      {lastRun.startedAt ? timeAgo(lastRun.startedAt) : ""}.
                    </p>
                    <p className="text-sm text-body mt-1.5">
                      No substantive changes observed yet — the next run starts
                      the change log.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-stone-border border border-stone-border bg-surface">
                    {changes.map((c) => (
                      <li key={c.id}>
                        <Link
                          href={`/watch/player/${c.playerSlug}`}
                          className="flex items-start gap-3 px-5 py-4 hover:bg-cream transition-colors"
                        >
                          <span className="mt-0.5 shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 bg-olive-wash text-olive-deep">
                            {CHANGE_TYPE_LABEL[c.changeType] ?? c.changeType}
                          </span>
                          <span className="text-sm text-body leading-snug">
                            <span className="font-semibold text-ink">
                              {c.playerSlug}
                            </span>{" "}
                            — {c.summary}
                          </span>
                          <span className="ml-auto shrink-0 text-[11px] text-slate">
                            {timeAgo(c.createdAt)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            {/* Right column: field brief link + players */}
            <div className="lg:col-span-5 space-y-8">
              <Link
                href="/watch/brief"
                className="block border border-stone-border bg-surface p-6 lift"
              >
                <span className="font-serif italic text-xl text-ink">
                  Field Brief
                </span>
                <p className="text-sm text-body mt-2">
                  The living map of the field — archetypes, weaknesses, and
                  your openings. Updated surgically every run.
                </p>
                <span className="inline-block text-[12px] font-semibold text-olive-deep mt-3">
                  Open the brief →
                </span>
              </Link>

              <PlayerGrid players={gridPlayers} />
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
