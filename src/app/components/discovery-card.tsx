"use client";

import { ScorePill } from "./score-pill";

type Discovery = {
  id: number;
  title: string;
  description: string | null;
  url: string;
  sourceName: string;
  author: string | null;
  techStack: string[] | null;
  categories: string[] | null;
  status: string;
  track: string | null;
  feasibilityScore: number | null;
  noveltyScore: number | null;
  stretchScore: number | null;
  tractionScore: number | null;
  relevanceScore: number | null;
  improvabilityScore: number | null;
  compositeScore: number | null;
  summary: string | null;
  isWildcard: boolean;
  userFeedback: string | null;
  publishedAt: string | null;
};

type Props = {
  discovery: Discovery;
  variant: "curated" | "basic";
};

function formatDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function DiscoveryCard({ discovery, variant }: Props) {
  const d = discovery;
  const dateLabel = formatDate(d.publishedAt);
  const isFamiliar = d.track === "familiar";

  async function sendFeedback(feedback: "spark" | "pass") {
    await fetch(`/api/discoveries/${d.id}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedback }),
    });
    window.location.reload();
  }

  if (variant === "basic") {
    return (
      <article className="bg-surface border border-stone-border p-5 flex flex-col gap-2 hover:bg-cream transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate bg-cream border border-stone-border px-2 py-0.5">
            {d.sourceName}
          </span>
          {d.author && (
            <span className="text-body text-sm">by {d.author}</span>
          )}
          {dateLabel && (
            <span className="text-slate text-xs">&middot; {dateLabel}</span>
          )}
          <span
            className={`ml-auto px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${
              d.status === "accepted"
                ? "text-olive border-[#d4e0d0] bg-[#f0f5ee]"
                : d.status === "rejected"
                  ? "text-slate border-stone-border bg-cream"
                  : "text-ochre border-[#f0deb0] bg-[#fdf6ec]"
            }`}
          >
            {d.status}
          </span>
        </div>
        <h3 className="text-base font-bold text-ink">
          <a href={d.url} target="_blank" rel="noopener" className="hover:underline">
            {d.title}
          </a>
        </h3>
        {d.description && (
          <p className="text-body text-sm line-clamp-2">{d.description}</p>
        )}
      </article>
    );
  }

  return (
    <article
      className={`bg-surface border grid hover:bg-cream/50 transition-colors ${
        d.isWildcard ? "border-2 border-ochre" : "border-stone-border"
      }`}
      style={{ gridTemplateColumns: "72px 1fr" }}
    >
      {/* Score strip */}
      <div className="bg-ink flex flex-col items-center justify-center py-6">
        <span className="font-serif text-[28px] font-bold leading-none text-canvas">
          {d.compositeScore?.toFixed(1) ?? "—"}
        </span>
        <span className="text-[9px] uppercase tracking-wider mt-1 text-canvas/40">
          {d.isWildcard ? "Wild" : isFamiliar ? "Up" : "Push"}
        </span>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Title row */}
        <div className="flex items-baseline gap-2.5 mb-1.5 flex-wrap">
          <h3 className="text-lg font-extrabold text-ink leading-tight">
            <a href={d.url} target="_blank" rel="noopener" className="hover:underline">
              {d.title}
            </a>
          </h3>
          {(d.categories || []).slice(0, 2).map((cat) => (
            <span
              key={cat}
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 ${
                d.isWildcard
                  ? "bg-ochre-wash text-ochre"
                  : isFamiliar
                    ? "bg-ochre-wash text-ochre"
                    : "bg-olive-wash text-olive"
              }`}
            >
              {cat}
            </span>
          ))}
          {d.isWildcard && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-ochre-wash text-ochre">
              Wildcard
            </span>
          )}
        </div>

        {/* Source + date */}
        <p className="text-xs text-slate mb-3">
          {d.sourceName}
          {d.author ? ` · by ${d.author}` : ""}
          {dateLabel ? ` · ${dateLabel}` : ""}
        </p>

        {/* Summary — the main content */}
        {d.summary && (
          <p className="text-sm leading-relaxed text-body mb-4">
            {d.summary}
          </p>
        )}

        {/* Score pills + feedback */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-1.5 flex-wrap">
            {isFamiliar ? (
              <>
                <ScorePill label="Traction" value={d.tractionScore} type="traction" />
                <ScorePill label="Relevance" value={d.relevanceScore} type="relevance" />
                <ScorePill label="Do Better" value={d.improvabilityScore} type="improvability" />
              </>
            ) : (
              <>
                <ScorePill label="Novelty" value={d.noveltyScore} type="novelty" />
                <ScorePill label="Stretch" value={d.stretchScore} type="stretch" />
                <ScorePill label="Feasibility" value={d.feasibilityScore} type="feasibility" />
              </>
            )}
          </div>

          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => sendFeedback("pass")}
              className={`px-3 py-1.5 border text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                d.userFeedback === "pass"
                  ? "bg-slate text-white border-slate"
                  : "border-stone-border text-slate hover:text-ink hover:border-ink"
              }`}
            >
              Pass
            </button>
            <button
              onClick={() => sendFeedback("spark")}
              className={`px-3 py-1.5 border text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                d.userFeedback === "spark"
                  ? "bg-olive text-white border-olive"
                  : "border-stone-border text-slate hover:text-olive hover:border-olive"
              }`}
            >
              Sparked
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
