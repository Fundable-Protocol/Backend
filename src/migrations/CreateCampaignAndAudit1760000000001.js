const { MigrationInterface } = require("typeorm")

module.exports = class CreateCampaignAndAudit1760000000001 {
  name = "CreateCampaignAndAudit1760000000001"

  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE "User"
      ADD COLUMN IF NOT EXISTS "campaign_count" integer NOT NULL DEFAULT 0
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "campaigns" (
        "campaign_id" text NOT NULL,
        "user_id" text NOT NULL,
        "campaign_ref" text NOT NULL,
        "target_amount" numeric(78,0) NOT NULL,
        "donation_token" text NOT NULL,
        "transaction_hash" text NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_campaigns_campaign_id" PRIMARY KEY ("campaign_id"),
        CONSTRAINT "UQ_campaigns_campaign_ref" UNIQUE ("campaign_ref")
      )
    `)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "campaigns_user_id_idx" ON "campaigns" ("user_id")
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "audit_id" text NOT NULL,
        "user_id" text NOT NULL,
        "action" text NOT NULL,
        "entity" text NOT NULL,
        "entity_id" text NOT NULL,
        "details" jsonb,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_audit_logs_audit_id" PRIMARY KEY ("audit_id")
      )
    `)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "audit_logs_user_id_idx" ON "audit_logs" ("user_id")
    `)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "audit_logs_entity_idx" ON "audit_logs" ("entity", "entity_id")
    `)
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP INDEX IF EXISTS "audit_logs_entity_idx"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "audit_logs_user_id_idx"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`)

    await queryRunner.query(`DROP INDEX IF EXISTS "campaigns_user_id_idx"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "campaigns"`)

    await queryRunner.query(`ALTER TABLE "User" DROP COLUMN IF EXISTS "campaign_count"`)
  }
}

