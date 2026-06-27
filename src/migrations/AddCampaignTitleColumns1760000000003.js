const { MigrationInterface } = require("typeorm")

module.exports = class AddCampaignTitleColumns1760000000003 {
  name = "AddCampaignTitleColumns1760000000003"

  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE "campaigns"
      ADD COLUMN IF NOT EXISTS "title" text
    `)

    await queryRunner.query(`
      ALTER TABLE "donations"
      ADD COLUMN IF NOT EXISTS "campaign_title" text
    `)
  }

  async down(queryRunner) {
    await queryRunner.query(`ALTER TABLE "donations" DROP COLUMN IF EXISTS "campaign_title"`)
    await queryRunner.query(`ALTER TABLE "campaigns" DROP COLUMN IF EXISTS "title"`)
  }
}
