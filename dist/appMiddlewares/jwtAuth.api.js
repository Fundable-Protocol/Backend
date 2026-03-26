"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireJwtAuthApi = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("../config"));
const apiResponse_1 = require("../utils/apiResponse");
const requireJwtAuthApi = (req, res, next) => {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
    if (!token) {
        return (0, apiResponse_1.sendError)(res, 401, {
            code: "AUTH_MISSING_TOKEN",
            message: "Missing authentication token",
        });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.default.authConfig.jwtSecret);
        const userId = decoded.sub ?? decoded.userId ?? decoded.id;
        if (!userId) {
            return (0, apiResponse_1.sendError)(res, 401, {
                code: "AUTH_INVALID_TOKEN",
                message: "Invalid authentication token",
            });
        }
        req.auth = {
            userId: String(userId),
            walletAddress: decoded.walletAddress ?? decoded.address,
            email: decoded.email,
            claims: decoded,
        };
        return next();
    }
    catch (error) {
        return (0, apiResponse_1.sendError)(res, 401, {
            code: "AUTH_INVALID_TOKEN",
            message: "Invalid authentication token",
            details: error instanceof Error ? { name: error.name } : {},
        });
    }
};
exports.requireJwtAuthApi = requireJwtAuthApi;
