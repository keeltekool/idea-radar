"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ARCHETYPE_LABEL } from "./labels";

type GridPlayer = {
  slug: string;
  name: string;
  archetype: string;
  domain: string;
  lastChangeAgo: string;
  changed: boolean;
};

export function PlayerGrid({ players }: { players: GridPlayer[] }) {
  const [filter, setFilter] = useState<string>("all");

  const archetypes = useMemo(
    () => [...new Set(players.map((p) => p.archetype))].sort(),
    [players],
  );
  const filtered =
    filter === "all" ? players : players.filter((p) => p.archetype === filter);

  return (
    <section>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.04em] text-ink">
          Players
        </h2>
        <span className="text-[11px] text-slate">
          {filtered.length} of {players.length}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        <button
          onClick={() => setFilter("all")}
          className={`text-[11px] uppercase tracking-wide px-2.5 py-1 border transition-colors ${
            filter === "all"
              ? "border-ink bg-ink text-canvas"
              : "border-stone-border text-body hover:border-ink"
          }`}
        >
          All
        </button>
        {archetypes.map((a) => (
          <button
            key={a}
            onClick={() => setFilter(a)}
            className={`text-[11px] uppercase tracking-wide px-2.5 py-1 border transition-colors ${
              filter === a
                ? "border-ink bg-ink text-canvas"
                : "border-stone-border text-body hover:border-ink"
            }`}
          >
            {ARCHETYPE_LABEL[a] ?? a}
          </button>
        ))}
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {filtered.map((p) => (
          <li key={p.slug}>
            <Link
              href={`/watch/player/${p.slug}`}
              className="block border border-stone-border bg-white px-4 py-3 hover:bg-cream transition-colors h-full"
            >
              <span className="block text-sm font-semibold text-ink leading-tight">
                {p.name}
              </span>
              <span className="block text-[11px] text-slate mt-1">
                {ARCHETYPE_LABEL[p.archetype] ?? p.archetype} · {p.domain}
              </span>
              <span
                className={`block text-[11px] mt-1.5 ${
                  p.changed ? "text-olive font-semibold" : "text-slate"
                }`}
              >
                {p.changed
                  ? `▲ changed ${p.lastChangeAgo}`
                  : "— quiet"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
