import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db-server";
import { discoveries, newsletterSubscribers } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

const BASE_URL = "https://idea-radar-topaz.vercel.app";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildEmailHtml(
  pushItems: typeof discoveries.$inferSelect[],
  levelUpItems: typeof discoveries.$inferSelect[],
  unsubUrl: string
): string {
  function cardHtml(d: typeof discoveries.$inferSelect): string {
    const score = d.compositeScore?.toFixed(1) || "?";
    const lane = d.track === "familiar" ? "LEVEL UP" : "PUSH";
    const laneColor = d.track === "familiar" ? "#B07B2E" : "#4B6344";
    const categories = (d.categories || [])
      .slice(0, 2)
      .map(
        (c) =>
          `<span style="font-size:10px;padding:2px 6px;background:${d.track === "familiar" ? "#F7EFE2" : "#EEF1EA"};color:${laneColor};font-weight:700;letter-spacing:0.5px;text-transform:uppercase">${esc(c)}</span>`
      )
      .join(" ");

    return `<div style="background:#1a1a1a;border:1px solid #2a2a2a;padding:20px 24px;margin-bottom:12px">
<div style="display:flex;gap:12px;align-items:flex-start">
<div style="background:#24241F;min-width:48px;height:48px;display:flex;align-items:center;justify-content:center">
<span style="font-family:Georgia,serif;font-size:18px;color:#F9F8F6;font-weight:700">${score}</span>
</div>
<div>
<div style="margin-bottom:4px">${categories} <span style="font-size:10px;color:${laneColor};font-weight:600;letter-spacing:0.5px;text-transform:uppercase;margin-left:4px">${lane}</span></div>
<h3 style="margin:0 0 6px;font-size:15px;font-weight:700;line-height:1.3"><a href="${esc(d.url)}" style="color:#F1EFEA;text-decoration:none">${esc(d.title)}</a></h3>
<p style="margin:0;font-size:13px;line-height:1.6;color:#999">${esc(d.summary || "")}</p>
</div>
</div>
</div>`;
  }

  const allItems = [...pushItems, ...levelUpItems];
  const itemsHtml = allItems.map(cardHtml).join("\n");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#0d0d0d;margin:0;padding:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:40px 20px">

<p style="font-family:Georgia,serif;font-style:italic;font-size:28px;font-weight:700;color:#F9F8F6;text-align:center;margin:0 0 4px">Idea Radar</p>
<p style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#666;text-align:center;margin:0 0 32px">Growth Compass</p>

<div style="border-top:1px solid #4B6344;margin:0 80px 28px"></div>

<p style="font-size:13px;color:#999;text-align:center;line-height:1.6;margin:0 0 28px">${allItems.length} discoveries scored from 31 sources. ${pushItems.length} push, ${levelUpItems.length} level up.</p>

${itemsHtml}

<div style="text-align:center;margin:28px 0 0">
<a href="${BASE_URL}" style="display:inline-block;background:#4B6344;color:#F9F8F6;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:16px 44px;text-decoration:none">Open the Radar</a>
</div>

<div style="border-top:1px solid #2a2a2a;margin:36px 0 24px"></div>

<p style="color:#444;font-size:10px;text-align:center;line-height:1.6;margin:0">Bi-weekly from Idea Radar. Your growth compass.</p>
<p style="text-align:center;margin:8px 0 0"><a href="${unsubUrl}" style="color:#444;font-size:10px;text-decoration:underline">Unsubscribe</a></p>

</div></body></html>`;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const resendKey = process.env.RESEND_API_KEY;

  if (!resendKey) {
    return NextResponse.json(
      { error: "RESEND_API_KEY not configured" },
      { status: 500 }
    );
  }

  const accepted = await db
    .select()
    .from(discoveries)
    .where(eq(discoveries.status, "accepted"))
    .orderBy(desc(discoveries.compositeScore))
    .limit(12);

  if (accepted.length === 0) {
    return NextResponse.json({ sent: 0, reason: "No accepted discoveries" });
  }

  const pushItems = accepted.filter((d) => d.track !== "familiar");
  const levelUpItems = accepted.filter((d) => d.track === "familiar");

  const subscribers = await db
    .select()
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.active, true));

  if (subscribers.length === 0) {
    return NextResponse.json({ sent: 0, reason: "No active subscribers" });
  }

  let sent = 0;
  let errors = 0;

  for (let i = 0; i < subscribers.length; i += 50) {
    const batch = subscribers.slice(i, i + 50);
    const results = await Promise.allSettled(
      batch.map(async (sub) => {
        const unsubUrl = `${BASE_URL}/api/newsletter/unsubscribe?email=${encodeURIComponent(sub.email)}`;
        const html = buildEmailHtml(pushItems, levelUpItems, unsubUrl);

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Idea Radar <onboarding@resend.dev>",
            to: sub.email,
            subject: `Idea Radar — ${accepted.length} discoveries scored`,
            html,
          }),
        });

        if (!res.ok) {
          const body = await res.text();
          throw new Error(`${res.status}: ${body}`);
        }
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled") sent++;
      else errors++;
    }
  }

  return NextResponse.json({ sent, errors, total: subscribers.length });
}
