"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const jwtAuth_api_1 = require("../../../appMiddlewares/jwtAuth.api");
const apiResponse_1 = require("../../../utils/apiResponse");
const campaign_controller_1 = require("./campaign.controller");
const campaignsRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-6",
    legacyHeaders: false,
    keyGenerator: (req) => {
        const r = req;
        return r.auth?.userId ?? req.ip ?? "unknown";
    },
    handler: (req, res) => {
        return (0, apiResponse_1.sendError)(res, 429, {
            code: "RATE_LIMITED",
            message: "Too many campaigns created. Try again later.",
            details: { limit: 5, windowSeconds: 3600 },
        });
    },
});
const router = (0, express_1.Router)();
router.post("/", jwtAuth_api_1.requireJwtAuthApi, campaignsRateLimiter, campaign_controller_1.createCampaign);
exports.default = router;
