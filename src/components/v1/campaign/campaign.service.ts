import { Between, Repository } from "typeorm";
import AppDataSource from "../../../config/persistence/data-source";
import { CampaignEntity, CampaignAuditEntity } from "./campaign.entity";
import { UpdateCampaignDto } from "./campaign.dto";
import { AppError } from "../../../utils/errorHandler";
import { updateCampaignTargetOnChain } from "../../../utils/blockchain";

export class CampaignService {
    private campaignRepo: Repository<CampaignEntity>;
    private auditRepo: Repository<CampaignAuditEntity>;

    constructor() {
        this.campaignRepo = AppDataSource.getRepository(CampaignEntity);
        this.auditRepo = AppDataSource.getRepository(CampaignAuditEntity);
    }

    async updateCampaign(campaignId: string, updateData: UpdateCampaignDto, userAddress: string): Promise<CampaignEntity> {
        const campaign = await this.campaignRepo.findOne({ where: { campaignId } });

        if (!campaign) {
            throw new AppError({ name: "NotFoundError", message: "Campaign not found", httpCode: 404, type: "API" });
        }

        // 1. Ownership verification
        if (campaign.creatorAddress.toLowerCase() !== userAddress.toLowerCase()) {
            throw new AppError({ name: "ForbiddenError", message: "You do not own this campaign", httpCode: 403, type: "API" });
        }

        // 2. Campaign active check
        if (campaign.status === "ended" || new Date() > campaign.endDate) {
            throw new AppError({ name: "ConflictError", message: "Cannot update an ended campaign", httpCode: 409, type: "API" });
        }

        // 3. Funding threshold check (90%)
        const target = parseFloat(campaign.targetAmount);
        const funding = parseFloat(campaign.currentFunding);
        if (funding / target > 0.9) {
            throw new AppError({ name: "ConflictError", message: "Campaign with more than 90% funding cannot be updated", httpCode: 409, type: "API" });
        }

        // 4. Daily update rate limiter (max 3 per day in UTC)
        const startOfDay = new Date();
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setUTCHours(23, 59, 59, 999);

        const updateCount = await this.auditRepo.count({
            where: {
                campaignId,
                createdAt: Between(startOfDay, endOfDay)
            }
        });

        if (updateCount >= 3) {
            throw new AppError({ name: "ForbiddenError", message: "Maximum 3 updates per campaign per day reached", httpCode: 403, type: "API" });
        }

        // 5. Field-level validation
        const oldValues: Record<string, any> = {};
        const newValues: Record<string, any> = {};
        const changedFields: string[] = [];

        // Target amount: must be greater than current value
        if (updateData.target_amount) {
            const newTarget = parseFloat(updateData.target_amount);
            if (newTarget <= target) {
                throw new AppError({ name: "BadRequestError", message: "Target amount can only be increased", httpCode: 400, type: "API" });
            }
            oldValues.targetAmount = campaign.targetAmount;
            newValues.targetAmount = updateData.target_amount;
            changedFields.push("targetAmount");
        }

        // End date: must be later than current value
        if (updateData.end_date) {
            const newEndDate = new Date(updateData.end_date);
            if (newEndDate <= campaign.endDate) {
                throw new AppError({ name: "BadRequestError", message: "End date can only be extended", httpCode: 400, type: "API" });
            }
            oldValues.endDate = campaign.endDate;
            newValues.endDate = newEndDate;
            changedFields.push("endDate");
        }

        // Other fields
        const updatableFields: (keyof UpdateCampaignDto)[] = ["description", "tags", "social_links", "image_url", "title"];
        for (const field of updatableFields) {
            if (updateData[field] !== undefined) {
                const entityField = this.mapDtoToEntityField(field);
                if (JSON.stringify(campaign[entityField]) !== JSON.stringify(updateData[field])) {
                    oldValues[entityField] = campaign[entityField];
                    newValues[entityField] = updateData[field];
                    changedFields.push(entityField);
                }
            }
        }

        if (changedFields.length === 0) {
            return campaign;
        }

        let transactionHash: string | undefined;
        let updateSource: "blockchain" | "database" = "database";

        // 6. Blockchain integration
        if (updateData.target_amount) {
            updateSource = "blockchain";
            try {
                const result = await updateCampaignTargetOnChain(campaign.campaignRef, updateData.target_amount);
                transactionHash = result.transactionHash;
                campaign.transactionHash = transactionHash;
            } catch (error) {
                throw new AppError({ name: "InternalServerError", message: "Blockchain update failed", httpCode: 500, type: "API" });
            }
        }

        // 7. Atomic update
        return await AppDataSource.transaction(async (manager) => {
            // Apply updates to campaign
            for (const field of changedFields) {
                (campaign as any)[field] = newValues[field];
            }
            const updatedCampaign = await manager.save(campaign);

            // 8. Audit trail
            const audit = new CampaignAuditEntity();
            audit.campaignId = campaignId;
            audit.updatedBy = userAddress;
            audit.changedFields = changedFields;
            audit.oldValues = oldValues;
            audit.newValues = newValues;
            audit.updateSource = updateSource;
            audit.transactionHash = transactionHash || "";
            await manager.save(audit);

            return updatedCampaign;
        });
    }

    private mapDtoToEntityField(dtoField: keyof UpdateCampaignDto): string {
        const mapping: Record<string, string> = {
            target_amount: "targetAmount",
            description: "description",
            end_date: "endDate",
            tags: "tags",
            social_links: "socialLinks",
            image_url: "imageUrl",
            title: "title"
        };
        return mapping[dtoField] || dtoField;
    }
}
