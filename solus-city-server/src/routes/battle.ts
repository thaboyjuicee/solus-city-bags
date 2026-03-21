import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { requireAuth } from "../lib/auth";
import {
  applyEnergy,
  applyHappiness,
  applyHospitalRecovery,
  applyIncome,
  applyNerve,
  clamp,
  computeCombatStats,
  isInHospital,
  processLevelUp,
} from "../lib/game";
import {
  BATTLE_DAMAGE_MAX,
  BATTLE_DAMAGE_MIN,
  CRIT_CHANCE_BASE,
  CRIT_CHANCE_MAX,
  CRIT_CHANCE_MIN,
  CRIT_DAMAGE_MULTIPLIER,
  CRIT_XP_BONUS,
  EVASION_CHANCE_BASE,
  EVASION_CHANCE_MAX,
  EVASION_CHANCE_MIN,
  EVASION_XP_REWARD,
  HOSPITAL_MINUTES_PER_DMG,
  LOOT_CAP,
  LOOT_PERCENT,
  RP_LOSS,
  RP_WIN_BASE,
  RP_WIN_CLAMP_MAX,
  RP_WIN_CLAMP_MIN,
} from "../lib/constants";
import { buildNpcForPlayer, NPC_POOL } from "../lib/npcs";
import { applyHeat, decayHeat } from "../lib/player/heat";
import { calculateWalletCashSteal } from "../lib/combat/loot";
import { fetchActiveProtectionEffects } from "../lib/combat/protection";
import { ensurePlayerMissionsAssigned } from "../lib/missions/assign";
import { progressPlayerMissions } from "../lib/missions/progress";
import { REPEAT_TARGET_LOOT_REDUCTION_WINDOW_MINUTES } from "../lib/config/balance";
import { getPlayerPerkContext } from "../lib/player/perks";
import { awardSeasonScore } from "../lib/seasons/scoring";
import { getMismatchAdjustment } from "../lib/matchmaking";
import {
  getActiveRevengeAgainst,
  getRevengeBonusPercent,
  maybeCreateRevengeMark,
  resolveRevenge,
} from "../lib/combat/revenge";

const attackBody = z.object({
  targetId: z.string().min(1),
  targetType: z.enum(["player", "npc"]),
});

function computeHospitalResult(hospitalizedTarget: boolean, hospitalizedSelf: boolean): string {
  if (hospitalizedTarget && hospitalizedSelf) return "both";
  if (hospitalizedTarget) return "target";
  if (hospitalizedSelf) return "self";
  return "none";
}

function computeEvasionChance(
  attackerSpeed: number,
  attackerDex: number,
  defenderSpeed: number,
  defenderDex: number
): number {
  const advantage = defenderSpeed + defenderDex - (attackerSpeed + attackerDex);
  const rawChance = EVASION_CHANCE_BASE + advantage / 600;
  return clamp(rawChance, EVASION_CHANCE_MIN, EVASION_CHANCE_MAX);
}

function computeCritChance(
  attackerSpeed: number,
  attackerDex: number,
  defenderSpeed: number,
  defenderDex: number
): number {
  const advantage = attackerSpeed + attackerDex - (defenderSpeed + defenderDex);
  const rawChance = CRIT_CHANCE_BASE + advantage / 700;
  return clamp(rawChance, CRIT_CHANCE_MIN, CRIT_CHANCE_MAX);
}

