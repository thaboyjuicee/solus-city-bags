import { FastifyInstance } from "fastify";
import { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { requireAuth } from "../lib/auth";
import {
  applyIncome,
  applyEnergy,
  applyNerve,
  applyHappiness,
  applyHospitalRecovery,
  clamp,
  computeCombatStats,
  isInHospital,
  processLevelUp,
} from "../lib/game";
import {
  BATTLE_DAMAGE_MAX,
  BATTLE_DAMAGE_MIN,
  LOOT_PERCENT,
  LOOT_CAP,
  RP_WIN_BASE,
  RP_WIN_CLAMP_MIN,
  RP_WIN_CLAMP_MAX,
  RP_LOSS,
  CRIT_CHANCE_BASE,
  CRIT_CHANCE_MIN,
  CRIT_CHANCE_MAX,
  CRIT_DAMAGE_MULTIPLIER,
  CRIT_XP_BONUS,
  EVASION_CHANCE_BASE,
  EVASION_CHANCE_MIN,
  EVASION_CHANCE_MAX,
  EVASION_XP_REWARD,
  HOSPITAL_MINUTES_PER_DMG,
} from "../lib/constants";
import { buildNpcForPlayer, NPC_POOL } from "../lib/npcs";

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
  const advantage = (defenderSpeed + defenderDex) - (attackerSpeed + attackerDex);
  const rawChance = EVASION_CHANCE_BASE + advantage / 600;
  return clamp(rawChance, EVASION_CHANCE_MIN, EVASION_CHANCE_MAX);
}

function computeCritChance(
  attackerSpeed: number,
  attackerDex: number,
  defenderSpeed: number,
  defenderDex: number
): number {
  const advantage = (attackerSpeed + attackerDex) - (defenderSpeed + defenderDex);
  const rawChance = CRIT_CHANCE_BASE + advantage / 700;
  return clamp(rawChance, CRIT_CHANCE_MIN, CRIT_CHANCE_MAX);
}

