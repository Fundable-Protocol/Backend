import { type PostgresJsDatabase, drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";

import type { IndexerConfig } from "../config/index.js";

/**
 * A ready-to-use database entry point shared across the indexer.
 *
 * `db` is the Drizzle query interface; `sql` is the underlying postgres.js
 * client for raw queries and lifecycle control (e.g. health checks, shutdown).
 */
export interface DbClient {
  readonly db: PostgresJsDatabase;
  readonly sql: Sql;
  /** Close the connection pool. Call during graceful shutdown. */
  close(): Promise<void>;
}

export interface CreateDbClientOptions {
  /** Maximum number of pooled connections. Defaults to 10. */
  readonly maxConnections?: number;
  /**
   * Factory for the underlying postgres.js client. Defaults to the real
   * `postgres` driver; override in tests to inject a mocked connection.
   */
  readonly createSql?: (url: string) => Sql;
}

/**
 * Create a PostgreSQL connection factory from validated configuration.
 *
 * The connection pool is lazy: no socket is opened until the first query, so
 * constructing a client is cheap and side-effect free.
 */
export function createDbClient(
  config: Pick<IndexerConfig, "databaseUrl">,
  options: CreateDbClientOptions = {},
): DbClient {
  const createSql =
    options.createSql ?? ((url: string) => postgres(url, { max: options.maxConnections ?? 10 }));

  const sql = createSql(config.databaseUrl);
  const db = drizzle(sql);

  return {
    db,
    sql,
    async close() {
      await sql.end();
    },
  };
}
