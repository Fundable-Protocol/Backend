import { NextFunction, Request, Response } from 'express';

export const verifyAllowedMethods = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        if (req.method === 'OPTIONS') {
            res.header(
                'Access-Control-Allow-Methods',
                'POST, PUT, PATCH, GET, DELETE'
            );

            return res.sendStatus(204);
        } else return next();
    } catch (err) {
        return next(err);
    }
};
