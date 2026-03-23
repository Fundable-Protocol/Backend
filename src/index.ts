import 'reflect-metadata';

import expressRateLimiter from 'express-rate-limit';
import express, { type Router } from 'express';
import helmet from 'helmet';
import cors from 'cors';

import fingerprintMiddleware from './appMiddlewares/fingerprint.middleware';
import { verifyAllowedMethods } from './appMiddlewares';

import {
    AppError,
    errorHandler,
    errorHandlingMiddleware,
} from './utils/errorHandler';
import AppDataSource from './config/persistence/data-source';
import logger from './utils/logger';
import appConfigs from './config';

const app = express();

const rateLimiter = expressRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: 'draft-6',
    legacyHeaders: false,
});

const initializeDb = () => {
    return AppDataSource.initialize();
};

const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001'];

const corsOptions = {
    origin: function (
        origin: string | undefined,
        callback: (_err: Error | null, _allow?: boolean) => void
    ) {
        if (
            appConfigs.isDev ||
            appConfigs.isLocalDev ||
            allowedOrigins.indexOf(origin as string) !== -1
        ) {
            callback(null, true);
        } else {
            callback(
                new AppError({
                    name: 'CorsError',
                    httpCode: 401,
                    message: 'Not allowed by CORS',
                    type: 'API',
                })
            );
        }
    },
    credentials: true,
};

const initializeMiddlewares = () => {
    app.use(cors(corsOptions))
        .use(helmet())
        .use(rateLimiter)
        .use(fingerprintMiddleware)
        .use(express.json())
        .use(express.urlencoded({ limit: '50kb', extended: false }))
        .use(verifyAllowedMethods);
};

const initializeRoutes = (routerV1: Router, routerApiV1?: Router) => {
    app.use('/v1/', routerV1);
    if (routerApiV1) app.use('/api/v1/', routerApiV1);

    // if (appConfigs.isProd || appConfigs.isStaging) {
    //     app.use(Sentry.Handlers.errorHandler());
    // }

    app.get('/', (_req, res) =>
        res.json({
            success: false,
            message: 'Up and running in ' + appConfigs.environment,
        })
    );

    app.all('*', (_req, res) =>
        res.status(404).json({
            success: false,
            message: 'You have used an invalid method or hit an invalid route',
        })
    );

    // Use the error handling middleware
    app.use(errorHandlingMiddleware);
};

const startServer = async () => {
    try {
        logger.info('Connecting to DB...');
        await initializeDb();
        logger.info('DB Connected Successfully!!!');

        initializeMiddlewares();

        const { default: routerV1 } = await import('./components/v1/routes.v1');
        const { default: routerApiV1 } = await import(
            './components/v1/routes.api.v1'
        );
        initializeRoutes(routerV1, routerApiV1);

        const port = appConfigs.port;
        app.listen(port, () => {
            logger.info('[+]Logging Service Started');
            logger.info(`[+] CLOUD Server Running ... on Port -> ${port}`);
        });
    } catch (error) {
        errorHandler.handleError(error as AppError);
        process.exit(1);
    }
};

void startServer();

process.on('uncaughtException', async (err) => {
    try {
        logger.log(
            'error',
            '❌❌❌ ➡ ⬇⬇⬇ An Error occured -> UNCAUGHT EXCEPTION ERROR ⬇⬇⬇'
        );

        const error = {
            name: err.name,
            message: err.message,
            stack: err.stack,
        };

        logger.log('error', error.message);
    } catch (shutdownError) {
        logger.error(
            'Error during shutdown:',
            (shutdownError as Error)?.message
        );
    } finally {
        logger.info('Initiating graceful shutdown...');

        setTimeout(() => process.exit(1), 100);
    }
});
