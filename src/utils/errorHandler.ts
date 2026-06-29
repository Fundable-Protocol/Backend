/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';

import { AppErrorAttributes, IRequest } from '../types/global';
import responseMessages from './responseMessages';
import appConfigs from '../config';
import logger from './logger';

// Custom Error Class
export class AppError extends Error {
    public readonly name: string;
    public readonly httpCode: number;
    public readonly type: AppErrorAttributes['type'];
    public readonly extra: Record<string, any>;

    constructor({
        name,
        httpCode = 500,
        message,
        type = 'OPERATIONAL',
        extra = {},
    }: AppErrorAttributes) {
        super(message);

        Object.setPrototypeOf(this, new.target.prototype);

        this.name = name || 'Error';
        this.httpCode = httpCode;
        this.type = type;
        this.extra = extra || {};

        Error.captureStackTrace(this);
    }
}

export class BadRequestError extends AppError {
    constructor(message: string, extra: Record<string, any> = {}) {
        super({
            name: 'BadRequestError',
            httpCode: 400,
            message,
            type: 'API',
            extra,
        });
    }
}

export class InvalidRequestError extends AppError {
    constructor(
        message?: string,
        statusCode?: number,
        extra: Record<string, any> = {}
    ) {
        super({
            name: 'InvalidRequestError',
            httpCode: statusCode || 401,
            message: message || responseMessages.invalidRequest,
            type: 'API',
            extra,
        });
    }
}

export class NotFoundError extends AppError {
    constructor(
        message: string,
        statusCode?: number,
        extra: Record<string, any> = {}
    ) {
        super({
            name: 'NotFoundError',
            httpCode: statusCode || 404,
            message,
            type: 'API',
            extra,
        });
    }
}

export class ConflictError extends AppError {
    constructor(message: string, extra: Record<string, any> = {}) {
        super({
            name: 'ConflictError',
            httpCode: 409,
            message,
            type: 'API',
            extra,
        });
    }
}

export class UnAuthorizedError extends AppError {
    constructor(
        message: string,
        statusCode?: number,
        extra: Record<string, any> = {}
    ) {
        super({
            name: 'UnAuthorizedError',
            httpCode: statusCode || 401,
            message,
            type: 'API',
            extra,
        });
    }
}

export class ForbiddenError extends AppError {
    constructor(
        message?: string,
        statusCode?: number,
        extra: Record<string, any> = {}
    ) {
        super({
            name: 'ForbiddenError',
            httpCode: statusCode || 403,
            message: message || 'Forbidden.',
            type: 'API',
            extra,
        });
    }
}

// Error Handler Class
class ErrorHandler {
    constructor() {
        this.handleError = this.handleError.bind(this);
        this.handleErrorResponse = this.handleErrorResponse.bind(this);
    }

    private isOperationalError(error: Error): boolean {
        return error instanceof AppError && error.type === 'OPERATIONAL';
    }

    private isApiError(error: Error): boolean {
        return error instanceof AppError && error.type === 'API';
    }

    private async processOperationalError(error: AppError, req?: IRequest) {
        if (
            appConfigs.isDev ||
            appConfigs.isLocalDev ||
            appConfigs.isTestMode
        ) {
            await this.logError(error, req);
        }
    }

    private async processCriticalError(error: Error, req?: IRequest) {
        await this.logError(error, req);

        setTimeout(() => {
            process.exit(1);
        }, 500);
    }

    private async logError(
        error: Error | AppError,
        req?: Request
    ): Promise<void> {
        const errorDetails = {
            name: error.name,
            message: error.message,
            path1: error.stack?.split('\n')[1].trim(),
            path2: error.stack?.split('\n')[2].trim(),
            ...(req?.originalUrl && { url: req.originalUrl }),
            ...(req?.method && { method: req.method }),
            ...(req?.body && { body: req.body }),
            ...(req?.params && { params: req.params }),
            ...(req?.query && { query: req.query }),
        };

        logger.error(JSON.stringify(errorDetails));

        // Add any additional logging to an external service here if needed
    }

    public async handleError(
        error: Error | AppError,
        req?: IRequest
    ): Promise<void> {
        switch (true) {
            case this.isOperationalError(error):
                await this.processOperationalError(error as AppError, req);
                return;

            case this.isApiError(error):
                return;

            default:
                await this.processCriticalError(error as AppError, req);
                break;
        }
    }

    public handleErrorResponse(error: unknown, statusCode?: number): never {
        let { message, httpCode, type } = error as AppError;
        const { name, extra } = error as AppError;

        logger.info(`${name}: ${message}`);

        switch (name) {
            case 'ValidationError':
                httpCode = 400;
                type = 'OPERATIONAL';
                break;

            case 'JsonWebTokenError':
                message = 'Invalid token';
                httpCode = 401;
                break;

            case 'TokenExpiredError':
                message = 'Token expired';
                httpCode = 401;
                break;

            case 'SyntaxError':
                httpCode = 400;
                type = 'API';
                break;
            case 'MulterError':
                httpCode = 400;
                type = 'API';
                break;

            // Redis-related error handling
            // case 'ECONNREFUSED':
            // case 'ETIMEDOUT':
            // case 'ECONNRESET':
            // case 'NR_CLOSED':
            // case 'WRONGTYPE':
            // case 'READONLY':
            //     //  logger.error(`Redis error occurred: ${name} - ${message}`, { extra }); // Log the detailed error
            //     message = responseMessages.tryAgain;
            //     httpCode = 503;
            //     type = 'API';
            //     break;

            default:
                message = type === 'API' ? message : responseMessages.tryAgain;
                httpCode = statusCode || httpCode || 500;
                break;
        }

        throw new AppError({
            name,
            message,
            httpCode,
            extra,
            type: type || 'API',
        });
    }
}

export const errorHandler = new ErrorHandler();

// Express Error Handling Middleware
export const errorHandlingMiddleware = async (
    err: Error | AppError,
    _req: IRequest,
    res: Response,
    _next: NextFunction
) => {
    try {
        errorHandler.handleErrorResponse(err);
    } catch (error) {
        errorHandler.handleError(error as AppError);

        if (error instanceof AppError && error.type === 'API') {
            const { httpCode, message, extra } = error;

            return res.status(httpCode || 500).json({
                success: false,
                message,
                ...(Object.values(extra)?.length && { extra }),
            });
        } else {
            return res
                .status(500)
                .json({ success: false, message: responseMessages.tryAgain });
        }
    }
};
