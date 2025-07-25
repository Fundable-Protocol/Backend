import type { Request, Response } from "express"
import AppDataSource from "../../../config/persistence/data-source"
import { DistributionEntity } from "./distribution.entity"
import { DistributionService } from "./distribution.service"
import type { ApiResponse, DistributionResponseDto, CreateDistributionDto } from "./distribution.dto"

const distributionRepository = AppDataSource.getRepository(DistributionEntity)
const distributionService = new DistributionService(distributionRepository)

export const createDistribution = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = req.body as CreateDistributionDto

    const distribution = await distributionService.createDistribution(validatedData)

    const response: ApiResponse<DistributionResponseDto> = {
      data: distribution,
      success: true,
      message: "Distribution created successfully",
    }

    res.status(201).json(response)
  } catch (error) {
    console.error("Error in createDistribution:", error)

    const errorResponse: ApiResponse<null> = {
      data: null,
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    }

    res.status(500).json(errorResponse)
  }
}

