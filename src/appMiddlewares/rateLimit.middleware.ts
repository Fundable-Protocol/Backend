import { Request, Response, NextFunction } from 'express';
import { saveUserCampaignRequest, getUserCampaignCountLastHour } from '../components/v1/campaigns/campaigns.db';

// Middleware to limit to 5 campaigns per user per hour
export const campaignRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'User not authenticated',
        details: {},
      },
    });
  }
  const userId = req.user.id;
  const count = await getUserCampaignCountLastHour(userId);
  if (count >= 5) {
    return res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Maximum 5 campaigns per user per hour exceeded',
        details: {},
      },
    });
  }
  // Log this request for future rate limit checks
  await saveUserCampaignRequest(userId);
  next();
};
