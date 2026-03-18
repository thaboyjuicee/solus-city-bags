/** @type {import('next').NextConfig} */
const nextConfig = {
  // Wallet adapter packages ship ESM — Next.js must transpile them for App Router
  transpilePackages: [
    "@solana/wallet-adapter-base",
    "@solana/wallet-adapter-react",
    "@solana/wallet-adapter-react-ui",
    "@solana/wallet-adapter-phantom",
    "@solana/wallet-adapter-solflare",
  ],
};

module.exports = nextConfig;
