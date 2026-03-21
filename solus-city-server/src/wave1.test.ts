import test from "node:test";
import assert from "node:assert/strict";
import { applyHeat, clampHeat, getWantedTier } from "./lib/player/heat";
import { calculateWalletCashSteal } from "./lib/combat/loot";
import { applyVaultTransfer } from "./lib/economy/vault";
import { reserveListingStock } from "./lib/economy/blackMarket";
import { assertClaimableMission } from "./lib/missions/rewards";
import { getAvailablePerkPoints } from "./lib/player/perks";
import { qualifiesForRevenge, getRevengeBonusPercent } from "./lib/combat/revenge";
import { getMismatchAdjustment } from "./lib/matchmaking";

test("heat clamps and maps to wanted tiers", () => {
  assert.equal(clampHeat(130), 100);
  assert.equal(clampHeat(-5), 0);
  assert.equal(getWantedTier(18), "low");
  assert.equal(getWantedTier(51), "wanted");
  assert.equal(applyHeat({ heat: 95, wantedTier: "dangerous", lastHeatDecayAt: new Date() }, 20).heat, 100);
});

test("loot never touches vault cash and repeat-target penalty reduces loot", () => {
  const first = calculateWalletCashSteal({
    availableWalletCash: 10000,
    defenderHeat: 60,
    defenderLevel: 10,
    recentAttackCount: 0,
    protectionEffects: [],
  });
  const repeated = calculateWalletCashSteal({
    availableWalletCash: 10000,
    defenderHeat: 60,
    defenderLevel: 10,
    recentAttackCount: 2,
    protectionEffects: [],
  });

  assert.ok(first.cashStolen > repeated.cashStolen);
  assert.ok(first.cashStolen <= 10000);
  assert.ok(repeated.cashStolen <= 10000);
});

test("protection effects reduce steal amount", () => {
  const unprotected = calculateWalletCashSteal({
    availableWalletCash: 5000,
    defenderHeat: 40,
    defenderLevel: 8,
    recentAttackCount: 0,
    protectionEffects: [],
  });
  const protectedLoot = calculateWalletCashSteal({
    availableWalletCash: 5000,
    defenderHeat: 40,
    defenderLevel: 8,
    recentAttackCount: 0,
    protectionEffects: [{ id: "1", type: "loot_reduction_percent", value: 0.5, startsAt: new Date(), endsAt: new Date(), sourceType: "effect" }],
  });

  assert.ok(protectedLoot.cashStolen < unprotected.cashStolen);
  assert.ok(protectedLoot.lootProtectedAmount > 0);
});

test("vault deposit and withdraw keep balances correct", () => {
  assert.deepEqual(applyVaultTransfer(1000, 200, 300, "deposit"), { walletCash: 700, vaultCash: 500 });
  assert.deepEqual(applyVaultTransfer(700, 500, 200, "withdraw"), { walletCash: 900, vaultCash: 300 });
});

test("black market stock cannot oversell", () => {
  assert.equal(reserveListingStock(5, 2), 3);
  assert.throws(() => reserveListingStock(1, 2));
});

test("mission claim cannot happen twice", () => {
  assert.throws(() => assertClaimableMission({ completed: true, claimed: true }));
  assert.throws(() => assertClaimableMission({ completed: false, claimed: false }));
  assert.doesNotThrow(() => assertClaimableMission({ completed: true, claimed: false }));
});

test("perk points are enforced by level cadence and unlock count", () => {
  assert.equal(getAvailablePerkPoints({ level: 10, availablePerkPoints: 0 }, 1), 1);
  assert.equal(getAvailablePerkPoints({ level: 4, availablePerkPoints: 0 }, 0), 0);
});

test("revenge marks only qualify for meaningful losses", () => {
  assert.equal(qualifiesForRevenge(100, false), false);
  assert.equal(qualifiesForRevenge(1000, false), true);
  assert.equal(qualifiesForRevenge(0, true), true);
  assert.equal(getRevengeBonusPercent({ bonusPercent: 0.15 }), 0.15);
});

test("mismatch penalty reduces rewards for much weaker targets", () => {
  const severe = getMismatchAdjustment({
    attackerPower: 400,
    defenderPower: 100,
    attackerLevel: 20,
    defenderLevel: 5,
  });
  const fair = getMismatchAdjustment({
    attackerPower: 180,
    defenderPower: 150,
    attackerLevel: 12,
    defenderLevel: 10,
  });

  assert.equal(severe.mismatchPenaltyApplied, true);
  assert.ok(severe.lootMultiplier < 1);
  assert.equal(fair.mismatchPenaltyApplied, false);
});
