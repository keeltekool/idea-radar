"use client";

import { useState } from "react";
import { Header } from "../components/header";
import { Footer } from "../components/footer";

export default function NewsletterPage() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState("");

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/newsletter/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (res.ok) {
      setSubscribed(true);
    } else {
      const data = await res.json();
      setError(data.error || "Failed to subscribe");
    }
  }

  return (
    <>
      <Header />
      <main className="flex-1 max-w-[1280px] mx-auto px-10 py-10 w-full">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-4 flex flex-col gap-10">
            <div>
              <h1 className="font-serif text-[40px] font-medium tracking-[-0.02em] text-ink">
                Newsletter
              </h1>
              <p className="text-body text-lg mt-1">
                Personal discovery digest delivered after each curation run.
              </p>
            </div>

            <div className="bg-white border border-stone-border rounded-lg p-6 flex flex-col gap-6">
              <div>
                <h2 className="font-serif text-2xl text-ink mb-1">
                  Subscribe
                </h2>
                <p className="text-body text-sm">
                  Get curated discoveries sent to your inbox.
                </p>
              </div>

              {subscribed ? (
                <div className="bg-[#f0f5ee] border border-[#d4e0d0] rounded p-4">
                  <p className="text-olive text-sm font-semibold">
                    Subscribed!
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex flex-col gap-4">
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-ink">
                      Email
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="border border-stone-border rounded px-4 py-2 text-sm focus:outline-none focus:border-ink transition-colors"
                      placeholder="you@example.com"
                    />
                  </label>
                  {error && <p className="text-red-600 text-sm">{error}</p>}
                  <button
                    type="submit"
                    className="bg-ink text-white text-[13px] font-semibold uppercase tracking-wider px-6 py-2 rounded hover:bg-body transition-colors"
                  >
                    Subscribe
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="md:col-span-8">
            <div className="flex items-center justify-between border-b border-stone-border pb-4 mb-6">
              <h2 className="font-serif text-[32px] font-medium text-ink">
                Archive
              </h2>
            </div>
            <div className="text-center py-16">
              <p className="font-serif text-xl text-ink mb-2">
                No newsletters sent yet
              </p>
              <p className="text-body text-sm">
                Newsletters are sent automatically after each curation run.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
