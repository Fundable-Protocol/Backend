import AppDataSource from "../../../config/persistence/data-source";
import { NotFoundException } from "../../../utils/exceptions";
import DistributionEntity from "./distribution.entity";
import { UpdateDistributionDto } from "./distribution.dto";

const distributionRepository = AppDataSource.getRepository(DistributionEntity);

export class DistributionService {
    async updateDistribution(id: string, data: UpdateDistributionDto): Promise<DistributionEntity> {
        const distribution = await distributionRepository.findOneBy({ id });

        if (!distribution) {
            throw new NotFoundException("Distribution not found");
        }

        Object.assign(distribution, data);

        return await distributionRepository.save(distribution);
    }
}
