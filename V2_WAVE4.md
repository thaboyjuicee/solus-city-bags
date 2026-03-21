# Solus City V2 - Wave 4

Wave 4 adds the first long-horizon meta loop on top of Waves 1 to 3:

- prestige preview and execution
- season-end reward previews and automatic reward grants
- season finalization and leaderboard snapshots
- hall of fame history entries
- syndicate championships with deterministic brackets
- profile and season history meta-progression UI
- prestige and hall-of-fame leaderboard views

This wave is additive. Waves 1, 2, and 3 systems remain in place.

## Backend summary

Wave 4 extends the server with reusable season and championship services under `solus-city-server/src/lib/seasons` and `solus-city-server/src/lib/syndicates`.

### New season services

- `prestige.ts`
  - prestige eligibility checks
  - prestige preview generation
  - transactional prestige execution
  - explicit reset scope and permanent bonus handling
  - prestige history creation
- `rewards.ts`
  - reward tier catalog
  - projected reward lookup
  - season-end reward calculation
  - reward grant logic with duplicate prevention
- `history.ts`
  - season history aggregation
  - hall of fame entry generation
  - player-specific season history lookup
  - hall of fame feed building

### New syndicate meta service

- `championships.ts`
  - qualifier selection from syndicate performance
  - deterministic seeding
  - bracket creation
  - match settlement
  - championship advancement
  - champion declaration

### Serializer support

Wave 4 adds or expands serializers in:

- `solus-city-server/src/lib/serializers/seasons.ts`
- `solus-city-server/src/lib/serializers/me.ts`
- `solus-city-server/src/lib/serializers/syndicates.ts`

## Prisma schema additions

### `Profile`

Wave 4 adds:

- `prestigePoints`

`prestigeLevel` already existed from Wave 2 and remains intact.

### New models

- `PrestigeHistory`
- `ChampionshipSeason`
- `ChampionshipEntry`
- `ChampionshipMatch`
- `HallOfFameEntry`

Supporting relations were added to:

- `User`
- `Season`
- `Syndicate`

Migration file:

- `solus-city-server/prisma/migrations/20260321190000_wave4_meta_progression/migration.sql`

## Config and balance additions

Wave 4 extends `solus-city-server/src/lib/config/balance.ts` with conservative values for:

- prestige requirements
- prestige permanent bonus values
- prestige reset defaults
- championship qualifier count
- championship round duration
- championship advancement buffer
- reward tiers for:
  - overall season placement
  - pvp placement
  - crime placement
  - syndicate placement
  - championship winner history

Feature toggles were also extended in `solus-city-server/src/lib/config/game.ts` for:

- `ENABLE_PRESTIGE`
- `ENABLE_CHAMPIONSHIPS`
- `ENABLE_HALL_OF_FAME`

## New backend routes

### Prestige

- `GET /prestige/preview`
- `POST /prestige/execute`

### Championships

- `GET /championships/current`
- `GET /championships/bracket`
- `GET /championships/qualifiers`

## Expanded backend routes

### `/seasons/current/rewards`

New preview endpoint returns:

- reward tier catalog
- projected player reward tier
- countdown to season end

### `/seasons/history`

Now returns:

- recent player season history
- reward claimed state
- season highlights
- hall of fame highlight entries

### `/leaderboard`

Now supports:

- `type=prestige`
- `type=hall_of_fame`

### `/me`

Dashboard/profile payload now includes:

- `prestigePoints`
- prestige summary / eligibility preview
- projected season reward state
- championship qualification / next-match summary
- lightweight season history preview

### `/syndicates/:id`

Syndicate detail now also exposes:

- championship qualification state
- current championship match summary if present
- champion history snippet

## Jobs

Wave 4 adds:

- `solus-city-server/src/jobs/seasonFinalize.ts`
- `solus-city-server/src/jobs/championshipAdvance.ts`

Purpose:

- finalize ended active seasons safely
- assign final ranks
- write leaderboard snapshots
- grant season rewards
- create hall of fame entries
- create championship brackets for ended seasons
- settle ended championship matches and advance brackets

These are registered in server startup through `solus-city-server/src/index.ts`.

## Prestige rules in this wave

Wave 4 prestige is intentionally transparent and moderate.

Eligibility checks include:

- minimum level
- minimum combined stat threshold
- minimum season-rank band

