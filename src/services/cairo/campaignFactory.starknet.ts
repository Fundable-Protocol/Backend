import { env } from "process"
import { Account, RpcProvider, shortString } from "starknet"

import logger from "../../utils/logger"
import { withRetry } from "./retry"
import { toU256Parts } from "../../components/v1/campaign/campaign.validation"
import type { CairoCampaignClient } from "./campaignFactory.client"

const getRequiredEnv = (key: string) => {
  const value = env[key]
  if (!value) throw new Error(`Missing required env var: ${key}`)
  return value
}

const parseEventCampaignId = (receipt: any): string | null => {
  const eventKey = env.CAMPAIGN_CREATED_EVENT_KEY
  if (!eventKey) return null

  const normalizedKey = eventKey.toLowerCase()
  const events: any[] = receipt?.events ?? []
  const match = events.find((e) => (e.keys ?? []).map((k: string) => k.toLowerCase()).includes(normalizedKey))
  if (!match) return null

  const data0 = match?.data?.[0]
  return typeof data0 === "string" && data0.length ? data0 : null
}

export const createStarknetCampaignClient = (): CairoCampaignClient => {
  const rpcUrl = getRequiredEnv("CAIRO_RPC_URL")
  const accountAddress = getRequiredEnv("CAIRO_ACCOUNT_ADDRESS")
  const privateKey = getRequiredEnv("CAIRO_PRIVATE_KEY")
  const factoryAddress = getRequiredEnv("CAIRO_FACTORY_CONTRACT_ADDRESS")

  const provider = new RpcProvider({ nodeUrl: rpcUrl })
  const account = new Account({ provider, address: accountAddress, signer: privateKey })

  return {
    assertContractAccessible: async (address: string) => {
      await withRetry(async () => {
        await provider.getClassHashAt(address)
      })
    },
    createCampaign: async ({ campaignRef, targetAmount, donationToken }) => {
      await withRetry(async () => {
        await provider.getClassHashAt(factoryAddress)
      })
      await withRetry(async () => {
        await provider.getClassHashAt(donationToken)
      })

      const campaignRefFelt = shortString.encodeShortString(campaignRef)
      const { low, high } = toU256Parts(targetAmount)

      const invocation = {
        contractAddress: factoryAddress,
        entrypoint: "create_campaign",
        calldata: [campaignRefFelt, low, high, donationToken],
      }

      const result = await withRetry(async () => {
        logger.info(`Submitting create_campaign tx for ref=${campaignRef}`)
        return await account.execute(invocation as any)
      })

      const transactionHash = (result as any)?.transaction_hash ?? (result as any)?.transactionHash
      if (!transactionHash) {
        throw new Error("Contract call did not return a transaction hash")
      }

      const receipt = await withRetry(async () => await provider.waitForTransaction(transactionHash))
      const campaignId = parseEventCampaignId(receipt) ?? transactionHash

      return { transactionHash, campaignId }
    },
  }
}

