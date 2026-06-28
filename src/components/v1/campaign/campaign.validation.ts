import { z } from 'zod';

const MAX_U256 = (1n << 256n) - 1n;

export const isPositiveU256String = (value: string) => {
    if (!/^\d+$/.test(value)) return false;
    const asBigInt = BigInt(value);
    return asBigInt > 0n && asBigInt <= MAX_U256;
};

export const isValidStarknetAddress = (value: string) => {
    if (!/^0x[0-9a-fA-F]{1,64}$/.test(value)) return false;
    try {
        const n = BigInt(value);
        return n >= 0n && n < 1n << 251n;
    } catch {
        return false;
    }
};

export const createCampaignSchema = z.object({
    campaign_ref: z
        .string()
        .trim()
        .length(5, 'campaign_ref must be exactly 5 characters long')
        .refine((s) => s.trim().length === 5, 'campaign_ref cannot be empty'),
    target_amount: z
        .string()
        .trim()
        .refine(
            (s) => isPositiveU256String(s),
            'target_amount must be a positive u256 integer string'
        ),
    title: z
        .string()
        .trim()
        .max(255, 'title must be at most 255 characters')
        .optional()
        .transform((val) => (val && val.length > 0 ? val : undefined)),

    donation_token: z
        .string()
        .trim()
        .refine(
            (s) => isValidStarknetAddress(s),
            'donation_token must be a valid contract address'
        ),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const toU256Parts = (value: string) => {
    const n = BigInt(value);
    const lowMask = (1n << 128n) - 1n;
    const low = n & lowMask;
    const high = n >> 128n;
    return { low: `0x${low.toString(16)}`, high: `0x${high.toString(16)}` };
};
