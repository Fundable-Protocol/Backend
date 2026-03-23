"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const fingerprint_middleware_1 = __importDefault(require("./appMiddlewares/fingerprint.middleware"));
const appMiddlewares_1 = require("./appMiddlewares");
const errorHandler_1 = require("./utils/errorHandler");
const data_source_1 = __importDefault(require("./config/persistence/data-source"));
const logger_1 = __importDefault(require("./utils/logger"));
const config_1 = __importDefault(require("./config"));
const app = (0, express_1.default)();
const rateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: 'draft-6',
    legacyHeaders: false,
});
const initializeDb = () => {
    return data_source_1.default.initialize();
};
const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001'];
const corsOptions = {
    origin: function (origin, callback) {
        if (config_1.default.isDev ||
            config_1.default.isLocalDev ||
            allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        }
        else {
            callback(new errorHandler_1.AppError({
                name: 'CorsError',
                httpCode: 401,
                message: 'Not allowed by CORS',
                type: 'API',
            }));
        }
    },
    credentials: true,
};
const initializeMiddlewares = () => {
    app.use((0, cors_1.default)(corsOptions))
        .use((0, helmet_1.default)())
        .use(rateLimiter)
        .use(fingerprint_middleware_1.default)
        .use(express_1.default.json())
        .use(express_1.default.urlencoded({ limit: '50kb', extended: false }))
        .use(appMiddlewares_1.verifyAllowedMethods);
};
const initializeRoutes = (routerV1, routerApiV1) => {
    app.use('/v1/', routerV1);
    if (routerApiV1)
        app.use('/api/v1/', routerApiV1);
    // if (appConfigs.isProd || appConfigs.isStaging) {
    //     app.use(Sentry.Handlers.errorHandler());
    // }
    app.get('/', (_req, res) => res.json({
        success: false,
        message: 'Up and running in ' + config_1.default.environment,
    }));
    app.all('*', (_req, res) => res.status(404).json({
        success: false,
        message: 'You have used an invalid method or hit an invalid route',
    }));
    // Use the error handling middleware
    app.use(errorHandler_1.errorHandlingMiddleware);
};
const startServer = async () => {
    try {
        logger_1.default.info('Connecting to DB...');
        await initializeDb();
        logger_1.default.info('DB Connected Successfully!!!');
        initializeMiddlewares();
        const { default: routerV1 } = await Promise.resolve().then(() => __importStar(require('./components/v1/routes.v1')));
        const { default: routerApiV1 } = await Promise.resolve().then(() => __importStar(require('./components/v1/routes.api.v1')));
        initializeRoutes(routerV1, routerApiV1);
        const port = config_1.default.port;
        app.listen(port, () => {
            logger_1.default.info('[+]Logging Service Started');
            logger_1.default.info(`[+] CLOUD Server Running ... on Port -> ${port}`);
        });
    }
    catch (error) {
        errorHandler_1.errorHandler.handleError(error);
        process.exit(1);
    }
};
void startServer();
process.on('uncaughtException', async (err) => {
    try {
        logger_1.default.log('error', '❌❌❌ ➡ ⬇⬇⬇ An Error occured -> UNCAUGHT EXCEPTION ERROR ⬇⬇⬇');
        const error = {
            name: err.name,
            message: err.message,
            stack: err.stack,
        };
        logger_1.default.log('error', error.message);
    }
    catch (shutdownError) {
        logger_1.default.error('Error during shutdown:', shutdownError?.message);
    }
    finally {
        logger_1.default.info('Initiating graceful shutdown...');
        setTimeout(() => process.exit(1), 100);
    }
});
