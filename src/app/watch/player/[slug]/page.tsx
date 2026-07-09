import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { Header } from "../../../components/header";
import { Footer } from "../../../components/footer";
import { getWatchDb } from "@/db/watch";
import {
  sources,
  watchChanges,
  watchPlayers,
  watchPosts,
  watchSignals,
  type SignalProfile,
} from "@/db/schema-watch";
import { ARCHETYPE_LABEL, CHANGE_TYPE_LABEL } from "../../components/labels";

export const dynamic = "force-dynamic";

function fmt(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = getWatchDb();

  const playerRows = await db
    .select()
    .from(watchPlayers)
    .where(eq(watchPlayers.slug, slug))
    .limit(1);
  const player = playerRows[0];
  if (!player) notFound();

  const [signalRows, changes, posts, pages] = await Promise.all([
    db
      .select()
      .from(watchSignals)
      .where(eq(watchSignals.playerSlug, slug))
      .orderBy(desc(watchSignals.createdAt))
      .limit(1),
    db
      .select()
      .from(watchChanges)
      .where(eq(watchChanges.playerSlug, slug))
      .orderBy(desc(watchChanges.createdAt))
      .limit(30),
    db
      .select()
      .from(watchPosts)
      .where(eq(watchPosts.playerSlug, slug))
      .orderBy(desc(watchPosts.postedAt))
      .limit(15),
    db
      .select()
      .from(sources)
      .where(eq(sources.competitor, slug))
      .orderBy(desc(sources.lastScrapedAt)),
  ]);

  const signals = (signalRows[0]?.signals ?? null) as SignalProfile | null;

  return (
    <>
      <Header />
      <main className="flex-1 max-w-[1280px] mx-auto px-5 md:px-10 py-8 md:py-10 w-full">
        <Link
          href="/watch"
          className="text-[12px] text-slate hover:text-ink transition-colors"
        >
          ← EE AI Builders Watch
        </Link>

        <div className="mt-4 mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-2">
          <div>
            <h1 className="font-serif italic text-3xl text-ink">
              {player.name}
            </h1>
            <p className="text-[12px] uppercase tracking-[0.08em] text-slate mt-2">
              {ARCHETYPE_LABEL[player.archetype] ?? player.archetype} ·{" "}
              <a
                href={`https://${player.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-ink"
              >
                {player.domain}
              </a>
              {player.linkedinUrl && (
                <>
                  {" · "}
                  <a
                    href={player.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-ink"
                  >
                    LinkedIn
                  </a>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: signal profile + posts + tracked pages */}
          <div className="lg:col-span-5 space-y-8">
            <section className="border border-stone-border bg-surface p-6">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.04em] text-olive-deep mb-4">
                Signal profile
              </h2>
              {!signals ? (
                <p className="text-sm text-body">
                  Baseline captured — profile lands after the first analysis
                  pass.
                </p>
              ) : (
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-slate">Offer</dt>
                    <dd className="text-body mt-0.5">{signals.offer}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-slate">Pricing shown</dt>
                    <dd className="text-body mt-0.5">
                      {signals.pricingVisible ? "Yes" : "No — “book a call”"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-slate">Claimed metrics</dt>
                    <dd className="text-body mt-0.5">
                      {signals.claimedMetrics.length
                        ? signals.claimedMetrics.join(" · ")
                        : "None shown"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-slate">Named clients</dt>
                    <dd className="text-body mt-0.5">
                      {signals.namedClients.length
                        ? signals.namedClients.join(", ")
                        : "None named"}
                    </dd>
                  </div>
                  {signals.events.length > 0 && (
                    <div>
                      <dt className="text-[11px] uppercase tracking-wide text-slate">Events</dt>
                      <dd className="text-body mt-0.5">{signals.events.join(" · ")}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-slate">Positioning</dt>
                    <dd className="text-body mt-0.5 italic">“{signals.positioning}”</dd>
                  </div>
                </dl>
              )}
            </section>

            <section>
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.04em] text-ink mb-3">
                LinkedIn activity
              </h2>
              {posts.length === 0 ? (
                <p className="text-sm text-body border border-stone-border bg-cream px-4 py-4">
                  No posts captured yet — the Social Sweep runs as an optional
                  step of each loop run.
                </p>
              ) : (
                <ul className="divide-y divide-stone-border border border-stone-border bg-surface">
                  {posts.map((p) => (
                    <li key={p.id} className="px-4 py-3">
                      <p className="text-sm text-body leading-snug line-clamp-3">
                        {p.text}
                      </p>
                      <p className="text-[11px] text-slate mt-1">
                        {fmt(p.postedAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.04em] text-ink mb-3">
                Tracked pages ({pages.length})
              </h2>
              <ul className="divide-y divide-stone-border border border-stone-border bg-surface">
                {pages.map((s) => (
                  <li key={s.id} className="px-4 py-2.5 flex items-center gap-3">
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[13px] text-body hover:text-ink truncate underline-offset-2 hover:underline"
                      title={s.url}
                    >
                      {s.url.replace(/^https?:\/\/(www\.)?/, "")}
                    </a>
                    <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wide text-slate">
                      {s.theme}
                    </span>
                    {s.lastStatus && s.lastStatus !== "ok" && (
                      <span className="shrink-0 text-[10px] uppercase tracking-wide text-ochre">
                        {s.lastStatus.slice(0, 12)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Right: change timeline */}
          <div className="lg:col-span-7">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.04em] text-ink mb-3">
              Change timeline
            </h2>
            {changes.length === 0 ? (
              <div className="border border-stone-border bg-cream px-5 py-8 text-sm text-body">
                Baseline captured {fmt(player.createdAt)} — no changes observed
                yet.
              </div>
            ) : (
              <ul className="space-y-3">
                {changes.map((c) => (
                  <li key={c.id} className="border border-stone-border bg-surface p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 bg-olive-wash text-olive-deep">
                        {CHANGE_TYPE_LABEL[c.changeType] ?? c.changeType}
                      </span>
                      <span className="text-[11px] text-slate">
                        {fmt(c.createdAt)} · run #{c.runId}
                      </span>
                    </div>
                    <p className="text-sm text-ink leading-snug">{c.summary}</p>
                    {c.impact && (
                      <p className="text-sm text-body mt-1.5">
                        <span className="text-olive font-semibold">Impact:</span>{" "}
                        {c.impact}
                      </p>
                    )}
                    {c.sourceUrl && (
                      <a
                        href={c.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-slate underline underline-offset-2 hover:text-ink mt-2 inline-block"
                      >
                        {c.sourceUrl.replace(/^https?:\/\/(www\.)?/, "")}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
