import EnhancedRouter from "../../../utils/enhancedRouter"
import policyMiddleware from "../../../appMiddlewares/policy.middleware"
import {
  createDistributionSchema,
  updateDistributionSchema,
  updateDistributionParamsSchema,
} from "./distribution.validation"
import {
  createDistribution,
  updateDistribution,
  listDistributions,
} from "./distribution.controller"

const distributionRouter = new EnhancedRouter()

distributionRouter.get("/", listDistributions)
distributionRouter.post("/", policyMiddleware(createDistributionSchema), createDistribution)
distributionRouter.patch(
  "/:id",
  policyMiddleware(updateDistributionParamsSchema, "params"),
  policyMiddleware(updateDistributionSchema),
  updateDistribution,
)

export default distributionRouter.getRouter()
