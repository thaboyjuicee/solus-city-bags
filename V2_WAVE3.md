# Solus City V2 - Wave 3

Wave 3 adds the first social-power layer on top of Waves 1 and 2:

- syndicate roles and permissions
- syndicate vault deposits and withdrawals
- bounded syndicate wars
- territory control and decay
- war-linked battle scoring
- syndicate and territory leaderboard views
- new syndicate, war, and territory UI surfaces

This wave is additive. Waves 1 and 2 systems remain in place.

## Backend summary

Wave 3 extends the server with reusable syndicate services under `solus-city-server/src/lib/syndicates`:

- `roles.ts`
  - centralized role permission checks
  - covers role management, vault withdrawals, war management, and recruiting
- `contributions.ts`
  - member contribution scoring
  - war participation scoring
  - syndicate vault contribution helpers
  - territory contribution helpers
- `territories.ts`
  - owner lookup
  - bonus lookup
  - influence application
  - control transfer
  - decay handling
- `wars.ts`
  - active war lookup
  - war creation helpers
  - war action scoring
  - battle-linked war scoring
  - settlement

Serializer support was added in:

- `solus-city-server/src/lib/serializers/syndicates.ts`
- `solus-city-server/src/lib/serializers/me.ts`

## Prisma schema additions

Wave 3 adds the following fields:

### `Syndicate`

- `vaultCash`
- `seasonPoints`
- `territoryCount`
- `warRating`
- `safehouseLevel`

### `SyndicateMember`

- `contributionScore`
- `warParticipation`
- `lastActiveAt`

### New models

- `Territory`
- `TerritoryControl`
- `TerritoryContribution`
- `SyndicateWar`
- `SyndicateWarAction`

Supporting relations were also added to `User` and `Syndicate` so war and territory records can be queried cleanly.

Migration file:

- `solus-city-server/prisma/migrations/20260322120000_wave3_social_wars/migration.sql`

## Seed data

Wave 3 seeds the first territory set:

- docks
- downtown
- industrial
- hospital_district
- financial
- slums
- market_row

Bonuses are intentionally modest and designed to stay non-breaking.

## New backend routes

### Syndicates

- `POST /syndicates/vault/deposit`
- `POST /syndicates/vault/withdraw`
- `POST /syndicates/:id/role`

### Wars

- `GET /wars/current`
- `GET /wars/:id/scoreboard`
- `POST /wars/:id/join`
- `POST /wars/:id/action`

### Territories

- `GET /territories`
- `GET /territories/:id`
- `POST /territories/:id/contribute`

## Expanded backend routes

### `/me`

Now includes syndicate-aware dashboard state such as:

- current syndicate role
- syndicate vault summary
- active territory bonuses
- current war summary

### `/battle/attack`

Now supports Wave 3 war integration:

- detects active wars between attacker and defender syndicates
- awards bounded war points
- dampens war points when repeat-target anti-farm or mismatch penalties apply
- applies territory impact when the war is linked to a territory
- returns:
  - `warId`
  - `warPointsGained`
  - `territoryImpact`

### `/leaderboard`

Now supports:

- `type=syndicates`
- `type=territories`

### `/logs/attacks`

Now surfaces war-linked metadata:

- `warId`
- `warPointsGained`
- `territoryImpact`

## Jobs

Wave 3 adds:

- `solus-city-server/src/jobs/territoryDecay.ts`
- `solus-city-server/src/jobs/warWindowTransitions.ts`

Purpose:

- decay inactive territory control
- settle active wars when their end window is reached

These are registered in server startup through `solus-city-server/src/index.ts`.

## Frontend summary

Wave 3 adds the first dedicated social conflict UI layer.

### New components

- `SyndicateVaultCard`
- `SyndicateRoleBadge`
- `WarScoreboard`
- `TerritoryCard`
- `TerritoryBonusBadge`
- `ContributionList`

### Updated pages

- `src/app/home/page.tsx`
  - shows syndicate role
  - shows syndicate summary
  - shows active territory bonuses
  - shows current war summary
