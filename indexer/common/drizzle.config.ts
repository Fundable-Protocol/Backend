import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit configuration for the indexer.
 *
 * Migration SQL is generated into ./migrations from the schema entrypoint in
 * ./src/db/schema.ts. Domain tables are added by later scoped issues; this
 * config only establishes the tooling and on-disk layout.
 *
 * The database URL is read directly from the environment here (rather than the
 * validated config loader) because Drizzle Kit runs as a standalone CLI outside
 * the application runtime.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./migrations",
  dbCredentials: {
    url: process.env.INDEXER_DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
