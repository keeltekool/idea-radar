"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Memo = {
  id: number;
  content: string;
  discoveryCount: number;
  generatedAt: string;
};

export function LatestMemoCard() {
  const [memo, setMemo] = useState<Memo | null>(null);

  useEffect(() => {
    fetch("/api/memos?limit=1")
      .then((r) => r.json())
      .then((data) => {
        if (data.items?.length > 0) setMemo(data.items[0]);
      })
      .catch(() => {});
  }, []);

  if (!memo) return null;

  const firstQuote = memo.content
    .split("\n")
    .find((l) => l.trim().length > 40 && !l.startsWith("#") && !l.startsWith("-"));
  const preview = (firstQuote || memo.content.slice(0, 300)).replace(/[#*_]/g, "").trim();
  const date = new Date(memo.generatedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Link href="/memo" className="block mb-8">
      <div className="bg-ink p-8 md:p-10 hover:bg-ink/95 transition-colors relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-full bg-gradient-to-bl from-olive/10 to-transparent" />
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-olive mb-4">
          Memo &middot; {date} &middot; {memo.discoveryCount} discoveries
        </p>
        <p className="font-serif italic text-xl md:text-2xl leading-relaxed text-cream max-w-[720px] mb-5">
          &ldquo;{preview.slice(0, 250)}&rdquo;
        </p>
        <span className="text-olive text-[13px] font-bold inline-flex items-center gap-1.5">
          Read the full memo <span className="text-base">→</span>
        </span>
      </div>
    </Link>
  );
}
