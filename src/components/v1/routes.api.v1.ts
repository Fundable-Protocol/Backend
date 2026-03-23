import EnhancedRouter from "../../utils/enhancedRouter"

import campaignRoutes from "./campaign/campaign.routes"

const router = new EnhancedRouter()

router.use("/campaigns", campaignRoutes)

export default router.getRouter()

