// Database operations for campaigns
// Assumes TypeORM or similar ORM is used
import AppDataSource from '../../../config/persistence/data-source';
import { Campaign} from './campaign.entity'

// Check if campaign_ref is unique
export async function isCampaignRefUnique(campaign_ref: string): Promise<boolean> {
  const repo = AppDataSource.getRepository(Campaign);
  const count = await repo.count({ where: { campaign_ref } });
  return count === 0;
}

// Save campaign metadata to DB
import { CampaignData } from '../../../types/campaign';

export async function saveCampaignToDb({
  campaign_id,
  campaign_ref,
  target_amount,
  donation_token,
  transaction_hash,
  user_id,
  created_at,
}: CampaignData): Promise<CampaignData> {
  const repo = AppDataSource.getRepository(Campaign);
  const campaign = repo.create({
    campaign_id,
    campaign_ref,
    target_amount,
    donation_token,
    transaction_hash,
    user_id,
    created_at,
  });
  await repo.save(campaign);
  return {
    campaign_id,
    campaign_ref,
    target_amount,
    donation_token,
    transaction_hash,
    user_id,
    created_at,
  };
}

// --- Rate limiting support ---
// Assumes a CampaignRequest entity/table with user_id and created_at fields
import { MoreThan } from 'typeorm';

export async function saveUserCampaignRequest(userId: string): Promise<void> {
  // You need a CampaignRequest entity for this to work
  const repo = AppDataSource.getRepository('CampaignRequest');
  await repo.insert({ user_id: userId, created_at: new Date().toISOString() });
}

export async function getUserCampaignCountLastHour(userId: string): Promise<number> {
  // You need a CampaignRequest entity for this to work
  const repo = AppDataSource.getRepository('CampaignRequest');
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  return await repo.count({ where: { user_id: userId, created_at: MoreThan(oneHourAgo) } });
}
