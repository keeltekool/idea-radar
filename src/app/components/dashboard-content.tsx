"use client";

import { useEffect, useState } from "react";
import { DiscoveryCard } from "./discovery-card";
import { LatestMemoCard } from "./latest-memo-card";

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
  scrapedAt: string;
};

type Source = {
  id: number;
  name: string;
  type: string;
  acceptanceRate: number | null;
};

type Tab = "all" | "filtered" | "curated";
type Lane = "push" | "levelup";

const TABS: { key: Tab; label: string; status: string }[] = [
  { key: "curated", label: "Radar", status: "accepted" },
  { key: "filtered", label: "Filtered", status: "relevant" },
  { key: "all", label: "All", status: "all" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "score", label: "Score" },
  { value: "novelty", label: "Novelty" },
  { value: "stretch", label: "Stretch" },
];

export function DashboardContent() {
  const [tab, setTab] = useState<Tab>("curated");
  const [lane, setLane] = useState<Lane>("push");
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [sort, setSort] = useState("newest");

  useEffect(() => {
    fetch("/api/sources")
      .then((r) => r.json())
      .then(setSources)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    const currentTab = TABS.find((t) => t.key === tab)!;
    if (currentTab.status !== "all") params.set("status", currentTab.status);
    if (search) params.set("search", search);
    if (sourceFilter) params.set("source", sourceFilter);
    params.set("sort", tab === "radar" ? "score" : sort);
    params.set("limit", tab === "radar" ? "200" : "50");

    fetch(`/api/discoveries?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setDiscoveries(data.items || []);
        setTotal(data.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tab, search, sourceFilter, sort]);

  const pushItems = discoveries.filter((d) => d.track !== "familiar");
  const levelUpItems = discoveries.filter((d) => d.track === "familiar");
  const laneItems = lane === "push" ? pushItems : levelUpItems;

  return (
    <>
      {/* Memo hero — the coach speaks first */}
      <LatestMemoCard />

      {/* Run stats */}
      <div className="flex items-center gap-6 mb-6 pb-4 border-b border-stone-border">
        <span className="text-xs text-slate">
          {sources.filter((s) => s.acceptanceRate !== null).length} sources &middot;{" "}
          <strong className="text-ink">{total} items</strong>
        </span>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-0 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.06em] transition-colors ${
              tab === t.key
                ? "bg-ink text-white"
                : "bg-cream text-slate border border-stone-border border-l-0 first:border-l hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}

        <div className="flex-1" />

        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate text-base">
              search
            </span>
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-48 bg-surface border border-stone-border py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-ink transition-colors"
            />
          </div>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-surface border border-stone-border py-2 px-3 text-[12px] font-semibold uppercase tracking-wider text-ink focus:outline-none"
          >
            <option value="">All sources</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-surface border border-stone-border py-2 px-3 text-[12px] font-semibold uppercase tracking-wider text-ink focus:outline-none"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="border border-stone-border bg-surface p-6">
              <div className="h-5 w-3/4 bg-cream animate-pulse mb-3" />
              <div className="h-3 w-full bg-cream animate-pulse mb-2" />
              <div className="h-3 w-2/3 bg-cream animate-pulse" />
            </div>
          ))}
        </div>
      ) : discoveries.length === 0 ? (
        <div className="text-center py-20">
          <p className="font-serif text-2xl text-ink mb-2">No discoveries yet</p>
          <p className="text-body text-sm">
            Run the pipeline to fetch and score projects from your {sources.length} sources.
          </p>
        </div>
      ) : tab === "curated" ? (
        <div className="fade-up">
          {/* Lane tabs */}
          <div className="flex gap-0 mb-8">
            <button
              onClick={() => setLane("push")}
              className={`px-6 py-3 text-[13px] font-bold uppercase tracking-[0.06em] transition-colors ${
                lane === "push"
                  ? "bg-ink text-white"
                  : "bg-cream text-slate border border-stone-border border-l-0 hover:text-ink"
              }`}
            >
              Push{" "}
              <span className="text-[11px] font-medium opacity-60 ml-1">
                {pushItems.length}
              </span>
            </button>
            <button
              onClick={() => setLane("levelup")}
              className={`px-6 py-3 text-[13px] font-bold uppercase tracking-[0.06em] transition-colors ${
                lane === "levelup"
                  ? "bg-ink text-white"
                  : "bg-cream text-slate border border-stone-border border-l-0 hover:text-ink"
              }`}
            >
              Level Up{" "}
              <span className="text-[11px] font-medium opacity-60 ml-1">
                {levelUpItems.length}
              </span>
            </button>
          </div>

          {/* Lane tagline */}
          <p className="text-sm text-slate italic mb-6">
            {lane === "push"
              ? "Unfamiliar domains — what new skills would building these teach you?"
              : "You could build this better — what craft angle would make yours stand out?"}
          </p>

          {laneItems.length === 0 ? (
            <p className="text-body text-sm py-6">
              Nothing in this lane from the latest run.
            </p>
          ) : (
            <div className="flex flex-col gap-5">
              {laneItems.map((d) => (
                <DiscoveryCard key={d.id} discovery={d} variant="curated" />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="fade-up">
          <div className="flex flex-col gap-4">
            {discoveries.map((d) => (
              <DiscoveryCard key={d.id} discovery={d} variant="basic" />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
