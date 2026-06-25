/**
 * Minimal, dependency-free migration runner for the Fundable indexer.
 *
 * Migrations are plain SQL files stored under ./migrations/.  Each file is
 * run once; idempotency is enforced inside the SQL itself via the
 * schema_migrations bookkeeping table.
 *
 * Usage (from indexer root):
 *   bun run indexer/common/src/db/migrate.ts
 *
 * Environment variables:
 *   INDEXER_DATABASE_URL  — postgres connection string (required)
 */

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/** Sorted list of *.sql migration files in the migrations directory. */
async function listMigrationFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir);
  return entries
    .filter((f) => f.endsWith(".sql"))
    .sort() // lexicographic order == numeric order given the NNN_ prefix convention
    .map((f) => join(dir, f));
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

export async function runMigrations(databaseUrl: string): Promise<void> {
  const migrationsDir = join(fileURLToPath(import.meta.url), "..", "migrations");

  const files = await listMigrationFiles(migrationsDir);

  if (files.length === 0) {
    console.log("[migrate] No migration files found.");
    return;
  }

  const sql = postgres(databaseUrl, {
    // Disable prepared statements so each migration runs in a single round
    // trip and the connection pool does not need to be warmed up.
    prepare: false,
    max: 1,
  });

  try {
    for (const filePath of files) {
      const fileName = filePath.split("/").at(-1) ?? filePath;
      const content = await readFile(filePath, "utf8");

      console.log(`[migrate] Applying ${fileName}…`);
      // Each SQL file is expected to be idempotent (the guard is inside the
      // SQL), so we just execute the whole file in one shot.
      await sql.unsafe(content);
      console.log(`[migrate] ✓ ${fileName}`);
    }
  } finally {
    await sql.end();
  }
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

// Run when executed directly: `bun run src/db/migrate.ts`
if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  runMigrations(resolveEnv("INDEXER_DATABASE_URL"))
    .then(() => {
      console.log("[migrate] All migrations applied successfully.");
      process.exit(0);
    })
    .catch((err: unknown) => {
      console.error("[migrate] Fatal error:", err);
      process.exit(1);
    });
}
