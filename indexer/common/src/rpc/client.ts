import { rpc } from "@stellar/stellar-sdk";
import { config } from "../config/index.js";

/**
 * Creates and configures a Soroban Server instance.
 * Reads the RPC URL from the validated configuration.
 */
export function createSorobanClient(rpcUrl: string = config.RPC_URL): rpc.Server {
  return new rpc.Server(rpcUrl);
}

export const sorobanClient = createSorobanClient();
