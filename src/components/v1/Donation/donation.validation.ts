import { z } from "zod"
import { Network } from "../../../types/enums"

const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/
const decimalStringRegex = /^\d+(\.\d+)?$/

export const createDonationSchema = z.object({
  campaignId: z.string().min(1, "campaignId is required"),

  donorAddress: z.string().regex(ethereumAddressRegex, "donorAddress must be a valid Ethereum address"),

  donationToken: z.string().regex(ethereumAddressRegex, "donationToken must be a valid Ethereum address"),

  donationAmount: z.string().regex(decimalStringRegex, "donationAmount must be a valid decimal string"),

  transactionHash: z.string().regex(/^0x([A-Fa-f0-9]{64})$/, "transactionHash must be a valid transaction hash"),

  network: z.nativeEnum(Network, {
    errorMap: () => ({ message: "network must be a valid Network" }),
  }),
})

export type CreateDonationInput = z.infer<typeof createDonationSchema>
