import type { Sql } from "postgres";

/**
 * Result of a database health probe. `healthy` is the single field callers
 * should branch on; `latencyMs` and `error` aid diagnostics and monitoring.
 */
export type DbHealth =
  | { readonly healthy: true; readonly latencyMs: number }
  | { readonly healthy: false; readonly latencyMs: number; readonly error: string };

/**
 * Verify database availability by running a minimal `select 1` query.
 *
 * Never throws: a failed connection or query is reported as an unhealthy
 * result so callers (local dev, Docker healthchecks, the future API) get a
 * consistent typed answer.
 *
 * @param sql The postgres.js client to probe (e.g. {@link DbClient.sql}).
 */
export async function checkDbHealth(sql: Sql): Promise<DbHealth> {
  const start = Date.now();
  try {
    await sql`select 1`;
    return { healthy: true, latencyMs: Date.now() - start };
  } catch (error) {
    return {
      healthy: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
