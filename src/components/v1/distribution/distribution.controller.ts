import type { Request, Response } from "express"
import AppDataSource from "../../../config/persistence/data-source"
import { sendError, sendSuccess } from "../../../utils/apiResponse"
import logger from "../../../utils/logger"
import { DistributionEntity } from "./distribution.entity"
import { DistributionNotFoundError, DistributionService } from "./distribution.service"
import type { CreateDistributionDto, UpdateDistributionDto } from "./distribution.dto"

/**
 * Raised when the data source has not finished initializing. Carries a stable
 * `code` so it maps to a predictable 503 payload instead of a generic 500.
 */
export class DatabaseNotReadyError extends Error {
  public readonly code = "DB_NOT_READY"
  constructor() {
    super("Database not initialized")
    this.name = "DatabaseNotReadyError"
  }
}

export type DistributionServiceResolver = () => DistributionService

/**
 * Default resolver used by the routes. Tests inject their own resolver so the
 * controller logic can be exercised without a live database connection.
 */
export const defaultDistributionServiceResolver: DistributionServiceResolver = () => {
  if (!AppDataSource.isInitialized) {
    throw new DatabaseNotReadyError()
  }

  return new DistributionService(AppDataSource.getRepository(DistributionEntity))
}

const handleControllerError = (res: Response, error: unknown, context: string): void => {
  if (error instanceof DatabaseNotReadyError) {
    sendError(res, 503, {
      code: "DB_NOT_READY",
      message: "Database not initialized",
    })
    return
  }

  const code = (error as { code?: unknown })?.code
  if (error instanceof DistributionNotFoundError || code === "DISTRIBUTION_NOT_FOUND") {
    sendError(res, 404, {
      code: "DISTRIBUTION_NOT_FOUND",
      message: error instanceof Error ? error.message : "Distribution not found",
    })
    return
  }

  logger.error(`${context}: ${error instanceof Error ? error.message : String(error)}`)
  sendError(res, 500, {
    code: "INTERNAL_ERROR",
    message: "Internal server error",
  })
}

export const createDistribution =
  (resolve: DistributionServiceResolver = defaultDistributionServiceResolver) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const service = resolve()
      const distribution = await service.createDistribution(req.body as CreateDistributionDto)
      sendSuccess(res, distribution, 201)
    } catch (error) {
      handleControllerError(res, error, "Error in createDistribution")
    }
  }

export const updateDistribution =
  (resolve: DistributionServiceResolver = defaultDistributionServiceResolver) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const service = resolve()
      const { id } = req.params
      const distribution = await service.updateDistribution(id, req.body as UpdateDistributionDto)
      sendSuccess(res, distribution)
    } catch (error) {
      handleControllerError(res, error, "Error in updateDistribution")
    }
  }

export const listDistributions =
  (resolve: DistributionServiceResolver = defaultDistributionServiceResolver) =>
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const service = resolve()
      const distributions = await service.listDistributions()
      sendSuccess(res, distributions)
    } catch (error) {
      handleControllerError(res, error, "Error in listDistributions")
    }
  }
