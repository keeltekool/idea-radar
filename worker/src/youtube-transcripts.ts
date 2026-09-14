import { config } from "dotenv";
config({ path: "../../.env.local" });

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { youtubeVideos } from "../../src/db/schema-youtube";
import { eq, isNull, and } from "drizzle-orm";
import { execSync } from "child_process";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  const videos = await db
    .select({ id: youtubeVideos.id, videoId: youtubeVideos.videoId, title: youtubeVideos.title })
    .from(youtubeVideos)
    .where(and(isNull(youtubeVideos.transcript), eq(youtubeVideos.status, "pending")))
    .limit(100);

  console.log(`${videos.length} videos need transcripts`);

  let success = 0;
  let failed = 0;

  for (const video of videos) {
    try {
      const result = execSync(
        `yt-dlp --write-auto-sub --sub-lang en --skip-download --no-download -o "transcript-%(id)s" "https://www.youtube.com/watch?v=${video.videoId}" 2>&1`,
        { timeout: 30000, encoding: "utf-8", cwd: process.env.TMPDIR || "/tmp" }
      );

      const vttPath = `${process.env.TMPDIR || "/tmp"}/transcript-${video.videoId}.en.vtt`;
      const { readFileSync, unlinkSync, existsSync } = await import("fs");

      if (existsSync(vttPath)) {
        const raw = readFileSync(vttPath, "utf-8");
        const transcript = cleanVtt(raw);
        unlinkSync(vttPath);

        if (transcript.length > 50) {
          await db
            .update(youtubeVideos)
            .set({ transcript })
            .where(eq(youtubeVideos.id, video.id));
          console.log(`  OK: ${video.title.slice(0, 60)} (${transcript.length} chars)`);
          success++;
        } else {
          console.log(`  SHORT: ${video.title.slice(0, 60)} (${transcript.length} chars)`);
          failed++;
        }
      } else {
        console.log(`  NO VTT: ${video.title.slice(0, 60)}`);
        failed++;
      }
    } catch (err) {
      console.log(`  ERR: ${video.title.slice(0, 60)} — ${err instanceof Error ? err.message.slice(0, 80) : "unknown"}`);
      failed++;
    }

    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log(`\nDone: ${success} transcripts saved, ${failed} failed`);
}

function cleanVtt(vtt: string): string {
  const lines = vtt.split("\n");
  const seen = new Set<string>();
  const cleaned: string[] = [];

  for (const line of lines) {
    if (line.startsWith("WEBVTT") || line.startsWith("Kind:") || line.startsWith("Language:")) continue;
    if (/^\d{2}:\d{2}/.test(line)) continue;
    if (line.includes("-->")) continue;
    if (line.trim() === "") continue;

    const text = line.replace(/<[^>]+>/g, "").trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    cleaned.push(text);
  }

  return cleaned.join(" ");
}

main().catch(console.error);
