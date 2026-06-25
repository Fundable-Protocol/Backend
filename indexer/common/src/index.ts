export const commonPackage = {
  name: "@fundable-indexer/common",
  role: "shared-infrastructure",
} as const;

// Ledger cursor — durable poller progress tracking.
export type { LedgerCursor, SqlClient } from "./cursor/ledger-cursor.js";
export { findCursor, upsertCursor } from "./cursor/ledger-cursor.js";

// Migration runner — applies SQL files under src/db/migrations/.
export { runMigrations } from "./db/migrate.js";
