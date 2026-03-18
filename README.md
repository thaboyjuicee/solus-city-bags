# Solus City

Solus City is an Android-first, text-driven crime RPG on Solana.
Players authenticate with a wallet signature, then progress through crimes, gym training, equipment/unit purchases, PvP/NPC battles, leaderboards, and syndicates.

This README is a detailed technical guide to how the project works across all major folders.

## Table Of Contents
1. Project Overview
2. Repository Layout
3. End-To-End Runtime Flow
4. Backend Architecture (`solus-city-server`)
5. Database Schema And Game State
6. API Contract By Route
7. Mobile Architecture (`soluscitymobile`)
8. Screen-To-Endpoint Mapping
9. Game Systems And Formulas
10. Configuration
11. Local Development
12. Troubleshooting
13. Extension Guide

## Project Overview

The repository is a monorepo-style workspace with:
- A Fastify + Prisma + PostgreSQL backend API.
- A React Native mobile app (Android-focused).
- Setup and launcher docs/scripts at root.

Core gameplay loop:
1. Connect Solana wallet and sign a nonce challenge.
2. Receive JWT and load profile state.
3. Regenerate bars and passive income on activity.
4. Spend energy/nerve to train and commit crimes.
5. Buy units/equipment to improve AP/DP.
6. Fight NPCs or players for loot/RP/XP.
7. Track progression via logs, leaderboards, and syndicates.

## Repository Layout

```text
solus_city_react/
|- README.md
|- SETUP.md
|- GAME_GUIDE.md
|- HACKATHON_SUBMISSION.md
|- start.bat
|- release/
|  `- solus-city-mvp-arm64-release.apk
|- solus-city-server/
|  |- .env.example
|  |- package.json
|  |- prisma/
|  |  |- schema.prisma
|  |  |- seed.ts
|  |  `- migrations/
|  `- src/
|     |- index.ts
|     |- lib/
|     |  |- auth.ts
|     |  |- jwt.ts
|     |  |- constants.ts
|     |  |- game.ts
|     |  `- npcs.ts
|     `- routes/
|        |- auth.ts
|        |- me.ts
|        |- events.ts
|        |- crimes.ts
|        |- gym.ts
|        |- shop.ts
|        |- targets.ts
|        |- battle.ts
|        |- attackLogs.ts
|        |- leaderboard.ts
|        `- syndicates.ts
`- soluscitymobile/
    |- App.tsx
    |- package.json
    |- jest.config.js
    |- jest.setup.js
    |- android/
    |- ios/
    `- src/
        |- config.ts
        |- api/client.ts
        |- assets/images.ts
        |- navigation/AppNavigator.tsx
        |- components/
        `- screens/
