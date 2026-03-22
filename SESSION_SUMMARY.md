# Solus City V2 — Session Summary
**Date:** 2026-03-22
**Branch:** `v2`
**Repo:** `solus-city-bags` (monorepo: `solus-city-server` + `solus-city-web`)

---

## Overview

This session was a comprehensive UI polish, bug-fix, and backend extension pass across the full v2 branch. Waves 1–4 were all previously implemented. The session layered on top of that foundation with targeted fixes, UX improvements, and one backend schema change (syndicate `creatorId`).

---

## Wave Documentation Summary

### Wave 1 — Core Systems
- Heat / Wanted system (server-authoritative, 0–100 clamped, timed decay)
- Vault + PvP cash stealing (wallet vs vault, repeat-target loot reduction)
- Hospital recovery flows (`weakened` / `shaken` / `exposed` penalties)
- Rotating black market (stock, level/heat requirements, sting chance)
- Daily and weekly missions
- New lib structure under `src/lib/` (player, combat, economy, missions, serializers, config)
- Jobs: `blackMarketRotation`, `dailyMissionReset`, `weeklyMissionReset`, `heatDecay`
- Frontend: `HeatMeter`, `WantedBadge`, `VaultCard`, `HospitalOptionsCard`, `MissionCard`, `LootBandBadge`

### Wave 2 — Progression
- Perk / skill tree (3 branches: enforcer, hustler, grinder; server-authoritative unlock validation)
- Inventory management (equip, unequip, use; grouped by slot category)
- Revenge system (strict eligibility: hospitalization or large cash loss; windowed; server-side bonus)
- Season scoring v1 (battle wins, hospitalizations, crimes, mission claims)
- Anti-whale matchmaking mismatch dampening
- Frontend: `PerkTree`, `RevengeAlert`, `SeasonRankCard`, `InventoryGrid`, `RarityBadge`, `EquippedSlotCard`
- New pages: `/inventory`, `/seasons`

### Wave 3 — Social / Wars / Territories
- Syndicate roles (`leader`, `co_leader`, `treasurer`, `war_captain`, `recruiter`, `member`)
- Syndicate vault deposits and withdrawals (role-gated)
- Bounded syndicate wars (point-based, time-windowed, anti-farm dampened)
- Territory control and decay (7 seed territories; `unstable` state before ownership drop)
- War-linked battle scoring
- Syndicate and territory leaderboard tabs
- New pages: `/wars`, `/territories`
- Jobs: `territoryDecay`, `warWindowTransitions`
- Frontend: `SyndicateVaultCard`, `SyndicateRoleBadge`, `WarScoreboard`, `TerritoryCard`, `TerritoryBonusBadge`, `ContributionList`

### Wave 4 — Meta Progression
- Prestige system (eligibility gates, transparent preview, transactional execution, permanent bonuses)
- Season finalization (final ranks, leaderboard snapshots, reward grants, hall of fame)
- Syndicate championships (deterministic bracket, seeded from syndicate performance, round windows)
- Hall of fame (`type=prestige`, `type=hall_of_fame` leaderboard tabs)
- Feature toggles: `ENABLE_PRESTIGE`, `ENABLE_CHAMPIONSHIPS`, `ENABLE_HALL_OF_FAME`
- New pages: `/prestige`, `/championships`
- Jobs: `seasonFinalize`, `championshipAdvance`
- Frontend: `PrestigePanel`, `PrestigePreviewCard`, `ChampionshipBracket`, `SeasonHistoryCard`, `HallOfFameList`

---

## Session Changes

### Bug Fixes

#### Attack Logs — Revenge on outgoing attacks
**File:** `src/app/attack-logs/page.tsx`
**Fix:** Added `isIncoming(entry.type)` guard to revenge section — was incorrectly showing revenge CTA on attacks the player initiated.
```tsx
{entry.revengeAvailable && entry.revengeTargetId && isIncoming(entry.type) && (...)}
```

#### Shop — Silent buy failures
**File:** `src/app/shop/page.tsx`
**Fix:** `catch { // ignore }` was swallowing all errors silently. Added `shopBuyingId`, `shopBuyError`, `shopSuccess`, `listingSuccess`, `successCounter` ref states. Buy button now shows "BUYING..." while in-flight; errors are displayed inline; successes show a fading `FlashMessage` component.

#### Syndicates — Vault errors not surfaced
**File:** `src/app/syndicates/page.tsx`
**Fix:** `try/finally` without `catch` on deposit/withdraw handlers. Added `catch (err)` blocks with `setVaultError(extractErrMsg(...))`.

