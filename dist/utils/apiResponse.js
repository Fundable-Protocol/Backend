"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendError = exports.sendSuccess = void 0;
const sendSuccess = (res, data, status = 200) => {
    return res.status(status).json({
        success: true,
        data,
    });
};
exports.sendSuccess = sendSuccess;
const sendError = (res, status, error) => {
    return res.status(status).json({
        success: false,
        error: {
            code: error.code,
            message: error.message,
            details: error.details ?? {},
        },
    });
};
exports.sendError = sendError;
