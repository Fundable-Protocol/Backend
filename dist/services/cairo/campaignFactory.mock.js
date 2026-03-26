"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockCampaignClient = void 0;
const createMockCampaignClient = () => {
    return {
        assertContractAccessible: async () => { },
        createCampaign: async ({ campaignRef }) => {
            const tx = `0xmock_${Date.now().toString(16)}`;
            return { transactionHash: tx, campaignId: `mock_${campaignRef}` };
        },
    };
};
exports.createMockCampaignClient = createMockCampaignClient;
