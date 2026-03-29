"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("../../utils/logger"));
/**
 * Seeding is intentionally disabled.
 *
 * The previous seeding implementation referenced modules/constants that are not
 * present in this repository snapshot, and blocked the server from booting.
 */
const initiateSeeding = async () => {
    logger_1.default.info('Seeding disabled (no-op).');
};
exports.default = initiateSeeding;
