import { getDb } from "@/lib/db-server";
import { sources, builderProfile } from "@/db/schema";
import { youtubeVideos, youtubeMemos } from "@/db/schema-youtube";
import { eq, desc, sql, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { newsletterSubscribers } from "@/db/schema";

function unauthorized(req: Request) {
  const token = process.env.LOOP_TOKEN;
  if (!token)
    return NextResponse.json({ error: "LOOP_TOKEN not configured" }, { status: 500 });
  if (req.headers.get("authorization") !== `Bearer ${token}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}

export async function GET(req: Request) {
  const denied = unauthorized(req);
  if (denied) return denied;

  const db = getDb();
  const url = new URL(req.url);
  const op = url.searchParams.get("op");

  try {
    if (op === "get-pending") {
      const pending = await db
        .select()
        .from(youtubeVideos)
        .where(eq(youtubeVideos.status, "pending"))
        .limit(500);

      const [profile] = await db
        .select({ content: builderProfile.content })
        .from(builderProfile)
        .orderBy(desc(builderProfile.generatedAt))
        .limit(1);

      return NextResponse.json({
        count: pending.length,
        videos: pending.map((v) => ({
          id: v.id,
          videoId: v.videoId,
          title: v.title,
          description: v.description,
          thumbnailUrl: v.thumbnailUrl,
          viewCount: v.viewCount,
          ratingCount: v.ratingCount,
          channelName: v.channelName,
          publishedAt: v.publishedAt,
        })),
        builderProfile: profile?.content || null,
      });
    }

    if (op === "status" || !op) {
      const [counts] = await db
        .select({
          total: sql<number>`count(*)::int`,
          pending: sql<number>`count(*) filter (where status = 'pending')::int`,
          filtered: sql<number>`count(*) filter (where status = 'filtered')::int`,
          accepted: sql<number>`count(*) filter (where status = 'accepted')::int`,
          skipped: sql<number>`count(*) filter (where status = 'skipped')::int`,
        })
        .from(youtubeVideos);

      const [sourceCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(sources)
        .where(eq(sources.type, "youtube" as any));

      const [lastMemo] = await db
        .select({
          id: youtubeMemos.id,
          generatedAt: youtubeMemos.generatedAt,
          videoCount: youtubeMemos.videoCount,
        })
        .from(youtubeMemos)
        .orderBy(desc(youtubeMemos.generatedAt))
        .limit(1);

      return NextResponse.json({
        status: "ok",
        sources: sourceCount.count,
        videos: counts,
        lastMemo: lastMemo || null,
      });
    }

    return NextResponse.json({ error: `Unknown op: ${op}` }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const denied = unauthorized(req);
  if (denied) return denied;

  const db = getDb();

  try {
    const body = await req.json();
    const { op } = body;

    if (op === "score-decisions") {
      const decisions: {
        id: number;
        status: "filtered" | "accepted" | "skipped";
        score?: number;
        verdict?: string;
        takeaway?: string;
        buildSuggestion?: string;
        tags?: string[];
        transcript?: string;
        extractedTools?: string[];
      }[] = body.decisions || [];

      let accepted = 0;
      let skipped = 0;
      let filtered = 0;

      for (const d of decisions) {
        const updates: Record<string, unknown> = {
          status: d.status,
          scoredAt: new Date(),
        };
        if (d.score != null) updates.score = d.score;
        if (d.verdict) updates.verdict = d.verdict;
        if (d.takeaway) updates.takeaway = d.takeaway;
        if (d.buildSuggestion) updates.buildSuggestion = d.buildSuggestion;
        if (d.tags) updates.tags = d.tags;
        if (d.transcript) updates.transcript = d.transcript;
        if (d.extractedTools) updates.extractedTools = d.extractedTools;

        await db
          .update(youtubeVideos)
          .set(updates as any)
          .where(eq(youtubeVideos.id, d.id));

        if (d.status === "accepted") accepted++;
        else if (d.status === "skipped") skipped++;
        else filtered++;
      }

      return NextResponse.json({ accepted, skipped, filtered, total: decisions.length });
    }

    if (op === "pull-transcript") {
      const { videoId } = body as { videoId: string; op: string };
      if (!videoId) {
        return NextResponse.json({ error: "videoId required" }, { status: 400 });
      }

      try {
        const { YoutubeTranscript } = await import("youtube-transcript");
        const segments = await YoutubeTranscript.fetchTranscript(videoId, { lang: "en" });
        const transcript = segments.map((s: { text: string }) => s.text).join(" ");

        // Store in DB
        await db
          .update(youtubeVideos)
          .set({ transcript })
          .where(eq(youtubeVideos.videoId, videoId));

        return NextResponse.json({ videoId, length: transcript.length });
      } catch (e) {
        return NextResponse.json({
          videoId,
          error: `Transcript not available: ${String(e)}`,
          length: 0,
        });
      }
    }

    if (op === "save-memo") {
      const { content, videoCount } = body as { content: string; videoCount: number; op: string };
      if (!content) {
        return NextResponse.json({ error: "content required" }, { status: 400 });
      }

      const [memo] = await db
        .insert(youtubeMemos)
        .values({ content, videoCount: videoCount || 0 })
        .returning({ id: youtubeMemos.id });

      return NextResponse.json({ saved: true, memoId: memo.id });
    }

    if (op === "send-newsletter") {
      const resendKey = (process.env.RESEND_API_KEY || "")
        .split("")
        .filter((c) => c.charCodeAt(0) < 128)
        .join("")
        .trim();
      if (!resendKey) {
        return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
      }

      const nl = body.newsletter as {
        subject: string;
        stats: { total: number; scored: number };
        sections: (
          | { label: string; text: string }
          | { label: string; videos: { title: string; url: string; thumbnailUrl: string; channel: string; views: string; takeaway: string; buildSuggestion: string }[] }
          | { label: string; items: { title: string; reason: string }[] }
        )[];
      };

      if (!nl?.sections?.length) {
        return NextResponse.json({ error: "newsletter requires sections" }, { status: 400 });
      }

      const esc = (s: string) =>
        s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

      const renderSection = (section: any) => {
        if (section.videos) {
          return section.videos
            .map(
              (v: any) =>
                `<div style="margin:0 0 24px;padding:0 0 24px;border-bottom:1px solid #1a1a1a">
<table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
<td width="160" valign="top" style="padding-right:16px">
<a href="${esc(v.url)}"><img src="${esc(v.thumbnailUrl)}" width="160" height="90" style="display:block;border:0" alt=""></a>
</td>
<td valign="top">
<p style="font-family:Georgia,'Times New Roman',serif;font-size:15px;font-weight:700;color:#F1EFEA;margin:0 0 4px;line-height:1.3"><a href="${esc(v.url)}" style="color:#F1EFEA;text-decoration:none">${esc(v.title)}</a></p>
<p style="font-size:11px;color:#75726A;margin:0 0 8px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">${esc(v.channel)} &middot; ${esc(v.views)} views</p>
<p style="font-size:13px;line-height:1.6;color:#999;margin:0 0 6px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">${esc(v.takeaway)}</p>
<p style="font-size:12px;line-height:1.5;color:#4B6344;margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif"><strong>Build:</strong> ${esc(v.buildSuggestion)}</p>
</td>
</tr></table>
</div>`
            )
            .join("\n");
        }

        if (section.items) {
          return section.items
            .map(
              (item: any) =>
                `<p style="font-size:13px;color:#75726A;margin:0 0 8px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">${esc(item.title)} — <em>${esc(item.reason)}</em></p>`
            )
            .join("\n");
        }

        return `<p style="font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.75;color:#C8C4BC;margin:0">${esc(section.text)}</p>`;
      };

      const bodyHtml = nl.sections
        .map(
          (s: any) =>
            `<div style="margin:0 0 28px;padding:0 0 24px;border-bottom:1px solid #1a1a1a">
<p style="color:#75726A;font-size:9px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;letter-spacing:3px;text-transform:uppercase;margin:0 0 14px;font-weight:700">${esc(s.label)}</p>
${renderSection(s)}
</div>`
        )
        .join("\n");

      const renderHtml = (unsubUrl: string) =>
        `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#0d0d0d;margin:0;padding:0">
<div style="max-width:560px;margin:0 auto;padding:48px 24px">

<p style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;color:#F9F8F6;text-align:center;margin:0 0 2px;letter-spacing:-0.5px">Idea Radar</p>
<p style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#75726A;text-align:center;margin:0 0 36px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">YouTube Radar</p>

<div style="border-top:1px solid #2a2a2a;margin:0 0 32px"></div>

<div style="background:#111;padding:10px 16px;margin:0 0 28px;text-align:center">
<span style="color:#75726A;font-size:9px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;letter-spacing:1.5px;text-transform:uppercase">${nl.stats.total} screened &middot; ${nl.stats.scored} scored &middot; weekly run</span>
</div>

${bodyHtml}

<div style="text-align:center;margin:32px 0 0">
<a href="https://idea-radar-topaz.vercel.app/youtube" style="display:inline-block;background:#4B6344;color:#F9F8F6;font-size:11px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:14px 40px;text-decoration:none">Open YouTube Radar</a>
</div>

<div style="border-top:1px solid #1a1a1a;margin:36px 0 0;padding:20px 0 0;text-align:center">
<p style="color:#444;font-size:10px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;margin:0">Weekly from YouTube Radar</p>
<p style="margin:6px 0 0"><a href="${esc(unsubUrl)}" style="color:#444;font-size:10px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;text-decoration:underline">Unsubscribe</a></p>
</div>

</div></body></html>`;

      const subs = await db
        .select()
        .from(newsletterSubscribers)
        .where(eq(newsletterSubscribers.active, true));

      if (subs.length === 0) {
        return NextResponse.json({ sent: 0, reason: "No active subscribers" });
      }

      let sent = 0;
      const errs: string[] = [];

      for (const sub of subs) {
        const unsubUrl = `https://idea-radar-topaz.vercel.app/api/newsletter/unsubscribe?email=${encodeURIComponent(sub.email)}`;
        const html = renderHtml(unsubUrl);

        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Idea Radar <onboarding@resend.dev>",
              to: sub.email,
              subject: nl.subject,
              html,
            }),
          });

          if (!res.ok) {
            const errBody = await res.text();
            errs.push(`${sub.email}: ${res.status} ${errBody}`);
          } else {
            sent++;
          }
        } catch (e) {
          errs.push(`${sub.email}: ${String(e)}`);
        }
      }

      return NextResponse.json({
        sent,
        errors: errs.length,
        total: subs.length,
        ...(errs.length > 0 && { errorDetails: errs }),
      });
    }

    return NextResponse.json({ error: `Unknown op: ${op}` }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
