import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../lib/auth";
import { applyIncome, applyEnergy, applyHappiness, computeAPDP } from "../lib/game";
import { RP_BAND_FRACTION, RP_BAND_MIN, TARGET_COUNT } from "../lib/constants";
import { buildNpcForPlayer, NPC_POOL } from "../lib/npcs";

export default async function targetsRoutes(
  fastify: FastifyInstance,
  { prisma }: { prisma: PrismaClient }
) {
  fastify.get("/targets", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;

    try {
      // Apply income/energy to attacker
      const attackerProfile = await prisma.profile.findUnique({ where: { userId } });
      if (!attackerProfile) return reply.status(404).send({ error: "Profile not found" });

      const incomeUpdate = applyIncome(attackerProfile);
      const energyUpdate = applyEnergy({ ...attackerProfile, ...incomeUpdate });
      const happinessUpdate = applyHappiness({ ...attackerProfile, ...incomeUpdate, ...energyUpdate });
      await prisma.profile.update({ where: { userId }, data: { ...incomeUpdate, ...energyUpdate, ...happinessUpdate } });

      const rp = attackerProfile.rp;
      const band = Math.max(rp * RP_BAND_FRACTION, RP_BAND_MIN);
      const rpMin = Math.max(0, rp - band);
      const rpMax = rp + band;
      const now = new Date();

      const excludedIds = new Set([userId]);

      // Find candidates in RP band, not shielded
      const candidates = await prisma.profile.findMany({
        where: {
          rp: { gte: rpMin, lte: rpMax },
          shieldUntil: { lte: now },
          hospitalUntil: { lte: now },
          userId: { notIn: Array.from(excludedIds) },
        },
        include: { user: true },
      });

      // Shuffle and take TARGET_COUNT
      const shuffled = candidates.sort(() => Math.random() - 0.5).slice(0, TARGET_COUNT);

      // Compute AP/DP for each target
      const playerTargets = await Promise.all(
        shuffled.map(async (target) => {
          const { ap, dp } = await computeAPDP(target.userId, prisma);
          return {
            id: target.userId,
            userId: target.userId,
            type: "player" as const,
            displayName: target.name || target.user.wallet.slice(0, 6) + "...",
            name: target.name || target.user.wallet.slice(0, 6) + "...",
            wallet: target.user.wallet.slice(0, 6) + "..." + target.user.wallet.slice(-4),
            rp: target.rp,
            level: target.level,
            attackPower: ap,
            defensePower: dp,
            ap,
            dp,
            shieldActive: false,
            shielded: false,
            inHospital: target.hospitalUntil ? target.hospitalUntil > now : false,
            avatarKey: "player",
          };
        })
      );

      const remaining = Math.max(0, TARGET_COUNT - playerTargets.length);
      const eliteTemplate = NPC_POOL.find((npc) => npc.id === "obsidian-colossus");
      const npcPool = NPC_POOL.filter((npc) => npc.id !== "obsidian-colossus");
      const slotsForRegularNpcs = Math.max(0, remaining - (eliteTemplate ? 1 : 0));
      const shuffledNpcPool = [...npcPool].sort(() => Math.random() - 0.5).slice(0, slotsForRegularNpcs);

      const buildTarget = (npcTemplate: typeof NPC_POOL[number]) => {
        const built = buildNpcForPlayer(attackerProfile.level, attackerProfile.rp, npcTemplate);
        return {
          id: built.id,
          userId: built.id,
          type: "npc" as const,
          displayName: built.displayName,
          name: built.displayName,
          wallet: "NPC",
          rp: built.rp,
          level: built.level,
          attackPower: built.attackPower,
          defensePower: built.defensePower,
          ap: built.attackPower,
          dp: built.defensePower,
          shieldActive: false,
          shielded: false,
          inHospital: false,
          avatarKey: built.avatarKey,
          flavor: built.flavor,
          health: built.health,
          maxHealth: built.maxHealth,
          strength: built.strength,
          speed: built.speed,
          defense: built.defense,
          dexterity: built.dexterity,
          cash: built.cash,
        };
      };

      const npcTargets = [
        ...(remaining > 0 && eliteTemplate ? [buildTarget(eliteTemplate)] : []),
        ...shuffledNpcPool.map(buildTarget),
      ];

      return reply.send([...playerTargets, ...npcTargets]);
    } catch (err) {
      request.log.error(err, "/targets error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });
}
