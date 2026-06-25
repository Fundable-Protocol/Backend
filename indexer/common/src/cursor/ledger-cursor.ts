/**
 * Ledger cursor — durable progress tracking for the Soroban event poller.
 *
 * A cursor row records the last successfully processed ledger sequence number
 * for a given (source, domain) pair.  The poller reads the cursor on startup
 * to resume from where it left off, and advances the cursor after every
 * successfully processed ledger batch.
 *
 * See: indexer/common/src/db/migrations/0001_create_ledger_cursor.sql
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Shape of a row returned from the ledger_cursor table.
 *
 * - `source`  identifies the Soroban RPC endpoint / network being polled.
 * - `domain`  is the indexer package that owns this cursor ("streams",
 *             "distributions", etc.).
 * - `last_ledger_seq`  is null until the first batch commits successfully.
 */
export interface LedgerCursor {
  readonly id: bigint;
  readonly source: string;
  readonly domain: string;
  readonly last_ledger_seq: bigint | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}

/**
 * Minimal subset of a `postgres` Sql instance used by the cursor functions.
 * Typed against the parts we actually call so callers can inject a typed or
 * mocked sql object in tests without importing `postgres` directly.
 */
// biome-ignore lint/suspicious/noExplicitAny: intentional escape-hatch for the tagged-template signature
export type SqlClient = (template: TemplateStringsArray, ...values: any[]) => Promise<unknown[]>;

// ---------------------------------------------------------------------------
// Repository functions
// ---------------------------------------------------------------------------

/**
 * Returns the cursor for (source, domain), or null if none exists yet.
 */
export async function findCursor(
  sql: SqlClient,
  source: string,
  domain: string,
): Promise<LedgerCursor | null> {
  if (source === "") throw new Error("source must not be empty");
  if (domain === "") throw new Error("domain must not be empty");

  const rows = (await sql`
    SELECT id, source, domain, last_ledger_seq, created_at, updated_at
    FROM   ledger_cursor
    WHERE  source = ${source}
      AND  domain = ${domain}
    LIMIT  1
  `) as LedgerCursor[];

  return rows[0] ?? null;
}

/**
 * Upserts the cursor for (source, domain), setting last_ledger_seq to the
 * given value.  Returns the updated row.
 *
 * On INSERT (first call for this pair) the row is created with the supplied
 * ledger sequence.
 *
 * On conflict the existing row's last_ledger_seq and updated_at are updated
 * only if the new sequence is strictly greater than the stored one.  This
 * prevents a stale write from rolling back progress.
 */
export async function upsertCursor(
  sql: SqlClient,
  source: string,
  domain: string,
  lastLedgerSeq: bigint,
): Promise<LedgerCursor> {
  if (source === "") throw new Error("source must not be empty");
  if (domain === "") throw new Error("domain must not be empty");
  if (lastLedgerSeq < 0n) throw new Error("lastLedgerSeq must be >= 0");

  const rows = (await sql`
    INSERT INTO ledger_cursor (source, domain, last_ledger_seq, updated_at)
    VALUES (${source}, ${domain}, ${lastLedgerSeq}, NOW())
    ON CONFLICT (source, domain) DO UPDATE
      SET last_ledger_seq = EXCLUDED.last_ledger_seq,
          updated_at      = EXCLUDED.updated_at
      WHERE ledger_cursor.last_ledger_seq IS NULL
         OR ledger_cursor.last_ledger_seq < EXCLUDED.last_ledger_seq
    RETURNING id, source, domain, last_ledger_seq, created_at, updated_at
  `) as LedgerCursor[];

  const row = rows[0];
  if (!row) {
    // The WHERE clause suppressed the update (attempted regression); return
    // the existing row unchanged.
    const existing = await findCursor(sql, source, domain);
    if (!existing) {
      throw new Error(`Cursor (${source}, ${domain}) vanished unexpectedly after upsert`);
    }
    return existing;
  }

  return row;
}
