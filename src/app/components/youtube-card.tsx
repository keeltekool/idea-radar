"use client";

import { useState } from "react";

type Video = {
  id: number;
  videoId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  viewCount: number | null;
  channelName: string | null;
  publishedAt: string | null;
  status: string;
  score: number | null;
  verdict: string | null;
  takeaway: string | null;
  buildSuggestion: string | null;
  tags: string[] | null;
  userFeedback: string | null;
};

function formatViews(n: number | null): string {
  if (!n) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function YouTubeCard({ video, scored }: { video: Video; scored: boolean }) {
  const [feedback, setFeedback] = useState<string | null>(video.userFeedback);

  const handleFeedback = async (fb: "spark" | "pass") => {
    setFeedback(fb);
    await fetch(`/api/youtube/videos/${video.id}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedback: fb }),
    });
  };

  const url = `https://www.youtube.com/watch?v=${video.videoId}`;

  return (
    <div className="border border-stone-border bg-canvas p-0 mb-4">
      <div className="flex flex-col sm:flex-row gap-0">
        {video.thumbnailUrl && (
          <a
            href={url}
            target="_blank"
            rel="noopener"
            className="shrink-0 block sm:w-[200px] md:w-[240px]"
          >
            <img
              src={video.thumbnailUrl}
              alt=""
              className="w-full aspect-video object-cover"
              loading="lazy"
            />
          </a>
        )}
        <div className="flex-1 p-4 sm:p-5 min-w-0">
          <div className="flex items-start gap-3 mb-2">
            {scored && video.score != null && (
              <div className="shrink-0 bg-ink w-12 h-12 flex flex-col items-center justify-center">
                <span className="font-serif text-lg font-bold text-canvas">
                  {video.score.toFixed(1)}
                </span>
                {video.verdict && (
                  <span className={`text-[8px] font-bold uppercase tracking-wider ${
                    video.verdict === "watch" ? "text-olive" : "text-slate"
                  }`}>
                    {video.verdict}
                  </span>
                )}
              </div>
            )}
            <div className="min-w-0">
              <a
                href={url}
                target="_blank"
                rel="noopener"
                className="text-ink font-bold text-[15px] leading-snug hover:underline line-clamp-2"
              >
                {video.title}
              </a>
              <p className="text-xs text-slate mt-1">
                {video.channelName}
                {video.viewCount ? ` · ${formatViews(video.viewCount)} views` : ""}
                {video.publishedAt ? ` · ${timeAgo(video.publishedAt)}` : ""}
              </p>
            </div>
          </div>

          {scored && video.takeaway && (
            <p className="text-body text-[13px] leading-relaxed mt-3">
              {video.takeaway}
            </p>
          )}

          {scored && video.buildSuggestion && (
            <p className="text-[13px] leading-relaxed mt-2">
              <span className="text-olive font-semibold">Build:</span>{" "}
              <span className="text-body">{video.buildSuggestion}</span>
            </p>
          )}

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-border">
            <div className="flex flex-wrap gap-1.5">
              {(video.tags || []).map((tag) => (
                <span
                  key={tag}
                  className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-cream text-olive"
                >
                  {tag}
                </span>
              ))}
              {!scored && (
                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 ${
                  video.status === "accepted" ? "bg-olive/10 text-olive"
                  : video.status === "skipped" ? "bg-stone-200 text-slate"
                  : "bg-cream text-body"
                }`}>
                  {video.status}
                </span>
              )}
            </div>

            {scored && (
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleFeedback("pass")}
                  className={`text-xs font-semibold px-3 py-1 border transition-colors ${
                    feedback === "pass"
                      ? "border-ink bg-ink text-canvas"
                      : "border-stone-border text-slate hover:text-ink"
                  }`}
                >
                  Pass
                </button>
                <button
                  type="button"
                  onClick={() => handleFeedback("spark")}
                  className={`text-xs font-semibold px-3 py-1 border transition-colors ${
                    feedback === "spark"
                      ? "border-ink bg-ink text-canvas"
                      : "border-stone-border text-slate hover:text-ink"
                  }`}
                >
                  Sparked
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
