import EnhancedRouter from "../../../utils/enhancedRouter";
import { authMiddleware } from "../../../appMiddlewares/auth.middleware";
import policyMiddleware from "../../../appMiddlewares/policy.middleware";
import { updateCampaignSchema } from "./campaign.validation";
import { updateCampaign } from "./campaign.controller";

const campaignRouter = new EnhancedRouter();

campaignRouter.put(
    "/:campaign_id",
    authMiddleware,
    policyMiddleware(updateCampaignSchema),
    updateCampaign
);

export default campaignRouter.getRouter();
