import EnhancedRouter from "../../../utils/enhancedRouter"
import policyMiddleware from "../../../appMiddlewares/policy.middleware"
import { createDistributionSchema } from "./distribution.validation"
import {
  createDistribution,
  listDistributions,
} from "./distribution.controller"

const distributionRouter = new EnhancedRouter()

distributionRouter.get("/", listDistributions)
distributionRouter.post("/", policyMiddleware(createDistributionSchema), createDistribution)

export default distributionRouter.getRouter()
