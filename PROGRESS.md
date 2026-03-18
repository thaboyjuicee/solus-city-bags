# Solus City — Web Client Progress

## 1. Project Overview

**Solus City** is an on-chain crime RPG built on Solana. Players commit crimes, attack other
players, train stats at the gym, buy gear, join syndicates, and compete for RP (Respect Points)
on a global leaderboard. The game economy runs on the **$SOLUS token** via the **Bags SDK**.

This repo contains two packages:

| Folder | Purpose |
|---|---|
| `solus-city-server/` | Fastify + Prisma backend deployed on Railway |
| `solus-city-web/` | Next.js 14 web client (this work) |

The web client is a ground-up port of the original React Native app's 11 screens into a Next.js 14
App Router application, targeting the **Bags Hackathon** submission deadline.
The React Native app (`soluscitymobile/`) has been removed from the repo — the web client is the active client.

---

## 2. Tech Stack

### Web client (`solus-city-web/`)
| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 14.2.35 (App Router) | Pinned to latest patched 14.x — avoids 14.2.29 security issue |
| Language | TypeScript 5 | Strict mode on |
| Styling | Tailwind CSS 3.4 | Custom colour palette mirroring the original mobile app |
| HTTP client | Axios 1.7.9 | JWT interceptor + 401 → `/login` redirect |
| Wallet | `@solana/wallet-adapter-react` + react-ui | Phantom + Solflare only (no meta-package) |
| Solana network | **mainnet-beta** | `NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta` |
| Base58 encoding | `bs58 ^5.0.0` | Used for wallet signature encoding in login flow |

### Backend (`solus-city-server/`)
| Layer | Choice |
|---|---|
| Runtime | Node.js ≥ 22 / Fastify |
| ORM | Prisma + PostgreSQL |
| Auth | Ed25519 wallet signature → JWT (tweetnacl + bs58) |
| Deployment | Railway (`https://solus-city-app-production.up.railway.app`) |

---

## 3. Completed Screens

### ✅ Login (`/login`)
**File:** `src/app/login/page.tsx`

Full wallet-auth flow:
1. `WalletMultiButton` → wallet connects
2. `GET /auth/challenge?wallet=<base58>` → `{ nonce, message }`
3. `signMessage(utf8(message))` → wallet popup → `Uint8Array` signature
4. `bs58.encode(sigBytes)` → `POST /auth/verify { wallet, message, signature }`
5. Receive `{ token }` → `localStorage.setItem("solus_city_jwt", token)` → redirect `/home`

**States:** idle (wallet button) / authenticating (spinner) / error (message + retry + disconnect).

**Auth guard:** `useEffect` watches `connected` — auto-triggers flow on wallet connect, resets on
disconnect. `authInProgress` ref prevents React strict-mode double-fire.

---

### ✅ Home (`/home`)
**File:** `src/app/home/page.tsx`

Parallel `GET /me` + `GET /events` on mount. Displays:
- `StatusBars` strip (HP/EN/NV/HA with CSS-animated fills)
- Hero card with player name, level, RP
- Shield banner (conditional on `shieldUntil > now`)
- Economy grid: Cash · Income/hr · AP · DP
- Combat grid: STR · SPD · DEF · DEX
- Syndicate badge (if member)
- Event feed (30 events, colour-coded by type, `timeAgo` formatting)
- Refresh button (replaces RN pull-to-refresh) + logout

**Decision:** XP next threshold = `100 * level` — taken from mobile `StatusBars.tsx` line 63.

---

### ✅ Crimes (`/crimes`)
**File:** `src/app/crimes/page.tsx`

Parallel `GET /me` + `GET /crimes`. Crimes are pre-filtered by level server-side.

Per-card inline results (green success / yellow failure / red error) instead of RN `Alert`.
Commit response `profile: { nerve, cash, xp, level }` patches local state directly — StatusBars
nerve bar animates down without a re-fetch.

**Button states:** ready / in-flight (spinner) / other-crime-in-flight (dimmed) / not enough
nerve (red, disabled) / locked by level (card at opacity-40, disabled).

---

### ✅ Targets (`/targets`)
**File:** `src/app/targets/page.tsx`

