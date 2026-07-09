/**
 * EE AI Builders Watch — authoritative schema for the `ee-ai-watch` Neon DB
 * (Neon project twilight-tree-93490667, env var DATABASE_URL_EEWATCH).
 *
 * This DB is federated into Tracker Admin (eudi-wallet-tracker) as project
 * `eewatch`; the admin keeps a manually synced copy in `src/db/schema-eewatch.ts`.
 * DDL is pushed from THIS file via `drizzle.config.watch.ts` — the copy never
 * runs migrations.
 *
 * `sources`/`snapshots`/`scrape_runs` deliberately mirror the Allekirjoitus
 * column shapes so the admin UI works unchanged: `competitor` holds the player
 * slug, `theme` holds the page type.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Admin-compatible trio (Allekirjoitus shape)
// ---------------------------------------------------------------------------

/** One row per tracked page. `competitor` = watch_players.slug, `theme` = page type. */
export const sources = pgTable("sources", {
  id: serial("id").primaryKey(),
  competitor: text("competitor").notNull(),
  url: text("url").notNull().unique(),
  theme: text("theme").notNull(),
  purpose: text("purpose"),
  active: boolean("active").notNull().default(true),
  discoveredBy: text("discovered_by").notNull().default("seed"),
  needsRender: boolean("needs_render").notNull().default(false),
  failCount: integer("fail_count").notNull().default(0),
  lastScrapedAt: timestamp("last_scraped_at", { withTimezone: true }),
  lastStatus: text("last_status"),
  lastContentHash: varchar("last_content_hash", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/** Normalized-text snapshots; insert only when content_hash changed. */
export const snapshots = pgTable(
  "snapshots",
  {
    id: serial("id").primaryKey(),
    sourceId: integer("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    scrapedAt: timestamp("scraped_at", { withTimezone: true }).defaultNow(),
    contentMd: text("content_md").notNull(),
    contentHash: varchar("content_hash", { length: 64 }).notNull(),
  },
  (table) => ({
    sourceHashIdx: uniqueIndex("snapshots_source_hash_idx").on(
      table.sourceId,
      table.contentHash,
    ),
  }),
);

export const scrapeRuns = pgTable("scrape_runs", {
  id: serial("id").primaryKey(),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  status: text("status").notNull(), // "running" | "success" | "failed"
  urlsScraped: integer("urls_scraped").default(0),
  urlsFailed: integer("urls_failed").default(0),
  changesDetected: integer("changes_detected").default(0),
  postsCaptured: integer("posts_captured").default(0),
  socialSweepRan: boolean("social_sweep_ran").notNull().default(false),
  briefUpdated: boolean("brief_updated").default(false),
  lccRunId: text("lcc_run_id"),
  errors: jsonb("errors").default(sql`'[]'::jsonb`),
});

// ---------------------------------------------------------------------------
// Watch-specific tables
// ---------------------------------------------------------------------------

export const watchPlayers = pgTable("watch_players", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  archetype: text("archetype").notNull(), // self | solo-trainer | corp-trainer | agency | coach-community | lab | contrarian | gov | school
  domain: text("domain").notNull(),
  linkedinUrl: text("linkedin_url"),
  fbUrl: text("fb_url"), // deferred in v1, column reserved
  lastSeenPostAt: timestamp("last_seen_post_at", { withTimezone: true }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/** SUBSTANTIVE changes only — cosmetic deltas are never stored. */
export const watchChanges = pgTable("watch_changes", {
  id: serial("id").primaryKey(),
  runId: integer("run_id")
    .notNull()
    .references(() => scrapeRuns.id),
  playerSlug: text("player_slug").notNull(),
  sourceId: integer("source_id").references(() => sources.id, {
    onDelete: "set null",
  }),
  changeType: text("change_type").notNull(), // new_page | content | pricing | metrics | positioning | removed | social
  summary: text("summary").notNull(),
  impact: text("impact"),
  prevHash: varchar("prev_hash", { length: 64 }),
  newHash: varchar("new_hash", { length: 64 }),
  sourceUrl: text("source_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/** One row per player per run, only when the profile changed. */
export const watchSignals = pgTable("watch_signals", {
  id: serial("id").primaryKey(),
  playerSlug: text("player_slug").notNull(),
  runId: integer("run_id")
    .notNull()
    .references(() => scrapeRuns.id),
  signals: jsonb("signals").notNull(), // { offer, pricingVisible, claimedMetrics[], namedClients[], events[], positioning }
  diffSummary: text("diff_summary"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const watchPosts = pgTable("watch_posts", {
  id: serial("id").primaryKey(),
  playerSlug: text("player_slug").notNull(),
  runId: integer("run_id")
    .notNull()
    .references(() => scrapeRuns.id),
  postedAt: timestamp("posted_at", { withTimezone: true }),
  text: text("text").notNull(),
  engagement: jsonb("engagement").default(sql`'{}'::jsonb`), // { likes, comments }
  url: text("url"),
  source: text("source").notNull().default("linkedin"), // linkedin | search
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const watchMemos = pgTable("watch_memos", {
  id: serial("id").primaryKey(),
  runId: integer("run_id")
    .notNull()
    .references(() => scrapeRuns.id),
  contentMd: text("content_md").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/** Living Field Brief, EUDI living_doc pattern — Neon is the operative source. */
export const watchBrief = pgTable("watch_brief", {
  id: serial("id").primaryKey(),
  section: text("section").notNull().unique(),
  contentMd: text("content_md").notNull(),
  position: integer("position").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------

export type WatchSource = typeof sources.$inferSelect;
export type NewWatchSource = typeof sources.$inferInsert;
export type WatchSnapshot = typeof snapshots.$inferSelect;
export type WatchScrapeRun = typeof scrapeRuns.$inferSelect;
export type WatchPlayer = typeof watchPlayers.$inferSelect;
export type NewWatchPlayer = typeof watchPlayers.$inferInsert;
export type WatchChange = typeof watchChanges.$inferSelect;
export type WatchSignalRow = typeof watchSignals.$inferSelect;
export type WatchPost = typeof watchPosts.$inferSelect;
export type WatchMemo = typeof watchMemos.$inferSelect;
export type WatchBriefSection = typeof watchBrief.$inferSelect;

export type PageTheme =
  | "home"
  | "services"
  | "pricing"
  | "blog"
  | "about"
  | "other";

export type Archetype =
  | "self"
  | "solo-trainer"
  | "corp-trainer"
  | "agency"
  | "coach-community"
  | "lab"
  | "contrarian"
  | "gov"
  | "school";

export type ChangeType =
  | "new_page"
  | "content"
  | "pricing"
  | "metrics"
  | "positioning"
  | "removed"
  | "social";

export interface SignalProfile {
  offer: string;
  pricingVisible: boolean;
  claimedMetrics: string[];
  namedClients: string[];
  events: string[];
  positioning: string;
}
