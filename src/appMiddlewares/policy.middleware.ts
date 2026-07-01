import { NextFunction, Response } from 'express';
import { Schema, z } from 'zod';

import { IRequest } from '../types/global';
import { sendError } from '../utils/apiResponse';

const policyMiddleware =
    (schema: Schema, fieldType: 'body' | 'params' | 'query' = 'body') =>
    (req: IRequest, _res: Response, next: NextFunction) => {
        try {
            const parsedData = schema.parse(req[fieldType]);

            req[fieldType] = parsedData;

            return next();
        } catch (err) {
            if (err instanceof z.ZodError) {
                const issue = err.issues[0];

                const message = `${issue.path.join('.')} ${
                    issue.message
                }`.toLowerCase();

                return sendError(res, 400, {
                    code: 'VALIDATION_ERROR',
                    message,
                    details: { issues: err.issues },
                });
            }

            return next(err);
        }
    };

export default policyMiddleware;
