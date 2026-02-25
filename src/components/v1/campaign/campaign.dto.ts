export interface UpdateCampaignDto {
    target_amount?: string;
    description?: string;
    end_date?: string;
    tags?: string[];
    social_links?: Record<string, string>;
    image_url?: string;
    title?: string;
}

export interface CampaignResponseDto {
    id: string;
    campaign_id: string;
    campaign_ref: string;
    creator_address: string;
    title: string;
    description: string;
    target_amount: string;
    current_funding: string;
    donation_token: string;
    end_date: Date;
    image_url: string;
    tags: string[];
    social_links: Record<string, string>;
    transaction_hash?: string;
    status: string;
    created_at: Date;
    updated_at: Date;
}
