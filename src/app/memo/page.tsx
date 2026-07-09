"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Header } from "../components/header";
import { Footer } from "../components/footer";

type Memo = {
  id: number;
  scrapeRunId: number | null;
  content: string;
  discoveryCount: number;
  generatedAt: string;
};

export default function MemoPage() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/memos?limit=50")
      .then((r) => r.json())
      .then((data) => {
        setMemos(data.items || []);
        setLoading(false);
        if (data.items?.length > 0) {
          setExpandedId(data.items[0].id);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <>
      <Header />
      <main className="flex-1 max-w-[1280px] mx-auto px-10 py-10 w-full">
        <div className="pb-6 mb-10 border-b border-stone-border">
          <h1 className="font-serif text-[40px] font-medium tracking-[-0.02em] text-ink">
            Builder Memos
          </h1>
          <p className="text-body text-lg mt-1">
            Coaching briefs generated after each discovery run.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate">Loading...</div>
        ) : memos.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-serif text-2xl text-ink mb-2">No memos yet</p>
            <p className="text-body text-sm">
              Run the discovery pipeline to generate your first coaching memo.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {memos.map((memo) => {
              const isExpanded = expandedId === memo.id;
              return (
                <article
                  key={memo.id}
                  className="bg-surface border border-stone-border rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : memo.id)}
                    className="w-full flex items-center justify-between p-6 text-left hover:bg-cream transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-serif text-xl text-ink">
                        {formatDate(memo.generatedAt)}
                      </span>
                      <span className="bg-cream text-slate text-[13px] font-semibold px-2 py-1 rounded border border-stone-border">
                        {memo.discoveryCount} discoveries
                      </span>
                    </div>
                    <span className="material-symbols-outlined text-slate text-xl">
                      {isExpanded ? "expand_less" : "expand_more"}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="px-6 pb-6 pt-0 border-t border-stone-border">
                      <article className="prose prose-stone max-w-none prose-headings:font-serif prose-headings:font-medium prose-p:text-body prose-li:text-body prose-strong:text-ink prose-a:text-ink prose-a:underline pt-6">
                        <ReactMarkdown>{memo.content}</ReactMarkdown>
                      </article>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
