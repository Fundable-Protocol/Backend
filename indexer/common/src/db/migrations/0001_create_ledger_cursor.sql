-- Migration: 0001_create_ledger_cursor
-- Creates the ledger_cursor table used by the indexer poller to durably
-- track per-domain progress across restarts and failures.

-- The migrations bookkeeping table must exist before any migration runs.
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     TEXT        NOT NULL PRIMARY KEY,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Guard: skip if this migration was already applied.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM schema_migrations WHERE version = '0001_create_ledger_cursor'
  ) THEN
    RAISE NOTICE 'Migration 0001_create_ledger_cursor already applied, skipping.';
    RETURN;
  END IF;

  -- -------------------------------------------------------------------------
  -- ledger_cursor
  --
  -- Tracks the last successfully processed ledger for a given source/domain
  -- pair.  The poller reads this value on startup to resume where it left off
  -- and writes it after every successfully processed ledger batch.
  --
  -- Columns
  --   id                  Surrogate primary key (BIGSERIAL for cheap writes).
  --   source              Identifies the Soroban RPC endpoint or network being
  --                       polled (e.g. "testnet", "mainnet").
  --   domain              The indexer domain that owns this cursor (e.g.
  --                       "streams", "distributions").  Together with source,
  --                       this forms a unique resume point.
  --   last_ledger_seq     The sequence number of the last ledger whose events
  --                       were fully processed and committed.  NULL until the
  --                       first batch completes.
  --   created_at          Wall-clock time when this cursor row was first
  --                       inserted.
  --   updated_at          Wall-clock time of the most recent cursor advance.
  -- -------------------------------------------------------------------------
  CREATE TABLE ledger_cursor (
    id               BIGSERIAL   NOT NULL,
    source           TEXT        NOT NULL,
    domain           TEXT        NOT NULL,
    last_ledger_seq  BIGINT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ledger_cursor_pkey             PRIMARY KEY (id),
    CONSTRAINT ledger_cursor_source_domain_uq UNIQUE      (source, domain),
    CONSTRAINT ledger_cursor_source_nonempty  CHECK       (source <> ''),
    CONSTRAINT ledger_cursor_domain_nonempty  CHECK       (domain <> ''),
    CONSTRAINT ledger_cursor_seq_positive     CHECK       (last_ledger_seq IS NULL OR last_ledger_seq >= 0)
  );

  -- Index for the hot path: the poller looks up a cursor by (source, domain)
  -- on every startup.  The UNIQUE constraint already creates a btree index, so
  -- this is covered automatically.

  -- Index for monitoring and backfill queries ordered by ledger progress.
  CREATE INDEX ledger_cursor_last_ledger_seq_idx
    ON ledger_cursor (last_ledger_seq)
    WHERE last_ledger_seq IS NOT NULL;

  -- Record that this migration has been applied.
  INSERT INTO schema_migrations (version) VALUES ('0001_create_ledger_cursor');
END;
$$;
