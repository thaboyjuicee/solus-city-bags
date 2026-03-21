import test from "node:test";
import assert from "node:assert/strict";
import { buildPrestigePreviewFromProfile } from "./lib/seasons/prestige";
import { getSeasonRewardTierCatalog, getTierForRank } from "./lib/seasons/rewards";
import {
  buildChampionshipPairs,
  determineChampionshipWinner,
} from "./lib/syndicates/championships";

test("prestige eligibility checks level, stats, and season rank", () => {
  const preview = buildPrestigePreviewFromProfile(
    {
      userId: "user_1",
      cash: 12000,
      defense: 140,
      dexterity: 140,
      level: 30,
      maxEnergy: 20,
      maxHappiness: 50,
      maxNerve: 10,
      prestigeLevel: 1,
      prestigePoints: 1,
      seasonScore: 250,
      speed: 140,
      strength: 140,
      vaultCash: 5000,
    },
    12
  );

  assert.equal(preview.eligible, true);
  assert.equal(preview.nextPrestigeLevel, 2);
  assert.equal(preview.nextProfile.cash, 1000);
  assert.equal(preview.nextProfile.maxEnergy, 22);
});

test("prestige preview stays ineligible when requirements fail", () => {
  const preview = buildPrestigePreviewFromProfile(
    {
      userId: "user_2",
      cash: 800,
      defense: 20,
      dexterity: 20,
      level: 10,
      maxEnergy: 20,
      maxHappiness: 50,
      maxNerve: 10,
      prestigeLevel: 0,
      prestigePoints: 0,
      seasonScore: 10,
      speed: 20,
      strength: 20,
      vaultCash: 0,
    },
    120
  );

  assert.equal(preview.eligible, false);
  assert.ok(preview.reasons.length >= 2);
});

test("season reward tiers map ranks conservatively", () => {
  const catalog = getSeasonRewardTierCatalog();
  assert.equal(getTierForRank(1, catalog.overall)?.key, "legend");
  assert.equal(getTierForRank(4, catalog.pvp)?.key, "vanguard");
  assert.equal(getTierForRank(40, catalog.crime), null);
});

test("championship bracket pairing is deterministic", () => {
  const pairs = buildChampionshipPairs([
    { syndicateId: "a", name: "A", qualifyingPoints: 100, warRating: 1000, territoryCount: 2, seed: 1 },
    { syndicateId: "b", name: "B", qualifyingPoints: 90, warRating: 980, territoryCount: 1, seed: 2 },
    { syndicateId: "c", name: "C", qualifyingPoints: 80, warRating: 970, territoryCount: 1, seed: 3 },
    { syndicateId: "d", name: "D", qualifyingPoints: 70, warRating: 950, territoryCount: 0, seed: 4 },
  ]);

  assert.deepEqual(pairs, [
    { seedA: 1, seedB: 4 },
    { seedA: 2, seedB: 3 },
  ]);
});

test("championship winner tie-breaker favors the higher seed", () => {
  assert.equal(
    determineChampionshipWinner({
      scoreA: 40,
      scoreB: 40,
      syndicateAId: "syn_a",
      syndicateBId: "syn_b",
      seedA: 1,
      seedB: 4,
    }),
    "syn_a"
  );
});

