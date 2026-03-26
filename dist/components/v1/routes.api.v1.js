"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const enhancedRouter_1 = __importDefault(require("../../utils/enhancedRouter"));
const campaign_routes_1 = __importDefault(require("./campaign/campaign.routes"));
const router = new enhancedRouter_1.default();
router.use("/campaigns", campaign_routes_1.default);
exports.default = router.getRouter();