Current Wave 4 prestige behavior resets:

- wallet cash
- vault cash
- heat
- wanted tier
- current season score
- hospital exit penalty state
- active protection effects

Current Wave 4 prestige behavior keeps:

- prestige level and prestige points
- core stats and level progression
- perks and account identity
- season history and hall of fame records
- prestige history rows

Permanent prestige bonuses currently increase:

- max energy
- max nerve
- max happiness

## Season finalization rules in this wave

Wave 4 season finalization is job-driven and idempotent-oriented.

At season end it:

- marks final player ranks
- stores leaderboard snapshots by category
- calculates season rewards
- grants rewards once
- creates hall of fame records
- opens a championship season for qualifying syndicates
- marks the season as ended

## Championship rules in this wave

Wave 4 championships are intentionally bounded and deterministic.

They currently:

- qualify top syndicates from existing social-performance data
- use deterministic seeding
- run on round windows
- settle match winners safely
- break ties by higher seed
- advance until one champion remains
- write champion history into hall of fame data

This is a framework tournament layer, not a full live esports engine.

## Frontend summary

Wave 4 adds the first veteran-chase UI layer.

### New components

- `PrestigePanel`
- `PrestigePreviewCard`
- `ChampionshipBracket`
- `SeasonHistoryCard`
- `HallOfFameList`

### New pages

- `src/app/prestige/page.tsx`
- `src/app/championships/page.tsx`

### Updated pages

- `src/app/profile/page.tsx`
  - shows prestige summary
  - shows prestige points
  - shows projected reward tiers
  - shows recent season history
  - shows hall of fame highlights
- `src/app/seasons/page.tsx`
  - shows current season reward preview
  - shows richer season history
  - shows hall of fame highlights
- `src/app/leaderboard/page.tsx`
  - adds `prestige` and `hall_of_fame` tabs
- `src/app/syndicates/page.tsx`
  - shows championship qualification state
  - shows current championship summary
  - shows champion history snippet

### Navigation

Navigation now includes:

- `Prestige`
- `Championships`

## Tests added

Wave 4 adds `solus-city-server/src/wave4.test.ts` covering:

- prestige eligibility behavior
- prestige preview gating
- season reward tier mapping
- deterministic championship bracket pairing
- championship tie-break resolution

## Local migration note

The Wave 4 migration file should be plain UTF-8 without BOM.

If PostgreSQL reports an error near `\uFEFFALTER`, it means the migration file encoding is wrong and Prisma is seeing a BOM before the first SQL token.

After fixing the file encoding locally, the usual recovery path is:

1. `npx prisma migrate resolve --rolled-back 20260321190000_wave4_meta_progression`
2. `npx prisma migrate deploy`
3. `npm run db:seed`

For a disposable local database, `npx prisma migrate reset` is also acceptable.

## Known limitations

These are still intentionally light for the next wave:

- championship qualification is derived from current syndicate totals rather than a dedicated per-season syndicate snapshot table
- season rewards are auto-granted at finalization, not manually claimed
- prestige does not currently reset selected inventory categories or level
- championship matches are deterministic and framework-driven rather than player-managed in real time
- hall of fame focuses on core categories only
- championship history is surfaced lightly rather than as a full archive browser

## Manual verification checklist

Suggested local checks:

1. open `/prestige` and confirm preview loads
2. verify an ineligible account sees clear failed requirements
3. verify an eligible account can execute prestige and receives the expected permanent bonuses
4. confirm prestige clears wallet/vault/heat state as designed
5. open `/seasons` and confirm reward projection loads
6. finalize or simulate a finished season and confirm final ranks/snapshots are written once
7. confirm season rewards are not granted twice
8. confirm hall of fame entries appear after finalization
9. open `/leaderboard` and verify `prestige` and `hall_of_fame` tabs
10. open `/championships` and confirm qualifiers and bracket render
11. settle a round and confirm the winner advances safely
12. open `/syndicates` and confirm championship qualification/champion history render when relevant
13. open `/profile` and confirm prestige and season-history sections render cleanly

## Notes

- Wave 4 was implemented as an additive extension to the existing architecture.
- Prestige execution, season finalization, reward grants, and championship advancement were structured around transactions at the service layer.
- This document describes the Wave 4 implementation state; it does not imply builds or runtime verification were executed unless separately reported.