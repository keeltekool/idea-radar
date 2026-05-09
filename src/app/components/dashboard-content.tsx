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
  feasibilityScore: number | null;
  noveltyScore: number | null;
  stretchScore: number | null;
  compositeScore: number | null;
  summary: string | null;
  isWildcard: boolean;
  userFeedback: string | null;
  publishedAt: string | null;
};

type Source = {
  id: number;
  name: string;
  type: string;
  acceptanceRate: number | null;
};

type Tab = "all" | "filtered" | "curated";

const TABS: { key: Tab; label: string; status: string }[] = [
  { key: "all", label: "All Discoveries", status: "all" },
  { key: "filtered", label: "Filtered", status: "relevant" },
  { key: "curated", label: "Curated", status: "accepted" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "score", label: "Score" },
  { value: "novelty", label: "Novelty" },
  { value: "stretch", label: "Stretch" },
];

export function DashboardContent() {
  const [tab, setTab] = useState<Tab>("curated");
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
    params.set("sort", sort);
    params.set("limit", "50");

    fetch(`/api/discoveries?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setDiscoveries(data.items || []);
        setTotal(data.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tab, search, sourceFilter, sort]);

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4 border-b border-stone-border pb-6">
        <div className="flex items-center gap-4">
          <h1 className="font-serif text-[40px] font-medium tracking-[-0.02em] text-ink">
            {TABS.find((t) => t.key === tab)?.label}
          </h1>
          <span className="bg-cream text-slate text-[13px] font-semibold px-2 py-1 rounded border border-stone-border">
            {total} items
          </span>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate text-lg">
              search
            </span>
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-stone-border rounded py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-ink transition-colors"
            />
          </div>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-white border border-stone-border rounded py-2 px-3 text-[13px] font-semibold uppercase tracking-wider text-ink focus:outline-none focus:border-ink"
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
            className="bg-white border border-stone-border rounded py-2 px-3 text-[13px] font-semibold uppercase tracking-wider text-ink focus:outline-none focus:border-ink"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <LatestMemoCard />

      {/* Tab bar */}
      <div className="flex gap-1 mb-8">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-[13px] font-semibold uppercase tracking-[0.04em] rounded transition-colors ${
              tab === t.key
                ? "bg-ink text-white"
                : "text-slate hover:text-ink hover:bg-cream"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate">Loading...</div>
      ) : discoveries.length === 0 ? (
        <div className="text-center py-20">
          <p className="font-serif text-2xl text-ink mb-2">No discoveries yet</p>
          <p className="text-body text-sm">
            Run the pipeline to fetch and score projects from your 15 sources.
          </p>
        </div>
      ) : (
        <div
          className={
            tab === "curated"
              ? "grid grid-cols-1 xl:grid-cols-2 gap-6"
              : "flex flex-col gap-4"
          }
        >
          {discoveries.map((d) => (
            <DiscoveryCard
              key={d.id}
              discovery={d}
              variant={tab === "curated" ? "curated" : "basic"}
            />
          ))}
        </div>
      )}
    </>
  );
}
