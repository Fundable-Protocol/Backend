export enum DistributionType {
  BULK_TRANSFER = "bulk_transfer",
  AIRDROP = "airdrop",
  PAYMENT = "payment",
  REWARD = "reward",
}

export enum DistributionStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export enum DonationStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  FAILED = "failed",
  REFUNDED = "refunded",
}

export enum Network {
  MAINNET = "mainnet",
  TESTNET = "testnet",
  POLYGON = "polygon",
  BSC = "bsc",
  ARBITRUM = "arbitrum",
  OPTIMISM = "optimism",
}
