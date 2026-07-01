-- Migration: 0002_create_distributions_schema
-- Creates distribution_batch and claim_action tables for the distributions indexer domain.

CREATE TABLE IF NOT EXISTS schema_migrations (
  version     TEXT        NOT NULL PRIMARY KEY,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM schema_migrations WHERE version = '0002_create_distributions_schema'
  ) THEN
    RAISE NOTICE 'Migration 0002_create_distributions_schema already applied, skipping.';
    RETURN;
  END IF;

  CREATE TABLE distribution_batch (
    id               TEXT           NOT NULL,
    contract_id      TEXT           NOT NULL,
    distributor      TEXT           NOT NULL,
    token            TEXT           NOT NULL,
    total_amount     NUMERIC(78, 0) NOT NULL,
    claimed_amount   NUMERIC(78, 0) NOT NULL DEFAULT 0,
    recipient_count  INTEGER        NOT NULL DEFAULT 0,
    status           TEXT           NOT NULL DEFAULT 'active',
    paused_at        BIGINT,
    resumed_at       BIGINT,
    unique_ref       TEXT           NOT NULL,
    ledger_number    BIGINT         NOT NULL,
    tx_hash          TEXT           NOT NULL,
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT distribution_batch_pkey PRIMARY KEY (id),
    CONSTRAINT distribution_batch_status_chk
      CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
    CONSTRAINT distribution_batch_total_amount_nonneg CHECK (total_amount >= 0),
    CONSTRAINT distribution_batch_claimed_amount_nonneg CHECK (claimed_amount >= 0),
    CONSTRAINT distribution_batch_recipient_count_nonneg CHECK (recipient_count >= 0)
  );

  CREATE INDEX distribution_batch_contract_id_idx
    ON distribution_batch (contract_id);
  CREATE INDEX distribution_batch_distributor_idx
    ON distribution_batch (distributor);
  CREATE INDEX distribution_batch_status_idx
    ON distribution_batch (status);
  CREATE INDEX distribution_batch_created_at_idx
    ON distribution_batch (created_at);
  CREATE INDEX distribution_batch_contract_status_idx
    ON distribution_batch (contract_id, status);

  CREATE TABLE claim_action (
    id               UUID           NOT NULL DEFAULT gen_random_uuid(),
    batch_id         TEXT           NOT NULL,
    claimant         TEXT           NOT NULL,
    amount           NUMERIC(78, 0) NOT NULL,
    tx_hash          TEXT           NOT NULL,
    ledger_number    BIGINT         NOT NULL,
    event_timestamp  BIGINT         NOT NULL,
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT claim_action_pkey PRIMARY KEY (id),
    CONSTRAINT claim_action_batch_fk
      FOREIGN KEY (batch_id) REFERENCES distribution_batch (id) ON DELETE CASCADE,
    CONSTRAINT claim_action_amount_nonneg CHECK (amount >= 0)
  );

  CREATE INDEX claim_action_batch_id_idx ON claim_action (batch_id);
  CREATE INDEX claim_action_claimant_idx ON claim_action (claimant);
  CREATE INDEX claim_action_tx_hash_idx ON claim_action (tx_hash);
  CREATE INDEX claim_action_batch_claimant_idx ON claim_action (batch_id, claimant);

  INSERT INTO schema_migrations (version) VALUES ('0002_create_distributions_schema');
END;
$$;
