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
const user_entity_1 = __importDefault(require("../../components/v1/user/user.entity"));
const campaign_entity_1 = __importDefault(require("../../components/v1/campaign/campaign.entity"));
const auditLog_entity_1 = __importDefault(require("../../components/v1/audit/auditLog.entity"));
const { dbConfigs } = __1.default;
const missingDbConfigKeys = [
    ['DATABASE_HOST', dbConfigs.DATABASE_HOST],
    ['DATABASE_PORT', dbConfigs.DATABASE_PORT],
    ['DATABASE_USERNAME', dbConfigs.DATABASE_USERNAME],
    ['DATABASE_PASSWORD', dbConfigs.DATABASE_PASSWORD],
    ['DATABASE_NAME', dbConfigs.DATABASE_NAME],
]
    .filter(([, value]) => !value)
    .map(([key]) => key);
if (missingDbConfigKeys.length) {
    throw new Error(`Missing required database env vars: ${missingDbConfigKeys.join(', ')}`);
}
const databasePort = Number(dbConfigs.DATABASE_PORT ?? 5432);
const AppDataSource = new typeorm_1.DataSource({
    host: dbConfigs.DATABASE_HOST,
    port: Number.isNaN(databasePort) ? 5432 : databasePort,
    username: dbConfigs.DATABASE_USERNAME,
    password: String(dbConfigs.DATABASE_PASSWORD ?? ''),
    database: dbConfigs.DATABASE_NAME,
    type: 'postgres',
    connectTimeoutMS: 5000,
    synchronize: false,
    logging: __1.default.isDev || __1.default.isLocalDev || __1.default.isTestMode,
    entities: [
        permission_entity_1.RoleEntity,
        platform_entity_1.default,
        permission_entity_1.PermissionEntity,
        wallet_entity_1.default,
        distribution_entity_1.default,
        feeConfig_entity_1.default,
        user_entity_1.default,
        campaign_entity_1.default,
        auditLog_entity_1.default,
    ],
    migrations: ['src/migrations/*.js'],
    ...(__1.default.isProd || __1.default.isStaging
        ? { ssl: { rejectUnauthorized: false } }
        : {}),
});
const resetDatabase = async () => {
    try {
        await AppDataSource.initialize();
        const queryRunner = AppDataSource.createQueryRunner();
        logger_1.default.info('Dropping all tables...');
        await queryRunner.clearDatabase();
        logger_1.default.info('All tables dropped. Database reset successfully!');
    }
    catch (error) {
        console.error('Error resetting the database:', error);
    }
    finally {
        await AppDataSource.destroy();
    }
};
exports.resetDatabase = resetDatabase;
exports.default = AppDataSource;
