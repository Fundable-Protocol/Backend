import { NextFunction, Request, Response } from "express";
import { DistributionService } from "./distribution.service";
import { UpdateDistributionDto } from "./distribution.dto";
import { plainToClass } from "class-transformer";
import { validate } from "class-validator";

const distributionService = new DistributionService();

export class DistributionController {
    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const updateDistributionDto = plainToClass(UpdateDistributionDto, req.body);

            const errors = await validate(updateDistributionDto);
            if (errors.length > 0) {
                return res.status(400).json({ errors });
            }

            const updatedDistribution = await distributionService.updateDistribution(id, updateDistributionDto);

            res.status(200).json({
                data: updatedDistribution,
                success: true,
                message: "Distribution updated successfully",
            });
        } catch (error) {
            next(error);
        }
    }
}
