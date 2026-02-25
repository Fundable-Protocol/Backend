"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetDatabase = void 0;
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const __1 = __importDefault(require(".."));
const logger_1 = __importDefault(require("../../utils/logger"));
const platform_entity_1 = __importDefault(require("../../components/v1/platform/platformEntities/platform.entity"));
const permission_entity_1 = require("../../components/v1/platform/platformEntities/permission.entity");
const wallet_entity_1 = __importDefault(require("../../components/v1/wallet/wallet.entity"));
const distribution_entity_1 = __importDefault(require("../../components/v1/distribution/distribution.entity"));
const feeConfig_entity_1 = __importDefault(require("../../components/v1/feeConfig/feeConfig.entity"));
const user_entity_1 = __importDefault(require("src/components/v1/user/user.entity"));
const campaign_entity_1 = require("../../components/v1/campaigns/campaign.entity");
const { dbConfigs } = __1.default;
const AppDataSource = new typeorm_1.DataSource({
    host: dbConfigs.DATABASE_HOST,
    port: +dbConfigs.DATABASE_PORT,
    username: dbConfigs.DATABASE_USERNAME,
    password: dbConfigs.DATABASE_PASSWORD,
    database: dbConfigs.DATABASE_NAME,
    type: "postgres",
    synchronize: false,
    logging: true,
    entities: [
        permission_entity_1.RoleEntity,
        platform_entity_1.default,
        permission_entity_1.PermissionEntity,
        wallet_entity_1.default,
        distribution_entity_1.default,
        feeConfig_entity_1.default,
        user_entity_1.default,
        campaign_entity_1.CampaignEntity,
    ],
    migrations: ["src/migrations/*.js"],
    ssl: {
        rejectUnauthorized: false,
    },
});
const resetDatabase = async () => {
    try {
        // Connect to the database
        await AppDataSource.initialize();
        const queryRunner = AppDataSource.createQueryRunner();
        // Drop all tables
        logger_1.default.info("Dropping all tables...");
        await queryRunner.clearDatabase();
        logger_1.default.info("All tables dropped. Database reset successfully!");
    }
    catch (error) {
        console.error("Error resetting the database:", error);
    }
    finally {
        // Close the connection
        await AppDataSource.destroy();
    }
};
exports.resetDatabase = resetDatabase;
exports.default = AppDataSource;
