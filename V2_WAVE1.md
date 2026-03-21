# Solus City V2 Wave 1

This document covers the Wave 1 gameplay update added to the Solus City repo.

## Scope

Wave 1 adds:
- Heat / Wanted system
- Vault + PvP wallet-cash stealing
- Hospital recovery options
- Rotating black market backend
- Daily and weekly missions
- Better target preview bands
- Expanded `/me` dashboard payload
- Richer attack and event metadata

Wave 1 does not include:
- perk tree
- revenge expansion
- seasons
- territory
- wars
- championships
- prestige
- token economy redesign

## Backend Changes

### New lib structure

Wave 1 logic lives under `solus-city-server/src/lib`:

```text
src/lib/
|- player/
|- combat/
|- economy/
|- missions/
|- serializers/
|- config/
```

Key modules:
- `src/lib/player/heat.ts`
- `src/lib/player/wanted.ts`
- `src/lib/combat/loot.ts`
- `src/lib/combat/protection.ts`
- `src/lib/economy/blackMarket.ts`
- `src/lib/economy/marketPricing.ts`
- `src/lib/economy/vault.ts`
- `src/lib/missions/assign.ts`
- `src/lib/missions/progress.ts`
- `src/lib/missions/rewards.ts`
- `src/lib/serializers/me.ts`
- `src/lib/serializers/targets.ts`
- `src/lib/serializers/market.ts`
- `src/lib/config/balance.ts`
- `src/lib/config/game.ts`

### Prisma additions

#### Extended `Profile`
- `heat`
- `wantedTier`
- `vaultCash`
- `lastHeatDecayAt`
- `hospitalExitPenaltyUntil`
- `hospitalExitPenaltyType`

#### Extended `AttackLog`
- `cashStolen`
- `heatChange`
- `metadata`

#### Extended `EventLog`
- `metadata`

#### Extended `Item`
- `subCategory`
- `effectType`
- `effectValue`
- `effectDurationSecs`
- `riskType`
- `riskValue`
- `blackMarketOnly`
- `consumable`
- `stealable`

#### Extended `Inventory`
- `expiresAt`
- `sourceType`

#### New models
- `ProtectionEffect`
- `BlackMarketRotation`
- `BlackMarketListing`
- `BlackMarketPurchase`
- `MissionDefinition`
- `PlayerMission`

Migration path:
- `solus-city-server/prisma/migrations/20260321120000_wave1_systems/`

## Gameplay Systems

### Heat / Wanted

- Heat is server-authoritative.
- Heat is clamped between `0` and `100`.
- Heat decays over time.
- Wanted bands:
  - `low`
  - `watched`
  - `wanted`
  - `dangerous`
  - `most_wanted`

### Vault + PvP Stealing

- `Profile.cash` is wallet cash.
- `Profile.vaultCash` is protected cash.
- PvP theft only touches wallet cash.
- Repeat attacks on the same target reduce loot.
- Protection effects can reduce cash stolen.

### Hospital Recovery

New hospital flows:
- cash release
- item release
- penalty release

Penalty types:
- `weakened`
- `shaken`
- `exposed`

### Black Market

- Rotations are generated server-side.
- Listings support:
  - stock
  - level requirements
  - heat requirements
  - risk/sting chance
  - item effect metadata

### Missions

Mission types:
- daily
- weekly

Seeded examples:

Daily:
- `daily_commit_5_crimes`
- `daily_win_2_battles`
- `daily_train_3_times`
- `daily_buy_black_market`
- `daily_deposit_vault`

Weekly:
- `weekly_earn_50000_cash`
- `weekly_hospitalize_5_players`
- `weekly_complete_20_crimes`
- `weekly_claim_7_dailies`

## Seeded Wave 1 Items

Black market-compatible items:
- `Medkit`
- `Adrenal Shot`
- `Fake ID`
- `Decoy Wallet`
- `Burner Phone`
- `Smuggler Bag`
- `Cheap Armor Patch`
- `Contraband Bundle`

These now use the new item metadata fields for:
- consumable behavior
- black market eligibility
- effect type and value
- risk classification
- stealability

## Route Changes

### Expanded routes
- `GET /me`
- `GET /targets`
- `POST /crimes/commit`
- `POST /battle/attack`
- `GET /logs/attacks`
- `GET /events`
- `POST /gym/train`

### New routes
- `GET /hospital/options`
- `POST /hospital/release-cash`
- `POST /hospital/release-item`
- `POST /hospital/accept-penalty-release`
- `GET /vault`
- `POST /vault/deposit`
- `POST /vault/withdraw`
- `GET /black-market/rotation`
- `GET /black-market/listings`
- `POST /black-market/buy`
- `GET /missions`
- `POST /missions/:id/claim`

## Frontend Changes

### Updated pages
- `src/app/home/page.tsx`
- `src/app/targets/page.tsx`
- `src/app/black-market/page.tsx`
- `src/app/attack-logs/page.tsx`

### New page
- `src/app/missions/page.tsx`

### New components
- `src/components/game/HeatMeter.tsx`
- `src/components/game/WantedBadge.tsx`
- `src/components/game/VaultCard.tsx`
- `src/components/game/HospitalOptionsCard.tsx`
- `src/components/game/MissionCard.tsx`
- `src/components/game/LootBandBadge.tsx`

## Jobs

New backend job modules:
- `src/jobs/blackMarketRotation.ts`
- `src/jobs/dailyMissionReset.ts`
- `src/jobs/weeklyMissionReset.ts`
- `src/jobs/heatDecay.ts`

These are lightweight modules intended to be connected to a scheduler later.

## Tests Added

Baseline backend coverage was added for:
- heat clamp and wanted tier mapping
- repeat-target loot reduction
- protection effect loot reduction
- vault balance correctness
- black market oversell guard
- mission double-claim prevention

## Notes

- Wave 1 was implemented as an additive extension, not a rewrite.
- Economy-sensitive calculations remain server authoritative.
- Transactions are used for vault, black market, mission claim, and PvP cash transfer flows.
- Setup and deployment instructions still live in [SETUP.md](./SETUP.md).
