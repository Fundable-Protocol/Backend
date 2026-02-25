export interface CampaignData {
    campaign_id: string;
    campaign_ref: string;
    target_amount: string;
    donation_token: string;
    transaction_hash: string;
    user_id: string;
    created_at?: Date;
}

export interface CreateCampaignParams {
    campaign_ref: string;
    target_amount: { low: bigint; high: bigint };
    donation_token: string;
    userWallet: string;
}

export interface StarknetError {
    code?: string;
    message?: string;
    details?: unknown;
}