Parallel `GET /me` + `GET /targets`. Mixed player + NPC list (10 targets, RP-band matched
server-side).

**Per-target attack state** (`Record<string, { attacking, error }>`) so multiple target buttons
are independent.

`IN_HOSPITAL` error from server (`code === "IN_HOSPITAL"`) is handled with the shared
`formatHospitalMessage(recoverAt)` utility. Hospital banner shown for the attacker too.

**Result handoff:** battle result stored in `sessionStorage` under `"solus_city_battle_result"`
before navigating to `/battle-result`. Opponent name is enriched with `target.displayName`
before storing — server falls back to `"Player"` for unnamed accounts, but the targets list
already showed the wallet-abbreviated name.

---

### ✅ Battle Result (`/battle-result`)
**File:** `src/app/battle-result/page.tsx`

Reads result from `sessionStorage` on mount. Redirects to `/targets` if missing or unparseable.

Displays: VICTORY / DEFEAT / EVADED headline (colour-coded) · loot · RP change · XP · hit type
(NORMAL / CRITICAL / EVADED) · evasion/crit chances · damage dealt/taken · hospital badges ·
battle odds (AP vs DP, win chance, roll) · post-battle stats.

**Attack Again** (NPC only): re-calls `POST /battle/attack`, overwrites `sessionStorage`, calls
`setResult()` in-place and scrolls to top — no navigation needed.

**Shared utilities:** `src/lib/battle.ts` exports `BattleResult` type, `BATTLE_RESULT_KEY`,
and `formatHospitalMessage` used by both Targets and Battle Result.

---

### ✅ Gym (`/gym`)
**File:** `src/app/gym/page.tsx`

`GET /me` only — no separate gym endpoint. Four trainable stats (STR/SPD/DEF/DEX).

Animated stat bars: fill = `Math.min(value / 5, 100)%` (ported from `GymScreen.tsx`).

Train response `profile: { energy, happiness, strength, speed, defense, dexterity, xp, level }`
patches all 8 fields into local state — StatusBars energy/happiness animate immediately.

**Low energy** is shown as a `(low energy)` hint on the button but NOT disabled client-side —
server enforces it and the error surfaces as an inline red result. Avoids stale-energy false
positives.

---

### ✅ Shop (`/shop`)
**File:** `src/app/shop/page.tsx`

Parallel `GET /me` + `GET /shop/items`. Items come back as `{ units, equipment, all }` —
page uses `all` and filters by the active tab.

**Post-buy local patch** (no re-fetch): `newCash` → `profile.cash`, `newCombat.ap/dp` →
`profile.ap/dp`, `qty` → increments `items[id].owned`.

**Power preview** (`AP X → Y · DP X → Y`) rendered from server-computed `powerPreview` field
(only shown when `atk > 0 || def > 0`).

**Buy button states:** LOCKED (level req) / OWNED (unique already held) / LOW CASH (client
estimate from `qty × price`) / in-flight (spinner) / BUY.

Qty input: `<input type="number" min=1 max=100>`. Invalid qty caught client-side and shown
as inline error before the network call. `MAX_BUY_QTY = 100` matches server constant.

---

## 4. Completed Screens (continued)

### ✅ Leaderboard (`/leaderboard`)
**File:** `src/app/leaderboard/page.tsx`

`Promise.all([GET /me, GET /leaderboard])`. Table: rank (trophy SVG top 3) · Player (name + AP/DP sub-line) · LV · RP.
`isMe` row highlighted `bg-[#1a0a2e]`. Out-of-top-100 self-row after dashed `· · ·` separator in purple-bordered card.
Refresh button with spin animation.

---

### ✅ Profile (`/profile`)
**File:** `src/app/profile/page.tsx`

`GET /me` only. Sections: Identity (name edit inline via `PATCH /me`, level, XP, wallet, RP) · Status (animated HP/EN/NV/HA bars) · Economy (cash, income/hr) · Combat (AP, DP, item bonuses, raw stats) · Syndicate (name, role, buff) · Timers (hospital, shield, next energy/nerve).

Name edit: inline input with SAVE/CANCEL buttons, 3–20 char validation client-side before `PATCH /me`. Error shown inline.

---

