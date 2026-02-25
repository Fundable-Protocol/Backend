import { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import { IRequest, IToken } from '../types/global';
import appConfigs from '../config';
import { AppError } from '../utils/errorHandler';

export const authMiddleware = (req: IRequest, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new AppError({
            name: 'UnauthorizedError',
            message: 'No token provided',
            httpCode: 401,
            type: 'API'
        }));
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, appConfigs.authConfig.jwtSecret) as IToken;
        req.decoded = decoded;
        next();
    } catch (error) {
        return next(new AppError({
            name: 'UnauthorizedError',
            message: 'Invalid or expired token',
            httpCode: 401,
            type: 'API'
        }));
    }
};