#### Syndicates — CREATOR badge disappearing after role updates
**Root cause:** `detail.leaderId` is a mutable FK that changes on leadership transfer. After any `load()` triggered by a role update, the badge would break or flip incorrectly.
**Fix (two layers):**
1. **Backend** — Added immutable `creatorId String?` field to `Syndicate` model, set once on creation and never updated. Migration backfills from `leaderId`. All serializers include `creatorId ?? leaderId`.
2. **Frontend** — Added stable `creatorId` state that only latches from `null → id`, never from `id → null`. Badge comparison uses this state instead of `detail.leaderId`.

**Files changed:**
- `solus-city-server/prisma/schema.prisma` — added `creatorId String?`
- `solus-city-server/prisma/migrations/20260322150000_syndicate_creator_id/migration.sql`
- `solus-city-server/src/routes/syndicates.ts` — `creatorId: userId` on create; included in list + detail responses
- `src/app/syndicates/page.tsx` — stable `creatorId` state, latch logic

#### Syndicates — Role badge extra whitespace
**File:** `src/components/game/SyndicateRoleBadge.tsx`
**Fix:** `px-2.5 py-1` → `px-2 py-0.5 w-fit` for snug fit-to-content sizing.

#### StatusBars — Label width overflow
**File:** `src/components/game/StatusBars.tsx`
**Fix:** Labels changed from 2-char abbreviations (HP/EN/NV/HA) to full words (Health/Energy/Nerve/Happiness). Label width `w-6` → `w-[64px] shrink-0` to accommodate longer text.

---

### UI / UX Improvements

#### Profile Page — Inline name edit + stats card
**File:** `src/app/profile/page.tsx`
- Inline name edit: pencil icon → text input → Check/X buttons → `PATCH /me`
- Detailed stats grid (AP, DP, STR, SPD, DEF, DEX, CASH, $/HR) in a 4-column `StatBox` layout
- Syndicate, shield, hospital status as labeled rows instead of icon badges
- `shieldActive = me.shieldUntil && new Date(me.shieldUntil) > new Date()`

#### Perk Tree — Spacious RPG card redesign
**File:** `src/components/game/PerkTree.tsx`
Full rewrite as 3-column visual skill tree:
- `grid-cols-1 md:grid-cols-3 gap-6` layout
- `p-3` node cards with three visual states: unlocked (purple glow) / available (hover) / locked (dim, `opacity-50`)
- `TIER N` badge top-right corner
- `border-l-2 h-6 border-[#9945FF]/60` connectors
- Solid `bg-[#9945FF]` UNLOCK button; green UNLOCKED; red LOCKED
- `BRANCH_SUBTITLES` map: `{ enforcer: "PvP pressure and loot edges", hustler: "Crime cash and heat control", grinder: "Training and recovery efficiency" }`

#### Syndicates — Role management system
**File:** `src/app/syndicates/page.tsx`
- Inline per-member role editor: CHANGE ROLE → select + CONFIRM + CANCEL
- `MemberRoleState` type with `open`, `draft`, `busy`, `success`, `error` per member
- `patchMemberRole(userId, patch)` helper
- Permission matrix: `canChangeRole(member)` — leader/co_leader/creator can manage; can't change own role; co_leader can't change leader/creator
- `confirmRoleChange(member)` async handler calls `POST /syndicates/:id/role`
- `vaultSuccess` toast with 3s auto-clear via `vaultSuccessTimer` ref

#### Black Market — Send $SLS + history icons
**File:** `src/app/black-market/page.tsx`
- `SendSLSPanel` accepts `onSendComplete: (entry: SlsTransactionItem) => void`
- After successful send: dispatches `"sls-balance-refresh"` custom window event
- Calls `onSendComplete` to add a local history entry (prepended to API results via `localEntries` prop)
- `getTxIcon(type)` maps type string → lucide icon: `Send`, `ArrowUpFromLine`, `HeartPulse`, `ShoppingCart`, `Clock3`
- History rows: circular icon badge left, flex text center, amount right

#### `useSLSBalance` hook — Auto-refresh on send
**File:** `src/hooks/useSLSBalance.ts`
- Refactored to `useCallback`-based `fetchBalance`
- Exported `SLS_BALANCE_REFRESH_EVENT = "sls-balance-refresh"` constant
- Listens for event: `window.addEventListener(SLS_BALANCE_REFRESH_EVENT, fetchBalance)` — enables cross-component balance refresh without prop drilling or global store

---

### Background Darkening

