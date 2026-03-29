"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDonationSchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("../../../types/enums");
const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/;
const decimalStringRegex = /^\d+(\.\d+)?$/;
exports.createDonationSchema = zod_1.z.object({
    campaignId: zod_1.z.string().min(1, "campaignId is required"),
    donorAddress: zod_1.z.string().regex(ethereumAddressRegex, "donorAddress must be a valid Ethereum address"),
    donationToken: zod_1.z.string().regex(ethereumAddressRegex, "donationToken must be a valid Ethereum address"),
    donationAmount: zod_1.z.string().regex(decimalStringRegex, "donationAmount must be a valid decimal string"),
    transactionHash: zod_1.z.string().regex(/^0x([A-Fa-f0-9]{64})$/, "transactionHash must be a valid transaction hash"),
    network: zod_1.z.nativeEnum(enums_1.Network, {
        errorMap: () => ({ message: "network must be a valid Network" }),
    }),
});
