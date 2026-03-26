"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCairoCampaignClient = void 0;
const process_1 = require("process");
const campaignFactory_mock_1 = require("./campaignFactory.mock");
const campaignFactory_starknet_1 = require("./campaignFactory.starknet");
const createCairoCampaignClient = () => {
    const isMock = process_1.env.CAIRO_MOCK === "true" || process_1.env.CAIRO_MOCK === "1";
    return isMock ? (0, campaignFactory_mock_1.createMockCampaignClient)() : (0, campaignFactory_starknet_1.createStarknetCampaignClient)();
};
exports.createCairoCampaignClient = createCairoCampaignClient;
