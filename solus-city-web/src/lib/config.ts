export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "https://solus-city-app-production.up.railway.app";

export const SOLANA_NETWORK =
  (process.env.NEXT_PUBLIC_SOLANA_NETWORK as
    | "mainnet-beta"
    | "devnet"
    | "testnet") ?? "mainnet-beta";

export const TOKEN_KEY = "solus_city_jwt";
