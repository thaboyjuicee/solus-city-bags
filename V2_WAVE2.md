# Solus City V2 Wave 2

This document summarizes the Wave 2 gameplay update layered on top of Wave 1.

## Goals

Wave 2 extends the existing architecture with:
- perk / skill tree foundations
- deeper itemization and visible inventory management
- expanded revenge flow after meaningful PvP losses
- seasonal scoring and leaderboard v1
- richer profile progression visibility
- conservative anti-farm / anti-whale balancing

Wave 2 remains additive. It does not redesign the app or remove Wave 1 systems.

## Backend Overview

Wave 2 adds reusable server-side logic under `solus-city-server/src/lib`:
- `player/perks.ts`: perk point calculation, unlock validation, player perk effect aggregation
- `combat/revenge.ts`: revenge mark creation, lookup, resolution, and bonus helpers
- `economy/items.ts`: grouped inventory responses, equip, unequip, and item use flows
- `seasons/scoring.ts`: current season lookup, participation creation, and score awards
- `matchmaking.ts`: hidden mismatch detection for anti-whale reward damping
- `serializers/seasons.ts`: stable current/history season payload serialization

Wave 2 also extends existing services:
- `game.ts`: combat stat calculation now reads perk context
- `blackMarket.ts`: perk-based black market discount support
- `missions/rewards.ts`: mission claims can award season score
- serializers for `/me`, targets, and market responses now expose Wave 2 data

## Prisma Schema Additions

### Profile additions
- `seasonScore Int @default(0)`
- `availablePerkPoints Int @default(0)`
- `prestigeLevel Int @default(0)`

### Item additions
- `slot String?`
- `tradable Boolean @default(false)`
- `maxStack Int?`

### Inventory additions
- `equipped Boolean @default(false)`
- `durability Int?`

### New models
- `PerkDefinition`
- `PlayerPerk`
- `RevengeMark`
- `Season`
- `SeasonParticipation`
- `SeasonLeaderboardSnapshot`

A Wave 2 migration file was added at:
- `solus-city-server/prisma/migrations/20260321183000_wave2_systems/migration.sql`

## Seed Data

Wave 2 seed updates include:
- perk definitions for:
  - `enforcer`
  - `hustler`
  - `grinder`
- a simple active dev season if none exists
- richer item metadata:
  - `rarity`
  - `slot`
  - `tradable`
  - `maxStack`

## Perk System

New endpoints:
- `GET /perks`
- `POST /perks/unlock`

Behavior:
- perk points are derived conservatively from level cadence
- unlocks validate active state, prerequisite chain, duplicate unlocks, and point availability
- perk effects remain authoritative on the server

Current effect hooks include:
- battle AP bonus
- PvP loot bonus
- revenge bonus
- crime payout bonus
- heat reduction bonus
- black market discount bonus

## Inventory / Itemization

New endpoints:
- `GET /inventory`
- `POST /inventory/equip`
- `POST /inventory/unequip`
- `POST /inventory/use`

Inventory responses are grouped into:
- `equipped`
- `consumables`
- `utilities`
- `contraband`
- `protection`
- `general`

Wave 2 item actions support:
- equip by slot
- unequip
- item use for conservative supported effects
- protection-effect creation for eligible consumables/utilities

## Revenge System

Wave 2 revenge rules are intentionally strict:
- revenge marks are created only after meaningful losses
- hospitalization or a large enough cash loss can qualify
- revenge windows expire automatically
- revenge can resolve when the victim beats the qualifying attacker within the window
- revenge bonuses are applied server-side during battle reward calculation

Attack logs now expose revenge context including:
- availability
- expiry
- target id
- bonus preview

## Seasons v1

New endpoints:
- `GET /seasons/current`
- `GET /seasons/history`

Season scoring currently awards points for:
- battle wins
- hospitalizing opponents
- successful crimes
- mission claims

Season data is also surfaced through:
- `/me`
- `/leaderboard?type=season`
- `/leaderboard?type=crime`
- existing leaderboard route with `type` switching

## Battle / Matchmaking Changes

`/battle/attack` was extended to support:
- perk modifiers where applicable
- revenge mark creation and resolution
- season score awards
- mismatch reward dampening
- repeat-target penalties continuing from Wave 1

New battle response fields include:
- `revengeCreated`
- `revengeResolved`
- `revengeBonusApplied`
- `seasonPointsGained`
- `mismatchPenaltyApplied`

Target scouting remains band-based, but internal reward logic now also considers hidden mismatch checks to reduce value from bullying much weaker targets.

## Crime Flow Changes

`/crimes/commit` now also:
- reads perk context
- applies conservative crime payout bonuses
- applies conservative heat reduction bonuses
- awards season score for successful crimes
- enriches event metadata with season/perk-related context

## `/me` Dashboard Expansion

Wave 2 expands the dashboard payload with:
- `seasonScore`
- `availablePerkPoints`
- `prestigeLevel`
- `currentSeason`
- `unlockedPerkSummary`
- `equipmentSummary`

Wave 1 fields remain in place.

## Frontend Overview

### Updated pages
- `src/app/profile/page.tsx`
- `src/app/leaderboard/page.tsx`
- `src/app/targets/page.tsx`
- `src/app/attack-logs/page.tsx`
- `src/app/shop/page.tsx`
- `src/app/black-market/page.tsx`

### New pages
- `src/app/inventory/page.tsx`
- `src/app/seasons/page.tsx`

### New components
- `Heat-related Wave 1 components remain in use`
- `PerkTree.tsx`
- `RevengeAlert.tsx`
- `SeasonRankCard.tsx`
- `InventoryGrid.tsx`
- `RarityBadge.tsx`
- `EquippedSlotCard.tsx`

### UI additions
- Profile now shows progression identity, season summary, perk entry, and equipment summary
- Leaderboard now switches between season, PvP, and crime views
- Attack logs now show revenge opportunities and a direct revenge CTA
- Targets now flag very weak targets where rewards may be dampened
- Shop and Black Market now surface rarity, slot, and item effect hints
- Navigation now includes inventory and seasons pages

## Current Known Constraints

Wave 2 is intentionally conservative in a few places:
- combat still respects earlier item-stat assumptions from the existing game layer
- season reward claiming and prestige execution are not implemented yet
- item durability exists but is still light-touch
- anti-whale balancing dampens rewards without exposing exact matchmaking math

## Suggested Local Validation

Backend:
```powershell
cd solus-city-server
npm test
```

If you want stricter validation too:
```powershell
cd solus-city-server
npm run build
```

Frontend:
```powershell
cd solus-city-web
npm run build
```

Manual smoke checks:
- unlock a perk and verify `/me` updates available points
- attack a player after a meaningful loss and verify revenge appears in attack logs
- open `/inventory` and test equip, unequip, and supported item use
- open `/seasons` and `/leaderboard?type=season` behavior through the UI
- verify shop and black market show rarity / slot metadata

## Wave 3 Follow-up TODOs

Likely next steps for Wave 3 compatibility:
- make equipped gear fully authoritative in combat math
- add end-of-season reward execution and prestige flow
- expand perk effects deeper into gym, recovery, and economy systems
- improve durability and equipment lifecycle rules
- add stronger integration coverage for battle, inventory, revenge, and season ranking
