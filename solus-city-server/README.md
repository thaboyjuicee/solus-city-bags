# Solus City Server

Backend API for Solus City, a text-based crime RPG on Solana.

This service handles wallet authentication, player profiles, progression systems, combat, shop purchases, logs, and syndicates.

## What This Service Does

- Verifies Solana wallet signatures and issues JWTs.
- Stores player state in PostgreSQL via Prisma.
- Applies passive regeneration and income.
- Runs game actions (crimes, gym, battles).
- Tracks attack logs, event logs, cooldowns, and rankings.
- Supports player and NPC target battles.

## Stack

- Runtime: Node.js + TypeScript
- HTTP: Fastify
- ORM: Prisma (`@prisma/client`)
- DB: PostgreSQL
- Validation: Zod
- Auth: JWT + wallet signature verification (`tweetnacl`, `bs58`)

## Folder Layout

```text
solus-city-server/
|-- prisma/
|   |-- schema.prisma
|   `-- seed.ts
|-- src/
|   |-- index.ts
|   |-- lib/
|   |   |-- auth.ts
|   |   |-- constants.ts
|   |   |-- game.ts
|   |   |-- jwt.ts
|   |   `-- npcs.ts
|   `-- routes/
|       |-- auth.ts
|       |-- me.ts
|       |-- shop.ts
|       |-- targets.ts
|       |-- battle.ts
|       |-- leaderboard.ts
|       |-- gym.ts
|       |-- crimes.ts
|       |-- events.ts
|       |-- attackLogs.ts
|       `-- syndicates.ts
|-- package.json
`-- tsconfig.json
```

## Prerequisites

- Node.js `>= 22.11.0` recommended
- PostgreSQL 16+

## Environment Variables

Create `.env` in `solus-city-server/`:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/soluscity"
JWT_SECRET="use-a-long-random-secret-at-least-32-chars"
PORT=3000
```

Notes:
- `JWT_SECRET` defaults to `dev-secret-change-me` if missing, but you should always set it.
- The mobile emulator reaches this API using `http://10.0.2.2:3000`.
- For Railway deployment, set `DATABASE_URL` to the PostgreSQL URL provided by Railway and ensure it does not point to localhost.
- For production, keep `JWT_SECRET` long and random in environment variables (not committed in `.env`).

## Setup

```bash
cd solus-city-server
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Health check:

```bash
curl http://localhost:3000/health
```

Expected:

```json
{"status":"ok"}
```

## Scripts

- `npm run dev` - Start Fastify with hot-reload (`ts-node-dev`).
- `npm run build` - Compile TypeScript to `dist/`.
- `npm run start` - Run compiled build.
- `npm run db:migrate` - Create/apply Prisma migrations.
- `npm run db:seed` - Seed items and crimes.
- `npm run db:studio` - Open Prisma Studio.

## Authentication Flow

1. Client requests challenge:
   - `GET /auth/challenge?wallet=<base58-pubkey>`
2. Server stores nonce in `Profile.pendingNonce` and returns message:
   - `Sign in to Solus City: <nonce>`
3. Wallet signs message.
4. Client verifies signature:
   - `POST /auth/verify`
5. Server returns JWT (`expiresIn: 7d`).
6. Protected endpoints require:
   - `Authorization: Bearer <token>`

## API Routes

Public routes:
- `GET /health`
- `GET /auth/challenge`
- `POST /auth/verify`

Protected routes:
- `GET /me`
- `GET /shop/items`
- `POST /shop/buy`
- `GET /targets`
- `POST /battle/attack`
- `GET /leaderboard`
- `GET /events`
- `GET /crimes`
- `POST /crimes/commit`
- `POST /gym/train`
- `GET /logs/attacks`
- `POST /syndicates`
- `GET /syndicates`
- `GET /syndicates/:id`
- `POST /syndicates/:id/join`
- `POST /syndicates/leave`
- `GET /leaderboard/syndicates`

## Request/Response Examples

### `GET /auth/challenge`

Request:

```http
GET /auth/challenge?wallet=YourWalletPubkey
```

Response:

```json
{
  "nonce": "f0e1d2...",
  "message": "Sign in to Solus City: f0e1d2..."
}
```

### `POST /auth/verify`

Request:

```json
{
  "wallet": "...",
  "message": "Sign in to Solus City: ...",
  "signature": "base58_signature"
}
```

Response:

```json
{
  "token": "jwt_token_here"
}
```

### `GET /me`

Response includes bars, combat breakdown, timers, and syndicate summary.

### `POST /battle/attack`

Request:

```json
{
  "targetId": "target-user-id-or-npc-id",
  "targetType": "player"
}
```

`targetType` can be `"player"` or `"npc"`.

Response includes:
- battle result (`win`/`loss`)
- damage dealt/taken
- loot/RP/XP deltas
- updated attacker profile snapshot

Validation/error:
- On success: normal battle payload.
- If attacker is hospitalized, response is:
  - `400 {"code":"IN_HOSPITAL","error":"You are in the hospital","recoverAt":"<ISO datetime>"}`

## Data Model Summary

Main tables:
- `User`: wallet identity
- `Profile`: player stats, bars, timers, XP/level
- `Item` and `Inventory`: units/equipment and ownership
- `Battle`: battle record snapshots
- `AttackCooldown`: anti-spam per attacker/defender pair
- `EventLog`: generic player event feed
- `AttackLog`: detailed battle history and revenge metadata
- `Crime`: configurable crime actions
- `Syndicate` and `SyndicateMember`: team/social layer

Schema file:
- `prisma/schema.prisma`

## Gameplay Rules (Server-Side)

Defined in `src/lib/constants.ts` and route logic.

Highlights:
- Energy regen: 1 per 5 minutes
- Nerve regen: 1 per 3 minutes
- Income cap: 24 hours offline
- Attack cooldown: 10 minutes per target
- Loot on win: 8% (capped)
- Hospitalization: time scales with battle damage
- Syndicate buff: AP multiplier for members

## Seeding

`npm run db:seed` inserts/updates:
- Shop items (units + equipment)
- Crime definitions by level tier

Seed file:
- `prisma/seed.ts`

## Error Handling

- Global Fastify error handler returns:
  - `500 {"error":"Internal server error"}`
- Request validation failures return `400` with concise messages.
- Auth middleware returns `401` for missing/invalid token.
- Battle-specific `400` can return `code: "IN_HOSPITAL"` with a `recoverAt` ISO datetime when action is attempted while hospitalized.

## Development Notes

- Prisma client auto-updates after migration.
- Keep game constants centralized in `src/lib/constants.ts`.
- Add new route modules in `src/routes/` and register them in `src/index.ts`.
- Keep route payload validation in Zod for all mutating endpoints.

## Troubleshooting

### Cannot connect to DB

- Verify PostgreSQL service is running.
- Check `DATABASE_URL` in `.env`.
- Ensure database `soluscity` exists.

### Migration or Prisma issues

```bash
npm install
npm run db:migrate
```

If schema changed without migration in local dev:

```bash
npx prisma migrate dev
```

### Port already in use

- Change `PORT` in `.env`.
- Update mobile API base URL to same port.

### JWT auth failing

- Ensure client sends `Authorization: Bearer <token>`.
- Ensure same `JWT_SECRET` is used by current running process.

## Related Docs

- Root project overview: `../README.md`
- Full Windows setup guide: `../SETUP.md`
