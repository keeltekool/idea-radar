import {
  pgTable,
  pgEnum,
  serial,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  real,
  varchar,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const sourceTypeEnum = pgEnum("source_type", [
  "producthunt",
  "github",
  "hackernews",
  "devto",
  "reddit",
  "rss",
]);

export const discoveryStatusEnum = pgEnum("discovery_status", [
  "pending",
  "relevant",
  "irrelevant",
  "accepted",
  "rejected",
]);

export const userFeedbackEnum = pgEnum("user_feedback", ["spark", "pass"]);

export const scrapeRunStatusEnum = pgEnum("scrape_run_status", [
  "running",
  "success",
  "failed",
]);

export const sources = pgTable("sources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  type: sourceTypeEnum("type").notNull(),
  config: jsonb("config").$type<SourceConfig>().default({}),
  active: boolean("active").notNull().default(true),
  lastScrapedAt: timestamp("last_scraped_at", { withTimezone: true }),
  lastProjectCount: integer("last_project_count"),
  acceptanceRate: real("acceptance_rate"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const discoveries = pgTable(
  "discoveries",
  {
    id: serial("id").primaryKey(),
    sourceId: integer("source_id").notNull(),
    url: text("url").notNull(),
    urlHash: varchar("url_hash", { length: 64 }).notNull(),
    contentHash: varchar("content_hash", { length: 64 }),
    title: text("title").notNull(),
    description: text("description"),
    author: text("author"),
    techStack: text("tech_stack").array().default([]),
    stars: integer("stars"),
    upvotes: integer("upvotes"),
    status: discoveryStatusEnum("status").notNull().default("pending"),
    feasibilityScore: real("feasibility_score"),
    noveltyScore: real("novelty_score"),
    stretchScore: real("stretch_score"),
    compositeScore: real("composite_score"),
    summary: text("summary"),
    categories: text("categories").array().default([]),
    rejectionReason: text("rejection_reason"),
    isWildcard: boolean("is_wildcard").notNull().default(false),
    userFeedback: userFeedbackEnum("user_feedback"),
    scrapedAt: timestamp("scraped_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("discoveries_url_hash_idx").on(table.urlHash)]
);

export const builderProfile = pgTable("builder_profile", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  projectCount: integer("project_count"),
});

export const scrapeRuns = pgTable("scrape_runs", {
  id: serial("id").primaryKey(),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  status: scrapeRunStatusEnum("status").notNull().default("running"),
  sourcesScraped: integer("sources_scraped").default(0),
  discoveriesFound: integer("discoveries_found").default(0),
  preFilterDropped: integer("pre_filter_dropped").default(0),
  aiAccepted: integer("ai_accepted").default(0),
  aiRejected: integer("ai_rejected").default(0),
  errors: jsonb("errors").$type<ScrapeError[]>().default([]),
});

export const builderMemos = pgTable("builder_memos", {
  id: serial("id").primaryKey(),
  scrapeRunId: integer("scrape_run_id"),
  content: text("content").notNull(),
  discoveryCount: integer("discovery_count").notNull().default(0),
  generatedAt: timestamp("generated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  subscribedAt: timestamp("subscribed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
  active: boolean("active").notNull().default(true),
});

export type SourceConfig = {
  feedUrl?: string;
  language?: string;
  tag?: string;
  subreddit?: string;
  preFilterRequired?: string[];
  preFilterBlocked?: string[];
};

export type ScrapeError = {
  sourceId: number;
  sourceName: string;
  error: string;
};
