import test from "node:test";
import assert from "node:assert/strict";
import { applyHeat, clampHeat, getWantedTier } from "./lib/player/heat";
import { calculateWalletCashSteal } from "./lib/combat/loot";
import { applyVaultTransfer } from "./lib/economy/vault";
import { reserveListingStock } from "./lib/economy/blackMarket";
import { assertClaimableMission } from "./lib/missions/rewards";

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
