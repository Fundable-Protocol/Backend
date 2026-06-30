import { env } from "process"
import { Account, RpcProvider, shortString } from "starknet"
import type { Call } from "starknet"

import logger from "../../utils/logger"
import { withRetry } from "./retry"
import { toU256Parts } from "../../components/v1/campaign/campaign.validation"
import type { CairoCampaignClient } from "./campaignFactory.client"

type StarknetEvent = {
  keys?: string[]
  data?: string[]
}

type StarknetReceipt = {
  events?: StarknetEvent[]
}

type ExecuteResult = {
  transaction_hash?: string
  transactionHash?: string
}

// Narrow provider/account interface used internally — allows injection in tests without live RPC
export type StarknetDeps = {
  provider: {
    getClassHashAt(_address: string): Promise<unknown>
    waitForTransaction(_txHash: string): Promise<StarknetReceipt>
  }
  account: {
    execute(_invocation: Call): Promise<ExecuteResult>
  }
}

const getRequiredEnv = (key: string) => {
  const value = env[key]
  if (!value) throw new Error(`Missing required env var: ${key}`)
  return value
}

const parseEventCampaignId = (receipt: StarknetReceipt): string | null => {
  const eventKey = env.CAMPAIGN_CREATED_EVENT_KEY
  if (!eventKey) return null

  const normalizedKey = eventKey.toLowerCase()
  const events: StarknetEvent[] = receipt?.events ?? []
  const match = events.find((e) => (e.keys ?? []).map((k: string) => k.toLowerCase()).includes(normalizedKey))
  if (!match) return null

  const data0 = match?.data?.[0]
  return typeof data0 === "string" && data0.length ? data0 : null
}

export const createStarknetCampaignClient = (_deps?: StarknetDeps): CairoCampaignClient => {
  const rpcUrl = getRequiredEnv("CAIRO_RPC_URL")
  const accountAddress = getRequiredEnv("CAIRO_ACCOUNT_ADDRESS")
  const privateKey = getRequiredEnv("CAIRO_PRIVATE_KEY")
  const factoryAddress = getRequiredEnv("CAIRO_FACTORY_CONTRACT_ADDRESS")

  const provider: StarknetDeps["provider"] =
    _deps?.provider ?? (new RpcProvider({ nodeUrl: rpcUrl }) as unknown as StarknetDeps["provider"])
  const account: StarknetDeps["account"] =
    _deps?.account ??
    (new Account({
      provider: provider as unknown as RpcProvider,
      address: accountAddress,
      signer: privateKey,
    }) as unknown as StarknetDeps["account"])

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

      const invocation: Call = {
        contractAddress: factoryAddress,
        entrypoint: "create_campaign",
        calldata: [campaignRefFelt, low, high, donationToken],
      }

      const result: ExecuteResult = await withRetry(async () => {
        logger.info(`Submitting create_campaign tx for ref=${campaignRef}`)
        return await account.execute(invocation)
      })

      const transactionHash = result?.transaction_hash ?? result?.transactionHash
      if (!transactionHash) {
        throw new Error("Contract call did not return a transaction hash")
      }

      const receipt = await withRetry(async () => await provider.waitForTransaction(transactionHash))
      const campaignId = parseEventCampaignId(receipt) ?? transactionHash

      return { transactionHash, campaignId }
    },
  }
}
