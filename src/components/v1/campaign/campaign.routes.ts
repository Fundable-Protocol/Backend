import { Router } from "express"
import rateLimit from "express-rate-limit"

import { requireJwtAuthApi } from "../../../appMiddlewares/jwtAuth.api"
import type { IRequest } from "../../../types/global"
import { sendError } from "../../../utils/apiResponse"
import { createCampaign } from "./campaign.controller"

const campaignsRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-6",
  legacyHeaders: false,
  keyGenerator: (req) => {
    const r = req as IRequest
    return r.auth?.userId ?? req.ip ?? "unknown"
  },
  handler: (req, res) => {
    return sendError(res, 429, {
      code: "RATE_LIMITED",
      message: "Too many campaigns created. Try again later.",
      details: { limit: 5, windowSeconds: 3600 },
    })
  },
})

const router = Router()

router.post("/", requireJwtAuthApi, campaignsRateLimiter, createCampaign)

export default router
