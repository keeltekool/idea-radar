import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema-watch";

// EE AI Builders Watch DB — separate Neon project, read by the /watch routes.
export function getWatchDb() {
  const url = process.env.DATABASE_URL_EEWATCH;
  if (!url) throw new Error("DATABASE_URL_EEWATCH is not set");
  return drizzle({ client: neon(url), schema });
}
