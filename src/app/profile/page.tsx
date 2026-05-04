"use client";

import { useEffect, useState } from "react";
import { Header } from "../components/header";
import { Footer } from "../components/footer";

type Profile = {
  content: string;
  generatedAt: string | null;
  projectCount: number;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [reindexing, setReindexing] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        setProfile(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleReindex() {
    setReindexing(true);
    try {
      const res = await fetch("/api/profile/reindex");
      const data = await res.json();
      const profileRes = await fetch("/api/profile");
      const profileData = await profileRes.json();
      setProfile(profileData);
    } catch {
      // ignore
    }
    setReindexing(false);
  }

  return (
    <>
      <Header />
      <main className="flex-1 max-w-[1280px] mx-auto px-10 py-10 w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 mb-10 border-b border-stone-border">
          <div>
            <h1 className="font-serif text-[40px] font-medium tracking-[-0.02em] text-ink">
              Builder Profile
            </h1>
            <p className="text-body text-lg mt-1">
              Intelligence summary based on your project portfolio.
            </p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-2">
            <button
              onClick={handleReindex}
              disabled={reindexing}
              className="bg-ink text-white px-4 py-2 rounded text-[13px] font-semibold uppercase tracking-wider hover:bg-body transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">
                sync
              </span>
              {reindexing ? "Re-indexing..." : "Re-index My Portfolio"}
            </button>
            {profile?.generatedAt && (
              <span className="text-[10px] uppercase tracking-widest text-slate">
                Last indexed:{" "}
                {new Date(profile.generatedAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate">Loading...</div>
        ) : (
          <div className="bg-white border border-stone-border rounded-lg p-8 md:p-12">
            <div className="flex items-center justify-between border-b border-stone-border pb-4 mb-6">
              <h2 className="font-serif text-[32px] font-medium text-ink">
                Synthesized Profile
              </h2>
              {profile?.projectCount && (
                <span className="text-[13px] font-semibold text-slate bg-cream px-2 py-1 rounded">
                  {profile.projectCount} projects
                </span>
              )}
            </div>
            <article className="prose prose-stone max-w-none prose-headings:font-serif prose-headings:font-medium prose-p:text-body prose-li:text-body prose-strong:text-ink prose-a:text-ink prose-a:underline">
              <div
                dangerouslySetInnerHTML={{
                  __html: markdownToHtml(profile?.content || ""),
                }}
              />
            </article>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hulo])/gm, '<p>')
    .replace(/<p><\/p>/g, '')
    .replace(/<p>(<[hulo])/g, '$1')
    .replace(/(<\/[hulo][^>]*>)<\/p>/g, '$1');
}
