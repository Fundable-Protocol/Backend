import { z } from 'zod';
import { DonationStatus, Network } from '../../../types/enums';

const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/;
const decimalStringRegex = /^\d+(\.\d+)?$/;
const starknetTransactionHashRegex = /^0x([A-Fa-f0-9]{1,64})$/;
const MAX_DECIMAL_PRECISION = 65;
const MAX_DECIMAL_SCALE = 30;

const decimal65x30 = (fieldName: string) =>
    z
        .string()
        .regex(
            decimalStringRegex,
            `${fieldName} must be a valid decimal string`
        )
        .refine(
            (val) => {
                const parts = val.split('.');
                const intDigits = parts[0].replace(/^0+/, '') || '0';
                const fracDigits = parts[1] ?? '';
                return (
                    intDigits.length + fracDigits.length <=
                        MAX_DECIMAL_PRECISION &&
                    fracDigits.length <= MAX_DECIMAL_SCALE
                );
            },
            {
                message: `${fieldName} exceeds decimal(${MAX_DECIMAL_PRECISION},${MAX_DECIMAL_SCALE}) limits`,
            }
        );

export const createDonationSchema = z.object({
    campaignId: z.string().min(1, 'campaignId is required'),

    campaignRef: z.string().nullable().optional(),
    campaignTitle: z
        .string()
        .max(255, 'campaignTitle must be at most 255 characters')
        .nullable()
        .optional(),

    donorId: z.string().nullable().optional(),

    donorAddress: z
        .string()
        .regex(
            ethereumAddressRegex,
            'donorAddress must be a valid Ethereum address'
        ),

    donorName: z
        .string()
        .max(255, 'donorName must be at most 255 characters')
        .nullable()
        .optional(),

    tokenAddress: z
        .string()
        .regex(
            ethereumAddressRegex,
            'tokenAddress must be a valid Ethereum address'
        ),

    tokenSymbol: z
        .string()
        .min(1, 'tokenSymbol is required')
        .max(20, 'tokenSymbol must be at most 20 characters'),

    tokenDecimals: z
        .number()
        .int('tokenDecimals must be an integer')
        .min(0, 'tokenDecimals must be at least 0')
        .max(30, 'tokenDecimals must be at most 30'),

    amount: decimal65x30('amount'),

    usdAmount: decimal65x30('usdAmount').optional(),

    gasFee: decimal65x30('gasFee').optional(),

    transactionHash: z
        .string()
        .regex(
            starknetTransactionHashRegex,
            'transactionHash must be a valid transaction hash'
        )
        .nullable()
        .optional(),

    blockNumber: z
        .string()
        .regex(/^\d+$/, 'blockNumber must be a non-negative integer string')
        .nullable()
        .optional(),

    blockTimestamp: z.string().datetime().nullable().optional(),

    network: z
        .nativeEnum(Network, {
            errorMap: () => ({ message: 'network must be a valid Network' }),
        })
        .optional(),

    isAnonymous: z.boolean().optional(),

    message: z
        .string()
        .max(1000, 'message must be at most 1000 characters')
        .nullable()
        .optional(),
});

export const listDonationsQuerySchema = z.object({
    page: z
        .string()
        .optional()
        .transform((val) => {
            const n = val ? Number(val) : 1;
            return Number.isNaN(n) || n < 1 ? 1 : Math.floor(n);
        }),
    limit: z
        .string()
        .optional()
        .transform((val) => {
            const n = val ? Number(val) : 20;
            if (Number.isNaN(n) || n < 1) return 20;
            return Math.min(Math.floor(n), 100);
        }),
    confirmed: z
        .enum(['true', 'false'])
        .optional()
        .transform((val) => {
            if (val === 'true') return true;
            if (val === 'false') return false;
            return undefined;
        }),
    sort_by: z
        .enum([
            'created_at',
            'amount',
            'status',
            'confirmed_at',
            'campaign_ref',
            'campaign_title',
            'donor_address',
        ])
        .optional()
        .default('created_at'),
    sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
    from_date: z.string().datetime().optional(),
    to_date: z.string().datetime().optional(),
    min_amount: z
        .string()
        .regex(decimalStringRegex, 'min_amount must be a valid decimal string')
        .optional(),
    max_amount: z
        .string()
        .regex(decimalStringRegex, 'max_amount must be a valid decimal string')
        .optional(),
    campaign_id: z.string().optional(),
    donor_id: z.string().optional(),
    donation_token: z.string().optional(),
    status: z
        .nativeEnum(DonationStatus, {
            errorMap: () => ({
                message: 'status must be a valid DonationStatus',
            }),
        })
        .optional(),
    search: z
        .string()
        .max(255, 'search must be at most 255 characters')
        .optional(),
});

export const listCampaignDonationsQuerySchema = listDonationsQuerySchema.omit({
    campaign_id: true,
});
export const listUserDonationsQuerySchema = listDonationsQuerySchema.omit({
    donor_id: true,
});
export const donationParamsSchema = z.object({
    id: z.string().uuid('id must be a valid UUID'),
});

export type CreateDonationInput = z.infer<typeof createDonationSchema>;
export type ListDonationsQuery = z.infer<typeof listDonationsQuerySchema>;
