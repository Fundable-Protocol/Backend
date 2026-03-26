"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUniqueNos = exports.getUniqueIds = exports.getIpAddressAndUserAgent = exports.decodeFromBase64 = exports.encodeToBase64 = exports.convertDateToTimeStamp = exports.getIpAddress = exports.generateBackupCodes = exports.generateRandomCode = exports.isValidDate = exports.redefinePhoneNo = exports.ulid = exports.uuid = exports.isValidUuid = void 0;
exports.executeTransaction = executeTransaction;
exports.transformObjectValues = transformObjectValues;
const ulidx_1 = require("ulidx");
const crypto_1 = require("crypto");
const zod_1 = require("zod");
const isValidUuid = (uuid) => {
    const result = zod_1.z.string().uuid().safeParse(uuid);
    return result.success;
};
exports.isValidUuid = isValidUuid;
/**
 * Executes a transaction with the given callback.
 * @param transactionCallback - A callback that performs the transaction logic.
 */
async function executeTransaction(transactionCallback) {
    const { default: AppDataSource } = await Promise.resolve().then(() => __importStar(require('../config/persistence/data-source')));
    return AppDataSource.transaction(async (transactionManager) => {
        try {
            return await transactionCallback(transactionManager);
        }
        catch (error) {
            console.error('Transaction failed:', error);
            throw error;
        }
    });
}
const uuid = () => (0, crypto_1.randomUUID)();
exports.uuid = uuid;
const ulid = () => (0, ulidx_1.ulid)();
exports.ulid = ulid;
const redefinePhoneNo = (val) => {
    const newVal = val.replace(/\s/g, '');
    if (newVal.startsWith('+'))
        return newVal.replace('+', '');
    if (newVal.startsWith('0'))
        return newVal.slice(1);
    return newVal;
};
exports.redefinePhoneNo = redefinePhoneNo;
const isValidDate = (value) => {
    const date = new Date(value);
    return !isNaN(date.getTime());
};
exports.isValidDate = isValidDate;
const generateRandomCode = (length = 6) => {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    const randomCode = Math.floor(Math.random() * (max - min + 1) + min);
    return randomCode.toString();
};
exports.generateRandomCode = generateRandomCode;
const generateBackupCodes = (length = 5) => {
    return Array.from({ length }, () => Math.random().toString(36).slice(-8).toUpperCase());
};
exports.generateBackupCodes = generateBackupCodes;
// export const AxiosErrorHandler = (err: unknown) => {
//     let message = '',
//         name: string | null = 'AxiosError';
//     const axiosErr = err as AxiosError;
//     if (axiosErr.response) {
//         message =
//             JSON.stringify(axiosErr.response.data, null, 2) || axiosErr.message;
//         name = axiosErr.name;
//     } else if (axiosErr?.request) {
//         message = axiosErr?.request?.data;
//     } else {
//         message = axiosErr?.message;
//     }
//     throw new AppError({
//         name,
//         message,
//         httpCode: 500,
//         type: 'OPERATIONAL',
//     });
// };
const getIpAddress = (req) => {
    const { headers, ip, socket } = req;
    const xForwardedFor = headers['x-forwarded-for'];
    const xForwardedForIp = Array.isArray(xForwardedFor)
        ? xForwardedFor[0]
        : typeof xForwardedFor === 'string'
            ? xForwardedFor.split(',')[0]
            : undefined;
    return (headers['x-real-ip'] ||
        xForwardedForIp ||
        ip ||
        socket.remoteAddress ||
        '');
};
exports.getIpAddress = getIpAddress;
const convertDateToTimeStamp = (date) => {
    return date ? new Date(date).getTime() : Date.now();
};
exports.convertDateToTimeStamp = convertDateToTimeStamp;
function transformObjectValues(obj, func) {
    const transformedData = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            transformedData[key] = func(obj[key]);
        }
    }
    return transformedData;
}
const encodeToBase64 = (value) => {
    return typeof value !== 'string'
        ? value
        : Buffer.from(value, 'utf-8').toString('base64');
};
exports.encodeToBase64 = encodeToBase64;
const decodeFromBase64 = (base64Text) => {
    return typeof base64Text !== 'string'
        ? base64Text
        : Buffer.from(base64Text, 'base64').toString('utf-8');
};
exports.decodeFromBase64 = decodeFromBase64;
const getIpAddressAndUserAgent = (req) => {
    const ipAddress = (0, exports.getIpAddress)(req);
    const userAgent = req.headers['user-agent'] || '';
    return { ipAddress, userAgent };
};
exports.getIpAddressAndUserAgent = getIpAddressAndUserAgent;
const getUniqueIds = (ids) => Array.from(new Set(ids));
exports.getUniqueIds = getUniqueIds;
const getUniqueNos = (ids) => Array.from(new Set(ids.map((perm) => +perm)));
exports.getUniqueNos = getUniqueNos;