### ✅ Attack Logs (`/attack-logs`)
**File:** `src/app/attack-logs/page.tsx`

`GET /logs/attacks` (up to 50 entries). Three-tab filter: All / Incoming / Outgoing. Per-entry: WIN/LOSS/EVADED badge + INCOMING/OUTGOING direction badge + timestamp · description · damage dealt/taken/loot/RP. Revenge button when `revengeAvailable: true` — calls `POST /battle/attack` then stores result in `sessionStorage` and navigates to `/battle-result`.

---

### ✅ Syndicates (`/syndicates`)
**File:** `src/app/syndicates/page.tsx`

`Promise.all([GET /me, GET /syndicates, GET /leaderboard/syndicates])`.

Three sections:
1. **My Syndicate** — if member: shows name, member count, buff, role, LEAVE button (`POST /syndicates/leave`). If not member: create form (name + description) calling `POST /syndicates`.
2. **Top Syndicates** — top 5 from `/leaderboard/syndicates` leaderboard.
3. **Discover** — full syndicate list with JOIN button (`POST /syndicates/:id/join`) when not in a syndicate.

Per-action inline errors. `busy` flag prevents concurrent mutations.

---

## 5. Pending Work — Bags SDK Integration

After all screens are wired up, the following Bags-specific features need to be added:

### $SOLUS Token
- Define `$SOLUS` mint address and integrate into the wallet context
- Display token balance in the StatusBars / Home screen
- Wire up any token-gated content (premium crimes, elite NPC access, etc.)

### Fee Sharing
- Integrate Bags fee-sharing SDK calls where the game takes a cut of transactions
- Likely applies to: shop purchases, syndicate creation, battle entry fees (if added)
- Requires Bags SDK documentation review for the exact integration surface

### Token-Gating
- Certain content may be gated behind holding a minimum $SOLUS balance
- Gate checks should be client-side hints only; server must enforce authoritatively
- Consider a `useTokenBalance` hook that reads the SPL balance and exposes it to pages

### General Bags SDK Setup
- Install `@bags-protocol/sdk` (or equivalent package name — confirm from hackathon docs)
- Wrap app in Bags provider alongside `SolanaWalletProvider`
- Ensure `NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta` is set correctly for production

---

## 6. Key File Locations & Architecture

```
solus-city-web/
├── next.config.js                  # transpilePackages for wallet adapter ESM
├── tailwind.config.ts              # custom colour tokens matching RN palette
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout — SolanaWalletProvider + Navigation (ssr:false)
│   │   ├── globals.css             # Tailwind base + wallet modal overrides
│   │   ├── login/page.tsx          ✅ Full auth flow
│   │   ├── home/page.tsx           ✅ /me + /events
│   │   ├── crimes/page.tsx         ✅ /me + /crimes + /crimes/commit
│   │   ├── targets/page.tsx        ✅ /me + /targets + /battle/attack
│   │   ├── battle-result/page.tsx  ✅ sessionStorage result reader
│   │   ├── gym/page.tsx            ✅ /me + /gym/train
│   │   ├── shop/page.tsx           ✅ /me + /shop/items + /shop/buy
│   │   ├── leaderboard/page.tsx    ✅ GET /leaderboard + /me
│   │   ├── profile/page.tsx        ✅ GET /me + PATCH /me (name edit)
│   │   ├── attack-logs/page.tsx    ✅ GET /logs/attacks + revenge
│   │   └── syndicates/page.tsx     ✅ GET/POST /syndicates + leave
│   ├── components/
│   │   ├── providers/WalletProvider.tsx   # Phantom + Solflare, autoConnect
│   │   ├── layout/Navigation.tsx          # Top nav + mobile bottom tabs (ssr:false)
│   │   ├── ui/StatusBars.tsx              # HP/EN/NV/HA + level/xp/cash/AP/DP strip
│   │   └── ui/LoadingSpinner.tsx
│   └── lib/
│       ├── api/client.ts           # Axios instance: JWT header + 401 redirect
│       ├── config.ts               # API_BASE_URL, SOLANA_NETWORK, TOKEN_KEY
│       └── battle.ts               # BattleResult type, BATTLE_RESULT_KEY, formatHospitalMessage
```

