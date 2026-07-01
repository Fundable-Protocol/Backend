import 'reflect-metadata';
import { DataSource } from 'typeorm';

import appConfigs from '..';
import logger from '../../utils/logger';
import PlatformEntity from '../../components/v1/platform/platformEntities/platform.entity';

import {
    PermissionEntity,
    RoleEntity,
} from '../../components/v1/platform/platformEntities/permission.entity';
import WalletEntity from '../../components/v1/wallet/wallet.entity';
import DistributionEntity from '../../components/v1/distribution/distribution.entity';
import FeeConfigEntity from '../../components/v1/feeConfig/feeConfig.entity';
import UserEntity from '../../components/v1/user/user.entity';
import CampaignEntity from '../../components/v1/campaign/campaign.entity';
import AuditLogEntity from '../../components/v1/audit/auditLog.entity';
import DonationEntity from '../../components/v1/Donation/donation.entity';

const { dbConfigs } = appConfigs;

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
    throw new Error(
        `Missing required database env vars: ${missingDbConfigKeys.join(', ')}`
    );
}

const databasePort = Number(dbConfigs.DATABASE_PORT ?? 5432);

const AppDataSource = new DataSource({
    host: dbConfigs.DATABASE_HOST,
    port: Number.isNaN(databasePort) ? 5432 : databasePort,
    username: dbConfigs.DATABASE_USERNAME,
    password: String(dbConfigs.DATABASE_PASSWORD ?? ''),
    database: dbConfigs.DATABASE_NAME,
    type: 'postgres',
    connectTimeoutMS: 5000,
    synchronize: false,
    logging: appConfigs.isDev || appConfigs.isLocalDev || appConfigs.isTestMode,
    entities: [
        RoleEntity,
        PlatformEntity,
        PermissionEntity,
        WalletEntity,
        DistributionEntity,
        FeeConfigEntity,
        UserEntity,
        CampaignEntity,
        AuditLogEntity,
        DonationEntity,
    ],
    migrations: ['src/migrations/*.js'],
    ...(appConfigs.isProd || appConfigs.isStaging
        ? { ssl: { rejectUnauthorized: false } }
        : {}),
});

export const resetDatabase = async () => {
    try {
        await AppDataSource.initialize();

        const queryRunner = AppDataSource.createQueryRunner();

        logger.info('Dropping all tables...');
        await queryRunner.clearDatabase();
        logger.info('All tables dropped. Database reset successfully!');
    } catch (error) {
        console.error('Error resetting the database:', error);
    } finally {
        await AppDataSource.destroy();
    }
};

export default AppDataSource;
