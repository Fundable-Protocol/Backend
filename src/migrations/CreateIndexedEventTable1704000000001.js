const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class CreateIndexedEventTable1704000000001 {
  name = "CreateIndexedEventTable1704000000001";

  async up(queryRunner) {
    // Create indexed_event table
    await queryRunner.query(`
      CREATE TABLE "indexed_event" (
        "id" text NOT NULL,
        "contract_id" text NOT NULL,
        "ledger_number" bigint NOT NULL,
        "transaction_hash" text NOT NULL,
        "event_index" integer NOT NULL,
        "event_data" jsonb NOT NULL,
        "event_topics" jsonb NOT NULL,
        "processed_by" text NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_indexed_event_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_indexed_event_dedupe" UNIQUE (
          "contract_id",
          "ledger_number",
          "transaction_hash",
          "event_index"
        )
      )
    `);

    // Create indexes for efficient queries
    await queryRunner.query(`
      CREATE INDEX "indexed_event_contract_id_idx" ON "indexed_event" ("contract_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "indexed_event_ledger_idx" ON "indexed_event" ("ledger_number")
    `);
    await queryRunner.query(`
      CREATE INDEX "indexed_event_tx_hash_idx" ON "indexed_event" ("transaction_hash")
    `);
    await queryRunner.query(`
      CREATE INDEX "indexed_event_created_at_idx" ON "indexed_event" ("created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX "indexed_event_processed_by_idx" ON "indexed_event" ("processed_by")
    `);

    // Composite index for common query patterns
    await queryRunner.query(`
      CREATE INDEX "indexed_event_contract_ledger_idx" ON "indexed_event" ("contract_id", "ledger_number")
    `);
    await queryRunner.query(`
      CREATE INDEX "indexed_event_domain_ledger_idx" ON "indexed_event" ("processed_by", "ledger_number")
    `);
  }

  async down(queryRunner) {
    // Drop indexes first
    await queryRunner.query(`DROP INDEX "indexed_event_domain_ledger_idx"`);
    await queryRunner.query(`DROP INDEX "indexed_event_contract_ledger_idx"`);
    await queryRunner.query(`DROP INDEX "indexed_event_processed_by_idx"`);
    await queryRunner.query(`DROP INDEX "indexed_event_created_at_idx"`);
    await queryRunner.query(`DROP INDEX "indexed_event_tx_hash_idx"`);
    await queryRunner.query(`DROP INDEX "indexed_event_ledger_idx"`);
    await queryRunner.query(`DROP INDEX "indexed_event_contract_id_idx"`);

    // Drop table
    await queryRunner.query(`DROP TABLE "indexed_event"`);
  }
};