```

## End-To-End Runtime Flow

### 1) Authentication
- Mobile calls `GET /auth/challenge?wallet=<pubkey>`.
- Server upserts `User` + `Profile`, writes `pendingNonce`, returns `message`.
- Mobile wallet signs message via Solana Mobile Wallet Adapter.
- Mobile sends `POST /auth/verify` with wallet/message/signature.
- Server verifies ed25519 signature (`tweetnacl` + `bs58`), clears nonce, returns JWT.
- Mobile stores JWT (`AsyncStorage`, key: `seeker_wars_jwt`).

### 2) Session bootstrap
- App opens `Main` route if token exists.
- `api` axios client attaches bearer token per request.
- Any `401` clears token and resets navigation to `Login`.

### 3) Stateful game actions
- Server-side routes apply passive updates (`income`, `energy`, `nerve`) before action logic.
- Hospital recovery is applied when timers have expired.
- Mutations log to `EventLog` and battle actions also log to `AttackLog`.

## Backend Architecture (`solus-city-server`)

### Entry point
- `src/index.ts`
Registers all route modules with shared Prisma client and starts Fastify on `PORT` (default `3000`).

### Shared libraries
- `src/lib/auth.ts`
Fastify `requireAuth` preHandler, validates bearer token and sets `request.user`.

- `src/lib/jwt.ts`
JWT helpers: `signToken` and `verifyToken`.

- `src/lib/constants.ts`
Centralized tuning constants for regen, battle, loot, leveling, gym, crimes, and syndicates.

- `src/lib/game.ts`
Core deterministic game logic:
- offline income application
- energy/nerve regen ticks
- hospital checks and recovery
- level-up processing
- AP/DP and combat breakdown computation
- next bar tick timestamps

- `src/lib/npcs.ts`
NPC template pool and scaling function (`buildNpcForPlayer`) based on player level and RP.

### Route modules
- `src/routes/auth.ts`
Wallet challenge + signature verification.

- `src/routes/me.ts`
Returns canonical profile snapshot, bars, timers, AP/DP, syndicate summary.

- `src/routes/events.ts`
Recent event feed.

- `src/routes/crimes.ts`
Crime listing and crime commit action (nerve cost, success roll, cash/XP reward).

- `src/routes/gym.ts`
Stat training action (energy cost, happiness bonus, XP gain).

- `src/routes/shop.ts`
Item listing with ownership and power preview; purchase endpoint with inventory upsert.

- `src/routes/targets.ts`
Target generation for RP band (players + NPC fill).

- `src/routes/battle.ts`
Combat resolution, cooldown checks, loot/RP/XP calculation, hospitalization, logs/events.

- `src/routes/attackLogs.ts`
Attack history and revenge eligibility checks.

- `src/routes/leaderboard.ts`
Top RP players (+ self if outside top 100).

- `src/routes/syndicates.ts`
Syndicate create/list/detail/join/leave and syndicate leaderboard.

## Database Schema And Game State

Defined in `solus-city-server/prisma/schema.prisma`.

### Primary entities
- `User`: wallet identity.
- `Profile`: all mutable player stats, bars, timers, nonce, shield/hospital state.
- `Item`: purchasable units/equipment.
- `Inventory`: user-item quantities.
- `Crime`: configurable crime catalog.
- `Battle`: historical battle snapshots.
- `AttackCooldown`: anti-spam attacker->defender cooldown.
- `EventLog`: feed-style events.
- `AttackLog`: battle log including revenge metadata.
- `Syndicate` and `SyndicateMember`: social groups and AP buff membership.

### Seeded content
From `solus-city-server/prisma/seed.ts`:
- Item catalog with both unit and equipment categories.
- Crime catalog with increasing risk/reward by level.

## API Contract By Route

Base URL:
- Local server: `http://localhost:3000`
- Android emulator from app: `http://10.0.2.2:3000`
- Production (Railway): `https://solus-city-app-production.up.railway.app`

Public routes:
- `GET /health`
- `GET /auth/challenge?wallet=<pubkey>`
- `POST /auth/verify`

Protected routes (JWT required):
- `GET /me`
- `GET /events`
- `GET /crimes`
- `POST /crimes/commit`
- `POST /gym/train`
- `GET /shop/items`
- `POST /shop/buy`
- `GET /targets`
- `POST /battle/attack`
  - Returns `400 {"code":"IN_HOSPITAL","error":"You are in the hospital","recoverAt":"<ISO datetime>"}` when hospital timer is active.
- `GET /logs/attacks`
- `GET /leaderboard`
- `POST /syndicates`
- `GET /syndicates`
- `GET /syndicates/:id`
- `POST /syndicates/:id/join`
- `POST /syndicates/leave`
- `GET /leaderboard/syndicates`

## Mobile Architecture (`soluscitymobile`)

### App shell
- `App.tsx`: top-level status bar + navigator.
- `src/navigation/AppNavigator.tsx`:
Stack + tab navigation:
`Login` -> `Main` tabs (`Home`, `Crimes`, `Targets`, `Gym`, `More`) -> nested `More` stack (`Shop`, `Leaderboard`, `Profile`, `AttackLogs`, `Syndicates`) + `BattleResult` screen.

### API layer
- `src/api/client.ts`
Axios instance with:
- base URL from `src/config.ts`
- automatic JWT injection
- automatic logout redirect on `401`

### Visual/status components
- `src/components/StatusBars.tsx`: persistent bars and quick stats.
- `src/components/LoadingSpinner.tsx`: loading UI.
- `src/components/RainOverlay.tsx` and `src/components/NeonGlow.tsx`: scene effects.

### Assets
- `src/assets/images.ts` maps screen image constants used by themed screens.

## Screen-To-Endpoint Mapping

- `src/screens/LoginScreen.tsx`
Uses Mobile Wallet Adapter authorize + sign flow and calls:
- `GET /auth/challenge`
- `POST /auth/verify`

- `src/screens/HomeScreen.tsx`
Calls:
- `GET /me`
- `GET /events`

- `src/screens/CrimesScreen.tsx`
Calls:
- `GET /me`
- `GET /crimes`
- `POST /crimes/commit`

