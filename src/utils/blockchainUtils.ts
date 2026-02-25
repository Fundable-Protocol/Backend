import { RpcProvider, Contract, uint256 } from 'starknet';

const RPC_URL =
    process.env.STARKNET_RPC_URL ||
    'https://starknet-mainnet.public.blastapi.io/rpc/v0_6';
const provider = new RpcProvider({ nodeUrl: RPC_URL });

const ERC20_ABI = [
    {
        inputs: [{ name: 'account', type: 'felt' }],
        name: 'balanceOf',
        outputs: [{ name: 'balance', type: 'Uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'symbol',
        outputs: [{ name: 'symbol', type: 'felt' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

export async function getUserWalletBalance(
    walletAddress: string,
    tokenAddress: string
): Promise<{ lte: (n: bigint) => boolean; value: bigint }> {
    try {
        const contract = new Contract(ERC20_ABI, tokenAddress, provider);
        const result = await contract.balanceOf(walletAddress);
        const value = uint256.uint256ToBN(result.balance);
        return {
            lte: (n: bigint) => value <= n,
            value,
        };
    } catch (error) {
        throw new Error(
            `Failed to fetch wallet balance: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

export async function verifyTokenContract(
    contractAddress: string
): Promise<boolean> {
    try {
        const contract = new Contract(ERC20_ABI, contractAddress, provider);
        await contract.symbol();
        return true;
    } catch {
        return false;
    }
}
