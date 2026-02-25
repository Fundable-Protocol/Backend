import { RpcProvider, Account, Contract, uint256, Abi } from 'starknet';

import { CreateCampaignParams, StarknetError } from '../types/campaign';

const _addr = process.env.CAMPAIGN_CONTRACT_ADDRESS;
if (!_addr) {
    throw new Error('CAMPAIGN_CONTRACT_ADDRESS environment variable is required');
}
const CONTRACT_ADDRESS: string = _addr;

let CONTRACT_ABI: Abi;
try {
    CONTRACT_ABI = require('./campaign_donation.abi.json') as Abi;
} catch (error) {
    throw new Error(
        'Failed to load campaign ABI: ' +
        (error instanceof Error ? error.message : 'Unknown error')
    );
}

function toError(mapped: StarknetError): Error {
    const err = new Error(mapped.message || 'Unknown contract error');
    Object.assign(err, mapped);
    return err;
}

const provider = new RpcProvider({
    nodeUrl:
        process.env.STARKNET_RPC_URL ||
        'https://starknet-mainnet.public.blastapi.io/rpc/v0_6',
});

export async function createCampaignOnChain({
    campaign_ref,
    target_amount,
    donation_token,
    userWallet,
}: CreateCampaignParams): Promise<{
    campaign_id: string;
    transaction_hash: string;
}> {
    if (!userWallet) throw new Error('userWallet is required');
    const privateKey = await getUserPrivateKey(userWallet);
    if (!privateKey) throw new Error('privateKey is required');

    const account = new Account(provider, userWallet, privateKey);
    const contract = new Contract(CONTRACT_ABI, CONTRACT_ADDRESS, account);

    const maxRetries = 3;
    let attempt = 0;
    let lastError: Error | undefined;

    while (attempt < maxRetries) {
        try {
            const tx = await contract.create_campaign(
                campaign_ref,
                target_amount,
                donation_token
            );
            const txHash = tx.transaction_hash;
            if (!txHash) throw new Error('No transaction hash returned');
            const receipt = await provider.waitForTransaction(txHash);
            const campaign_id = extractCampaignIdFromReceipt(
                receipt as unknown as {
                    events?: Array<{
                        from_address?: string;
                        keys?: string[];
                        data?: string[];
                    }>;
                }
            );
            return {
                campaign_id,
                transaction_hash: tx.transaction_hash,
            };
        } catch (error) {
            if (error instanceof Error) {
                lastError = error;
                if (isRetriableError(error)) {
                    const delay =
                        Math.pow(2, attempt) * 1000 + Math.random() * 500;
                    await new Promise((res) => setTimeout(res, delay));
                    attempt++;
                    continue;
                }
                throw toError(mapStarknetError(error));
            }
            throw new Error('Unknown error during contract interaction');
        }
    }
    throw mapStarknetError(
        mapStarknetError(lastError || new Error('Unknown error after retries'))
    );
}

function isRetriableError(err: Error): boolean {
    const message = err?.message || '';
    return (
        message.includes('timeout') ||
        message.includes('ECONNRESET') ||
        message.includes('network') ||
        message.includes('temporarily unavailable')
    );
}

function extractCampaignIdFromReceipt(receipt: {
    events?: Array<{ from_address?: string; keys?: string[]; data?: string[] }>;
}): string {
    if (!receipt.events?.length) {
        throw new Error('No events found in transaction receipt');
    }
    const contractAddr = (CONTRACT_ADDRESS ?? '').toLowerCase();
    const campaignEvent = receipt.events.find(
        (e) => e.from_address?.toLowerCase() === contractAddr
    );
    if (!campaignEvent?.keys || campaignEvent.keys.length < 5) {
        throw new Error('Campaign ID not found in transaction events');
    }
    const keys = campaignEvent.keys;
    const low = keys[3] ?? '0';
    const high = keys[4] ?? '0';
    return uint256.uint256ToBN({ low, high }).toString();
}

function mapStarknetError(err: unknown): StarknetError {
    const error = err as StarknetError & { message?: string };
    const message = error?.message || '';
    if (message.includes('Contract not found')) {
        return {
            code: 'INVALID_CONTRACT_ADDRESS',
            message: 'Contract address not found',
            details: error,
        };
    }
    if (message.includes('Invalid transaction')) {
        return {
            code: 'INVALID_TRANSACTION',
            message: 'Transaction validation failed',
            details: error,
        };
    }
    if (message.includes('Insufficient balance')) {
        return {
            code: 'INSUFFICIENT_BALANCE',
            message: 'Insufficient balance for transaction',
            details: error,
        };
    }
    if (message.includes('CAMPAIGN_REF_EMPTY')) {
        return {
            code: 'CAMPAIGN_REF_EMPTY',
            message: 'Campaign reference is empty',
            details: error,
        };
    }
    if (message.includes('CAMPAIGN_REF_EXISTS')) {
        return {
            code: 'CAMPAIGN_REF_EXISTS',
            message: 'Campaign reference already exists',
            details: error,
        };
    }
    if (message.includes('ZERO_AMOUNT')) {
        return {
            code: 'ZERO_TARGET_AMOUNT',
            message: 'Target amount must be greater than zero',
            details: error,
        };
    }
    return {
        code: 'CONTRACT_ERROR',
        message: (error?.message as string) || 'Unknown contract error',
        details: error,
    };
}

async function getUserPrivateKey(_userWallet: string): Promise<string> {
    throw new Error('getUserPrivateKey not implemented');
}
