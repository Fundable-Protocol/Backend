"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DistributionService = void 0;
const enums_1 = require("../../../types/enums");
class DistributionService {
    distributionRepository;
    constructor(distributionRepository) {
        this.distributionRepository = distributionRepository;
    }
    async createDistribution(createDistributionDto) {
        try {
            const distributionData = this.prepareDistributionData(createDistributionDto);
            const distribution = this.distributionRepository.create(distributionData);
            const savedDistribution = await this.distributionRepository.save(distribution);
            return this.formatDistributionResponse(savedDistribution);
        }
        catch (error) {
            console.error("Error creating distribution:", error);
            throw new Error("Failed to create distribution");
        }
    }
    async listDistributions(limit = 50) {
        try {
            const distributions = await this.distributionRepository.find({
                order: { createdAt: "DESC" },
                take: Math.min(Math.max(limit, 1), 200),
            });
            return distributions.map((d) => this.formatDistributionResponse(d));
        }
        catch (error) {
            console.error("Error listing distributions:", error);
            throw new Error("Failed to list distributions");
        }
    }
    prepareDistributionData(data) {
        const distributionData = {
            userAddress: data.userAddress.toLowerCase(),
            tokenAddress: data.tokenAddress.toLowerCase(),
            tokenSymbol: data.tokenSymbol.toUpperCase(),
            tokenDecimals: data.tokenDecimals,
            totalAmount: data.totalAmount,
            feeAmount: data.feeAmount,
            totalRecipients: data.totalRecipients,
            distributionType: data.distributionType,
            chainName: data.chainName || "",
            status: enums_1.DistributionStatus.PENDING,
            network: data.network || enums_1.Network.MAINNET,
            transactionHash: null,
            blockNumber: null,
            blockTimestamp: null,
        };
        if (data.usdRate) {
            distributionData.usdRate = data.usdRate;
            distributionData.totalUsdAmount = this.calculateTotalUsdAmount(data.totalAmount, data.usdRate);
        }
        else {
            distributionData.usdRate = "0";
            distributionData.totalUsdAmount = "0";
        }
        if (data.metadata) {
            distributionData.metadata = this.processMetadata(data.metadata);
        }
        return distributionData;
    }
    calculateTotalUsdAmount(totalAmount, usdRate) {
        try {
            const amount = Number.parseFloat(totalAmount);
            const rate = Number.parseFloat(usdRate);
            const totalUsd = amount * rate;
            return totalUsd.toString();
        }
        catch (error) {
            console.warn("Error calculating total USD amount:", error);
            return "0";
        }
    }
    processMetadata(metadata) {
        const processedMetadata = { ...metadata };
        delete processedMetadata.__proto__;
        delete processedMetadata.constructor;
        return processedMetadata;
    }
    formatDistributionResponse(distribution) {
        return {
            id: distribution.id,
            userAddress: distribution.userAddress,
            transactionHash: distribution.transactionHash,
            tokenAddress: distribution.tokenAddress,
            tokenSymbol: distribution.tokenSymbol,
            tokenDecimals: distribution.tokenDecimals,
            totalAmount: distribution.totalAmount,
            feeAmount: distribution.feeAmount,
            usdRate: distribution.usdRate,
            totalUsdAmount: distribution.totalUsdAmount,
            totalRecipients: distribution.totalRecipients,
            distributionType: distribution.distributionType,
            chainName: distribution.chainName,
            status: distribution.status,
            blockNumber: distribution.blockNumber,
            blockTimestamp: distribution.blockTimestamp,
            network: distribution.network,
            createdAt: distribution.createdAt,
            metadata: distribution.metadata,
        };
    }
}
exports.DistributionService = DistributionService;
