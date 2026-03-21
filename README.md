# Solus City

**An on-chain crime RPG built on Solana.**

Players authenticate with a Phantom/Solflare wallet signature and enter a persistent criminal underworld - committing crimes, training stats, buying equipment, raiding other players, climbing the leaderboard, and building syndicates. The in-game economy is anchored to the **$SLS token** traded on-chain, with real SOL->$SLS swaps powered by the **Bags protocol**.

**Live:** [soluscity.xyz](https://soluscity.xyz)

---

## Repository Structure

```text
solus-city-bags/
|- solus-city-server/   # Fastify + Prisma API backend (Railway)
|- solus-city-web/      # Next.js 14 web client (Vercel)
```

---

## Tech Stack

### Backend (`solus-city-server/`)

| Layer | Choice |
|---|---|
| Runtime | Node.js >= 22 |
| Framework | Fastify 4 |
| ORM | Prisma 5 + PostgreSQL |
| Auth | Ed25519 wallet-signature -> JWT (tweetnacl + bs58 + jsonwebtoken) |
| Solana RPC | Helius (mainnet-beta) |
| SPL Tokens | `@solana/spl-token`, `@solana/web3.js` |
| Swaps | `@bagsfm/bags-sdk` 1.3.1 |
| Validation | Zod |
| Deployment | Railway |

### Web Client (`solus-city-web/`)

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS 3.4 |
| HTTP | Axios with JWT interceptor + 401 redirect |
| Wallet | `@solana/wallet-adapter-react` - Phantom, Solflare |
| Swaps | `@bagsfm/bags-sdk` 1.3.2 |
| Solana network | mainnet-beta |
| Deployment | Vercel |

---

## Features

### Core Game Loop

| System | Details |
|---|---|
| **Crimes** | 10+ crimes with nerve cost, cooldown, XP/CASH reward, and jail risk |
| **Gym** | Train Strength, Speed, Defense, Dexterity to boost AP/DP |
| **Shop** | Buy units (gang members) and equipment - each with AP/DP bonuses |
| **Battles** | Attack players and NPCs; win loot capped at `min(cash x 8%, $5 000)` |
| **Hospital** | Defeated players are hospitalized; recover over time or buy out with $SLS |
| **Leaderboard** | Top 100 players ranked by Respect Points (RP) |
| **Syndicates** | Player-created factions with shared RP and a combat multiplier |
| **Events feed** | Real-time scrolling ticker of recent game activity |

### Black Market (`/black-market`)

The Black Market is the hub for all $SLS token interactions:

| Tab | Description |
|---|---|
| **Get $SLS** | Swap SOL -> $SLS directly in-game via Bags protocol (Jupiter-routed) |
| **Sell $SLS** | Convert $SLS -> in-game CASH at a fixed rate of **50 $SLS = 1 CASH** |
| **Hospital** | Pay $SLS to instantly leave the hospital (base fee $0.15 USD, doubles per release per day) |
| **History** | Full ledger of all $SLS transactions (buys, sells, hospital releases) |

The $SLS price strip at the top shows live price, wallet balance, and total $SLS spent in-game.

### $SLS Token Integration

- **Mint:** `ELTXCFp1tmtfu39CPw6afnMSjW1BBxjinorJQsKmBAGS`
- **Treasury:** `5vTZGYbkJ2xGbpNEbgp8TLuob3jjXTLqRgzdG8zP1FiZ`
- **DexScreener:** [View $SLS on DexScreener](https://dexscreener.com/solana/ELTXCFp1tmtfu39CPw6afnMSjW1BBxjinorJQsKmBAGS)
- All on-chain transfers are verified server-side by reading pre/post token balances from the confirmed transaction.

### Bags SDK Integration

SOL->$SLS swaps use the [Bags protocol](https://bags.fm):

1. Frontend calls `/bags/quote` and receives a `VersionedTransaction`
2. Player signs with their wallet
3. Frontend calls `/bags/swap` to submit the signed tx
4. Bags routes through Jupiter for best execution

---

## Game Mechanics

| Mechanic | Formula / Rule |
|---|---|
| AP | `BASE_ATK + strength + sum item AP bonuses` (x syndicate multiplier) |
| DP | `BASE_DEF + defense + sum item DP bonuses` |
| Win chance | `attackerAP / (attackerAP + defenderDP)` |
| Loot cap | `min(defenderCash x 8%, $5 000)` |
| Attack cooldown | 10 min per attacker->defender pair |
| Level threshold | `level x 100 XP` |
| Energy regen | +1 per 5 min |
| Nerve regen | +1 per 3 min |
| Happiness | Decays with crimes/battles; boosted by home items |
| Passive income | Applied on next login, capped at 24 h backfill |
| Hospital release | Base $0.15 USD in $SLS; cost doubles per release within the same UTC day |
| $SLS -> CASH rate | 50 $SLS = 1 CASH |

---

## API Reference

**Production base URL:** `https://solus-city-app-production.up.railway.app`

### Public

| Method | Route | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/auth/challenge?wallet=<pubkey>` | Get nonce challenge message |
| POST | `/auth/verify` | Verify wallet signature -> JWT |
| GET | `/sls/price` | Live $SLS price in USD |

### Protected

| Method | Route | Description |
|---|---|---|
| GET | `/me` | Full profile snapshot |
| PATCH | `/me` | Update display name |
| GET | `/events` | Recent event feed |
| GET | `/crimes` | Available crimes |
| POST | `/crimes/commit` | Commit a crime |
| POST | `/gym/train` | Train a stat |
| GET | `/shop/items` | Shop inventory with ownership flags |
| POST | `/shop/buy` | Purchase an item |
| GET | `/targets` | RP-matched target list |
| POST | `/battle/attack` | Attack a target |
| GET | `/logs/attacks` | Last 50 attack log entries |
| GET | `/leaderboard` | Top 100 players by RP |
| GET | `/syndicates` | All syndicates |
| GET | `/syndicates/:id` | Syndicate detail + members |
| POST | `/syndicates` | Create a syndicate |
| POST | `/syndicates/:id/join` | Join a syndicate |
| POST | `/syndicates/leave` | Leave current syndicate |
| GET | `/leaderboard/syndicates` | Top syndicates by total RP |
| POST | `/hospital/release` | Build unsigned $SLS transfer tx |
| POST | `/hospital/confirm` | Verify on-chain tx and clear hospitalization |
| POST | `/sls/sell/quote` | Build unsigned $SLS transfer tx for CASH purchase |
| POST | `/sls/sell/confirm` | Verify on-chain tx and credit CASH |
| GET | `/sls/transactions` | Last 20 $SLS transaction records |
| POST | `/bags/quote` | Proxy: get Bags swap quote |
| POST | `/bags/swap` | Proxy: submit signed Bags swap tx |

---

For V2 Wave 1 documentation, see [V2_WAVE1.md](./V2_WAVE1.md).