export default async function battleRoutes(
  fastify: FastifyInstance,
  { prisma }: { prisma: PrismaClient }
) {
  fastify.post("/battle/attack", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;
    const parsed = attackBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    }

    if (parsed.data.targetType === "player" && parsed.data.targetId === userId) {
      return reply.status(400).send({ error: "Cannot attack yourself" });
    }

    try {
      await ensurePlayerMissionsAssigned(prisma, userId);
      const now = new Date();
      const [attackerProfileRaw, attackerPerkContext] = await Promise.all([
        prisma.profile.findUnique({ where: { userId } }),
        getPlayerPerkContext(userId, prisma),
      ]);
      if (!attackerProfileRaw) return reply.status(404).send({ error: "Your profile not found" });

      const attackerHospitalUpdate = applyHospitalRecovery(attackerProfileRaw);
      const recoveredAttacker = { ...attackerProfileRaw, ...attackerHospitalUpdate };
      if (attackerHospitalUpdate.health !== undefined) {
        await prisma.$transaction([
          prisma.profile.update({ where: { userId }, data: attackerHospitalUpdate }),
          prisma.eventLog.create({
            data: {
              userId,
              type: "hospital",
              message: "Discharged from hospital. Health fully restored.",
              metadata: { method: "natural_recovery" },
            },
          }),
        ]);
      }

      if (isInHospital(recoveredAttacker)) {
        return reply.status(400).send({
          code: "IN_HOSPITAL",
          error: "You are in the hospital",
          recoverAt: recoveredAttacker.hospitalUntil.toISOString(),
        });
      }

      const atkIncomeUpdate = applyIncome(recoveredAttacker);
      const atkEnergyUpdate = applyEnergy({ ...recoveredAttacker, ...atkIncomeUpdate });
      const atkNerveUpdate = applyNerve({ ...recoveredAttacker, ...atkIncomeUpdate, ...atkEnergyUpdate });
      const atkHappinessUpdate = applyHappiness({ ...recoveredAttacker, ...atkIncomeUpdate, ...atkEnergyUpdate, ...atkNerveUpdate });
      const atkHeatState = decayHeat({ ...recoveredAttacker, ...atkIncomeUpdate, ...atkEnergyUpdate, ...atkNerveUpdate, ...atkHappinessUpdate }, now);
      const updatedAttacker = { ...recoveredAttacker, ...atkIncomeUpdate, ...atkEnergyUpdate, ...atkNerveUpdate, ...atkHappinessUpdate, ...atkHeatState };

      if (updatedAttacker.energy < 1) {
        await prisma.profile.update({
          where: { userId },
          data: { ...atkIncomeUpdate, ...atkEnergyUpdate, ...atkNerveUpdate, ...atkHappinessUpdate, heat: atkHeatState.heat, wantedTier: atkHeatState.wantedTier, lastHeatDecayAt: atkHeatState.lastHeatDecayAt },
        });
        return reply.status(400).send({ error: "Not enough energy" });
      }

      const attackerStats = await computeCombatStats(userId, prisma);
      const attackerAP = attackerStats.totalStats.ap;
      const attackerDP = attackerStats.totalStats.dp;
      const attackerPower = attackerAP + attackerDP;
      const attackerSpeed = attackerStats.totalStats.speed;
      const attackerDexterity = attackerStats.totalStats.dexterity;
      const isNpc = parsed.data.targetType === "npc";
      const repeatWindowStart = new Date(now.getTime() - REPEAT_TARGET_LOOT_REDUCTION_WINDOW_MINUTES * 60 * 1000);

      let opponentId = parsed.data.targetId;
      let opponentName = "Target";
      let opponentLevel = 1;
      let opponentRp = 0;
      let opponentDP = 1;
      let opponentPower = 1;
      let opponentSpeed = 0;
      let opponentDexterity = 0;
      let defenderCash = 0;
      let defenderHealth = 0;
      let defenderHospitalUntil = new Date(0);
      let defenderUserId: string | null = null;
      let targetHeatBand = "low";
      let defenderProtectionEffects = [] as Awaited<ReturnType<typeof fetchActiveProtectionEffects>>;
      let lootProtectedAmount = 0;
      let protectionTriggered: string[] = [];
      let antiFarmPenaltyApplied = false;
      let recentAttackCount = 0;
      let defenderHeatState = { heat: 0, wantedTier: "low", lastHeatDecayAt: now, decayedBy: 0 };
      let defIncomeUpdate: Record<string, unknown> = {};
      let defEnergyUpdate: Record<string, unknown> = {};
      let defNerveUpdate: Record<string, unknown> = {};
      let defHappinessUpdate: Record<string, unknown> = {};
      let defenderPenaltyType: string | null = null;
      let defenderPenaltyActive = false;
      let revengeMark = null as Awaited<ReturnType<typeof getActiveRevengeAgainst>>;

      if (!isNpc) {
        const defenderProfileRaw = await prisma.profile.findUnique({ where: { userId: parsed.data.targetId } });
        if (!defenderProfileRaw) return reply.status(404).send({ error: "Target not found" });

        const defenderHospitalUpdate = applyHospitalRecovery(defenderProfileRaw);
        const recoveredDefender = { ...defenderProfileRaw, ...defenderHospitalUpdate };
        if (defenderHospitalUpdate.health !== undefined) {
          await prisma.$transaction([
            prisma.profile.update({ where: { userId: parsed.data.targetId }, data: defenderHospitalUpdate }),
            prisma.eventLog.create({
              data: {
                userId: parsed.data.targetId,
                type: "hospital",
                message: "Discharged from hospital. Health fully restored.",
                metadata: { method: "natural_recovery" },
              },
            }),
          ]);
        }

        if (recoveredDefender.shieldUntil > now) return reply.status(400).send({ error: "Target is shielded" });
        if (isInHospital(recoveredDefender)) return reply.status(400).send({ error: "Target is in hospital" });

        defIncomeUpdate = applyIncome(recoveredDefender);
        defEnergyUpdate = applyEnergy({ ...recoveredDefender, ...defIncomeUpdate });
        defNerveUpdate = applyNerve({ ...recoveredDefender, ...defIncomeUpdate, ...defEnergyUpdate });
        defHappinessUpdate = applyHappiness({ ...recoveredDefender, ...defIncomeUpdate, ...defEnergyUpdate, ...defNerveUpdate });
        defenderHeatState = decayHeat({ ...recoveredDefender, ...defIncomeUpdate, ...defEnergyUpdate, ...defNerveUpdate, ...defHappinessUpdate }, now);
        const updatedDefender = { ...recoveredDefender, ...defIncomeUpdate, ...defEnergyUpdate, ...defNerveUpdate, ...defHappinessUpdate, ...defenderHeatState };
        const defenderStats = await computeCombatStats(parsed.data.targetId, prisma);

        opponentName = recoveredDefender.name || "Player";
        opponentLevel = recoveredDefender.level;
        opponentRp = recoveredDefender.rp;
        opponentDP = defenderStats.totalStats.dp;
        opponentPower = defenderStats.totalStats.ap + defenderStats.totalStats.dp;
        opponentSpeed = defenderStats.totalStats.speed;
        opponentDexterity = defenderStats.totalStats.dexterity;
        defenderCash = updatedDefender.cash;
        defenderHealth = updatedDefender.health;
        defenderHospitalUntil = updatedDefender.hospitalUntil;
        defenderUserId = parsed.data.targetId;
        targetHeatBand = updatedDefender.wantedTier;
        defenderProtectionEffects = await fetchActiveProtectionEffects(prisma, parsed.data.targetId, now);
        recentAttackCount = await prisma.attackLog.count({
          where: {
            userId,
            defenderId: parsed.data.targetId,
            result: "win",
            createdAt: { gte: repeatWindowStart },
          },
        });
        defenderPenaltyType = updatedDefender.hospitalExitPenaltyType;
        defenderPenaltyActive = !!updatedDefender.hospitalExitPenaltyUntil && updatedDefender.hospitalExitPenaltyUntil > now;
        revengeMark = await getActiveRevengeAgainst(prisma, userId, parsed.data.targetId, now);
      } else {
        const template = NPC_POOL.find((npc) => npc.id === parsed.data.targetId);
        if (!template) return reply.status(400).send({ error: "Invalid NPC target" });
        const npc = buildNpcForPlayer(updatedAttacker.level, updatedAttacker.rp, template);
        opponentId = npc.id;
        opponentName = npc.displayName;
        opponentLevel = npc.level;
        opponentRp = npc.rp;
        opponentDP = npc.defensePower;
        opponentPower = npc.defensePower * 2;
        opponentSpeed = npc.speed;
        opponentDexterity = npc.dexterity;
        defenderCash = npc.cash;
        defenderHealth = npc.health;
      }

      const mismatch = getMismatchAdjustment({
        attackerPower,
        defenderPower: opponentPower,
        attackerLevel: updatedAttacker.level,
        defenderLevel: opponentLevel,
      });

      const pWin = attackerAP / (attackerAP + opponentDP);
      const roll = Math.random();
      const baseWin = roll < pWin;
      const baseDmg = BATTLE_DAMAGE_MIN + Math.floor(Math.random() * (BATTLE_DAMAGE_MAX - BATTLE_DAMAGE_MIN + 1));
      let damageDealt = 0;
      let damageTaken = 0;
      let outcomeType: "win" | "loss" | "evaded" = baseWin ? "win" : "loss";
      let criticalHit = false;
      let evadeChance = 0;
      let critChance = 0;
      let evadeRoll = 0;
      let critRoll = 0;
      let loot = 0;
      let cashStolen = 0;
      let rpChange = 0;
      let xpGained = 0;
      let revengeBonusApplied = 0;

      if (baseWin) {
        evadeChance = computeEvasionChance(attackerSpeed, attackerDexterity, opponentSpeed, opponentDexterity);
        evadeRoll = Math.random();
        if (evadeRoll < evadeChance) {
          outcomeType = "evaded";
          xpGained = EVASION_XP_REWARD;
        } else {
          damageDealt = baseDmg;
          damageTaken = Math.floor(baseDmg * 0.3);
          critChance = computeCritChance(attackerSpeed, attackerDexterity, opponentSpeed, opponentDexterity);
          critRoll = Math.random();
          criticalHit = critRoll < critChance;
          if (criticalHit) {
            damageDealt = Math.floor(damageDealt * CRIT_DAMAGE_MULTIPLIER);
          }

          if (defenderUserId) {
            const lootResult = calculateWalletCashSteal({
              availableWalletCash: defenderCash,
              defenderHeat: defenderHeatState.heat,
              defenderLevel: opponentLevel,
              recentAttackCount,
              protectionEffects: defenderProtectionEffects,
              defenderPenaltyType,
              defenderPenaltyActive,
            });
            const revengeBonus = getRevengeBonusPercent(revengeMark) + (attackerPerkContext.effects.revenge_bonus_percent ?? 0);
            const lootPerk = attackerPerkContext.effects.loot_percent ?? 0;
            const boostedSteal = Math.floor(lootResult.cashStolen * (1 + lootPerk + revengeBonus));
            cashStolen = Math.min(defenderCash, Math.max(0, Math.floor(boostedSteal * mismatch.lootMultiplier)));
            loot = cashStolen;
            lootProtectedAmount = lootResult.lootProtectedAmount;
            protectionTriggered = lootResult.protectionTriggered;
            antiFarmPenaltyApplied = lootResult.antiFarmPenaltyApplied;
            revengeBonusApplied = revengeBonus;
          } else {
            loot = Math.min(Math.round(defenderCash * LOOT_PERCENT), LOOT_CAP);
            cashStolen = loot;
          }

          rpChange = Math.max(0, Math.round(
            RP_WIN_BASE + clamp((opponentRp - updatedAttacker.rp) / 50, RP_WIN_CLAMP_MIN, RP_WIN_CLAMP_MAX)
          ));
          xpGained = 15 + Math.floor(Math.random() * 10) + (criticalHit ? CRIT_XP_BONUS : 0);
        }
      } else {
        damageDealt = Math.floor(baseDmg * 0.3);
        damageTaken = baseDmg;
        rpChange = RP_LOSS;
        xpGained = 5;
      }

      const win = outcomeType === "win";
      const newAttackerHealth = Math.max(0, updatedAttacker.health - damageTaken);
      const newDefenderHealth = Math.max(0, defenderHealth - damageDealt);
      const attackerHospitalized = newAttackerHealth === 0;
      const defenderHospitalized = newDefenderHealth === 0;
      const attackerHospitalUntil = attackerHospitalized
        ? new Date(now.getTime() + damageTaken * HOSPITAL_MINUTES_PER_DMG * 60 * 1000)
        : updatedAttacker.hospitalUntil;
      const computedDefenderHospitalUntil = defenderHospitalized
        ? new Date(Math.max(defenderHospitalUntil.getTime(), now.getTime() + damageDealt * HOSPITAL_MINUTES_PER_DMG * 60 * 1000))
        : defenderHospitalUntil;

      const attackerHeatDelta = Math.max(1, win ? 2 + (defenderHospitalized ? 2 : 0) : 1);
      const attackerHeatUpdate = applyHeat(updatedAttacker, attackerHeatDelta, now);
      const newXp = updatedAttacker.xp + xpGained;
      const levelResult = processLevelUp({ ...updatedAttacker, xp: newXp });
      const newAttackerRp = Math.max(0, updatedAttacker.rp + rpChange);
      const hospitalResult = computeHospitalResult(defenderHospitalized, attackerHospitalized);

      const txResult = await prisma.$transaction(async (tx) => {
        const finalAttacker = await tx.profile.update({
          where: { userId },
          data: {
            ...atkIncomeUpdate,
            ...atkEnergyUpdate,
            ...atkNerveUpdate,
            ...atkHappinessUpdate,
            cash: updatedAttacker.cash + loot,
            rp: newAttackerRp,
            energy: updatedAttacker.energy - 1,
            health: newAttackerHealth,
            hospitalUntil: attackerHospitalUntil,
            xp: levelResult.xp ?? newXp,
            level: levelResult.level ?? updatedAttacker.level,
            maxHealth: levelResult.maxHealth ?? updatedAttacker.maxHealth,
            heat: attackerHeatUpdate.heat,
            wantedTier: attackerHeatUpdate.wantedTier,
            lastHeatDecayAt: attackerHeatUpdate.lastHeatDecayAt,
          },
        });

        if (defenderUserId) {
          await tx.profile.update({
            where: { userId: defenderUserId },
            data: {
              ...defIncomeUpdate,
              ...defEnergyUpdate,
              ...defNerveUpdate,
              ...defHappinessUpdate,
              cash: Math.max(0, defenderCash - cashStolen),
              health: newDefenderHealth,
              hospitalUntil: computedDefenderHospitalUntil,
              heat: defenderHeatState.heat,
              wantedTier: defenderHeatState.wantedTier,
              lastHeatDecayAt: defenderHeatState.lastHeatDecayAt,
            },
          });
        }

        const createdBattle = await tx.battle.create({
          data: {
            attackerId: userId,
            defenderId: defenderUserId,
            defenderType: isNpc ? "npc" : "player",
            defenderNpcId: isNpc ? opponentId : null,
            defenderName: opponentName,
            win,
            loot,
            rpDelta: rpChange,
            xpGained,
            damageDealt,
            damageTaken,
            hospitalizedTarget: defenderHospitalized,
            hospitalizedSelf: attackerHospitalized,
            aAP: attackerAP,
            dDP: opponentDP,
          },
        });

        const missionUpdates = await progressPlayerMissions(tx, userId, [
          { goalType: "battle_win", amount: win ? 1 : 0 },
          { goalType: "cash_earned", amount: loot },
          { goalType: "hospitalize_player", amount: defenderHospitalized && defenderUserId ? 1 : 0 },
        ]);

        let seasonPointsGained = 0;
        if (win) {
          const battleSeason = await awardSeasonScore(tx, {
            userId,
            category: "battle_win",
            amount: 1,
            repeatPenaltyApplied: antiFarmPenaltyApplied || mismatch.mismatchPenaltyApplied,
          });
          seasonPointsGained += battleSeason.pointsGained;
          if (defenderHospitalized && defenderUserId) {
            const hospitalSeason = await awardSeasonScore(tx, {
              userId,
              category: "hospitalize",
              amount: 1,
              repeatPenaltyApplied: antiFarmPenaltyApplied || mismatch.mismatchPenaltyApplied,
            });
            seasonPointsGained += hospitalSeason.pointsGained;
          }
        }

        let revengeResolved = false;
        if (win && revengeMark) {
          await resolveRevenge(tx, revengeMark.id, now);
          revengeResolved = true;
        }

        let createdRevenge = null;
        if (defenderUserId && outcomeType !== "evaded") {
          if (win) {
            createdRevenge = await maybeCreateRevengeMark(tx, {
              victimUserId: defenderUserId,
              attackerUserId: userId,
              battleId: createdBattle.id,
              cashLost: cashStolen,
              hospitalized: defenderHospitalized,
              now,
            });
          } else {
            createdRevenge = await maybeCreateRevengeMark(tx, {
              victimUserId: userId,
              attackerUserId: defenderUserId,
              battleId: createdBattle.id,
              cashLost: 0,
              hospitalized: attackerHospitalized,
              now,
            });
          }
        }

        const attackMetadata = {
          protectionTriggered,
          lootProtectedAmount,
          antiFarmPenaltyApplied,
          targetHeatBand,
          outcomeType,
          criticalHit,
          revengeBonusApplied,
          mismatchPenaltyApplied: mismatch.mismatchPenaltyApplied,
        };

        await tx.eventLog.create({
          data: {
            userId,
            type: isNpc ? "attacked_npc" : win ? "attack_win" : "attack_loss",
            message: win
              ? `Attacked ${opponentName} and stole $${loot.toLocaleString()}`
              : outcomeType === "evaded"
                ? `Attacked ${opponentName}, but they evaded.`
                : `Attacked ${opponentName} and lost.`,
            metadata: {
              battleId: createdBattle.id,
              cashStolen,
              heatChange: attackerHeatDelta,
              seasonPointsGained,
              revengeResolved,
              revengeCreated: !!createdRevenge,
              ...attackMetadata,
            },
          },
        });

        await tx.attackLog.create({
          data: {
            userId,
            type: outcomeType === "evaded" ? "attack_evaded" : isNpc ? "attacked_npc" : win ? "attack_win" : "attack_loss",
            attackerId: userId,
            defenderId: defenderUserId,
            attackerName: attackerProfileRaw.name || "You",
            defenderName: opponentName,
            targetType: isNpc ? "npc" : "player",
            result: win ? "win" : "loss",
            damageDealt,
            damageTaken,
            loot,
            cashStolen,
            heatChange: attackerHeatDelta,
            metadata: attackMetadata,
            rpChange,
            xpGained,
            hospitalResult,
            revengeTargetId: defenderUserId,
            revengeAvailable: !!createdRevenge,
          },
        });

        if (defenderUserId) {
          await tx.eventLog.create({
            data: {
              userId: defenderUserId,
              type: "attacked",
              message: win
                ? `${attackerProfileRaw.name || "A rival"} attacked you and stole $${loot.toLocaleString()}`
                : outcomeType === "evaded"
                  ? `${attackerProfileRaw.name || "A rival"} attacked you and you evaded.`
                  : `${attackerProfileRaw.name || "A rival"} attacked you and lost.`,
              metadata: {
                battleId: createdBattle.id,
                cashStolen,
                protectionTriggered,
                lootProtectedAmount,
                targetHeatBand,
                revengeCreated: !!createdRevenge,
              },
            },
          });

          await tx.attackLog.create({
            data: {
              userId: defenderUserId,
              type: outcomeType === "evaded" ? "attacked_by_player_evaded" : "attacked_by_player",
              attackerId: userId,
              defenderId: defenderUserId,
              attackerName: attackerProfileRaw.name || "Rival",
              defenderName: opponentName,
              targetType: "player",
              result: outcomeType === "evaded" ? "win" : win ? "loss" : "win",
              damageDealt: damageTaken,
              damageTaken: damageDealt,
              loot: -loot,
              cashStolen: loot,
              heatChange: 0,
              metadata: { protectionTriggered, lootProtectedAmount, targetHeatBand, revengeCreated: !!createdRevenge },
              rpChange: 0,
              xpGained: 0,
              hospitalResult,
              revengeTargetId: userId,
              revengeAvailable: !!createdRevenge,
            },
          });
        }

        return { finalAttacker, createdBattle, missionUpdates, seasonPointsGained, revengeResolved, revengeCreated: !!createdRevenge };
      });

      const finalCombat = await computeCombatStats(userId, prisma);

      return reply.send({
        battleId: txResult.createdBattle.id,
        opponent: {
          id: opponentId,
          type: isNpc ? "npc" : "player",
          name: opponentName,
          level: opponentLevel,
        },
        result: win ? "win" : "loss",
        win,
        outcomeType: outcomeType === "evaded" ? "evaded" : win ? "win" : "loss",
        loot,
        cashStolen,
        lootProtectedAmount,
        heatChange: attackerHeatDelta,
        newHeat: txResult.finalAttacker.heat,
        targetHeatBand,
        protectionTriggered,
        antiFarmPenaltyApplied,
        mismatchPenaltyApplied: mismatch.mismatchPenaltyApplied,
        missionUpdates: txResult.missionUpdates,
        revengeCreated: txResult.revengeCreated,
        revengeResolved: txResult.revengeResolved,
        revengeBonusApplied,
        seasonPointsGained: txResult.seasonPointsGained,
        rpChange,
        xpGained,
        attackerAP,
        defenderDP: opponentDP,
        pWin: Math.round(pWin * 1000) / 1000,
        roll: Math.round(roll * 1000) / 1000,
        criticalHit,
        evadeChance: Math.round(evadeChance * 1000) / 1000,
        evadeRoll: Math.round(evadeRoll * 1000) / 1000,
        critChance: Math.round(critChance * 1000) / 1000,
        critRoll: Math.round(critRoll * 1000) / 1000,
        damageDealt,
        damageTaken,
        hospitalizedTarget: defenderHospitalized,
        hospitalizedSelf: attackerHospitalized,
        attackerHospitalized,
        defenderHospitalized,
        eventTimestamp: now.toISOString(),
        updatedProfile: {
          cash: txResult.finalAttacker.cash,
          rp: txResult.finalAttacker.rp,
          energy: txResult.finalAttacker.energy,
          health: txResult.finalAttacker.health,
          maxHealth: txResult.finalAttacker.maxHealth,
          level: txResult.finalAttacker.level,
          xp: txResult.finalAttacker.xp,
          ap: finalCombat.totalStats.ap,
          dp: finalCombat.totalStats.dp,
        },
      });
    } catch (err) {
      request.log.error(err, "/battle/attack error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });
}
