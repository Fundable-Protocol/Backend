/**
 * Minimal, dependency-free migration runner for the Fundable indexer.
 *
 * Migrations are plain SQL files stored under src/db/migrations/.  Each file
 * is run once; idempotency is enforced inside the SQL itself via the
 * schema_migrations bookkeeping table.
 *
 * The migrations directory is resolved relative to this source file so the
 * runner works correctly whether executed directly from source (the normal
 * workflow via `bun run src/db/migrate.ts`) or from a compiled dist build.
 * SQL asset files live only in src/ and are referenced by their source path at
 * runtime; they are never emitted into dist by tsc.
 *
 * Usage (from repo root):
 *   bun run indexer:db:migrate
 *
 * Environment variables:
 *   INDEXER_DATABASE_URL  — postgres connection string (required)
 */

import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
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

/**
 * Resolves the migrations directory to `src/db/migrations/` regardless of
 * whether this module is loaded from source or a compiled dist output.
 *
 * Strategy:
 *  - Walk up from the current file's directory until we find a directory
 *    that contains a `package.json` (the package root for
 *    `@fundable-indexer/common`).
 *  - Then return `<packageRoot>/src/db/migrations`.
 *
 * This ensures the SQL assets — which are only present in src/ — are always
 * found correctly, whether the caller is running from:
 *   - `indexer/common/src/db/migrate.ts`  (bun source execution, CLI default)
 *   - `indexer/common/dist/db/migrate.js` (compiled build)
 */
async function resolveMigrationsDir(): Promise<string> {
  const { access } = await import("node:fs/promises");

  // Start from the directory that contains this file and walk upward.
  let dir = dirname(fileURLToPath(import.meta.url));

  // Safety limit: don't walk more than 10 levels up.
  for (let i = 0; i < 10; i++) {
    try {
      await access(join(dir, "package.json"));
      // Found the package root — migrations always live at src/db/migrations.
      return join(dir, "src", "db", "migrations");
    } catch {
      const parent = dirname(dir);
      if (parent === dir) break; // reached filesystem root
      dir = parent;
    }
  }

  throw new Error(
    `[migrate] Could not locate package root from ${fileURLToPath(import.meta.url)}. Ensure the runner is invoked from within the @fundable-indexer/common package.`,
  );
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
  const migrationsDir = await resolveMigrationsDir();

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
