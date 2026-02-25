import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import appConfigs from '../config';
import { AuthUser } from '../types/auth';

const jwtSecret = appConfigs.authConfig.jwtSecret;
if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required');
}

export function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
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
    try {
        const decoded = jwt.verify(token, jwtSecret);
        if (
            typeof decoded === 'object' &&
            decoded !== null &&
            'id' in decoded &&
            'walletAddress' in decoded
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
