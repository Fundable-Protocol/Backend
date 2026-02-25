export interface CampaignResponseDto {
  campaignId: string
  campaignRef: string
  targetAmount: string
  donationToken: string
  transactionHash: string
  createdAt: Date
}

export interface ApiResponse<T> {
  data: T | null
  success: boolean
  message?: string
}