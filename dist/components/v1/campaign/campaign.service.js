"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignService = void 0;
const logger_1 = __importDefault(require("../../../utils/logger"));
class CampaignService {
    campaignRepository;
    auditRepository;
    walletRepository;
    userRepository;
    cairoClient;
    constructor(campaignRepository, auditRepository, walletRepository, userRepository, cairoClient) {
        this.campaignRepository = campaignRepository;
        this.auditRepository = auditRepository;
        this.walletRepository = walletRepository;
        this.userRepository = userRepository;
        this.cairoClient = cairoClient;
    }
    async createCampaign(args) {
        const { userId, walletAddress, campaignRef, targetAmount, donationToken } = args;
        const existing = await this.campaignRepository.findOne({ where: { campaignRef } });
        if (existing) {
            const error = new Error("Duplicate campaign_ref");
            error.code = "DUPLICATE_CAMPAIGN_REF";
            throw error;
        }
        if (!walletAddress) {
            const error = new Error("Missing wallet address in token claims");
            error.code = "MISSING_WALLET_ADDRESS";
            throw error;
        }
        const wallet = await this.walletRepository.findOne({ where: { address: walletAddress } });
        if (!wallet) {
            const error = new Error("Wallet not found");
            error.code = "WALLET_NOT_FOUND";
            throw error;
        }
        const walletBalance = Number.parseFloat(wallet.balance ?? "0");
        if (!Number.isFinite(walletBalance) || walletBalance <= 0) {
            const error = new Error("Insufficient wallet balance for fees");
            error.code = "INSUFFICIENT_BALANCE";
            throw error;
        }
        const { transactionHash, campaignId } = await this.cairoClient.createCampaign({
            campaignRef,
            targetAmount,
            donationToken,
        });
        const saved = await this.campaignRepository.save(this.campaignRepository.create({
            campaignId,
            userId,
            campaignRef,
            targetAmount,
            donationToken,
            transactionHash,
        }));
        await this.auditRepository.save(this.auditRepository.create({
            userId,
            action: "campaign.create",
            entity: "campaign",
            entityId: saved.campaignId,
            details: {
                campaignRef,
                donationToken,
                transactionHash,
            },
        }));
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (user) {
            const nextCount = (user.campaignCount ?? 0) + 1;
            await this.userRepository.update({ id: userId }, { campaignCount: nextCount });
        }
        else {
            logger_1.default.info(`User ${userId} not found; skipped campaignCount update`);
        }
        return saved;
    }
}
exports.CampaignService = CampaignService;
