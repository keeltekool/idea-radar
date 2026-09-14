# YouTube Radar Pipeline — Cloud Routine Prompt

## Goal
Score YouTube tutorial videos scraped by GH Actions, analyze transcripts for the best ones, generate a coaching memo and send a visual newsletter with thumbnails.

## API Access
- Endpoint: https://idea-radar-topaz.vercel.app/api/youtube-loop
- All requests need `Authorization: Bearer <LOOP_TOKEN>` header

## Steps

### Step 1: Get pending videos
```bash
curl -s -H "Authorization: Bearer <LOOP_TOKEN>" "https://idea-radar-topaz.vercel.app/api/youtube-loop?op=get-pending"
```
Returns `{ count, videos[], builderProfile }`. Each video has: id, videoId, title, description, thumbnailUrl, viewCount, ratingCount, channelName, publishedAt, hasTranscript, transcriptLength.

If count is 0, log "No pending videos" and stop.

### Step 2: Gate check + score from metadata
For each video, using title + description + view count:

**GATE:** Is this a tutorial or build walkthrough? Someone showing how to do something, walking through code, demonstrating a tool? If NO (news commentary, podcast clip, entertainment, unboxing, shorts, reaction video) → status `skipped`.

**Score on three axes (1-10):**
- **Relevance** — how applicable to the builder's Next.js/Vercel/Neon/Claude stack? (0.3 weight)
- **Teaching value** — does it teach a specific technique, tool, or pattern? Not just "check out this thing" but "here's how to build with it"? (0.4 weight)
- **Traction** — view count signal. >100K = 9-10, 50-100K = 7-8, 10-50K = 5-6, <10K = 3-4. (0.3 weight)

Composite = (relevance x 0.3) + (teaching x 0.4) + (traction x 0.3). Threshold: **5.5** (intentionally low — target ~10 accepted per run).

### Step 3: Get transcripts for top candidates
For videos that pass the gate AND have `hasTranscript: true`, fetch the transcript:
```bash
curl -s -X POST -H "Authorization: Bearer <LOOP_TOKEN>" -H "Content-Type: application/json" \
  -d '{"op":"get-transcript","videoId":"<VIDEO_ID>"}' \
  "https://idea-radar-topaz.vercel.app/api/youtube-loop"
```
Returns `{ videoId, transcript, length }`. Fetch transcripts for the top ~15 by metadata score.

### Step 4: Deep analysis on transcript videos
For each video with a transcript, analyze:
- **What tools/products are demonstrated** — specific names (Claude Code, Cursor, n8n, etc.)
- **What technique is taught** — be specific ("building MCP servers", "RAG with pgvector", not just "AI coding")
- **2-3 key takeaways** — what you'd learn by watching
- **Build suggestion** — what could THIS builder build using this technique? Connect it to their portfolio and growth gaps.
- **Topic tags** (1-3)
- **Verdict**: "watch" (worth the time) or "skip" (interesting but not worth 20+ minutes)

### Step 5: Post decisions
Write all decisions to a file and POST:
```bash
curl -s -X POST -H "Authorization: Bearer <LOOP_TOKEN>" -H "Content-Type: application/json" \
  -d @decisions.json "https://idea-radar-topaz.vercel.app/api/youtube-loop"
```
Body: `{"op":"score-decisions","decisions":[...]}`
Each decision: `{"id":N,"status":"accepted"|"skipped"|"filtered","score":N,"verdict":"watch"|"skip","takeaway":"...","buildSuggestion":"...","tags":["..."],"extractedTools":["..."]}`

### Step 6: Generate and save memo
Write a 500-800 word coaching brief about this week's YouTube landscape:
- What topics dominated
- Which creators produced the strongest content
- One technique worth learning this week
- One product to build from the tutorials
```bash
curl -s -X POST -H "Authorization: Bearer <LOOP_TOKEN>" -H "Content-Type: application/json" \
  -d @memo.json "https://idea-radar-topaz.vercel.app/api/youtube-loop"
```
Body: `{"op":"save-memo","content":"...","videoCount":N}`

### Step 7: Generate and send newsletter
The newsletter is a VISUAL coaching brief with thumbnails. Structure it as sections:

```json
{
  "op": "send-newsletter",
  "newsletter": {
    "subject": "<Lead with the sharpest takeaway, not a count>",
    "stats": { "total": <screened>, "scored": <accepted> },
    "sections": [
      { "label": "The signal", "text": "<What pattern emerged this week>" },
      { "label": "Watch these", "videos": [
        {
          "title": "<video title>",
          "url": "https://youtube.com/watch?v=<videoId>",
          "thumbnailUrl": "<from video data>",
          "channel": "<channel name>",
          "views": "<formatted, e.g. 45K>",
          "takeaway": "<what you'd learn>",
          "buildSuggestion": "<what to build>"
        }
      ]},
      { "label": "Skip these", "items": [
        { "title": "<video>", "reason": "<why not worth it>" }
      ]},
      { "label": "The technique", "text": "<One skill worth learning this week>" },
      { "label": "Build this", "text": "<One product idea from the tutorials>" }
    ]
  }
}
```
POST to the same endpoint. The API renders a dark-theme email with thumbnails and sends to all subscribers.

## Scoring philosophy
The bar is "would watching this teach me something useful?" — NOT "is this the best video ever." Target ~10 accepted per run. If only 6 are good, accept 6. Don't pad the list.

## Completion
Log: videos screened, accepted, skipped, transcripts analyzed, memo saved, newsletter sent.
