import AppDataSource from '../../../config/persistence/data-source';
import { CampaignEntity } from './campaign.entity';
import { CampaignData } from '../../../types/campaign';

const campaignRepository = AppDataSource.getRepository(CampaignEntity);

export async function isCampaignRefUnique(campaign_ref: string): Promise<boolean> {
    const count = await campaignRepository.count({ where: { campaign_ref } });
    return count === 0;
}

export async function saveCampaign(data: CampaignData): Promise<CampaignEntity> {
    const campaign = campaignRepository.create(data);
    return campaignRepository.save(campaign);
}
