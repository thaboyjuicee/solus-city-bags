import { FastifyInstance } from "fastify";
import { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { requireAuth } from "../lib/auth";
import { SYNDICATE_AP_BUFF, SYNDICATE_MAX_MEMBERS } from "../lib/constants";
import { canManageRoles, canRecruit, canWithdrawVault, SYNDICATE_ROLES } from "../lib/syndicates/roles";
import { addContributionScore, addVaultContribution, applySyndicateVaultTransfer } from "../lib/syndicates/contributions";
import { serializeChampionshipSyndicateState, serializeSyndicateOverview, serializeWarSummary } from "../lib/serializers/syndicates";
import { SYNDICATE_VAULT_MAX_WITHDRAW_PERCENT, SYNDICATE_VAULT_MIN_WITHDRAW } from "../lib/config/balance";

class SyndicateRouteError extends Error {
  status: number;
  payload: { error: string };

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.payload = { error: message };
  }
}

const createBody = z.object({
  name: z.string().min(3).max(24),
  description: z.string().max(180).optional(),
});

const amountBody = z.object({ amount: z.number().positive() });
const roleBody = z.object({
  targetUserId: z.string().min(1),
  role: z.enum(SYNDICATE_ROLES),
});

export default async function syndicateRoutes(
  fastify: FastifyInstance,
  { prisma }: { prisma: PrismaClient }
) {
  fastify.post("/syndicates", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;
    const parsed = createBody.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Invalid syndicate payload" });

    try {
      const existingMembership = await prisma.syndicateMember.findUnique({ where: { userId } });
      if (existingMembership) return reply.status(400).send({ error: "Already in a syndicate" });

      const created = await prisma.$transaction(async (tx) => {
        const syndicate = await tx.syndicate.create({
          data: {
            name: parsed.data.name.trim(),
            description: parsed.data.description?.trim() ?? "",
            leaderId: userId,
            creatorId: userId,
            buffType: "ap",
            buffValue: SYNDICATE_AP_BUFF,
          },
        });

        await tx.syndicateMember.create({
          data: {
            syndicateId: syndicate.id,
            userId,
            role: "leader",
          },
        });

        await tx.eventLog.create({
          data: {
            userId,
            type: "syndicate_created",
            message: `Created syndicate ${syndicate.name}`,
          },
        });

        return syndicate;
      });

      return reply.send(created);
    } catch (err) {
      request.log.error(err, "/syndicates POST error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.get("/syndicates", { preHandler: requireAuth }, async (request, reply) => {
    const viewerMembership = await prisma.syndicateMember.findUnique({ where: { userId: request.user.userId } });
    try {
      const syndicates = await prisma.syndicate.findMany({
        include: {
          members: { include: { user: { include: { profile: true } } } },
          leader: true,
          territories: { include: { territory: true } },
          warsAsAttacker: { where: { status: "active" }, take: 1 },
          warsAsDefender: { where: { status: "active" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
      });

      const data = syndicates.map((s) => {
        const totalRp = s.members.reduce((sum, m) => sum + (m.user.profile?.rp ?? 0), 0);
        return {
          ...serializeSyndicateOverview(s),
          leaderId: s.leaderId,
          creatorId: s.creatorId ?? s.leaderId,
          memberCount: s.members.length,
          totalRp,
          territoriesOwned: s.territories.map((t) => ({ id: t.territory.id, name: t.territory.name, code: t.territory.code })),
          currentWarStatus: s.warsAsAttacker[0]?.status ?? s.warsAsDefender[0]?.status ?? null,
          rolePermissions: viewerMembership?.syndicateId === s.id ? {
            manageRoles: canManageRoles(viewerMembership.role),
            withdrawVault: canWithdrawVault(viewerMembership.role),
            recruit: canRecruit(viewerMembership.role),
          } : null,
        };
      });

      return reply.send(data);
    } catch (err) {
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.get<{ Params: { id: string } }>("/syndicates/:id", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params;
    const { userId } = request.user;

    try {
      const viewerMembership = await prisma.syndicateMember.findUnique({ where: { userId } });
      const syndicate = await prisma.syndicate.findUnique({
        where: { id },
        include: {
          members: {
            include: { user: { include: { profile: true } } },
            orderBy: [{ contributionScore: "desc" }, { joinedAt: "asc" }],
          },
          leader: true,
          territories: { include: { territory: true } },
          warsAsAttacker: {
            where: { status: "active" },
            include: { territory: true, attackerSyndicate: { select: { id: true, name: true } }, defenderSyndicate: { select: { id: true, name: true } } },
            take: 1,
          },
          warsAsDefender: {
            where: { status: "active" },
            include: { territory: true, attackerSyndicate: { select: { id: true, name: true } }, defenderSyndicate: { select: { id: true, name: true } } },
            take: 1,
          },
        },
      });

      if (!syndicate) return reply.status(404).send({ error: "Syndicate not found" });

      const members = syndicate.members.map((m) => ({
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
        contributionScore: m.contributionScore,
        warParticipation: m.warParticipation,
        name: m.user.profile?.name || m.user.wallet.slice(0, 6) + "...",
        rp: m.user.profile?.rp ?? 0,
        level: m.user.profile?.level ?? 1,
      }));

      const currentWar = syndicate.warsAsAttacker[0] ?? syndicate.warsAsDefender[0] ?? null;
      const championshipEntry = await prisma.championshipEntry.findFirst({
        where: { syndicateId: syndicate.id },
        orderBy: { createdAt: "desc" },
      });
      const [championshipMatch, championHistory] = await Promise.all([
        championshipEntry
          ? prisma.championshipMatch.findFirst({
              where: {
                championshipSeasonId: championshipEntry.championshipSeasonId,
                OR: [{ syndicateAId: syndicate.id }, { syndicateBId: syndicate.id }],
              },
              orderBy: [{ round: "desc" }, { startsAt: "desc" }],
            })
          : Promise.resolve(null),
        prisma.hallOfFameEntry.findMany({
          where: { syndicateId: syndicate.id, category: "championship_champion" },
          include: { season: true },
          orderBy: { createdAt: "desc" },
          take: 3,
        }),
      ]);

      return reply.send({
        ...serializeSyndicateOverview(syndicate),
        leaderId: syndicate.leaderId,
        creatorId: syndicate.creatorId ?? syndicate.leaderId,
        memberCount: members.length,
        totalRp: members.reduce((sum, m) => sum + m.rp, 0),
        members,
        territoriesOwned: syndicate.territories.map((control) => ({
          id: control.territory.id,
          name: control.territory.name,
          code: control.territory.code,
          influence: control.influence,
        })),
        memberContributionLeaders: members.slice(0, 5),
        currentWarStatus: currentWar ? serializeWarSummary(currentWar) : null,
        championshipQualification: serializeChampionshipSyndicateState({
          entry: championshipEntry,
          currentMatch: championshipMatch,
        }),
        championHistory: championHistory.map((entry) => ({
          id: entry.id,
          seasonId: entry.seasonId,
          seasonName: entry.season.name,
          rank: entry.rank,
          display: entry.displayJson ?? null,
        })),
        rolePermissions: viewerMembership?.syndicateId === syndicate.id
          ? {
              manageRoles: canManageRoles(viewerMembership.role),
              withdrawVault: canWithdrawVault(viewerMembership.role),
              recruit: canRecruit(viewerMembership.role),
            }
          : null,
      });
    } catch (err) {
      request.log.error(err, "/syndicates/:id error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.post<{ Params: { id: string } }>("/syndicates/:id/join", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;
    const { id } = request.params;

    try {
      const membership = await prisma.$transaction(async (tx) => {
        const locked = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "Syndicate" WHERE "id" = ${id} FOR UPDATE`;
        if (locked.length === 0) throw new SyndicateRouteError(404, "Syndicate not found");

        const existingMembership = await tx.syndicateMember.findUnique({ where: { userId } });
        if (existingMembership) throw new SyndicateRouteError(400, "Already in a syndicate");

        const memberCount = await tx.syndicateMember.count({ where: { syndicateId: id } });
        if (memberCount >= SYNDICATE_MAX_MEMBERS) throw new SyndicateRouteError(400, "Syndicate is full");

        const createdMembership = await tx.syndicateMember.create({
          data: { syndicateId: id, userId, role: "member" },
        });

        await tx.eventLog.create({ data: { userId, type: "syndicate_joined", message: "Joined a syndicate" } });
        return createdMembership;
      });

      return reply.send({ success: true, membership });
    } catch (err) {
      if (err instanceof SyndicateRouteError) return reply.status(err.status).send(err.payload);
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return reply.status(400).send({ error: "Already in a syndicate" });
      request.log.error(err, "/syndicates/:id/join error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.post("/syndicates/leave", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;

    try {
      const membership = await prisma.syndicateMember.findUnique({ where: { userId } });
      if (!membership) return reply.status(400).send({ error: "Not in a syndicate" });

      const isLeader = membership.role === "leader";
      if (isLeader) {
        const count = await prisma.syndicateMember.count({ where: { syndicateId: membership.syndicateId } });
        if (count > 1) return reply.status(400).send({ error: "Leader must transfer or disband before leaving" });

        await prisma.$transaction(async (tx) => {
          const syndicateId = membership.syndicateId;

          // Find all wars this syndicate is party to (as attacker, defender, or winner)
          const involvedWars = await tx.syndicateWar.findMany({
            where: { OR: [{ attackerSyndicateId: syndicateId }, { defenderSyndicateId: syndicateId }] },
            select: { id: true },
          });
          const warIds = involvedWars.map((w) => w.id);

          // Delete all war actions for those wars (both sides' actions reference the war via warId)
          if (warIds.length > 0) {
            await tx.syndicateWarAction.deleteMany({ where: { warId: { in: warIds } } });
            await tx.syndicateWar.deleteMany({ where: { id: { in: warIds } } });
          }

          await tx.territoryContribution.deleteMany({ where: { syndicateId } });
          await tx.territoryControl.deleteMany({ where: { syndicateId } });
          await tx.championshipMatch.deleteMany({
            where: { OR: [{ syndicateAId: syndicateId }, { syndicateBId: syndicateId }] },
          });
          await tx.championshipEntry.deleteMany({ where: { syndicateId } });
          await tx.hallOfFameEntry.deleteMany({ where: { syndicateId } });
          await tx.syndicateMember.delete({ where: { id: membership.id } });
          await tx.syndicate.delete({ where: { id: syndicateId } });
          await tx.eventLog.create({ data: { userId, type: "syndicate_left", message: "Left and disbanded your syndicate" } });
        });

        return reply.send({ success: true, disbanded: true });
      }

      await prisma.$transaction([
        prisma.syndicateMember.delete({ where: { id: membership.id } }),
        prisma.eventLog.create({ data: { userId, type: "syndicate_left", message: "Left your syndicate" } }),
      ]);

      return reply.send({ success: true, disbanded: false });
    } catch (err) {
      request.log.error(err, "/syndicates/leave error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.post("/syndicates/vault/deposit", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = amountBody.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Invalid amount" });
    const { userId } = request.user;

    try {
      const membership = await prisma.syndicateMember.findUnique({ where: { userId } });
      if (!membership) return reply.status(400).send({ error: "Must be in a syndicate" });

      const result = await prisma.$transaction(async (tx) => {
        const profile = await tx.profile.findUnique({ where: { userId } });
        if (!profile) throw new Error("Profile not found");
        if (parsed.data.amount > profile.cash) throw new SyndicateRouteError(400, "Insufficient wallet cash");

        const [updatedProfile, updatedSyndicate] = await Promise.all([
          tx.profile.update({ where: { userId }, data: { cash: { decrement: parsed.data.amount } } }),
          tx.syndicate.update({ where: { id: membership.syndicateId }, data: { vaultCash: { increment: parsed.data.amount } } }),
        ]);

        await addVaultContribution(tx, userId, parsed.data.amount);
        await tx.eventLog.create({
          data: {
            userId,
            type: "syndicate_vault_deposit",
            message: `Deposited $${Math.floor(parsed.data.amount).toLocaleString()} into syndicate vault`,
            metadata: { amount: parsed.data.amount, syndicateId: membership.syndicateId },
          },
        });

        return { updatedProfile, updatedSyndicate };
      });

      return reply.send({ success: true, walletCash: result.updatedProfile.cash, vaultCash: result.updatedSyndicate.vaultCash });
    } catch (err) {
      if (err instanceof SyndicateRouteError) return reply.status(err.status).send(err.payload);
      request.log.error(err, "/syndicates/vault/deposit error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.post("/syndicates/vault/withdraw", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = amountBody.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Invalid amount" });
    const { userId } = request.user;

    try {
      const membership = await prisma.syndicateMember.findUnique({ where: { userId }, include: { syndicate: true } });
      if (!membership) return reply.status(400).send({ error: "Must be in a syndicate" });
      if (!canWithdrawVault(membership.role)) return reply.status(403).send({ error: "Role cannot withdraw vault funds" });
      if (parsed.data.amount < SYNDICATE_VAULT_MIN_WITHDRAW) return reply.status(400).send({ error: `Minimum withdrawal is ${SYNDICATE_VAULT_MIN_WITHDRAW}` });

      const result = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "Syndicate" WHERE "id" = ${membership.syndicateId} FOR UPDATE`;
        const lockedSyndicate = await tx.syndicate.findUnique({ where: { id: membership.syndicateId } });
        if (!lockedSyndicate) throw new SyndicateRouteError(404, "Syndicate not found");
        if (parsed.data.amount > lockedSyndicate.vaultCash) throw new SyndicateRouteError(400, "Insufficient syndicate vault cash");
        if (parsed.data.amount > lockedSyndicate.vaultCash * SYNDICATE_VAULT_MAX_WITHDRAW_PERCENT) {
          throw new SyndicateRouteError(400, "Withdrawal exceeds safe vault limit");
        }

        const nextBalances = applySyndicateVaultTransfer(0, lockedSyndicate.vaultCash, parsed.data.amount, "withdraw");
        const [updatedProfile, updatedSyndicate] = await Promise.all([
          tx.profile.update({ where: { userId }, data: { cash: { increment: parsed.data.amount } } }),
          tx.syndicate.update({ where: { id: membership.syndicateId }, data: { vaultCash: nextBalances.syndicateVaultCash } }),
        ]);

        await tx.eventLog.create({
          data: {
            userId,
            type: "syndicate_vault_withdraw",
            message: `Withdrew $${Math.floor(parsed.data.amount).toLocaleString()} from syndicate vault`,
            metadata: { amount: parsed.data.amount, syndicateId: membership.syndicateId },
          },
        });

        return { updatedProfile, updatedSyndicate };
      });

      return reply.send({ success: true, walletCash: result.updatedProfile.cash, vaultCash: result.updatedSyndicate.vaultCash });
    } catch (err) {
      request.log.error(err, "/syndicates/vault/withdraw error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.post<{ Params: { id: string } }>("/syndicates/:id/role", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = roleBody.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Invalid role payload" });
    const { id } = request.params;
    const { userId } = request.user;

    try {
      const requester = await prisma.syndicateMember.findUnique({ where: { userId } });
      if (!requester || requester.syndicateId !== id) return reply.status(403).send({ error: "Not authorized for this syndicate" });
      if (!canManageRoles(requester.role)) return reply.status(403).send({ error: "Role cannot manage members" });

      const target = await prisma.syndicateMember.findUnique({ where: { userId: parsed.data.targetUserId } });
      if (!target || target.syndicateId !== id) return reply.status(400).send({ error: "Target is not in this syndicate" });
      if (target.userId === requester.userId && parsed.data.role !== requester.role) return reply.status(400).send({ error: "Cannot change your own role here" });
      const updated = await prisma.$transaction(async (tx) => {
        const syndicate = await tx.syndicate.findUnique({ where: { id } });
        if (!syndicate) throw new SyndicateRouteError(404, "Syndicate not found");
        if (target.userId === syndicate.leaderId && parsed.data.role !== "leader") {
          throw new SyndicateRouteError(400, "Transfer leadership before demoting the current leader");
        }
        if (parsed.data.role === "leader" && requester.role !== "leader") {
          throw new SyndicateRouteError(403, "Only the current leader can transfer leadership");
        }

        if (parsed.data.role === "leader" && syndicate.leaderId !== target.userId) {
          const currentLeaderMember = await tx.syndicateMember.findUnique({ where: { userId: syndicate.leaderId } });
          if (currentLeaderMember) {
            await tx.syndicateMember.update({
              where: { id: currentLeaderMember.id },
              data: { role: "co_leader", lastActiveAt: new Date() },
            });
          }
          await tx.syndicate.update({
            where: { id },
            data: { leaderId: target.userId },
          });
        }

        const nextMember = await tx.syndicateMember.update({
          where: { id: target.id },
          data: { role: parsed.data.role, lastActiveAt: new Date() },
        });

        await tx.eventLog.create({
          data: {
            userId,
            type: "syndicate_role_change",
            message: `Updated member role to ${parsed.data.role}`,
            metadata: { targetUserId: parsed.data.targetUserId, role: parsed.data.role, syndicateId: id },
          },
        });

        return nextMember;
      });

      return reply.send({ success: true, member: updated });
    } catch (err) {
      request.log.error(err, "/syndicates/:id/role error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.get("/leaderboard/syndicates", { preHandler: requireAuth }, async (_request, reply) => {
    try {
      const syndicates = await prisma.syndicate.findMany({
        include: { members: { include: { user: { include: { profile: true } } } } },
      });

      const leaderboard = syndicates
        .map((s) => ({
          id: s.id,
          name: s.name,
          memberCount: s.members.length,
          totalRp: s.members.reduce((sum, m) => sum + (m.user.profile?.rp ?? 0), 0),
          buffType: s.buffType,
          buffValue: s.buffValue,
          seasonPoints: s.seasonPoints,
          territoryCount: s.territoryCount,
          warRating: s.warRating,
        }))
        .sort((a, b) => b.seasonPoints - a.seasonPoints || b.totalRp - a.totalRp)
        .slice(0, 100);

      return reply.send(leaderboard);
    } catch (err) {
      return reply.status(500).send({ error: "Internal server error" });
    }
  });
}