- `src/app/syndicates/page.tsx`
  - upgraded into syndicate HQ
  - includes member roster
  - includes syndicate vault controls
  - includes owned territory display
  - includes role management UI when allowed
- `src/app/leaderboard/page.tsx`
  - adds `syndicates` and `territories` tabs

### New pages

- `src/app/wars/page.tsx`
- `src/app/territories/page.tsx`

### Navigation

Navigation now includes:

- `Wars`
- `Territories`

## Role model

Supported Wave 3 syndicate roles:

- `leader`
- `co_leader`
- `treasurer`
- `war_captain`
- `recruiter`
- `member`

Role checks are centralized in `roles.ts` rather than scattered across route handlers.

## War rules in this wave

Wave 3 wars are intentionally bounded:

- they have start and end times
- they award points from:
  - battle wins
  - battle hospitalizations
  - `supply_deliver`
  - `node_secure`
- they settle safely at the end
- ties are allowed and do not wipe syndicates or inventories
- repeat-target and mismatch penalties now reduce war-point value too
- war actions have a cooldown and a per-player cap per war

This is a framework wave, not a full always-on war simulation.

## Territory rules in this wave

Territories are intentionally simple in Wave 3:

- one current owner at most
- one modest bonus per territory
- influence can be raised or contested
- inactive control decays
- ownership can transfer through influence logic
- zeroed influence now moves through an `unstable` state before ownership is dropped on a later decay pass

## Tests added

Wave 3 adds `solus-city-server/src/wave3.test.ts` covering:

- role permission matrix
- syndicate vault transfer correctness
- war point calculations
- war winner resolution
- territory influence outcomes
- contribution value scaling

## Review fixes and validation notes

After a review pass, the following issues were corrected:

- war scoring now respects anti-farm and anti-whale dampening
- syndicate leadership changes now keep `leaderId` and member role state aligned
- syndicate vault withdrawals now re-check live locked balances inside the transaction
- duplicate war metadata keys were removed from battle event payload construction
- war action submission now has stricter spam control
- cash-based territory contributions no longer grant contribution score twice
- territory decay no longer hard-drops ownership immediately at zero influence
- serializer typing was updated so expanded Wave 3 payloads compile cleanly

Validation from the review pass:

- backend tests: passed
- backend TypeScript build: passed
- frontend production build: passed

Environment note:

- `prisma generate` hit a Windows file-lock rename issue for the local Prisma query engine DLL during validation, but the codebase still built and the backend tests passed after the logic fixes

## Known limitations

These are still intentionally light for Wave 4 follow-up:

- no explicit player-facing war declaration flow yet
- territory bonuses are exposed cleanly, but only lightly integrated into wider economy/combat systems
- no season-end syndicate rewards flow yet
- war actions are intentionally limited to a small safe set
- territory bonuses are not yet deeply threaded into every possible Wave 1-2 subsystem
- no complex territory map or real-time war animation layer yet

## Manual verification checklist

Suggested local checks:

1. create or join a syndicate
2. deposit wallet cash into the syndicate vault
3. attempt unauthorized vault withdraw with a low-permission role
4. change a member role with a permitted role
5. open `/wars` and confirm active war summaries render
6. submit `supply_deliver` or `node_secure` and confirm score changes
7. repeat the same war action too quickly and confirm it is blocked
8. attack a rival syndicate member during an active war and confirm war points are returned
9. repeat-farm or heavily mismatch a rival during war and confirm war points are reduced
10. transfer leadership and confirm the syndicate still shows the correct leader state
11. let a territory decay down and confirm it becomes unstable before ownership is cleared
12. open `/territories` and confirm owner, bonus, and influence render
13. contribute to a territory and confirm influence/owner updates
14. open `/leaderboard` and check `syndicates` and `territories` tabs
15. open `/home` and confirm syndicate role, territory bonuses, and war summary appear

## Notes

- Wave 3 was implemented as an additive extension to the existing architecture.
- Shared-fund and war/territory mutations were structured around transactions.
- This document describes the Wave 3 implementation state; it does not imply builds or runtime verification were executed unless separately reported.
