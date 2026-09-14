import {
  pgTable,
  pgEnum,
  serial,
  text,
  timestamp,
  boolean,
  integer,
  real,
  varchar,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { userFeedbackEnum } from "./schema";

export const youtubeVideoStatusEnum = pgEnum("youtube_video_status", [
  "pending",
  "filtered",
  "accepted",
  "skipped",
]);

export const youtubeVideos = pgTable(
  "youtube_videos",
  {
    id: serial("id").primaryKey(),
    videoId: varchar("video_id", { length: 20 }).notNull(),
    sourceId: integer("source_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    thumbnailUrl: text("thumbnail_url"),
    viewCount: integer("view_count"),
    ratingCount: integer("rating_count"),
    channelName: text("channel_name"),
    channelId: text("channel_id"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    status: youtubeVideoStatusEnum("status").notNull().default("pending"),
    score: real("score"),
    verdict: text("verdict"),
    takeaway: text("takeaway"),
    buildSuggestion: text("build_suggestion"),
    tags: text("tags").array().default([]),
    transcript: text("transcript"),
    extractedTools: text("extracted_tools").array().default([]),
    userFeedback: userFeedbackEnum("user_feedback"),
    scrapedAt: timestamp("scraped_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    scoredAt: timestamp("scored_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("youtube_videos_video_id_idx").on(table.videoId)]
);

export const youtubeMemos = pgTable("youtube_memos", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  videoCount: integer("video_count").notNull().default(0),
  generatedAt: timestamp("generated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
