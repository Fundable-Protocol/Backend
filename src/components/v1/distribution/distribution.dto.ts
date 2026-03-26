import type { DistributionType, Network } from "../../../types/enums"
import type { CreateDistributionInput, UpdateDistributionInput } from "./distribution.validation"

export type CreateDistributionDto = CreateDistributionInput
export type UpdateDistributionDto = UpdateDistributionInput

export interface DistributionResponseDto {
  id: string
  userAddress: string
  transactionHash: string | null
  tokenAddress: string
  tokenSymbol: string
  tokenDecimals: number
  totalAmount: string
  feeAmount: string
  usdRate: string
  totalUsdAmount: string
  totalRecipients: number
  distributionType: DistributionType
  chainName: string
  status: string
  blockNumber: number | null
  blockTimestamp: Date | null
  network: Network
  createdAt: Date
  metadata: Record<string, any> | null
}

export interface ApiResponse<T> {
  data: T | null
  success: boolean
  message?: string
}
