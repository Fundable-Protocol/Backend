// Blockchain utility functions for wallet balance and token contract verification
import { RpcProvider, Contract, uint256 } from 'starknet';

// You may want to move these to a config file
const STARKNET_RPC_URL = process.env.STARKNET_RPC_URL || 'https://starknet-mainnet.public.blastapi.io/rpc/v0_6';
if (!STARKNET_RPC_URL) {
  throw new Error('STARKNET_RPC_URL environment variable is required');
}
const provider = new RpcProvider({ nodeUrl: STARKNET_RPC_URL });

// Standard ERC20 ABI fragment for balanceOf and symbol
const ERC20_ABI = [
  {
    "inputs": [{ "name": "account", "type": "felt" }],
    "name": "balanceOf",
    "outputs": [{ "name": "balance", "type": "Uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{ "name": "symbol", "type": "felt" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// Returns a BigInt balance (in u256) for the given wallet and ERC20 contract
export async function getUserWalletBalance(walletAddress: string, tokenAddress: string): Promise<{ lte: (n: bigint) => boolean, value: bigint }> {
  try {
    const contract = new Contract(ERC20_ABI, tokenAddress, provider);
    const { balance } = await contract.balanceOf(walletAddress);
    // Convert StarkNet Uint256 to BigInt
    const value = uint256.uint256ToBN(balance);
    return {
      lte: (n: bigint) => value <= n,
      value
    };
  } catch (error) {
    // If contract call fails, treat as zero balance
    return {
      lte: () => true,
      value: 0n
    };
  }
}

// Verifies if a contract exists and is a valid ERC20 (has symbol method)
export async function verifyTokenContract(contractAddress: string): Promise<boolean> {
  try {
    const contract = new Contract(ERC20_ABI, contractAddress, provider);
    // Try calling symbol (should not throw if valid ERC20)
    await contract.symbol();
    return true;
  } catch (error) {
    return false;
  }
}
