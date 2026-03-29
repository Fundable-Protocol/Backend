"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDistributionSchema = exports.ValidationError = void 0;
const zod_1 = require("zod");
const enums_1 = require("../../../types/enums");
class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = "ValidationError";
    }
}
exports.ValidationError = ValidationError;
// Helper function to validate Ethereum addresses
const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/;
const decimalStringRegex = /^\d+(\.\d+)?$/;
exports.createDistributionSchema = zod_1.z.object({
    userAddress: zod_1.z.string().regex(ethereumAddressRegex, "userAddress must be a valid Ethereum address"),
    tokenAddress: zod_1.z.string().regex(ethereumAddressRegex, "tokenAddress must be a valid Ethereum address"),
    tokenSymbol: zod_1.z.string().min(1, "tokenSymbol is required").max(20, "tokenSymbol must be max 20 characters"),
    tokenDecimals: zod_1.z
        .number()
        .int("tokenDecimals must be an integer")
        .min(0, "tokenDecimals must be at least 0")
        .max(30, "tokenDecimals must be at most 30"),
    totalAmount: zod_1.z.string().regex(decimalStringRegex, "totalAmount must be a valid decimal string"),
    feeAmount: zod_1.z.string().regex(decimalStringRegex, "feeAmount must be a valid decimal string"),
    totalRecipients: zod_1.z.number().int("totalRecipients must be an integer").min(1, "totalRecipients must be at least 1"),
    distributionType: zod_1.z.nativeEnum(enums_1.DistributionType, {
        errorMap: () => ({ message: "distributionType must be a valid DistributionType" }),
    }),
    usdRate: zod_1.z.string().regex(decimalStringRegex, "usdRate must be a valid decimal string").optional(),
    chainName: zod_1.z.string().max(50, "chainName must be max 50 characters").optional(),
    network: zod_1.z
        .nativeEnum(enums_1.Network, {
        errorMap: () => ({ message: "network must be a valid Network" }),
    })
        .optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
