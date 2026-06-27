const { MigrationInterface } = require("typeorm")

module.exports = class CreateDonationsTable1760000000002 {
  name = "CreateDonationsTable1760000000002"

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TYPE "donation_status" AS ENUM('pending', 'confirmed', 'failed', 'refunded')
    `)

    await queryRunner.query(`
      CREATE TABLE "donations" (
        "id" text NOT NULL,
        "campaign_id" text NOT NULL,
        "campaign_ref" text,
        "donor_id" text,
        "donor_address" text NOT NULL,
        "donor_name" text,
        "transaction_hash" text,
        "block_number" bigint,
        "block_timestamp" TIMESTAMP(3),
        "gas_fee" decimal(65,30) DEFAULT '0',
        "amount" decimal(65,30) NOT NULL,
        "usd_amount" decimal(65,30) DEFAULT '0',
        "token_address" text NOT NULL,
        "token_symbol" text NOT NULL,
        "token_decimals" integer NOT NULL,
        "status" "donation_status" NOT NULL DEFAULT 'pending',
        "confirmed_at" TIMESTAMP(3),
        "is_anonymous" boolean NOT NULL DEFAULT false,
        "message" text,
        "network" "network" NOT NULL DEFAULT 'mainnet',
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_donations_id" PRIMARY KEY ("id")
      )
    `)

    await queryRunner.query(`CREATE INDEX "donations_campaign_id_idx" ON "donations" ("campaign_id")`)
    await queryRunner.query(`CREATE INDEX "donations_donor_address_idx" ON "donations" ("donor_address")`)
    await queryRunner.query(`CREATE INDEX "donations_status_idx" ON "donations" ("status")`)
    await queryRunner.query(`CREATE INDEX "donations_created_at_idx" ON "donations" ("created_at")`)
    await queryRunner.query(`CREATE INDEX "donations_transaction_hash_idx" ON "donations" ("transaction_hash")`)
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP INDEX IF EXISTS "donations_transaction_hash_idx"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "donations_created_at_idx"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "donations_status_idx"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "donations_donor_address_idx"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "donations_campaign_id_idx"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "donations"`)
    await queryRunner.query(`DROP TYPE IF EXISTS "donation_status"`)
  }
}
