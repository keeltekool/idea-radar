"use client";

import { useEffect, useState } from "react";
import { YouTubeCard } from "../components/youtube-card";

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

type Memo = { id: number; content: string; videoCount: number; generatedAt: string };
type Tab = "curated" | "filtered" | "all";

const TABS: { key: Tab; label: string; status: string }[] = [
  { key: "curated", label: "Curated", status: "accepted" },
  { key: "filtered", label: "Filtered", status: "filtered" },
  { key: "all", label: "All", status: "all" },
];

export default function YouTubeDashboard() {
  const [tab, setTab] = useState<Tab>("curated");
  const [videos, setVideos] = useState<Video[]>([]);
  const [total, setTotal] = useState(0);
  const [allTotal, setAllTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [latestMemo, setLatestMemo] = useState<Memo | null>(null);

  useEffect(() => {
    fetch("/api/youtube/memos?limit=1")
      .then((r) => r.json())
      .then((data) => setLatestMemo(data.items?.[0] || null))
      .catch(() => {});
    fetch("/api/youtube/videos?status=all&limit=1")
      .then((r) => r.json())
      .then((data) => setAllTotal(data.total || 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    const currentTab = TABS.find((t) => t.key === tab)!;
    if (currentTab.status !== "all") params.set("status", currentTab.status);
    if (search) params.set("search", search);
    params.set("sort", tab === "curated" ? "score" : sort);
    params.set("limit", tab === "curated" ? "100" : "50");

    fetch(`/api/youtube/videos?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setVideos(data.items || []);
        setTotal(data.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tab, search, sort]);

  const scored = tab === "curated";

  return (
    <>
      {latestMemo && (
        <div className="bg-ink text-canvas p-6 md:p-8 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] uppercase tracking-[0.2em] text-canvas/50 font-semibold">
              Memo
            </span>
            <span className="text-[10px] text-canvas/40">
              &middot; {new Date(latestMemo.generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </span>
            <span className="text-[10px] text-canvas/40">
              &middot; {latestMemo.videoCount} videos
            </span>
          </div>
          <p className="font-serif italic text-lg md:text-xl leading-relaxed text-canvas/90 line-clamp-4">
            &ldquo;{latestMemo.content.slice(0, 300)}...&rdquo;
          </p>
          <a href="/youtube/memos" className="inline-block mt-4 text-sm text-olive hover:underline">
            Read the full memo &rarr;
          </a>
        </div>
      )}

      {!latestMemo && !loading && tab === "curated" && videos.length === 0 && (
        <div className="bg-cream border border-stone-border p-8 text-center mb-6">
          <p className="text-body text-sm">No curated videos yet. Switch to the All tab to see scraped videos, or wait for the Sunday run.</p>
        </div>
      )}

      <div className="flex items-center gap-6 mb-6 pb-4 border-b border-stone-border">
        <span className="text-xs text-slate">
          <strong className="text-ink">{allTotal} videos</strong>
          {tab !== "all" && total !== allTotal && (
            <> &middot; {total} {tab === "curated" ? "curated" : "filtered"}</>
          )}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="flex gap-0">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                tab === t.key
                  ? "bg-ink text-canvas"
                  : "bg-cream text-body hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex gap-3 flex-1 justify-end">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-stone-border px-3 py-1.5 text-sm bg-canvas w-40 md:w-52"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="border border-stone-border px-3 py-1.5 text-sm bg-canvas"
          >
            <option value="newest">Newest</option>
            <option value="score">Score</option>
            <option value="views">Views</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-stone-border bg-cream/50 h-32 animate-pulse" />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <p className="text-center text-slate py-12 text-sm">No videos match your search.</p>
      ) : (
        <div>
          {videos.map((v) => (
            <YouTubeCard key={v.id} video={v} scored={scored} />
          ))}
        </div>
      )}
    </>
  );
}
