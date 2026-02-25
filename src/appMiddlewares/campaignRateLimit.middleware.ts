import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { RedisStore, type RedisReply } from 'rate-limit-redis';
import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let redisClient: Redis | null = null;
let limiter: ReturnType<typeof rateLimit> | null = null;
let initPromise: Promise<ReturnType<typeof rateLimit>> | null = null;

function getLimiter(): Promise<ReturnType<typeof rateLimit>> {
    if (initPromise) return initPromise;
    initPromise = createLimiter().catch((err) => {
        initPromise = null;
        throw err;
    });
    return initPromise;
}

async function createLimiter() {
    redisClient = new Redis(REDIS_URL);
    redisClient.on('error', (err) => {
        console.error('[campaignRateLimit] Redis error:', err);
    });
    limiter = rateLimit({
        windowMs: 60 * 60 * 1000,
        max: 5,
        standardHeaders: 'draft-6',
        legacyHeaders: false,
        keyGenerator: (req: Request) => {
            if (req.user?.id) return `campaign:${req.user.id}`;
            return req.ip || 'unknown';
        },
        store: new RedisStore({
            sendCommand: (command: string, ...args: string[]) =>
                redisClient!.call(command, ...args) as Promise<RedisReply>,
        }),
        handler: (_req: Request, res: Response) => {
            res.status(429).json({
                success: false,
                error: {
                    code: 'RATE_LIMIT_EXCEEDED',
                    message: 'Maximum 5 campaigns per user per hour exceeded',
                    details: {},
                },
            });
        },
    });
    return limiter;
}

export const campaignRateLimit = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (!req.user?.id) {
        return res.status(401).json({
            success: false,
            error: {
                code: 'UNAUTHORIZED',
                message: 'User not authenticated',
                details: {},
            },
        });
    }
    const limiterInstance = await getLimiter();
    limiterInstance(req, res, next);
};
