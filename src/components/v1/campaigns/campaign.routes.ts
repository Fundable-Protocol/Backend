import EnhancedRouter from '../../../utils/enhancedRouter';
import policyMiddleware from '../../../appMiddlewares/policy.middleware';
import { authMiddleware } from '../../../appMiddlewares/auth.middleware';
import { campaignRateLimit } from '../../../appMiddlewares/campaignRateLimit.middleware';
import { createCampaignSchema } from './campaign.validation';
import { createCampaign } from './campaign.controller';

const campaignRouter = new EnhancedRouter();

campaignRouter.post(
    '/',
    authMiddleware,
    campaignRateLimit,
    policyMiddleware(createCampaignSchema),
    createCampaign
);

export default campaignRouter.getRouter();
