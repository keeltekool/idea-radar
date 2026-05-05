"use client";

import { ScorePill } from "./score-pill";
import { SourceBadge } from "./source-badge";

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
  feasibilityScore: number | null;
  noveltyScore: number | null;
  stretchScore: number | null;
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
      <article className="bg-white border border-stone-border rounded-lg p-6 flex flex-col gap-3 hover:bg-cream transition-colors">
        <div className="flex items-center gap-2">
          <SourceBadge name={d.sourceName} />
          {d.author && (
            <span className="text-body text-sm">by {d.author}</span>
          )}
          {dateLabel && (
            <span className="text-slate text-xs">· {dateLabel}</span>
          )}
          <span
            className={`ml-auto px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${
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
        <h3 className="font-serif text-xl text-ink">
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
      className={`bg-white border rounded-lg p-6 flex flex-col gap-3 hover:bg-cream transition-colors ${
        d.isWildcard ? "border-2 border-ochre" : "border-stone-border"
      }`}
    >
      {d.isWildcard && (
        <div className="absolute -top-0 -right-0 bg-ochre text-white text-[10px] font-semibold uppercase tracking-widest px-3 py-1 rounded-bl-lg">
          Wildcard
        </div>
      )}

      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <SourceBadge name={d.sourceName} />
            {d.author && (
              <span className="text-body text-sm">by {d.author}</span>
            )}
            {dateLabel && (
              <span className="text-slate text-xs">· {dateLabel}</span>
            )}
          </div>
          <h3 className="font-serif text-2xl text-ink mb-1">
            <a
              href={d.url}
              target="_blank"
              rel="noopener"
              className="hover:underline"
            >
              {d.title}
            </a>
          </h3>
          {d.description && (
            <p className="text-body text-sm line-clamp-2">{d.description}</p>
          )}
        </div>

        {d.compositeScore !== null && (
          <div className="flex flex-col items-center pl-4">
            <div className="w-16 h-16 rounded-full border-2 border-ink bg-ink text-white flex items-center justify-center font-serif text-2xl">
              {d.compositeScore.toFixed(1)}
            </div>
            <span className="text-[11px] text-slate mt-1 uppercase tracking-wider font-semibold">
              Score
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-2 my-1">
        <ScorePill label="Feasibility" value={d.feasibilityScore} type="feasibility" />
        <ScorePill label="Novelty" value={d.noveltyScore} type="novelty" />
        <ScorePill label="Stretch" value={d.stretchScore} type="stretch" />
      </div>

      {d.summary && (
        <div className="bg-cream border border-stone-border rounded p-3">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-ink mb-1">
            Why this matters
          </h4>
          <p className="text-body text-sm">{d.summary}</p>
        </div>
      )}

      <div className="flex justify-between items-center mt-auto pt-3">
        <div className="flex gap-2 flex-wrap">
          {(d.techStack || []).slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="text-slate text-[10px] uppercase tracking-widest border border-stone-border px-2 py-1 rounded"
            >
              {tag}
            </span>
          ))}
          {(d.categories || []).slice(0, 2).map((cat) => (
            <span
              key={cat}
              className="text-olive text-[10px] uppercase tracking-widest border border-[#d4e0d0] bg-[#f0f5ee] px-2 py-1 rounded"
            >
              {cat}
            </span>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => sendFeedback("pass")}
            className={`px-3 py-1.5 rounded border text-[11px] font-semibold uppercase tracking-wider transition-colors ${
              d.userFeedback === "pass"
                ? "bg-slate text-white border-slate"
                : "border-stone-border text-slate hover:text-ink hover:border-ink"
            }`}
          >
            Pass
          </button>
          <button
            onClick={() => sendFeedback("spark")}
            className={`px-3 py-1.5 rounded border text-[11px] font-semibold uppercase tracking-wider transition-colors ${
              d.userFeedback === "spark"
                ? "bg-olive text-white border-olive"
                : "border-stone-border text-slate hover:text-olive hover:border-olive"
            }`}
          >
            Sparked ✦
          </button>
        </div>
      </div>
    </article>
  );
}
