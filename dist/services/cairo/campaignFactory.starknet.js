"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStarknetCampaignClient = void 0;
const process_1 = require("process");
const starknet_1 = require("starknet");
const logger_1 = __importDefault(require("../../utils/logger"));
const retry_1 = require("./retry");
const campaign_validation_1 = require("../../components/v1/campaign/campaign.validation");
const getRequiredEnv = (key) => {
    const value = process_1.env[key];
    if (!value)
        throw new Error(`Missing required env var: ${key}`);
    return value;
};
const parseEventCampaignId = (receipt) => {
    const eventKey = process_1.env.CAMPAIGN_CREATED_EVENT_KEY;
    if (!eventKey)
        return null;
    const normalizedKey = eventKey.toLowerCase();
    const events = receipt?.events ?? [];
    const match = events.find((e) => (e.keys ?? []).map((k) => k.toLowerCase()).includes(normalizedKey));
    if (!match)
        return null;
    const data0 = match?.data?.[0];
    return typeof data0 === "string" && data0.length ? data0 : null;
};
const createStarknetCampaignClient = () => {
    const rpcUrl = getRequiredEnv("CAIRO_RPC_URL");
    const accountAddress = getRequiredEnv("CAIRO_ACCOUNT_ADDRESS");
    const privateKey = getRequiredEnv("CAIRO_PRIVATE_KEY");
    const factoryAddress = getRequiredEnv("CAIRO_FACTORY_CONTRACT_ADDRESS");
    const provider = new starknet_1.RpcProvider({ nodeUrl: rpcUrl });
    const account = new starknet_1.Account({ provider, address: accountAddress, signer: privateKey });
    return {
        assertContractAccessible: async (address) => {
            await (0, retry_1.withRetry)(async () => {
                await provider.getClassHashAt(address);
            });
        },
        createCampaign: async ({ campaignRef, targetAmount, donationToken }) => {
            await (0, retry_1.withRetry)(async () => {
                await provider.getClassHashAt(factoryAddress);
            });
            await (0, retry_1.withRetry)(async () => {
                await provider.getClassHashAt(donationToken);
            });
            const campaignRefFelt = starknet_1.shortString.encodeShortString(campaignRef);
            const { low, high } = (0, campaign_validation_1.toU256Parts)(targetAmount);
            const invocation = {
                contractAddress: factoryAddress,
                entrypoint: "create_campaign",
                calldata: [campaignRefFelt, low, high, donationToken],
            };
            const result = await (0, retry_1.withRetry)(async () => {
                logger_1.default.info(`Submitting create_campaign tx for ref=${campaignRef}`);
                return await account.execute(invocation);
            });
            const transactionHash = result?.transaction_hash ?? result?.transactionHash;
            if (!transactionHash) {
                throw new Error("Contract call did not return a transaction hash");
            }
            const receipt = await (0, retry_1.withRetry)(async () => await provider.waitForTransaction(transactionHash));
            const campaignId = parseEventCampaignId(receipt) ?? transactionHash;
            return { transactionHash, campaignId };
        },
    };
};
exports.createStarknetCampaignClient = createStarknetCampaignClient;
