# Solus City

An on-chain crime RPG built on Solana. Players authenticate with a wallet signature then progress through crimes, gym training, equipment purchases, PvP/NPC battles, leaderboards, and syndicates. The game economy runs on the **$SOLUS token** via the **Bags protocol**.

## Repository Structure

```
solus-city-bags/
├── solus-city-server/   # Fastify + Prisma backend (deployed on Railway)
└── solus-city-web/      # Next.js 14 web client (deployed on Railway)
```

## Tech Stack

### Backend (`solus-city-server/`)
| Layer | Choice |
|---|---|
| Runtime | Node.js ≥ 22 + Fastify |
| ORM | Prisma + PostgreSQL |
| Auth | Ed25519 wallet signature → JWT (tweetnacl + bs58) |
| Deployment | Railway |

### Web client (`solus-city-web/`)
| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS 3.4 |
| HTTP client | Axios — JWT interceptor + 401 redirect |
| Wallet | `@solana/wallet-adapter-react` — Phantom + Solflare |
| Solana network | mainnet-beta |
| Deployment | Railway |

## Running Locally

### Prerequisites
- Node.js ≥ 22
- PostgreSQL running locally

### 1. Backend

```bash
cd solus-city-server
npm install

# Apply migrations and seed item/crime catalog
npm run db:migrate
npm run db:seed

# Start dev server (http://localhost:3000)
npm run dev
```

Available scripts:
| Script | Description |
|---|---|
| `npm run dev` | Start with ts-node-dev (hot reload) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run compiled build |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:seed` | Seed items and crimes |
| `npm run db:studio` | Open Prisma Studio |

### 2. Web Client

```bash
cd solus-city-web
npm install

# Start dev server (http://localhost:3001 or next available port)
npm run dev
```

Available scripts:
| Script | Description |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | Run ESLint |

## Environment Variables

### Backend — `solus-city-server/.env`

Copy `.env.example` → `.env` and fill in:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/soluscity"
JWT_SECRET="a-long-random-secret-at-least-32-chars"
PORT=3000
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret used to sign/verify JWTs |
| `PORT` | Port for the Fastify server (default `3000`) |

### Web client — `solus-city-web/.env.local`

Copy `.env.local.example` → `.env.local` and fill in:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API base URL |
| `NEXT_PUBLIC_SOLANA_NETWORK` | Solana cluster — `mainnet-beta`, `devnet`, or `testnet` |

## API Reference

**Base URL (production):** `https://solus-city-app-production.up.railway.app`

### Public
| Method | Route | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/auth/challenge?wallet=<pubkey>` | Get nonce challenge message |
| POST | `/auth/verify` | Verify signature and receive JWT |

### Protected (Bearer JWT required)
| Method | Route | Description |
|---|---|---|
| GET | `/me` | Full profile snapshot |
| PATCH | `/me` | Update display name |
| GET | `/events` | Recent event feed |
| GET | `/crimes` | Available crimes |
| POST | `/crimes/commit` | Commit a crime |
| POST | `/gym/train` | Train a stat |
| GET | `/shop/items` | Shop inventory with ownership |
| POST | `/shop/buy` | Purchase item(s) |
| GET | `/targets` | RP-matched target list |
| POST | `/battle/attack` | Attack a target |
| GET | `/logs/attacks` | Attack log history |
| GET | `/leaderboard` | Top 100 players by RP |
| GET | `/syndicates` | All syndicates |
| GET | `/syndicates/:id` | Syndicate detail + members |
| POST | `/syndicates` | Create a syndicate |
| POST | `/syndicates/:id/join` | Join a syndicate |
| POST | `/syndicates/leave` | Leave current syndicate |
| GET | `/leaderboard/syndicates` | Top syndicates by total RP |

## Deployment

### Backend — Railway

1. Connect the `solus-city-server/` directory (or the repo root with root directory set).
2. Set the environment variables (`DATABASE_URL`, `JWT_SECRET`, `PORT`).
3. Railway runs `npm run build && npm run start` automatically on push.
4. The PostgreSQL plugin in Railway provides `DATABASE_URL`.

### Web client — Railway

1. Create a second Railway service for `solus-city-web`.
2. Set the **Root Directory** for that service to `solus-city-web`.
3. Set environment variables:
   - `NEXT_PUBLIC_API_BASE_URL` -> `https://${{Backend.RAILWAY_PUBLIC_DOMAIN}}` or your backend service name
   - `NEXT_PUBLIC_SOLANA_NETWORK` -> `mainnet-beta`
4. Railway will detect Next.js automatically and run `npm run build` / `npm run start`.

## Game Systems

| System | Summary |
|---|---|
| Energy regen | +1 per 5 minutes |
| Nerve regen | +1 per 3 minutes |
| Passive income | Applied on next login, capped at 24h backfill |
| AP formula | `BASE_ATK + strength + item bonuses` (× syndicate multiplier if applicable) |
| DP formula | `BASE_DEF + defense + item bonuses` |
| Battle win chance | `attackerAP / (attackerAP + defenderDP)` |
| Loot cap | `min(defenderCash × 8%, $5,000)` |
| Attack cooldown | 10 minutes per attacker→defender pair |
| Level threshold | `level × 100 XP` |
