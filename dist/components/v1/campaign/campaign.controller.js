"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCampaign = void 0;
const zod_1 = require("zod");
const apiResponse_1 = require("../../../utils/apiResponse");
const campaign_validation_1 = require("./campaign.validation");
const data_source_1 = __importDefault(require("../../../config/persistence/data-source"));
const campaign_entity_1 = __importDefault(require("./campaign.entity"));
const auditLog_entity_1 = __importDefault(require("../audit/auditLog.entity"));
const campaign_service_1 = require("./campaign.service");
const campaignFactory_client_1 = require("../../../services/cairo/campaignFactory.client");
const logger_1 = __importDefault(require("../../../utils/logger"));
const wallet_entity_1 = __importDefault(require("../wallet/wallet.entity"));
const user_entity_1 = __importDefault(require("../user/user.entity"));
const mapCreateCampaignError = (error) => {
    const code = typeof error?.code === "string" ? error.code : "INTERNAL_ERROR";
    switch (code) {
        case "DUPLICATE_CAMPAIGN_REF":
            return { status: 409, code, message: "campaign_ref already exists" };
        case "INSUFFICIENT_BALANCE":
            return { status: 400, code, message: "Insufficient wallet balance for transaction fees" };
        case "WALLET_NOT_FOUND":
            return { status: 400, code, message: "Wallet not found" };
        case "MISSING_WALLET_ADDRESS":
            return { status: 400, code, message: "Token does not include a wallet address claim" };
        default:
            return {
                status: 500,
                code,
                message: error instanceof Error ? error.message : "Internal server error",
            };
    }
};
const createCampaign = async (req, res) => {
    if (!req.auth?.userId) {
        return (0, apiResponse_1.sendError)(res, 401, { code: "AUTH_REQUIRED", message: "Authentication required" });
    }
    try {
        const parsed = campaign_validation_1.createCampaignSchema.parse(req.body);
        if (!data_source_1.default.isInitialized) {
            return (0, apiResponse_1.sendError)(res, 500, { code: "DB_NOT_READY", message: "Database not initialized" });
        }
        const service = new campaign_service_1.CampaignService(data_source_1.default.getRepository(campaign_entity_1.default), data_source_1.default.getRepository(auditLog_entity_1.default), data_source_1.default.getRepository(wallet_entity_1.default), data_source_1.default.getRepository(user_entity_1.default), (0, campaignFactory_client_1.createCairoCampaignClient)());
        const saved = await service.createCampaign({
            userId: req.auth.userId,
            walletAddress: req.auth.walletAddress,
            campaignRef: parsed.campaign_ref,
            targetAmount: parsed.target_amount,
            donationToken: parsed.donation_token,
        });
        return (0, apiResponse_1.sendSuccess)(res, {
            campaign_id: saved.campaignId,
            campaign_ref: saved.campaignRef,
            target_amount: saved.targetAmount,
            donation_token: saved.donationToken,
            transaction_hash: saved.transactionHash,
            created_at: saved.createdAt.toISOString(),
        }, 201);
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            const issue = error.issues?.[0];
            return (0, apiResponse_1.sendError)(res, 400, {
                code: "VALIDATION_ERROR",
                message: issue ? `${issue.path.join(".")} ${issue.message}` : "Invalid request",
                details: { issues: error.issues },
            });
        }
        const mapped = mapCreateCampaignError(error);
        logger_1.default.error(JSON.stringify({
            name: error?.name,
            code: mapped.code,
            message: mapped.message,
        }));
        return (0, apiResponse_1.sendError)(res, mapped.status, { code: mapped.code, message: mapped.message });
    }
};
exports.createCampaign = createCampaign;
