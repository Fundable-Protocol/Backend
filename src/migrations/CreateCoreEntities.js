const { MigrationInterface, QueryRunner } = require("typeorm")

module.exports = class CreateCoreEntities1703000000000 {
  name = "CreateCoreEntities1703000000000"

  async up(queryRunner) {
    // Create enums
    await queryRunner.query(`
      CREATE TYPE "distribution_type" AS ENUM('bulk_transfer', 'airdrop', 'payment', 'reward')
    `)
    await queryRunner.query(`
      CREATE TYPE "distribution_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'cancelled')
    `)
    await queryRunner.query(`
      CREATE TYPE "network" AS ENUM('mainnet', 'testnet', 'polygon', 'bsc', 'arbitrum', 'optimism')
    `)

    // Create User table
    await queryRunner.query(`
      CREATE TABLE "User" (
        "id" text NOT NULL,
        "username" text NOT NULL,
        "email" text NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_User_email" UNIQUE ("email"),
        CONSTRAINT "PK_User_id" PRIMARY KEY ("id")
      )
    `)

    // Create FeeConfig table
    await queryRunner.query(`
      CREATE TABLE "FeeConfig" (
        "id" text NOT NULL,
        "network" "network" NOT NULL,
        "chain_id" text NOT NULL,
        "chain_name" text NOT NULL,
        "amount" decimal(65,30) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "unique_network_config" UNIQUE ("chain_name", "network", "chain_id"),
        CONSTRAINT "PK_FeeConfig_id" PRIMARY KEY ("id")
      )
    `)

    // Create Distribution table
    await queryRunner.query(`
      CREATE TABLE "Distribution" (
        "id" text NOT NULL,
        "user_address" text NOT NULL,
        "transaction_hash" text,
        "token_address" text NOT NULL,
        "token_symbol" text NOT NULL,
        "token_decimals" integer NOT NULL,
        "total_amount" decimal(65,30) NOT NULL,
        "fee_amount" decimal(65,30) NOT NULL,
        "usd_rate" decimal(65,30) DEFAULT '0',
        "total_usd_amount" decimal(65,30) DEFAULT '0',
        "total_recipients" integer NOT NULL,
        "distribution_type" "distribution_type" NOT NULL,
        "chain_name" text DEFAULT '',
        "status" "distribution_status" NOT NULL DEFAULT 'pending',
        "block_number" bigint,
        "block_timestamp" TIMESTAMP(3),
        "network" "network" NOT NULL DEFAULT 'mainnet',
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "metadata" jsonb,
        CONSTRAINT "PK_Distribution_id" PRIMARY KEY ("id")
      )
    `)

    // Ensure Wallet table exists (this repo snapshot does not include an earlier wallet migration)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wallet" (
        "id" text NOT NULL,
        "address" text NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UQ_wallet_address" UNIQUE ("address"),
        CONSTRAINT "PK_wallet_id" PRIMARY KEY ("id")
      )
    `)

    // Update Wallet table (backwards compatible)
    await queryRunner.query(`
      ALTER TABLE "wallet" ADD COLUMN IF NOT EXISTS "network" "network" NOT NULL DEFAULT 'mainnet'
    `)
    await queryRunner.query(`
      ALTER TABLE "wallet" ADD COLUMN IF NOT EXISTS "chain_id" text NOT NULL DEFAULT ''
    `)
    await queryRunner.query(`
      ALTER TABLE "wallet" ADD COLUMN IF NOT EXISTS "chain_name" text NOT NULL DEFAULT ''
    `)
    await queryRunner.query(`
      ALTER TABLE "wallet" ADD COLUMN IF NOT EXISTS "balance" decimal(65,30) DEFAULT '0'
    `)

    // Create indexes
    await queryRunner.query(`CREATE INDEX "User_email_key" ON "User" ("email")`)
    await queryRunner.query(`CREATE INDEX "Distribution_created_at_idx" ON "Distribution" ("created_at")`)
    await queryRunner.query(`CREATE INDEX "Distribution_status_idx" ON "Distribution" ("status")`)
    await queryRunner.query(`CREATE INDEX "Distribution_transaction_hash_idx" ON "Distribution" ("transaction_hash")`)
    await queryRunner.query(`CREATE INDEX "Distribution_user_address_idx" ON "Distribution" ("user_address")`)
    await queryRunner.query(`CREATE INDEX "Wallet_address_idx" ON "wallet" ("address")`)
    await queryRunner.query(`CREATE INDEX "Wallet_network_idx" ON "wallet" ("network")`)
  }

  async down(queryRunner) {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "Wallet_network_idx"`)
    await queryRunner.query(`DROP INDEX "Wallet_address_idx"`)
    await queryRunner.query(`DROP INDEX "Distribution_user_address_idx"`)
    await queryRunner.query(`DROP INDEX "Distribution_transaction_hash_idx"`)
    await queryRunner.query(`DROP INDEX "Distribution_status_idx"`)
    await queryRunner.query(`DROP INDEX "Distribution_created_at_idx"`)
    await queryRunner.query(`DROP INDEX "User_email_key"`)

    // Drop tables
    await queryRunner.query(`DROP TABLE "Distribution"`)
    await queryRunner.query(`DROP TABLE "FeeConfig"`)
    await queryRunner.query(`DROP TABLE "User"`)

    // Remove wallet columns
    await queryRunner.query(`ALTER TABLE "wallet" DROP COLUMN "balance"`)
    await queryRunner.query(`ALTER TABLE "wallet" DROP COLUMN "chain_name"`)
    await queryRunner.query(`ALTER TABLE "wallet" DROP COLUMN "chain_id"`)
    await queryRunner.query(`ALTER TABLE "wallet" DROP COLUMN "network"`)

    // Drop enums
    await queryRunner.query(`DROP TYPE "network"`)
    await queryRunner.query(`DROP TYPE "distribution_status"`)
    await queryRunner.query(`DROP TYPE "distribution_type"`)
  }
}