### Architecture decisions

**JWT storage:** `localStorage["solus_city_jwt"]` — matches the RN app's key (was
`seeker_wars_jwt`, renamed during this session). The Axios interceptor attaches it to every
request and clears + redirects on 401.

**Server/client boundary:** All data-fetching pages are `"use client"` because auth is
localStorage-based and unavailable during SSR. `Navigation` is `dynamic(..., { ssr: false })`
to prevent wallet adapter hydration mismatch (the `<i>` icon issue).

**State patching over re-fetching:** After mutations (crimes, gym, shop, battle) the server
returns a partial profile. Local state is patched from the response rather than triggering a
full `GET /me` re-fetch. This keeps the StatusBars reactive with zero extra round-trips.

**sessionStorage for battle result:** The battle response (~25 fields) is too large to safely
encode in URL query params. It's written to `sessionStorage["solus_city_battle_result"]` in
the targets page and read back on `/battle-result`. Missing or unparseable data redirects to
`/targets`.

**Shared stat colour palette** (matches mobile exactly):
```
HP  #e53935    EN  #43a047    NV  #1e88e5    HA  #fdd835
STR #ff9800    SPD #ab47bc    DEF #26c6da    DEX #fdd835
AP  #ef5350    DP  #1e88e5    RP  #14F195    Cash #66bb6a
Accent #9945FF (Solana purple)
```

---

## 7. Environment Variables

Copy `solus-city-web/.env.local.example` → `solus-city-web/.env.local`:

```env
# Required
NEXT_PUBLIC_API_BASE_URL=https://solus-city-app-production.up.railway.app
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta

# Future — Bags SDK
# NEXT_PUBLIC_BAGS_APP_ID=<your-bags-app-id>
# NEXT_PUBLIC_SOLUS_MINT=<$SOLUS-token-mint-address>
```

---

## 8. Known Issues & Gotchas

### Wallet adapter hydration mismatch (fixed)
`WalletMultiButton` renders an `<i>` icon tag on the client that isn't in the server HTML.
Fixed by importing `Navigation` via `dynamic(..., { ssr: false })` in `layout.tsx`.

### `@solana/wallet-adapter-wallets` pulls in `@stellar/stellar-sdk`
The "all wallets" meta-package transitively depends on stellar SDK which requires `yarn`.
Fixed by using individual adapter packages directly:
- `@solana/wallet-adapter-phantom`
- `@solana/wallet-adapter-solflare`

### Opponent name shows as "Player (PLAYER)" (fixed)
`POST /battle/attack` resolves opponent name as `defenderProfile.name || "Player"`.
For players without a username this loses the wallet-abbreviated name shown in the targets
list. Fixed in `targets/page.tsx` by enriching `opponent.name` with `target.displayName`
before writing to `sessionStorage`.

### `next.config.ts` → `next.config.js` (fixed)
TypeScript config file caused issues during install. Converted to plain JS with JSDoc type
annotation (`/** @type {import('next').NextConfig} */`).

### Mobile `StatusBars` uses `nextHappinessAt` — web does not
The RN `StatusBars` reads `profile.nextHappinessAt` to display a regen timer. The web
`StatusBars` component omits this for now. Can be added when the Profile page is built and
regen timers are needed.

### `GET /targets` server-side filtering
Targets are RP-band filtered on the server (already excluding shielded/hospitalized
players). However, the mobile still checks `profile.level < crime.levelReq` client-side for
crime cards — similar defensive checks exist in several pages. These are belt-and-suspenders
guards, not primary enforcement.

### Energy check for attack (1 energy required)
`POST /battle/attack` deducts 1 energy. The Targets page does not client-side-gate on
energy (unlike the nerve check on Crimes). If the player has 0 energy the server returns a
400 `"Not enough energy"` which surfaces as a per-target inline error. This is intentional
— avoids stale energy false positives.

### Power preview staleness after shop purchase
`/shop/items` computes `powerPreview` (AP/DP delta) server-side at fetch time. After buying,
the preview is not refreshed — it reflects the pre-purchase state. Acceptable for now; a full
re-fetch of shop items after each purchase would fix it at the cost of an extra round-trip.
