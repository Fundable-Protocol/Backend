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
  try {
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
    // Do not log here - let the controller log after successful campaign creation
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Rate limit check failed',
        details: {},
      },
    });
  }
};
