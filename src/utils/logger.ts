import winston from 'winston';
import appConfigs from '../config';

// Logger Configuration
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
    ],
});

if (appConfigs.isDev || appConfigs.isTestMode || appConfigs.isLocalDev) {
    logger.add(
        new winston.transports.Console({
            format: winston.format.simple(),
        })
    );
}

/**
 * Log an informational message with optional context metadata.
 *
 * @param message - Human-readable message
 * @param context - Optional key/value metadata (service name, IDs, etc.)
 */
export const logInfo = (
    message: string,
    context?: Record<string, unknown>
): void => {
    logger.info(message, context);
};

/**
 * Log a warning with optional context metadata.
 */
export const logWarn = (
    message: string,
    context?: Record<string, unknown>
): void => {
    logger.warn(message, context);
};

/**
 * Log an error.  Accepts an Error instance, a plain message, or both.
 *
 * @param message - Human-readable description of what went wrong
 * @param error   - The caught error/exception (optional)
 * @param context - Additional key/value metadata (optional)
 */
export const logError = (
    message: string,
    error?: unknown,
    context?: Record<string, unknown>
): void => {
    const meta: Record<string, unknown> = { ...context };

    if (error instanceof Error) {
        meta.errorName = error.name;
        meta.errorMessage = error.message;
        meta.stack = error.stack;
    } else if (error !== undefined) {
        meta.error = error;
    }

    logger.error(message, meta);
};

/**
 * Log a debug message (only emitted when log level is set to 'debug').
 */
export const logDebug = (
    message: string,
    context?: Record<string, unknown>
): void => {
    logger.debug(message, context);
};

export default logger;
