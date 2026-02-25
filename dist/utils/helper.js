"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidUserId = exports.isValidPlatformId = exports.handleResponse = void 0;
exports.capitalizeString = capitalizeString;
exports.u256FromString = u256FromString;
exports.isValidContractAddress = isValidContractAddress;
exports.isValidBase64String = isValidBase64String;
const zod_1 = require("zod");
const general_policy_1 = require("../types/general-policy");
const handleResponse = (res, data, status = 200) => {
    const success = status >= 400 ? false : true;
    if (typeof data === 'string') {
        return res.status(status).json({ success, message: data });
    }
    return res.status(status).json({
        success,
        message: 'Ok',
        ...data,
    });
};
exports.handleResponse = handleResponse;
function capitalizeString(input) {
    return input?.replace(/\b\w/g, (char) => char.toUpperCase());
}
const isValidPlatformId = (val) => val?.toLowerCase() === 'system' || zod_1.z.string().uuid().safeParse(val).success;
exports.isValidPlatformId = isValidPlatformId;
const isValidUserId = (userId) => {
    const isValidUUID = zod_1.z.string().uuid().safeParse(userId).success;
    const isValidULID = zod_1.z.string().ulid().safeParse(userId).success;
    const isValidCustomId = general_policy_1.validCustomIdString.safeParse(userId).success;
    return isValidUUID || isValidULID || isValidCustomId;
};
exports.isValidUserId = isValidUserId;
function u256FromString(value) {
    const big = BigInt(value);
    const low = Number(big & BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'));
    const high = Number(big >> 128n);
    return { low, high };
}
function isValidContractAddress(address) {
    return /^0x[0-9a-fA-F]{64}$/.test(address);
}
function isValidBase64String(field) {
    // Regular expression for Base64 validation
    const base64Pattern = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
    // Check if it's a valid Base64 string
    const isBase64 = base64Pattern.test(field);
    return isBase64;
}
