import { Router, Request } from 'express';
import { createCampaignController } from './campaigns.controller';
import { authMiddleware } from 'src/appMiddlewares/auth.middleware';
import { campaignRateLimit } from '../../../appMiddlewares/rateLimit.middleware';

const router = Router();

// Express Request is globally augmented for user property via types/express/index.d.ts

router.post(
  '/campaigns',
  authMiddleware,
  campaignRateLimit,
  createCampaignController
);

export default router;