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

  const preview = memo.content.slice(0, 300).replace(/[#*_]/g, "");
  const date = new Date(memo.generatedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Link href="/memo" className="block mb-8">
      <div className="bg-white border border-stone-border rounded-lg p-6 hover:bg-cream transition-colors">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink">
            Latest Builder Memo
          </h3>
          <span className="text-[11px] text-slate uppercase tracking-wider">
            {date} · {memo.discoveryCount} discoveries
          </span>
        </div>
        <p className="text-body text-sm line-clamp-3">{preview}...</p>
        <span className="text-ink text-[13px] font-semibold mt-3 inline-block hover:underline">
          Read full memo →
        </span>
      </div>
    </Link>
  );
}