**Goal:** Reduce washed-out appearance across all pages; target 15–25% opacity on background image with dark `#0a0a0a` base.

**Root cause:** The `texture_overlay.png` at `mix-blend-screen` was the primary culprit — it added perceived brightness even at low base opacity.

**Changes:**
- `src/app/globals.css` — `body { background-color: #000000 }` → `#0a0a0a`
- `src/components/layout/GamePageChrome.tsx`:
  - Background image opacity `0.08` → `0.18`
  - Removed `texture_overlay.png` `<Image>` with `mix-blend-screen` blend mode
  - Added `<div className="absolute inset-0 z-[1] bg-[#0a0a0a]/60 pointer-events-none" />` dark overlay between image and content
  - Container background: `bg-transparent` → `bg-[#0a0a0a]`

---

### Territory Feature Hidden from UI

**Decision:** Backend code, Prisma models, and `src/app/territories/` page preserved. Only UI entry points removed.

**Files changed:**
- `src/components/layout/Navigation.tsx` — removed Territories from `MORE_TABS`
- `src/app/leaderboard/page.tsx` — removed `"territories"` from `TABS`; `grid-cols-7` → `grid-cols-6`; syndicates secondary text now shows `membersCount • warRating`
- `src/app/syndicates/page.tsx` — removed `TerritoryBonusBadge` import, Territories stat box, Owned Territories section
- `src/app/home/page.tsx` — removed `TerritoryBonusBadge` import, Territories stat box, `activeTerritoryBonuses` section

---

## Backend Schema Change

### `Syndicate.creatorId`

```sql
-- Migration: 20260322150000_syndicate_creator_id
ALTER TABLE "Syndicate" ADD COLUMN "creatorId" TEXT;
UPDATE "Syndicate" SET "creatorId" = "leaderId" WHERE "creatorId" IS NULL;
```

**Purpose:** `leaderId` is mutable (updated on leadership transfer). `creatorId` is set once at syndicate creation and is never updated, providing a stable identity for the founder regardless of who holds leadership at any given time.

---

## Key Architecture Notes

### Custom Event Bus
Cross-component communication between `SendSLSPanel` and `useSLSBalance` is done via:
```ts
window.dispatchEvent(new Event("sls-balance-refresh"))
```
No prop drilling or global store needed.

### Stable Latch Pattern
For values that should never revert to null once set:
```ts
const [creatorId, setCreatorId] = useState<string | null>(null);
// Only latch from null → id
if (incoming && !creatorId) setCreatorId(incoming);
```

### Local History Merging
After on-chain send (no backend confirmation), local entries are prepended to API results:
```ts
const all = [...localEntries, ...transactions];
```

### FlashMessage Component
Fade-out success feedback used in Shop:
```tsx
function FlashMessage({ message }: { message: string }) {
  const [fading, setFading] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFading(true), 1600);
    return () => clearTimeout(t);
  }, []);
  return (
    <p className={`text-[10px] font-bold text-[#66bb6a] transition-opacity duration-700 ${fading ? "opacity-0" : "opacity-100"}`}>
      {message}
    </p>
  );
}
```

---

## Known / Non-Blocking Issues

These were identified in a prior audit and remain deferred:

| Issue | Notes |
|-------|-------|
| Vault UI page | No frontend for `POST /vault/deposit` and `POST /vault/withdraw`. Backend routes exist. |
| Feature toggle dead code | `ENABLE_WARS` etc. are constants that are never read at runtime |
| `SeasonLeaderboardSnapshot` never populated | Model exists in schema; `seasonFinalize` job creates entries but no frontend surfacing |
| `Territory.incomeType` never consumed | Field stored but not used in any economy calculation |
| Duplicate syndicate leaderboard endpoints | Two endpoint shapes with incompatible response structures |
| Territories UI hidden but not deleted | `src/app/territories/` and all backend code intact; re-enabling requires restoring 4 UI entry points |

---

## $SLS Token

- **Mint:** `ELTXCFp1tmtfu39CPw6afnMSjW1BBxjinorJQsKmBAGS`
- **Treasury:** `5vTZGYbkJ2xGbpNEbgp8TLuob3jjXTLqRgzdG8zP1FiZ`
- **Decimals:** 9
- **Network:** Solana mainnet

On-chain transfer via `createTransferInstruction` + `getAssociatedTokenAddressSync` + `sendRawTransaction` + `confirmTransaction`.

---

## Merge Plan

`v2 → dev → master`

Not yet executed. All Wave 1–4 systems implemented. Session-day bug fixes applied and stable.
