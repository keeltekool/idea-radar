import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

config({ path: ".env.local" });

// EE AI Builders Watch DB — separate Neon project (ee-ai-watch).
// Push: npx drizzle-kit push --config drizzle.config.watch.ts
export default defineConfig({
  schema: "./src/db/schema-watch.ts",
  out: "./drizzle-watch",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_EEWATCH!,
  },
});
