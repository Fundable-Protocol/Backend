"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toU256Parts = exports.createCampaignSchema = exports.isValidStarknetAddress = exports.isPositiveU256String = void 0;
const zod_1 = require("zod");
const MAX_U256 = (1n << 256n) - 1n;
const isPositiveU256String = (value) => {
    if (!/^\d+$/.test(value))
        return false;
    const asBigInt = BigInt(value);
    return asBigInt > 0n && asBigInt <= MAX_U256;
};
exports.isPositiveU256String = isPositiveU256String;
const isValidStarknetAddress = (value) => {
    if (!/^0x[0-9a-fA-F]{1,64}$/.test(value))
        return false;
    try {
        const n = BigInt(value);
        return n >= 0n && n < (1n << 251n);
    }
    catch {
        return false;
    }
};
exports.isValidStarknetAddress = isValidStarknetAddress;
exports.createCampaignSchema = zod_1.z.object({
    campaign_ref: zod_1.z
        .string()
        .trim()
        .length(5, "campaign_ref must be exactly 5 characters long")
        .refine((s) => s.trim().length === 5, "campaign_ref cannot be empty"),
    target_amount: zod_1.z
        .string()
        .trim()
        .refine((s) => (0, exports.isPositiveU256String)(s), "target_amount must be a positive u256 integer string"),
    donation_token: zod_1.z
        .string()
        .trim()
        .refine((s) => (0, exports.isValidStarknetAddress)(s), "donation_token must be a valid contract address"),
});
const toU256Parts = (value) => {
    const n = BigInt(value);
    const lowMask = (1n << 128n) - 1n;
    const low = n & lowMask;
    const high = n >> 128n;
    return { low: `0x${low.toString(16)}`, high: `0x${high.toString(16)}` };
};
exports.toU256Parts = toU256Parts;
