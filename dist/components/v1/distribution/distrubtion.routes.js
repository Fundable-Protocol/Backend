"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const enhancedRouter_1 = __importDefault(require("../../../utils/enhancedRouter"));
const policy_middleware_1 = __importDefault(require("../../../appMiddlewares/policy.middleware"));
const distribution_validation_1 = require("./distribution.validation");
const distribution_controller_1 = require("./distribution.controller");
const distributionRouter = new enhancedRouter_1.default();
distributionRouter.get("/", distribution_controller_1.listDistributions);
distributionRouter.post("/", (0, policy_middleware_1.default)(distribution_validation_1.createDistributionSchema), distribution_controller_1.createDistribution);
exports.default = distributionRouter.getRouter();
