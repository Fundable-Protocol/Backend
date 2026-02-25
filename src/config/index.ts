import { env } from 'process';

const appConfigs = {
    isProd: ['prod', 'production'].includes(env.NODE_ENV!),
    isDev: ['dev', 'development'].includes(env.NODE_ENV!),
    isLocalDev: 'local_dev' === env.NODE_ENV!,
    isStaging: env.NODE_ENV === 'staging',
    isTestMode: ['test', 'testing'].includes(env.NODE_ENV!),
    port: env.PORT || 8002,
    dbUrl: ['test', 'testing'].includes(env.NODE_ENV!)
        ? env.TEST_DATABASE_URL
        : env.DATABASE_URL,
    dbName: env.DATABASE_NAME,
    dbConfigs: {
        DATABASE_URL: env.DATABASE_URL,
        DATABASE_NAME: env.DATABASE_NAME,
        DATABASE_HOST: env.DATABASE_HOST,
        DATABASE_PORT: env.DATABASE_PORT,
        DATABASE_USERNAME: env.DATABASE_USERNAME,
        DATABASE_PASSWORD: env.DATABASE_PASSWORD,
    },
    environment: env.NODE_ENV || 'dev',
    authConfig: {
        saltRound: 10,
        jwtSecret: env.JWT_SECRET,
        jwtIssuer: env.JWT_ISSUER,
        jwtAudience: env.JWT_AUDIENCE,
        hashPepper: env.HASH_PEPPER || '',
        sessionLifeSpan: '2 days',
        maxInactivity: '4 hours',
    },
    seedData: {
        firstName: env.SEED_FIRST_NAME!,
        lastName: env.SEED_LAST_NAME!,
        email: env.SEED_EMAIL!,
        password: env.SEED_PASSWORD!,
        phonePrefix: env.SEED_PHONE_PREFIX!,
        phone: env.SEED_PHONE!,
    },
    platformConfig: {
        name: 'fundable-server',
        description: env.PLATFORM_DESCRIPTION ?? '',
    },
};

export default appConfigs;
