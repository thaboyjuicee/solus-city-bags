import test from "node:test";
import assert from "node:assert/strict";
import { canManageWar, canWithdrawVault, getRolePermissions } from "./lib/syndicates/roles";
import { applySyndicateVaultTransfer } from "./lib/syndicates/contributions";
import {
  calculateBattleWarPoints,
  computeWarWinnerSyndicateId,
  getWarActionPoints,
} from "./lib/syndicates/wars";
import {
  computeTerritoryInfluenceOutcome,
  getInfluenceDeltaForAction,
} from "./lib/syndicates/territories";

test("role permission matrix keeps sensitive actions centralized", () => {
  assert.equal(getRolePermissions("leader").manageRoles, true);
  assert.equal(canWithdrawVault("member"), false);
  assert.equal(canWithdrawVault("treasurer"), true);
  assert.equal(canManageWar("war_captain"), true);
  assert.equal(canManageWar("member"), false);
});

test("syndicate vault transfers keep balances correct", () => {
  assert.deepEqual(applySyndicateVaultTransfer(5000, 10000, 1500, "deposit"), {
    walletCash: 3500,
    syndicateVaultCash: 11500,
  });
  assert.deepEqual(applySyndicateVaultTransfer(3500, 11500, 500, "withdraw"), {
    walletCash: 4000,
    syndicateVaultCash: 11000,
  });
  assert.throws(() => applySyndicateVaultTransfer(300, 1000, 500, "deposit"));
});

test("war action and battle points remain conservative", () => {
  assert.equal(getWarActionPoints("supply_deliver"), 6);
  assert.equal(getWarActionPoints("node_secure"), 10);
  assert.equal(calculateBattleWarPoints(false, false), 8);
  assert.equal(calculateBattleWarPoints(true, false), 12);
  assert.ok(calculateBattleWarPoints(true, true) > calculateBattleWarPoints(true, false));
});

test("war winner resolution safely handles ties", () => {
  assert.equal(computeWarWinnerSyndicateId(20, 10, "a", "b"), "a");
  assert.equal(computeWarWinnerSyndicateId(10, 20, "a", "b"), "b");
  assert.equal(computeWarWinnerSyndicateId(15, 15, "a", "b"), null);
});

test("territory influence updates and control transfer logic behave predictably", () => {
  const freshCapture = computeTerritoryInfluenceOutcome(null, 0, "syn_a", 8);
  assert.deepEqual(freshCapture, {
    captured: true,
    ownerSyndicateId: "syn_a",
    nextInfluence: 8,
    decayState: "stable",
  });

  const defended = computeTerritoryInfluenceOutcome("syn_a", 12, "syn_a", 5);
  assert.equal(defended.ownerSyndicateId, "syn_a");
  assert.equal(defended.nextInfluence, 17);

  const contested = computeTerritoryInfluenceOutcome("syn_a", 12, "syn_b", 5);
  assert.equal(contested.captured, false);
  assert.equal(contested.ownerSyndicateId, "syn_a");
  assert.equal(contested.nextInfluence, 7);

  const transferred = computeTerritoryInfluenceOutcome("syn_a", 6, "syn_b", 8);
  assert.equal(transferred.captured, true);
  assert.equal(transferred.ownerSyndicateId, "syn_b");
  assert.equal(transferred.nextInfluence, 8);
});

test("territory contribution values scale conservatively", () => {
  assert.equal(getInfluenceDeltaForAction("complete_local_task"), 5);
  assert.equal(getInfluenceDeltaForAction("war_control_action"), 12);
  assert.ok(getInfluenceDeltaForAction("donate_cash", 3000) > getInfluenceDeltaForAction("donate_cash", 1000));
});
