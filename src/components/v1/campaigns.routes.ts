import { Router } from 'express';
import { createCampaignController } from './campaigns.controller';
import { authenticateJWT } from '../../appMiddlewares/auth.middleware';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limit: max 5 campaigns per user per hour
const createCampaignLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  keyGenerator: (req) => req.user?.id || req.ip,
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
  authenticateJWT,
  createCampaignLimiter,
  createCampaignController
);

export default router;
