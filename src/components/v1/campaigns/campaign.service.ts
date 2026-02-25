import { QueryFailedError } from 'typeorm';

import AppDataSource from '../../../config/persistence/data-source';
import { ConflictError } from '../../../utils/errorHandler';
import { CampaignEntity } from './campaign.entity';
import { CampaignData } from '../../../types/campaign';

const POSTGRES_UNIQUE_VIOLATION = '23505';

function getRepo() {
    return AppDataSource.getRepository(CampaignEntity);
}

function isUniqueConstraintViolation(err: unknown): boolean {
    if (err instanceof QueryFailedError) {
        const code = (err as { driverError?: { code?: string } }).driverError?.code;
        return code === POSTGRES_UNIQUE_VIOLATION;
    }
    return false;
}

export async function isCampaignRefUnique(campaign_ref: string): Promise<boolean> {
    const count = await getRepo().count({ where: { campaign_ref } });
    return count === 0;
}

export async function saveCampaign(data: CampaignData): Promise<CampaignEntity> {
    const campaign = getRepo().create(data);
    try {
        return await getRepo().save(campaign);
    } catch (err) {
        if (isUniqueConstraintViolation(err)) {
            throw new ConflictError('Campaign reference already exists', {
                code: 'DUPLICATE_CAMPAIGN_REF',
            });
        }
        throw err;
    }
}
