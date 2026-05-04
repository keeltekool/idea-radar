import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db-server";
import { discoveries, newsletterSubscribers } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const brevoKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;

  if (!brevoKey || !senderEmail) {
    return NextResponse.json(
      { error: "Brevo not configured" },
      { status: 500 }
    );
  }

  const accepted = await db
    .select()
    .from(discoveries)
    .where(eq(discoveries.status, "accepted"))
    .orderBy(desc(discoveries.compositeScore))
    .limit(10);

  if (accepted.length === 0) {
    return NextResponse.json({ sent: 0, reason: "No accepted discoveries" });
  }

  const subscribers = await db
    .select()
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.active, true));

  if (subscribers.length === 0) {
    return NextResponse.json({ sent: 0, reason: "No active subscribers" });
  }

  const htmlItems = accepted
    .map((d) => {
      const scores = `F:${d.feasibilityScore?.toFixed(1) || "?"} N:${d.noveltyScore?.toFixed(1) || "?"} S:${d.stretchScore?.toFixed(1) || "?"}`;
      const wildcard = d.isWildcard ? " 🎲 WILDCARD" : "";
      return `<div style="margin-bottom:24px;padding:16px;border:1px solid #E5E1DA;border-radius:8px;">
        <h3 style="margin:0 0 8px;font-family:Georgia,serif;"><a href="${d.url}" style="color:#2D2D2D;text-decoration:none;">${d.title}</a>${wildcard}</h3>
        <p style="margin:0 0 8px;color:#555;font-size:14px;">${d.description || ""}</p>
        <p style="margin:0 0 8px;font-size:13px;color:#4B6344;"><strong>Composite: ${d.compositeScore?.toFixed(1)}</strong> | ${scores}</p>
        <p style="margin:0;font-size:14px;color:#555;font-style:italic;">${d.summary || ""}</p>
      </div>`;
    })
    .join("");

  const html = `<div style="max-width:600px;margin:0 auto;font-family:'Plus Jakarta Sans',Arial,sans-serif;background:#F9F8F6;padding:32px;">
    <h1 style="font-family:Georgia,serif;color:#2D2D2D;margin-bottom:8px;">Idea Radar</h1>
    <p style="color:#555;margin-bottom:24px;">${accepted.length} new discoveries scored for your growth.</p>
    ${htmlItems}
    <p style="color:#929292;font-size:12px;margin-top:32px;">Idea Radar Intelligence • Personal discovery feed</p>
  </div>`;

  let sent = 0;
  let errors = 0;

  for (const sub of subscribers) {
    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": brevoKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: { email: senderEmail, name: "Idea Radar" },
          to: [{ email: sub.email }],
          subject: `Idea Radar — ${accepted.length} new discoveries`,
          htmlContent: html,
        }),
      });

      if (res.ok) sent++;
      else errors++;
    } catch {
      errors++;
    }
  }

  return NextResponse.json({ sent, errors });
}
