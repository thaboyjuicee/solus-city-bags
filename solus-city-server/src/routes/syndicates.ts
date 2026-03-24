import { FastifyInstance } from "fastify";
import { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { requireAuth } from "../lib/auth";
import { SYNDICATE_AP_BUFF, SYNDICATE_MAX_MEMBERS } from "../lib/constants";
import { canManageRoles, canRecruit, canWithdrawVault, SYNDICATE_ROLES } from "../lib/syndicates/roles";
import { addContributionScore, addVaultContribution, applySyndicateVaultTransfer } from "../lib/syndicates/contributions";
import { serializeChampionshipSyndicateState, serializeSyndicateOverview, serializeWarSummary } from "../lib/serializers/syndicates";
import { SYNDICATE_VAULT_MAX_WITHDRAW_PERCENT, SYNDICATE_VAULT_MIN_WITHDRAW } from "../lib/config/balance";
import { displayName } from "../lib/player/displayName";

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
const patchSyndicateBody = z.object({
  visibility: z.enum(["public", "private"]).optional(),
});
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
        const creatorIdResolved = s.creatorId ?? s.leaderId;
        const creatorMember = s.members.find((m) => m.userId === creatorIdResolved);
        const creatorName = creatorMember
          ? displayName(creatorMember.user.profile?.name, creatorMember.user.wallet)
          : "Unknown";
        return {
          ...serializeSyndicateOverview(s),
          leaderId: s.leaderId,
          creatorId: creatorIdResolved,
          creatorName,
          memberCount: s.members.length,
          totalRp,
          visibility: s.visibility ?? "public",
          territoriesOwned: s.territories.map((t) => ({ id: t.territory.id, name: t.territory.name, code: t.territory.code, bonusType: t.territory.bonusType, bonusValue: t.territory.bonusValue })),
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
        name: displayName(m.user.profile?.name, m.user.wallet),
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
        visibility: syndicate.visibility ?? "public",
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

  fastify.patch<{ Params: { id: string } }>("/syndicates/:id", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = patchSyndicateBody.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Invalid patch payload" });

    const { id } = request.params;
    const { userId } = request.user;

    try {
      const membership = await prisma.syndicateMember.findUnique({ where: { userId } });
      if (!membership || membership.syndicateId !== id) {
        return reply.status(403).send({ error: "Not authorized for this syndicate" });
      }

      const syndicate = await prisma.syndicate.findUnique({ where: { id }, select: { creatorId: true, leaderId: true } });
      if (!syndicate) return reply.status(404).send({ error: "Syndicate not found" });

      const isCreatorOrLeader = syndicate.creatorId === userId || syndicate.leaderId === userId;
      if (!canManageRoles(membership.role) && !isCreatorOrLeader) {
        return reply.status(403).send({ error: "Role cannot change syndicate settings" });
      }

      const updated = await prisma.syndicate.update({
        where: { id },
        data: { ...(parsed.data.visibility !== undefined ? { visibility: parsed.data.visibility } : {}) },
      });

      return reply.send({ success: true, visibility: updated.visibility });
    } catch (err) {
      request.log.error(err, "/syndicates/:id PATCH error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  // ── Helper: cascade-delete a syndicate and all related records ──────────────
  // Order matters — child FKs must be removed before parent rows.
  async function disbandSyndicate(tx: Prisma.TransactionClient, syndicateId: string) {
    // 1. War actions — two FKs pointing at this syndicate: via warId and via direct syndicateId
    await tx.syndicateWarAction.deleteMany({ where: { syndicateId } });
    const involvedWars = await tx.syndicateWar.findMany({
      where: { OR: [{ attackerSyndicateId: syndicateId }, { defenderSyndicateId: syndicateId }] },
      select: { id: true },
    });
    if (involvedWars.length > 0) {
      const warIds = involvedWars.map((w) => w.id);
      await tx.syndicateWarAction.deleteMany({ where: { warId: { in: warIds } } });
      await tx.syndicateWar.deleteMany({ where: { id: { in: warIds } } });
    }
    // 2. Territory records
    await tx.territoryContribution.deleteMany({ where: { syndicateId } });
    await tx.territoryControl.deleteMany({ where: { syndicateId } });
    // 3. Championship — matches before entries (entries hold the season FK)
    await tx.championshipMatch.deleteMany({
      where: { OR: [{ syndicateAId: syndicateId }, { syndicateBId: syndicateId }, { winnerSyndicateId: syndicateId }] },
    });
    await tx.championshipEntry.deleteMany({ where: { syndicateId } });
    // 4. Hall of fame
    await tx.hallOfFameEntry.deleteMany({ where: { syndicateId } });
    // 5. Members, then the syndicate itself
    await tx.syndicateMember.deleteMany({ where: { syndicateId } });
    await tx.syndicate.delete({ where: { id: syndicateId } });
  }

  fastify.post<{ Params: { id: string } }>("/syndicates/:id/join", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;
    const { id } = request.params;

    // Cooldown check — 5 minutes for testing (change to 24 * 60 * 60 * 1000 before pushing to main)
    const JOIN_COOLDOWN_MS = 5 * 60 * 1000;
    const profileCheck = await prisma.profile.findUnique({ where: { userId }, select: { lastLeftSyndicateAt: true } });
    if (profileCheck?.lastLeftSyndicateAt) {
      const msSinceLeft = Date.now() - new Date(profileCheck.lastLeftSyndicateAt).getTime();
      if (msSinceLeft < JOIN_COOLDOWN_MS) {
        const minsLeft = Math.ceil((JOIN_COOLDOWN_MS - msSinceLeft) / 60000);
        return reply.status(400).send({ error: `You must wait ${minsLeft}m before joining a new syndicate` });
      }
    }

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

        await tx.eventLog.create({ data: { userId, type: "syndicate_joined", message: "Joined a syndicate", metadata: { syndicateId: id } } });
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

      const syndicateId = membership.syndicateId;
      const isLeader = membership.role === "leader";

      if (isLeader) {
        const memberCount = await prisma.syndicateMember.count({ where: { syndicateId } });

        if (memberCount <= 1) {
          // Sole member — disband the syndicate entirely
          await prisma.$transaction(async (tx) => {
            await disbandSyndicate(tx, syndicateId);
            await tx.profile.update({ where: { userId }, data: { lastLeftSyndicateAt: new Date() } });
            await tx.eventLog.create({ data: { userId, type: "syndicate_disbanded", message: "Disbanded their syndicate", metadata: { syndicateId } } });
          });
          return reply.send({ success: true, disbanded: true });
        }

        // Auto-transfer leadership to the member with highest contributionScore (excluding self)
        const nextLeader = await prisma.syndicateMember.findFirst({
          where: { syndicateId, userId: { not: userId } },
          orderBy: { contributionScore: "desc" },
        });
        if (!nextLeader) return reply.status(500).send({ error: "No eligible member to transfer leadership to" });
        await prisma.$transaction(async (tx) => {
          await tx.syndicate.update({ where: { id: syndicateId }, data: { leaderId: nextLeader.userId } });
          await tx.syndicateMember.update({ where: { id: nextLeader.id }, data: { role: "leader", lastActiveAt: new Date() } });
          await tx.syndicateMember.delete({ where: { id: membership.id } });
          await tx.profile.update({ where: { userId }, data: { lastLeftSyndicateAt: new Date() } });
          await tx.eventLog.create({
            data: {
              userId,
              type: "syndicate_left",
              message: "Left the syndicate (leadership transferred)",
              metadata: { syndicateId, leadershipTransferredTo: nextLeader.userId },
            },
          });
        });
        return reply.send({ success: true, disbanded: false });
      }

      // Non-leader leave
      await prisma.$transaction(async (tx) => {
        await tx.syndicateMember.delete({ where: { id: membership.id } });
        await tx.profile.update({ where: { userId }, data: { lastLeftSyndicateAt: new Date() } });
        await tx.eventLog.create({ data: { userId, type: "syndicate_left", message: "Left the syndicate", metadata: { syndicateId } } });
      });

      return reply.send({ success: true, disbanded: false });
    } catch (err) {
      request.log.error(err, "/syndicates/leave error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.delete<{ Params: { id: string } }>("/syndicates/:id", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params;
    const { userId } = request.user;

    try {
      const membership = await prisma.syndicateMember.findUnique({ where: { userId } });
      if (!membership || membership.syndicateId !== id) {
        return reply.status(403).send({ error: "Not a member of this syndicate" });
      }

      const syndicate = await prisma.syndicate.findUnique({ where: { id }, select: { creatorId: true, leaderId: true } });
      if (!syndicate) return reply.status(404).send({ error: "Syndicate not found" });

      if (membership.role !== "leader" && syndicate.creatorId !== userId && syndicate.leaderId !== userId) {
        return reply.status(403).send({ error: "Only the leader can disband the syndicate" });
      }

      await prisma.$transaction(async (tx) => {
        await disbandSyndicate(tx, id);
        await tx.profile.update({ where: { userId }, data: { lastLeftSyndicateAt: new Date() } });
        await tx.eventLog.create({ data: { userId, type: "syndicate_disbanded", message: "Disbanded their syndicate", metadata: { syndicateId: id } } });
      });

      return reply.send({ success: true, disbanded: true });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const errCode = (err as { code?: string }).code;
      request.log.error({ syndicateId: id, userId, errMsg, errCode, err }, "/syndicates/:id DELETE error — full details");
      return reply.status(500).send({ error: `Disband failed: ${errMsg}` });
    }
  });

  fastify.get<{ Params: { id: string } }>("/syndicates/:id/history", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params;
    const { userId } = request.user;

    try {
      const membership = await prisma.syndicateMember.findUnique({ where: { userId } });
      if (!membership || membership.syndicateId !== id) {
        return reply.status(403).send({ error: "Not a member of this syndicate" });
      }

      const logs = await prisma.eventLog.findMany({
        where: {
          type: {
            in: [
              "syndicate_created",
              "syndicate_joined",
              "syndicate_left",
              "syndicate_disbanded",
              "syndicate_role_change",
              "syndicate_vault_deposit",
              "syndicate_vault_withdraw",
            ],
          },
          metadata: { path: ["syndicateId"], equals: id },
        },
        include: { user: { include: { profile: true } } },
        orderBy: { ts: "desc" },
        take: 50,
      });

      return reply.send(
        logs.map((log) => ({
          id: log.id,
          type: log.type,
          message: log.message,
          playerName: displayName(log.user.profile?.name, log.user.wallet),
          ts: log.ts,
        }))
      );
    } catch (err) {
      request.log.error(err, "/syndicates/:id/history error");
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
