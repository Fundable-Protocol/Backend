import { Router, Request } from 'express';
import { createCampaignController } from './campaigns.controller';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from 'src/appMiddlewares/auth.middleware';

const router = Router();

// Express Request is globally augmented for user property via types/express/index.d.ts

// Rate limit: max 5 campaigns per user per hour
const createCampaignLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  keyGenerator: (req) => req.user?.id || req.ip || '',
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Max 5 campaigns per user per hour',
      details: {}
    }
  }
});

router.post(
  '/campaigns',
  authMiddleware,
  createCampaignLimiter,
  createCampaignController
);

export default router;