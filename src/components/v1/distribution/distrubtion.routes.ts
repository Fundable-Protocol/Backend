import EnhancedRouter from "../../../utils/enhancedRouter"
import policyMiddleware from "../../../appMiddlewares/policy.middleware"
import { createDistributionSchema, updateDistributionSchema } from "./distribution.validation"
import {
  createDistribution,
  updateDistribution,
} from "./distribution.controller"

const distributionRouter = new EnhancedRouter()

distributionRouter.post("/distributions", policyMiddleware(createDistributionSchema), createDistribution)
distributionRouter.patch("/distributions/:id", policyMiddleware(updateDistributionSchema), updateDistribution)

export default distributionRouter.getRouter()
