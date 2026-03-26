import type { CairoCampaignClient } from "./campaignFactory.client"

export const createMockCampaignClient = (): CairoCampaignClient => {
  return {
    assertContractAccessible: async () => {},
    createCampaign: async ({ campaignRef }) => {
      const tx = `0xmock_${Date.now().toString(16)}`
      return { transactionHash: tx, campaignId: `mock_${campaignRef}` }
    },
  }
}

