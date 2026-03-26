"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listDistributions = exports.createDistribution = void 0;
const data_source_1 = __importDefault(require("../../../config/persistence/data-source"));
const distribution_entity_1 = require("./distribution.entity");
const distribution_service_1 = require("./distribution.service");
const getDistributionService = () => {
    if (!data_source_1.default.isInitialized) {
        throw new Error("Database not initialized");
    }
    const distributionRepository = data_source_1.default.getRepository(distribution_entity_1.DistributionEntity);
    return new distribution_service_1.DistributionService(distributionRepository);
};
const createDistribution = async (req, res) => {
    try {
        const distributionService = getDistributionService();
        const validatedData = req.body;
        const distribution = await distributionService.createDistribution(validatedData);
        const response = {
            data: distribution,
            success: true,
            message: "Distribution created successfully",
        };
        res.status(201).json(response);
    }
    catch (error) {
        console.error("Error in createDistribution:", error);
        const errorResponse = {
            data: null,
            success: false,
            message: error instanceof Error ? error.message : "Internal server error",
        };
        res.status(500).json(errorResponse);
    }
};
exports.createDistribution = createDistribution;
const listDistributions = async (_req, res) => {
    try {
        const distributionService = getDistributionService();
        const distributions = await distributionService.listDistributions();
        const response = {
            data: distributions,
            success: true,
            message: "Distributions fetched successfully",
        };
        res.status(200).json(response);
    }
    catch (error) {
        console.error("Error in listDistributions:", error);
        const errorResponse = {
            data: null,
            success: false,
            message: error instanceof Error ? error.message : "Internal server error",
        };
        res.status(500).json(errorResponse);
    }
};
exports.listDistributions = listDistributions;
