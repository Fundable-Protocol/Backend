"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const enhancedRouter_1 = __importDefault(require("../../utils/enhancedRouter"));
const platform_routes_1 = __importDefault(require("./platform/platform.routes"));
const wallet_routes_1 = __importDefault(require("./wallet/wallet.routes"));
const distrubtion_routes_1 = __importDefault(require("./distribution/distrubtion.routes"));
const campaign_routes_1 = __importDefault(require("./campaigns/campaign.routes"));
const routerV1 = new enhancedRouter_1.default();
routerV1.use('/platform', platform_routes_1.default);
routerV1.use('/wallets', wallet_routes_1.default);
routerV1.use('/distributions', distrubtion_routes_1.default);
routerV1.use('/', campaign_routes_1.default);
exports.default = routerV1.getRouter();
