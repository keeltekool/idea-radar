"use client";

import { useEffect, useState } from "react";

type Memo = { id: number; content: string; videoCount: number; generatedAt: string };

export default function YouTubeMemosPage() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/youtube/memos")
      .then((r) => r.json())
      .then((data) => {
        setMemos(data.items || []);
        if (data.items?.length) setExpanded(data.items[0].id);
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <h1 className="font-serif text-3xl font-bold text-ink mb-2">YouTube Memos</h1>
      <p className="text-body text-sm mb-8">Weekly coaching briefs from the YouTube Radar.</p>
      <div className="border-t border-stone-border" />

      {memos.length === 0 && (
        <p className="text-center text-slate py-12 text-sm">No memos yet. The first one arrives after the Sunday run.</p>
      )}

      {memos.map((memo) => (
        <div key={memo.id} className="border-b border-stone-border">
          <button
            type="button"
            onClick={() => setExpanded(expanded === memo.id ? null : memo.id)}
            className="w-full flex items-center justify-between py-5 text-left"
          >
            <div className="flex items-center gap-4">
              <span className="text-body text-sm">
                {new Date(memo.generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                {" at "}
                {new Date(memo.generatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className="text-[11px] bg-cream text-body px-2 py-0.5 font-semibold">
                {memo.videoCount} videos
              </span>
            </div>
            <span className="text-slate text-lg">{expanded === memo.id ? "⌃" : "⌄"}</span>
          </button>

          {expanded === memo.id && (
            <div className="pb-6 max-w-none text-body leading-relaxed">
              {memo.content.split("\n").map((line, i) => {
                if (line.startsWith("# ") && !line.startsWith("## "))
                  return <h2 key={i} className="text-ink font-bold text-xl mt-6 mb-3 border-b border-stone-border pb-2">{line.replace(/^#+ /, "")}</h2>;
                if (line.startsWith("## "))
                  return <h3 key={i} className="text-ink font-bold text-base mt-6 mb-2">{line.replace("## ", "")}</h3>;
                if (line.trim() === "") return <div key={i} className="h-3" />;
                const rendered = line
                  .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-ink font-semibold">$1</strong>')
                  .replace(/\*([^*]+)\*/g, '<em>$1</em>');
                return <p key={i} className="mb-2 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: rendered }} />;
              })}
            </div>
          )}
        </div>
      ))}
    </>
  );
}
