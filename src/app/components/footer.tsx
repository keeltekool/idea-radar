"use client";

import { usePathname } from "next/navigation";

export function Footer() {
  const isWatch = usePathname().startsWith("/watch");

  return (
    <footer className="bg-ink text-canvas mt-auto">
      <div className="max-w-[1280px] mx-auto px-5 md:px-10 py-8 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
        <span className="font-serif italic text-lg text-canvas">
          {isWatch ? "EE Watch" : "Idea Radar"}
        </span>
        <span className="text-[11px] text-canvas/55">
          {isWatch
            ? "Estonian AI field intelligence · players, signals & memos"
            : "Personal intelligence · discoveries, memos & the Estonian AI field watch"}
        </span>
      </div>
    </footer>
  );
}
