import { Decimal } from "decimal.js"
import type { Repository } from "typeorm"
import type { DistributionEntity } from "./distribution.entity"
import type { CreateDistributionDto, DistributionResponseDto, UpdateDistributionDto } from "./distribution.dto"
import { DistributionStatus, Network } from "../../../types/enums"

export class DistributionService {
  constructor(private readonly distributionRepository: Repository<DistributionEntity>) {}

  async createDistribution(createDistributionDto: CreateDistributionDto): Promise<DistributionResponseDto> {
    try {
      const distributionData = this.prepareDistributionData(createDistributionDto)

      const distribution = this.distributionRepository.create(distributionData)
      const savedDistribution = await this.distributionRepository.save(distribution)

      return this.formatDistributionResponse(savedDistribution)
    } catch (error) {
      console.error("Error creating distribution:", error)
      throw new Error("Failed to create distribution")
    }
  }

  async updateDistribution(id: string, updateData: UpdateDistributionDto): Promise<DistributionResponseDto> {
    try {
      const distribution = await this.distributionRepository.findOne({ where: { id } })
      if (!distribution) {
        throw new Error("Distribution not found")
      }

      const updatedFields: Partial<DistributionEntity> = { ...updateData }

      if (updateData.userAddress !== undefined) {
        updatedFields.userAddress = updateData.userAddress.toLowerCase()
      }
      if (updateData.tokenAddress !== undefined) {
        updatedFields.tokenAddress = updateData.tokenAddress.toLowerCase()
      }
      if (updateData.tokenSymbol !== undefined) {
        updatedFields.tokenSymbol = updateData.tokenSymbol.toUpperCase()
      }

      if (updateData.totalAmount || updateData.usdRate) {
        const totalAmount = updateData.totalAmount ?? distribution.totalAmount
        const usdRate = updateData.usdRate ?? distribution.usdRate
        updatedFields.totalUsdAmount = this.calculateTotalUsdAmount(totalAmount, usdRate)
      }

      if (updateData.metadata === null) {
        updatedFields.metadata = null
      } else if (updateData.metadata !== undefined) {
        updatedFields.metadata = this.processMetadata(updateData.metadata)
      }

      Object.assign(distribution, updatedFields)
      const savedDistribution = await this.distributionRepository.save(distribution)

      return this.formatDistributionResponse(savedDistribution)
    } catch (error) {
      console.error("Error updating distribution:", error)
      throw error instanceof Error ? error : new Error("Failed to update distribution")
    }
  }

  async listDistributions(limit = 50): Promise<DistributionResponseDto[]> {
    try {
      const distributions = await this.distributionRepository.find({
        order: { createdAt: "DESC" as const },
        take: Math.min(Math.max(limit, 1), 200),
      })

      return distributions.map((d) => this.formatDistributionResponse(d))
    } catch (error) {
      console.error("Error listing distributions:", error)
      throw new Error("Failed to list distributions")
    }
  }

  private prepareDistributionData(data: CreateDistributionDto): Partial<DistributionEntity> {
    const distributionData: Partial<DistributionEntity> = {
      userAddress: data.userAddress.toLowerCase(),
      tokenAddress: data.tokenAddress.toLowerCase(),
      tokenSymbol: data.tokenSymbol.toUpperCase(),
      tokenDecimals: data.tokenDecimals,
      totalAmount: data.totalAmount,
      feeAmount: data.feeAmount,
      totalRecipients: data.totalRecipients,
      distributionType: data.distributionType,
      chainName: data.chainName || "",
      status: DistributionStatus.PENDING,
      network: data.network || Network.MAINNET,
      transactionHash: null,
      blockNumber: null,
      blockTimestamp: null,
    }

    if (data.usdRate) {
      distributionData.usdRate = data.usdRate
      distributionData.totalUsdAmount = this.calculateTotalUsdAmount(data.totalAmount, data.usdRate)
    } else {
      distributionData.usdRate = "0"
      distributionData.totalUsdAmount = "0"
    }

    if (data.metadata) {
      distributionData.metadata = this.processMetadata(data.metadata)
    }

    return distributionData
  }

  private calculateTotalUsdAmount(totalAmount: string, usdRate: string): string {
    try {
      const amount = new Decimal(totalAmount)
      const rate = new Decimal(usdRate)
      return amount.mul(rate).toString()
    } catch (error) {
      console.warn("Error calculating total USD amount:", error)
      return "0"
    }
  }

  private processMetadata(metadata: Record<string, any>): Record<string, any> {
    const processedMetadata = { ...metadata }
    delete (processedMetadata as any).__proto__
    delete (processedMetadata as any).constructor
    return processedMetadata
  }

  public formatDistributionResponse(distribution: DistributionEntity): DistributionResponseDto {
    return {
      id: distribution.id,
      userAddress: distribution.userAddress,
      transactionHash: distribution.transactionHash,
      tokenAddress: distribution.tokenAddress,
      tokenSymbol: distribution.tokenSymbol,
      tokenDecimals: distribution.tokenDecimals,
      totalAmount: distribution.totalAmount,
      feeAmount: distribution.feeAmount,
      usdRate: distribution.usdRate,
      totalUsdAmount: distribution.totalUsdAmount,
      totalRecipients: distribution.totalRecipients,
      distributionType: distribution.distributionType,
      chainName: distribution.chainName,
      status: distribution.status,
      blockNumber: distribution.blockNumber,
      blockTimestamp: distribution.blockTimestamp,
      network: distribution.network,
      createdAt: distribution.createdAt,
      metadata: distribution.metadata,
    }
  }
}
