import { config } from "dotenv";
config({ path: "../../.env.local" });

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { youtubeVideos } from "../../src/db/schema-youtube";
import { eq, isNull, and } from "drizzle-orm";
import { execFileSync } from "child_process";
import { readFileSync, readdirSync, unlinkSync } from "fs";
import { join } from "path";

const TMP = process.env.TMPDIR || "/tmp";

// English videos list two auto-caption tracks: en-orig (the real captions) and en (a machine-translated copy
// that YouTube answers with HTTP 429). Ask for en-orig first; en still covers creator-uploaded subtitles and
// videos whose original language isn't English.
const ATTEMPTS = [
  ["--write-auto-subs", "--sub-langs", "en-orig"],
  ["--write-subs", "--write-auto-subs", "--sub-langs", "en"],
];

function fetchTranscript(videoId: string): { transcript: string } | { error: string } {
  let error = "no English captions";
  for (const args of ATTEMPTS) {
    try {
      execFileSync(
        "yt-dlp",
        ["--skip-download", ...args, "--sub-format", "vtt", "-o", "transcript-%(id)s", `https://www.youtube.com/watch?v=${videoId}`],
        { cwd: TMP, timeout: 60000, encoding: "utf-8", stdio: "pipe" }
      );
    } catch (err) {
      error = lastError(err);
    }
    const file = readdirSync(TMP).find((f) => f.startsWith(`transcript-${videoId}.`) && f.endsWith(".vtt"));
    if (file) {
      const transcript = cleanVtt(readFileSync(join(TMP, file), "utf-8"));
      unlinkSync(join(TMP, file));
      return transcript.length > 50 ? { transcript } : { error: `transcript too short (${transcript.length} chars)` };
    }
  }
  return { error };
}

// yt-dlp's reason is its last "ERROR:" line on stderr; the exec message alone only repeats the command.
function lastError(err: unknown): string {
  const stderr = String((err as { stderr?: string }).stderr ?? "");
  const line = stderr.split("\n").reverse().find((l) => l.startsWith("ERROR:"));
  return line ?? (err instanceof Error ? err.message.split("\n")[0] : "unknown");
}

async function main() {
  // `--check <videoId>` fetches one transcript without touching the database (the runnable check).
  const checkIdx = process.argv.indexOf("--check");
  if (checkIdx !== -1) {
    const result = fetchTranscript(process.argv[checkIdx + 1]);
    console.log("transcript" in result ? `OK: ${result.transcript.length} chars` : `FAIL: ${result.error}`);
    process.exit("transcript" in result ? 0 : 1);
  }

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
    const result = fetchTranscript(video.videoId);
    if ("transcript" in result) {
      await db.update(youtubeVideos).set({ transcript: result.transcript }).where(eq(youtubeVideos.id, video.id));
      console.log(`  OK: ${video.title.slice(0, 60)} (${result.transcript.length} chars)`);
      success++;
    } else {
      console.log(`  FAIL: ${video.title.slice(0, 60)} — ${result.error}`);
      failed++;
    }

    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log(`\nDone: ${success} transcripts saved, ${failed} failed`);
  // Zero out of many is a broken puller, not unlucky videos: fail the run so it shows red.
  if (videos.length > 0 && success === 0) process.exit(1);
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

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
