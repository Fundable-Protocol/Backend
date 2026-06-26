/**
 * Drizzle schema entrypoint for the indexer database.
 *
 * Domain tables — cursors, indexed events, streams, and distributions — are
 * defined by later scoped issues. This file exists so that migration tooling
 * (drizzle-kit) and the connection factory have a single, stable schema entry
 * to read from. Re-export table definitions from here as they are introduced.
 */
export {};
