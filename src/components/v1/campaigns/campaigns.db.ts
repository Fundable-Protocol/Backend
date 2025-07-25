// Database operations for campaigns
// Assumes TypeORM or similar ORM is used
import AppDataSource from '../../../config/persistence/data-source';
import { Campaign } from './campaign.entity'
import { CampaignRequest } from './campaignRequest.entity';

// Check if campaign_ref is unique
export async function isCampaignRefUnique(campaign_ref: string): Promise<boolean> {
  try {
    const repo = AppDataSource.getRepository(Campaign);
    const count = await repo.count({ where: { campaign_ref } });
    return count === 0;
  } catch (error) {
    console.error('Error checking campaign reference uniqueness:', error);
    throw new Error('Failed to verify campaign reference uniqueness');
  }
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
  try {
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
    const saved = await repo.save(campaign);
    return saved;
  } catch (error) {
    console.error('Error saving campaign to database:', error);
    throw new Error('Failed to save campaign');
  }
}

// --- Rate limiting support ---
// Assumes a CampaignRequest entity/table with user_id and created_at fields
import { MoreThan } from 'typeorm';

export async function saveUserCampaignRequest(userId: string): Promise<void> {
  try {
    const repo = AppDataSource.getRepository(CampaignRequest);
    await repo.insert({ user_id: userId }); // created_at will be auto-set
  } catch (error) {
    console.error('Error logging campaign request:', error);
    throw new Error('Failed to log campaign request');
  }
}

export async function getUserCampaignCountLastHour(userId: string): Promise<number> {
  try {
    const repo = AppDataSource.getRepository(CampaignRequest);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return await repo.count({ where: { user_id: userId, created_at: MoreThan(oneHourAgo) } });
  } catch (error) {
    console.error('Error counting user campaign requests:', error);
    throw new Error('Failed to count user campaign requests');
  }
}
