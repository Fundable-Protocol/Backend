"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withRetry = exports.sleep = void 0;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
exports.sleep = sleep;
const withRetry = async (fn, options) => {
    const retries = options?.retries ?? 3;
    const minDelayMs = options?.minDelayMs ?? 250;
    const factor = options?.factor ?? 2;
    let attempt = 0;
    let lastError;
    while (attempt <= retries) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            if (attempt === retries)
                break;
            const backoff = Math.round(minDelayMs * Math.pow(factor, attempt));
            const jitter = Math.round(Math.random() * 100);
            await (0, exports.sleep)(backoff + jitter);
            attempt += 1;
        }
    }
    throw lastError;
};
exports.withRetry = withRetry;
