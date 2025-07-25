// This service handles interaction with the Cairo smart contract using starknet.js
import { RpcProvider, Account, Contract, uint256, Abi } from 'starknet';

// Use the new distributor ABI
const CONTRACT_ADDRESS = process.env.CAMPAIGN_CONTRACT_ADDRESS;
if (!CONTRACT_ADDRESS) {
  throw new Error('CAMPAIGN_CONTRACT_ADDRESS environment variable is required');
}
const CONTRACT_ADDRESS_STR: string = CONTRACT_ADDRESS;
let CONTRACT_ABI: Abi;
try {
  CONTRACT_ABI = require('./distributor.abi.json') as Abi;
} catch (error) {
  if (error instanceof Error) {
    throw new Error('Failed to load contract ABI: ' + error.message);
  } else {
    throw new Error('Failed to load contract ABI: Unknown error');
  }
}

// Use environment variable for RPC URL, fallback to default
const provider = new RpcProvider({
  nodeUrl: process.env.STARKNET_RPC_URL || 'https://starknet-mainnet.public.blastapi.io/rpc/v0_6',
});

// This function assumes you have a way to get the user's private key for signing
import { U256, CreateCampaignParams, CampaignEvent, TransactionReceipt, StarknetError } from '../types/campaign';

export async function createCampaignOnChain({ campaign_ref, target_amount, donation_token, userWallet }: CreateCampaignParams) {
  // You must implement secure key management for production
  const privateKey = await getUserPrivateKey(userWallet); // Implement this securely
  if (!userWallet) throw new Error('userWallet is required');
  if (!privateKey) throw new Error('privateKey is required');
  const account = new Account(provider, userWallet, privateKey);
  const contract = new Contract(CONTRACT_ABI, CONTRACT_ADDRESS_STR, account);

  // Retry logic with exponential backoff
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
      // Wait for transaction to be accepted
      const receipt = await provider.waitForTransaction(tx.transaction_hash);
      // Extract campaign_id from events or return value
      const campaign_id = extractCampaignIdFromReceipt(receipt); // Implement this
      return {
        campaign_id,
        transaction_hash: tx.transaction_hash,
      };
    } catch (error) {
      if (error instanceof Error) {
        lastError = error;
        // Only retry on network/temporary errors
        if (isRetriableError(error)) {
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
          await new Promise(res => setTimeout(res, delay));
          attempt++;
          continue;
        } else {
          throw mapStarknetError(error);
        }
      } else {
        // If error is not an instance of Error, throw a generic error
        throw new Error('Unknown error occurred during contract interaction');
      }
    }
  }
  throw mapStarknetError(lastError || new Error('Unknown error after retries'));
}

function isRetriableError(err: any): boolean {
  const message = err?.message || '';
  // Add more retriable error patterns as needed
  return (
    message.includes('timeout') ||
    message.includes('ECONNRESET') ||
    message.includes('network') ||
    message.includes('temporarily unavailable')
  );
}

// Placeholder for extracting campaign_id from transaction receipt
// (Removed local CampaignEvent and TransactionReceipt interfaces; using imported ones)
function extractCampaignIdFromReceipt(receipt: TransactionReceipt): string {
  if (!receipt.events) {
    throw new Error('No events found in transaction receipt');
  }
  const campaignEvent = receipt.events.find(e => e.event_type === 'CampaignCreated');
  if (!campaignEvent || !campaignEvent.data?.campaign_id) {
    throw new Error('Campaign ID not found in transaction events');
  }
  return campaignEvent.data.campaign_id as string;
}

// Placeholder for error mapping
function mapStarknetError(err: unknown): StarknetError {
  const error = err as StarknetError;
  const message = error.message || '';
  // Map common StarkNet error patterns to application error codes
  if (message.includes('Contract not found')) {
    return { code: 'INVALID_CONTRACT_ADDRESS', message: 'Contract address not found', details: error };
  }
  if (message.includes('Invalid transaction')) {
    return { code: 'INVALID_TRANSACTION', message: 'Transaction validation failed', details: error };
  }
  if (message.includes('Insufficient balance')) {
    return { code: 'INSUFFICIENT_BALANCE', message: 'Insufficient balance for transaction', details: error };
  }
  // Return original error if no mapping found
  return { code: 'CONTRACT_ERROR', message: error.message || 'Unknown contract error', details: error };
}

// Placeholder for secure key management
async function getUserPrivateKey(userWallet: string): Promise<string> {
  // Implement secure retrieval of user's private key
  console.warn('getUserPrivateKey is not implemented. This must be securely implemented before production.');
  throw new Error('getUserPrivateKey not implemented');
}
