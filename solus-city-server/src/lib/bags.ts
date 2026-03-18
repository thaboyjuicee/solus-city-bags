import { Connection, clusterApiUrl } from "@solana/web3.js";
import { BagsSDK } from "@bagsfm/bags-sdk";

const apiKey = process.env.BAGS_API_KEY;

if (!apiKey) {
  console.error("BAGS_API_KEY is not set. Bags SDK features will not work correctly.");
}

const rpcUrl = process.env.HELIUS_RPC_URL ?? clusterApiUrl("mainnet-beta");
const connection = new Connection(rpcUrl, "processed");

export const bags = new BagsSDK(apiKey ?? "", connection, "processed");
