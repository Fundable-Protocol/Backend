import type { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';

import type { IRequest } from '../types/global';
import appConfigs from '../config';
import { sendError } from '../utils/apiResponse';

type JwtClaims = jwt.JwtPayload & {
    sub?: string;
    userId?: string;
    id?: string;
    walletAddress?: string;
    address?: string;
    email?: string;
    role?: string;
    userType?: string;
};

export const requireJwtAuthApi = (
    req: IRequest,
    res: Response,
    next: NextFunction
) => {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ')
        ? header.slice('Bearer '.length).trim()
        : '';

    if (!token) {
        return sendError(res, 401, {
            code: 'AUTH_MISSING_TOKEN',
            message: 'Missing authentication token',
        });
    }

    try {
        const decoded = jwt.verify(
            token,
            appConfigs.authConfig.jwtSecret
        ) as JwtClaims;

        const userId = decoded.sub ?? decoded.userId ?? decoded.id;
        if (!userId) {
            return sendError(res, 401, {
                code: 'AUTH_INVALID_TOKEN',
                message: 'Invalid authentication token',
            });
        }

        req.auth = {
            userId: String(userId),
            walletAddress: decoded.walletAddress ?? decoded.address,
            email: decoded.email,
            claims: decoded,
        };

        return next();
    } catch (error) {
        return sendError(res, 401, {
            code: 'AUTH_INVALID_TOKEN',
            message: 'Invalid authentication token',
            details: error instanceof Error ? { name: error.name } : {},
        });
    }
};

const ADMIN_ROLES = ['super-admin', 'admin'];

export const requireAdminApi = (
    req: IRequest,
    res: Response,
    next: NextFunction
) => {
    const role = req.auth?.claims?.role as string | undefined;
    const userType = req.auth?.claims?.userType as string | undefined;

    if (role && ADMIN_ROLES.includes(role)) {
        return next();
    }

    if (userType && ADMIN_ROLES.includes(userType)) {
        return next();
    }

    return sendError(res, 403, {
        code: 'FORBIDDEN',
        message: 'Admin access required',
    });
};