- `src/screens/GymScreen.tsx`
Calls:
- `GET /me`
- `POST /gym/train`

- `src/screens/TargetsScreen.tsx`
Calls:
- `GET /me`
- `GET /targets`
- `POST /battle/attack`

- `src/screens/BattleResultScreen.tsx`
Displays battle payload and allows `Attack Again` for NPCs via `POST /battle/attack`.

- `src/screens/AttackLogsScreen.tsx`
Calls:
- `GET /logs/attacks`
- revenge via `POST /battle/attack`

- `src/screens/ShopScreen.tsx`
Calls:
- `GET /me`
- `GET /shop/items`
- `POST /shop/buy`

- `src/screens/LeaderboardScreen.tsx`
Calls:
- `GET /me`
- `GET /leaderboard`

- `src/screens/ProfileScreen.tsx`
Calls:
- `GET /me`

- `src/screens/SyndicatesScreen.tsx`
Calls:
- `GET /me`
- `GET /syndicates`
- `GET /leaderboard/syndicates`
- `POST /syndicates`
- `POST /syndicates/:id/join`
- `POST /syndicates/leave`

## Game Systems And Formulas

Values are centralized in `solus-city-server/src/lib/constants.ts`.

Highlights:
- Energy: +1 per 5 minutes.
- Nerve: +1 per 3 minutes.
- Income: passive, capped to 24h backfill.
- Base AP/DP: `10` each before stats/items.
- AP/DP calculation:
- `AP = BASE_ATK + strength + item atk bonuses` (with syndicate AP multiplier when in syndicate).
- `DP = BASE_DEF + defense + item def bonuses`.
- Battle win chance: `attackerAP / (attackerAP + defenderDP)`.
- Loot on win: `min(defenderCash * 0.08, 5000)`.
- Cooldown: 10 minutes for same attacker->defender pair.
- Hospital lockout: if your `hospitalUntil` is in the future, attacks are blocked and `POST /battle/attack` returns `IN_HOSPITAL` plus `recoverAt` for client messaging.
- Gym: costs energy, grants stat gain + XP, happiness can increase gain.
- Crimes: costs nerve, success roll against crime success rate.
- Level-up: XP threshold scales with level (`XP_PER_LEVEL * level`) and increases max health.

## Configuration

### Server env (`solus-city-server/.env`)

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/soluscity"
JWT_SECRET="use-a-long-random-secret-at-least-32-chars"
PORT=3000
```

### Mobile API base URL
- `soluscitymobile/src/config.ts`
- Emulator default: `http://10.0.2.2:3000`
- Physical device: use `http://<your-lan-ip>:3000`
- Production deployment: set `API_BASE_URL` and `APP_IDENTITY_URI` to your Railway service URL

## Local Development

### Quick start (manual)

Backend:
```bash
cd solus-city-server
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Mobile:
```bash
cd soluscitymobile
npm install
npx react-native run-android
```

### One-click launcher
- `start.bat` runs install, migrations, seed, backend startup, adb reverse, and Android launch.

### Useful scripts

Server (`solus-city-server/package.json`):
- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run db:migrate`
- `npm run db:seed`
- `npm run db:studio`

Mobile (`soluscitymobile/package.json`):
- `npm run android`
- `npm run start`
- `npm run lint`
- `npm run test`

## Troubleshooting

### Port already in use (`EADDRINUSE: 3000`)
Find and kill blocker:
```bash
netstat -ano | grep ":3000"
taskkill //PID <PID> //F
```

### API unreachable from emulator
- Ensure server is running on `3000`.
- Ensure mobile config uses `10.0.2.2` for emulator.

### DB connection errors
- Verify PostgreSQL is running.
- Verify DB exists and `DATABASE_URL` is correct.

### Android build issues
- Confirm Android SDK/JDK setup from `SETUP.md`.
- Rebuild after dependency updates.

## Extension Guide

### Add a new backend feature
1. Add/extend model in `prisma/schema.prisma`.
2. Run migration.
3. Add constants/helpers in `src/lib/` if needed.
4. Implement route in `src/routes/` with Zod validation.
5. Register route in `src/index.ts`.

### Add a new mobile screen
1. Create screen in `soluscitymobile/src/screens/`.
2. Add route in `AppNavigator.tsx`.
3. Wire API calls through `src/api/client.ts`.
4. Refresh relevant profile/event state after mutations.

---

For first-time Windows onboarding, follow `SETUP.md` step-by-step.
