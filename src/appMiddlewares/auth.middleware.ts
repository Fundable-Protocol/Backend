import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import appConfigs from '../config';
import { AuthUser } from '../types/auth';

export function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    const jwtSecret = appConfigs.authConfig.jwtSecret;
    if (!jwtSecret) {
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Server misconfiguration',
                details: {},
            },
        });
        return;
    }
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
        res.status(401).json({
            success: false,
            error: {
                code: 'UNAUTHORIZED',
                message: 'No token provided',
                details: {},
            },
        });
        return;
    }
    const token = authHeader.split(' ')[1];
    const verifyOptions: jwt.VerifyOptions = {
        algorithms: ['HS256'],
    };
    if (appConfigs.authConfig.jwtIssuer) {
        verifyOptions.issuer = appConfigs.authConfig.jwtIssuer;
    }
    if (appConfigs.authConfig.jwtAudience) {
        verifyOptions.audience = appConfigs.authConfig.jwtAudience;
    }
    try {
        const decoded = jwt.verify(token, jwtSecret, verifyOptions);
        if (
            typeof decoded === 'object' &&
            decoded !== null &&
            typeof (decoded as Record<string, unknown>).id === 'string' &&
            typeof (decoded as Record<string, unknown>).walletAddress === 'string'
        ) {
            req.user = decoded as AuthUser;
            next();
        } else {
            throw new Error('Invalid token payload');
        }
    } catch {
        res.status(401).json({
            success: false,
            error: {
                code: 'UNAUTHORIZED',
                message: 'Authentication failed',
                details: {},
            },
        });
    }
}
