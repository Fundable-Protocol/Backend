import { z } from "zod"
import { DistributionType, DistributionStatus, Network } from "../../../types/enums"

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ValidationError"
  }
}

// Helper function to validate Ethereum addresses
const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/

const decimalStringRegex = /^\d+(\.\d+)?$/

export const createDistributionSchema = z.object({
  userAddress: z.string().regex(ethereumAddressRegex, "userAddress must be a valid Ethereum address"),

  tokenAddress: z.string().regex(ethereumAddressRegex, "tokenAddress must be a valid Ethereum address"),

  tokenSymbol: z.string().min(1, "tokenSymbol is required").max(20, "tokenSymbol must be max 20 characters"),

  tokenDecimals: z
    .number()
    .int("tokenDecimals must be an integer")
    .min(0, "tokenDecimals must be at least 0")
    .max(30, "tokenDecimals must be at most 30"),

  totalAmount: z.string().regex(decimalStringRegex, "totalAmount must be a valid decimal string"),

  feeAmount: z.string().regex(decimalStringRegex, "feeAmount must be a valid decimal string"),

  totalRecipients: z.number().int("totalRecipients must be an integer").min(1, "totalRecipients must be at least 1"),

  distributionType: z.nativeEnum(DistributionType, {
    errorMap: () => ({ message: "distributionType must be a valid DistributionType" }),
  }),

  usdRate: z.string().regex(decimalStringRegex, "usdRate must be a valid decimal string").optional(),

  chainName: z.string().max(50, "chainName must be max 50 characters").optional(),

  network: z
    .nativeEnum(Network, {
      errorMap: () => ({ message: "network must be a valid Network" }),
    })
    .optional(),

  metadata: z.record(z.any()).optional(),
})

export const updateDistributionSchema = createDistributionSchema.partial().extend({
  status: z.nativeEnum(DistributionStatus, {
    errorMap: () => ({ message: "status must be a valid DistributionStatus" }),
  }).optional(),
})

export const updateDistributionParamsSchema = z.object({
  id: z.string().uuid("id must be a valid UUID"),
})

export type CreateDistributionInput = z.infer<typeof createDistributionSchema>
export type UpdateDistributionInput = z.infer<typeof updateDistributionSchema>
