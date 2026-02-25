import { z } from 'zod';

const starknetAddressRegex = /^0x[0-9a-fA-F]{64}$/;
const decimalStringRegex = /^[1-9]\d*$/;

export const createCampaignSchema = z.object({
    campaign_ref: z
        .string()
        .trim()
        .length(5, 'campaign_ref must be exactly 5 characters')
        .regex(/^[^\s]+$/, 'campaign_ref cannot contain whitespace'),
    target_amount: z
        .string()
        .regex(decimalStringRegex, 'target_amount must be a positive integer')
        .refine(
            (v) => {
                const big = BigInt(v);
                return big > 0n && big <= 2n ** 256n - 1n;
            },
            'target_amount must be a positive number and valid u256'
        ),
    donation_token: z
        .string()
        .regex(starknetAddressRegex, 'donation_token must be a valid contract address')
        .refine(
            (v) => {
                const feltMax = 2n ** 251n + 17n * 2n ** 192n; // Stark prime - 1
                return BigInt(v) <= feltMax;
            },
            'donation_token exceeds the StarkNet felt252 address range'
        ),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
