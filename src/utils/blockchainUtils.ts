import { RpcProvider, Contract, uint256, RpcError, TimeoutError } from 'starknet';
import logger from './logger';

function getProvider(): RpcProvider {
    const rpcUrl = process.env.STARKNET_RPC_URL;
    if (!rpcUrl) {
        throw new Error('STARKNET_RPC_URL environment variable is not set');
    }
    return new RpcProvider({ nodeUrl: rpcUrl });
}

const ERC20_ABI = [
    {
        inputs: [{ name: 'account', type: 'core::starknet::contract_address::ContractAddress' }],
        name: 'balanceOf',
        outputs: [{ name: 'balance', type: 'core::integer::u256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'symbol',
        outputs: [{ name: 'symbol', type: 'core::byte_array::ByteArray' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

export async function getUserWalletBalance(
    walletAddress: string,
    tokenAddress: string
): Promise<{ lte: (n: bigint) => boolean; value: bigint }> {
    try {
        const contract = new Contract(ERC20_ABI, tokenAddress, getProvider());
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

const RPC_CODE_CONTRACT_NOT_FOUND = 20;
const RPC_CODE_ENTRY_POINT_NOT_FOUND = 21;

function isNetworkOrRpcInfraError(error: unknown): boolean {
    if (error instanceof TimeoutError) return true;
    const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
    return (
        message.includes('timeout') ||
        message.includes('econnreset') ||
        message.includes('network') ||
        message.includes('fetch') ||
        message.includes('connection') ||
        message.includes('temporarily unavailable') ||
        message.includes('econnrefused') ||
        message.includes('enotfound')
    );
}

function isContractLacksSymbolError(error: unknown): boolean {
    if (error instanceof RpcError) {
        const code = error.code;
        if (code === RPC_CODE_CONTRACT_NOT_FOUND || code === RPC_CODE_ENTRY_POINT_NOT_FOUND) {
            return true;
        }
    }
    const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
    return (
        message.includes('entry point') ||
        message.includes('entrypoint') ||
        message.includes('requested entrypoint does not exist') ||
        message.includes('contract not found') ||
        message.includes('method not found')
    );
}

export async function verifyTokenContract(
    contractAddress: string
): Promise<boolean> {
    const provider = getProvider();
    try {
        const contract = new Contract(ERC20_ABI, contractAddress, provider);
        await contract.symbol();
        return true;
    } catch (error) {
        const rpcUrl = process.env.STARKNET_RPC_URL ?? '(not set)';
        const logContext = {
            contractAddress,
            providerNodeUrl: rpcUrl,
            errorMessage: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        };

        if (isNetworkOrRpcInfraError(error)) {
            logger.error('verifyTokenContract: network/RPC infra error', logContext);
            throw error;
        }

        if (isContractLacksSymbolError(error)) {
            logger.error('verifyTokenContract: contract lacks symbol()', logContext);
            return false;
        }

        logger.error('verifyTokenContract: unexpected error (rethrowing)', logContext);
        throw error;
    }
}
