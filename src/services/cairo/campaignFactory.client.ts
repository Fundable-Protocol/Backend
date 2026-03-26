import { env } from "process"

import { createMockCampaignClient } from "./campaignFactory.mock"
import { createStarknetCampaignClient } from "./campaignFactory.starknet"

export type CreateCampaignOnChainArgs = {
  campaignRef: string
  targetAmount: string
  donationToken: string
}

export type CreateCampaignOnChainResult = {
  transactionHash: string
  campaignId: string
}

export type CairoCampaignClient = {
  assertContractAccessible: (_address: string) => Promise<void>
  createCampaign: (_args: CreateCampaignOnChainArgs) => Promise<CreateCampaignOnChainResult>
}

export const createCairoCampaignClient = (): CairoCampaignClient => {
  const isMock = env.CAIRO_MOCK === "true" || env.CAIRO_MOCK === "1"
  return isMock ? createMockCampaignClient() : createStarknetCampaignClient()
}