function getRepeatedAttackRewardMultiplier(consecutiveAttackCount: number): number {
  if (consecutiveAttackCount <= 0) return 1;
  if (consecutiveAttackCount === 1) return 0.6;
  if (consecutiveAttackCount === 2) return 0.3;
  return 0.2;
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

    const targetId = parsed.data.targetId;
    const targetTypeHint = parsed.data.targetType;
    if (!targetId) {
      return reply.status(400).send({ error: "targetId is required" });
    }

    if (targetId === userId) {
      return reply.status(400).send({ error: "Cannot attack yourself" });
    }

    try {
      const now = new Date();
      const attackerProfileRaw = await prisma.profile.findUnique({ where: { userId } });
      if (!attackerProfileRaw) return reply.status(404).send({ error: "Your profile not found" });

      const attackerHospitalUpdate = applyHospitalRecovery(attackerProfileRaw);
      const attackerProfile = { ...attackerProfileRaw, ...attackerHospitalUpdate };
      if (attackerHospitalUpdate.health !== undefined) {
        await prisma.$transaction([
          prisma.profile.update({ where: { userId }, data: attackerHospitalUpdate }),
          prisma.eventLog.create({
            data: {
              userId,
              type: "hospital",
              message: "Discharged from hospital. Health fully restored.",
            },
          }),
        ]);
      }

      if (isInHospital(attackerProfile)) {
        return reply.status(400).send({
          code: "IN_HOSPITAL",
          error: "You are in the hospital",
          recoverAt: attackerProfile.hospitalUntil.toISOString(),
        });
      }

      const atkIncomeUpdate = applyIncome(attackerProfile);
      const atkEnergyUpdate = applyEnergy({ ...attackerProfile, ...atkIncomeUpdate });
      const atkNerveUpdate = applyNerve({ ...attackerProfile, ...atkIncomeUpdate, ...atkEnergyUpdate });
      const atkHappinessUpdate = applyHappiness({ ...attackerProfile, ...atkIncomeUpdate, ...atkEnergyUpdate, ...atkNerveUpdate });
      const updatedAttacker = { ...attackerProfile, ...atkIncomeUpdate, ...atkEnergyUpdate, ...atkNerveUpdate, ...atkHappinessUpdate };

      if (updatedAttacker.energy < 1) {
        await prisma.profile.update({ where: { userId }, data: { ...atkIncomeUpdate, ...atkEnergyUpdate, ...atkNerveUpdate, ...atkHappinessUpdate } });
        return reply.status(400).send({ error: "Not enough energy" });
      }

      const attackerStats = await computeCombatStats(userId, prisma);
      const attackerAP = attackerStats.totalStats.ap;
      const attackerSpeed = attackerStats.totalStats.speed;
      const attackerDexterity = attackerStats.totalStats.dexterity;

      const isNpc = targetTypeHint === "npc";

      let opponentId: string;
      let opponentName: string;
      let opponentLevel: number;
      let opponentRp: number;
      let opponentDP: number;
      let opponentSpeed: number;
      let opponentDexterity: number;
      let defenderCash: number;
      let defenderHealth: number;
      let defenderHospitalUntil = new Date("1970-01-01T00:00:00.000Z");
      let updatedDefenderHospitalUntil = new Date("1970-01-01T00:00:00.000Z");
      let defenderProfileUserId: string | null = null;
      let defIncomeUpdate: Record<string, unknown> = {};
      let defEnergyUpdate: Record<string, unknown> = {};
      let defNerveUpdate: Record<string, unknown> = {};
      let defHappinessUpdate: Record<string, unknown> = {};

      if (!isNpc) {
        const defenderProfileRaw = await prisma.profile.findUnique({ where: { userId: targetId } });
        if (!defenderProfileRaw) return reply.status(404).send({ error: "Target not found" });

        const defenderHospitalUpdate = applyHospitalRecovery(defenderProfileRaw);
        const defenderProfile = { ...defenderProfileRaw, ...defenderHospitalUpdate };
        if (defenderHospitalUpdate.health !== undefined) {
          await prisma.$transaction([
            prisma.profile.update({ where: { userId: targetId }, data: defenderHospitalUpdate }),
            prisma.eventLog.create({
              data: {
                userId: targetId,
                type: "hospital",
                message: "Discharged from hospital. Health fully restored.",
              },
            }),
          ]);
        }

        if (defenderProfile.shieldUntil > now) {
          return reply.status(400).send({ error: "Target is shielded" });
        }
        if (isInHospital(defenderProfile)) {
          return reply.status(400).send({ error: "Target is in hospital" });
        }

        defIncomeUpdate = applyIncome(defenderProfile);
        defEnergyUpdate = applyEnergy({ ...defenderProfile, ...defIncomeUpdate });
        defNerveUpdate = applyNerve({ ...defenderProfile, ...defIncomeUpdate, ...defEnergyUpdate });
        defHappinessUpdate = applyHappiness({ ...defenderProfile, ...defIncomeUpdate, ...defEnergyUpdate, ...defNerveUpdate });
        const updatedDefender = { ...defenderProfile, ...defIncomeUpdate, ...defEnergyUpdate, ...defNerveUpdate, ...defHappinessUpdate };
        const defenderStats = await computeCombatStats(targetId, prisma);

        opponentId = targetId;
        opponentName = defenderProfile.name || "Player";
        opponentLevel = defenderProfile.level;
        opponentRp = defenderProfile.rp;
        opponentDP = defenderStats.totalStats.dp;
        opponentSpeed = defenderStats.totalStats.speed;
        opponentDexterity = defenderStats.totalStats.dexterity;
        defenderCash = updatedDefender.cash;
        defenderHealth = updatedDefender.health;
        updatedDefenderHospitalUntil = updatedDefender.hospitalUntil;
        defenderHospitalUntil = updatedDefender.hospitalUntil;
        defenderProfileUserId = targetId;
      } else {
        const template = NPC_POOL.find((n) => n.id === targetId);
        if (!template) {
          return reply.status(400).send({ error: "Invalid NPC target" });
        }
        const npc = buildNpcForPlayer(updatedAttacker.level, updatedAttacker.rp, template);

        opponentId = npc.id;
        opponentName = npc.displayName;
        opponentLevel = npc.level;
        opponentRp = npc.rp;
        opponentDP = npc.defensePower;
        opponentSpeed = npc.speed;
        opponentDexterity = npc.dexterity;
        defenderCash = npc.cash;
        defenderHealth = npc.health;
      }

      let repeatedAttackMultiplier = 1;
      if (defenderProfileUserId) {
        const recentAttackLogs = await prisma.attackLog.findMany({
          where: {
            userId,
            targetType: "player",
          },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: { defenderId: true },
        });

        let consecutiveTargetHits = 0;
        for (const entry of recentAttackLogs) {
          if (entry.defenderId !== defenderProfileUserId) break;
          consecutiveTargetHits += 1;
        }

        repeatedAttackMultiplier = getRepeatedAttackRewardMultiplier(consecutiveTargetHits);
      }

      const pWin = attackerAP / (attackerAP + opponentDP);
      const roll = Math.random();
      const baseWin = roll < pWin;

      const baseDmg = BATTLE_DAMAGE_MIN + Math.floor(Math.random() * (BATTLE_DAMAGE_MAX - BATTLE_DAMAGE_MIN + 1));
      const winnerDmg = Math.floor(baseDmg * 0.3);
      const loserDmg = baseDmg;

      let damageDealt = 0;
      let damageTaken = 0;
      let outcomeType: "win" | "loss" | "evaded" = baseWin ? "win" : "loss";
      let criticalHit = false;
      let evadeChance = 0;
      let critChance = 0;
      let evadeRoll = 0;
      let critRoll = 0;
      let loot = 0;
      let rpChange = 0;
      let xpGained = 0;

      if (baseWin) {
        evadeChance = computeEvasionChance(attackerSpeed, attackerDexterity, opponentSpeed, opponentDexterity);
        evadeRoll = Math.random();
        const evaded = evadeRoll < evadeChance;

        if (evaded) {
          outcomeType = "evaded";
          xpGained = EVASION_XP_REWARD;
          damageDealt = 0;
          damageTaken = 0;
          rpChange = 0;
          loot = 0;
        } else {
          damageDealt = loserDmg;
          damageTaken = winnerDmg;
          critChance = computeCritChance(attackerSpeed, attackerDexterity, opponentSpeed, opponentDexterity);
          critRoll = Math.random();
          criticalHit = critRoll < critChance;
          if (criticalHit) {
            damageDealt = Math.floor(damageDealt * CRIT_DAMAGE_MULTIPLIER);
          }

          loot = Math.min(Math.round(defenderCash * LOOT_PERCENT), LOOT_CAP);
          const baseRpChange = Math.round(
            RP_WIN_BASE + clamp((opponentRp - updatedAttacker.rp) / 50, RP_WIN_CLAMP_MIN, RP_WIN_CLAMP_MAX)
          );
          let baseXpGain = 15 + Math.floor(Math.random() * 10);
          if (criticalHit) {
            baseXpGain += CRIT_XP_BONUS;
          }
          rpChange = Math.max(0, Math.floor(baseRpChange * repeatedAttackMultiplier));
          loot = Math.floor(loot * repeatedAttackMultiplier);
          xpGained = Math.floor(baseXpGain * repeatedAttackMultiplier);
        }
      } else {
        damageDealt = winnerDmg;
        damageTaken = loserDmg;
        rpChange = RP_LOSS;
        xpGained = 5;
      }

      const win = outcomeType === "win";
      const evaded = outcomeType === "evaded";
      const newAttackerHealth = Math.max(0, updatedAttacker.health - damageTaken);
      const newDefenderHealth = Math.max(0, defenderHealth - damageDealt);

      const attackerHospitalized = newAttackerHealth === 0;
      const defenderHospitalized = newDefenderHealth === 0;

      const attackerHospitalUntil = attackerHospitalized
        ? new Date(now.getTime() + damageTaken * HOSPITAL_MINUTES_PER_DMG * 60 * 1000)
        : updatedAttacker.hospitalUntil;
      const computedDefHospitalUntil = defenderProfileUserId
        ? defenderHospitalized
          ? new Date(
            Math.max(
              updatedDefenderHospitalUntil.getTime(),
              now.getTime() + damageDealt * HOSPITAL_MINUTES_PER_DMG * 60 * 1000
            )
          )
          : updatedDefenderHospitalUntil
        : defenderHospitalUntil;

      const newAttackerRp = Math.max(0, updatedAttacker.rp + rpChange);
      const newXp = updatedAttacker.xp + xpGained;
      const levelResult = processLevelUp({ ...updatedAttacker, xp: newXp });

      let finalAttacker: Awaited<ReturnType<typeof prisma.profile.update>>;
      let createdBattle: Awaited<ReturnType<typeof prisma.battle.create>>;

      if (defenderProfileUserId) {
        const txResult = await prisma.$transaction(async (tx) => {
          const attacker = await tx.profile.update({
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
            },
          });

          await tx.profile.update({
            where: { userId: defenderProfileUserId },
            data: {
              ...defIncomeUpdate,
              ...defEnergyUpdate,
              ...defNerveUpdate,
              ...defHappinessUpdate,
              cash: Math.max(0, defenderCash - loot),
              health: newDefenderHealth,
              hospitalUntil: computedDefHospitalUntil,
            },
          });

          const battle = await tx.battle.create({
            data: {
              attackerId: userId,
              defenderId: defenderProfileUserId,
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

          return { attacker, battle };
        });

        finalAttacker = txResult.attacker;
        createdBattle = txResult.battle;
      } else {
        [finalAttacker, createdBattle] = await prisma.$transaction([
          prisma.profile.update({
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
            },
          }),
          prisma.battle.create({
            data: {
              attackerId: userId,
              defenderId: null,
              defenderType: "npc",
              defenderNpcId: opponentId,
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
          }),
        ]);
      }

      const hospitalResult = computeHospitalResult(defenderHospitalized, attackerHospitalized);
      const shouldEnableRevenge = hospitalResult === "target" || hospitalResult === "both";
      const attackerName = attackerProfile.name || "You";

      const attackerAttackType = evaded ? "attack_evaded" : isNpc ? "attacked_npc" : win ? "attack_win" : "attack_loss";
      const attackerAttackMessage = evaded
        ? `Attacked ${opponentName}, but they evaded.`
        : win
          ? `Attacked ${opponentName} and won. Looted $${loot.toLocaleString()}`
          : `Attacked ${opponentName} and lost.`;

      await prisma.eventLog.create({
        data: {
          userId,
          type: attackerAttackType,
          message: attackerAttackMessage,
        },
      });

      await prisma.attackLog.create({
        data: {
          userId,
          type: attackerAttackType,
          attackerId: userId,
          defenderId: defenderProfileUserId,
          attackerName,
          defenderName: opponentName,
          targetType: isNpc ? "npc" : "player",
          result: win ? "win" : "loss",
          damageDealt,
          damageTaken,
          loot,
          rpChange,
          xpGained,
          hospitalResult,
          revengeTargetId: defenderProfileUserId,
          revengeAvailable: false,
        },
      });

      if (defenderProfileUserId) {
        const defenderLogType = evaded ? "attacked_by_player_evaded" : "attacked_by_player";
        const defenderResult = evaded ? "win" : win ? "loss" : "win";
        const defenderMessage = evaded
          ? `${attackerName} attacked you and you evaded.`
          : win
            ? `${attackerName} attacked you and stole $${loot.toLocaleString()}`
            : `${attackerName} attacked you and lost`;

        await prisma.eventLog.create({
          data: {
            userId: defenderProfileUserId,
            type: "attacked",
            message: defenderMessage,
          },
        });

        await prisma.attackLog.create({
          data: {
            userId: defenderProfileUserId,
          type: defenderLogType,
            attackerId: userId,
            defenderId: defenderProfileUserId,
            attackerName,
            defenderName: opponentName,
            targetType: "player",
            result: defenderResult,
            damageDealt: damageTaken,
            damageTaken: damageDealt,
            loot: -loot,
            rpChange: 0,
            xpGained: 0,
            hospitalResult,
            revengeTargetId: userId,
            revengeAvailable: shouldEnableRevenge,
          },
        });
      }

      if (attackerHospitalized) {
        await prisma.eventLog.create({
          data: { userId, type: "hospital", message: "Hospitalized from battle injuries" },
        });
      }

      if (defenderHospitalized && defenderProfileUserId) {
        await prisma.eventLog.create({
          data: {
            userId: defenderProfileUserId,
            type: "hospital",
            message: `Hospitalized after attack by ${attackerName}`,
          },
        });
      }

      const finalCombat = await computeCombatStats(userId, prisma);

      return reply.send({
        battleId: createdBattle.id,
        opponent: {
          id: opponentId,
          type: isNpc ? "npc" : "player",
          name: opponentName,
          level: opponentLevel,
        },
        result: win ? "win" : "loss",
        win,
        outcomeType: evaded ? "evaded" : win ? "win" : "loss",
        loot,
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
          cash: finalAttacker.cash,
          rp: finalAttacker.rp,
          energy: finalAttacker.energy,
          health: finalAttacker.health,
          maxHealth: finalAttacker.maxHealth,
          level: finalAttacker.level,
          xp: finalAttacker.xp,
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
