import type { Request, Response } from "express"
import AppDataSource from "../../../config/persistence/data-source"
import { DistributionEntity } from "./distribution.entity"
import { DistributionService } from "./distribution.service"
import type { ApiResponse, DistributionResponseDto, CreateDistributionDto, UpdateDistributionDto } from "./distribution.dto"

const getDistributionService = () => {
  if (!AppDataSource.isInitialized) {
    throw new Error("Database not initialized")
  }

  const distributionRepository = AppDataSource.getRepository(DistributionEntity)
  return new DistributionService(distributionRepository)
}

export const createDistribution = async (req: Request, res: Response): Promise<void> => {
  try {
    const distributionService = getDistributionService()

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

export const updateDistribution = async (req: Request, res: Response): Promise<void> => {
  try {
    const distributionService = getDistributionService()
    const { id } = req.params
    const validatedData = req.body as UpdateDistributionDto

    const distribution = await distributionService.updateDistribution(id, validatedData)

    const response: ApiResponse<DistributionResponseDto> = {
      data: distribution,
      success: true,
      message: "Distribution updated successfully",
    }

    res.status(200).json(response)
  } catch (error) {
    console.error("Error in updateDistribution:", error)

    const isNotFound = error instanceof Error && error.message === "Distribution not found"
    const status = isNotFound ? 404 : 500
    const errorResponse: ApiResponse<null> = {
      data: null,
      success: false,
      message: isNotFound && error instanceof Error ? error.message : "Internal server error",
    }
    res.status(status).json(errorResponse)
  }
}

export const listDistributions = async (_req: Request, res: Response): Promise<void> => {
  try {
    const distributionService = getDistributionService()
    const distributions = await distributionService.listDistributions()

    const response: ApiResponse<DistributionResponseDto[]> = {
      data: distributions,
      success: true,
      message: "Distributions fetched successfully",
    }

    res.status(200).json(response)
  } catch (error) {
    console.error("Error in listDistributions:", error)

    const errorResponse: ApiResponse<null> = {
      data: null,
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    }

    res.status(500).json(errorResponse)
  }
}
