export interface CampaignData {
  campaign_id: string;
  campaign_ref: string;
  target_amount: string;
  donation_token: string;
  transaction_hash: string;
  user_id: string;
  created_at: string;
}

export interface U256 {
  low: number;
  high: number;
}

export interface CreateCampaignParams {
  campaign_ref: string;
  target_amount: U256;
  donation_token: string;
  userWallet: string;
}

export interface CampaignEvent {
  event_type: string;
  data: { campaign_id?: string };
}

export interface TransactionReceipt {
  events?: CampaignEvent[];
  [key: string]: unknown;
}

export interface StarknetError {
  code?: string;
  message?: string;
  details?: unknown;
}
