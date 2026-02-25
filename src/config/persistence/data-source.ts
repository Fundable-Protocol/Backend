import "reflect-metadata"
import { DataSource } from "typeorm"

import appConfigs from ".."
import logger from "../../utils/logger"
import PlatformEntity from "../../components/v1/platform/platformEntities/platform.entity"

import { PermissionEntity, RoleEntity } from "../../components/v1/platform/platformEntities/permission.entity"
import WalletEntity from "../../components/v1/wallet/wallet.entity"
import DistributionEntity from "../../components/v1/distribution/distribution.entity"
import FeeConfigEntity from "../../components/v1/feeConfig/feeConfig.entity"
import UserEntity from "src/components/v1/user/user.entity"

const { dbConfigs } = appConfigs

const AppDataSource = new DataSource({
  host: dbConfigs.DATABASE_HOST,
  port: +dbConfigs.DATABASE_PORT!,
  username: dbConfigs.DATABASE_USERNAME,
  password: dbConfigs.DATABASE_PASSWORD,
  database: dbConfigs.DATABASE_NAME,
  type: "postgres",
  synchronize: false,
  logging: true,
  entities: [
    RoleEntity,
    PlatformEntity,
    PermissionEntity,
    WalletEntity,
    DistributionEntity,
    FeeConfigEntity,
    UserEntity,
  ],
  migrations: ["src/migrations/*.js"],
  ssl: {
    rejectUnauthorized: false,
  },
})

export const resetDatabase = async () => {
  try {
    // Connect to the database
    await AppDataSource.initialize()

    const queryRunner = AppDataSource.createQueryRunner()

    // Drop all tables
    logger.info("Dropping all tables...")
    await queryRunner.clearDatabase()

    logger.info("All tables dropped. Database reset successfully!")
  } catch (error) {
    console.error("Error resetting the database:", error)
  } finally {
    // Close the connection
    await AppDataSource.destroy()
  }
}

export default AppDataSource
