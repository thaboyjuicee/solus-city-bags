import { FastifyInstance } from "fastify";
import { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { requireAuth } from "../lib/auth";
import { SYNDICATE_AP_BUFF, SYNDICATE_MAX_MEMBERS } from "../lib/constants";

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

  fastify.get("/syndicates", { preHandler: requireAuth }, async (_request, reply) => {
    try {
      const syndicates = await prisma.syndicate.findMany({
        include: {
          members: { include: { user: { include: { profile: true } } } },
          leader: true,
        },
        orderBy: { createdAt: "desc" },
      });

      const data = syndicates.map((s) => {
        const totalRp = s.members.reduce((sum, m) => sum + (m.user.profile?.rp ?? 0), 0);
        return {
          id: s.id,
          name: s.name,
          description: s.description,
          buffType: s.buffType,
          buffValue: s.buffValue,
          leaderId: s.leaderId,
          memberCount: s.members.length,
          totalRp,
        };
      });

      return reply.send(data);
    } catch (err) {
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.get<{ Params: { id: string } }>("/syndicates/:id", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params;

    try {
      const syndicate = await prisma.syndicate.findUnique({
        where: { id },
        include: {
          members: {
            include: {
              user: { include: { profile: true } },
            },
            orderBy: { joinedAt: "asc" },
          },
          leader: true,
        },
      });

      if (!syndicate) return reply.status(404).send({ error: "Syndicate not found" });

      const members = syndicate.members.map((m) => ({
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
        name: m.user.profile?.name || m.user.wallet.slice(0, 6) + "...",
        rp: m.user.profile?.rp ?? 0,
        level: m.user.profile?.level ?? 1,
      }));

      return reply.send({
        id: syndicate.id,
        name: syndicate.name,
        description: syndicate.description,
        leaderId: syndicate.leaderId,
        memberCount: members.length,
        totalRp: members.reduce((sum, m) => sum + m.rp, 0),
        buffType: syndicate.buffType,
        buffValue: syndicate.buffValue,
        members,
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
        if (locked.length === 0) {
          throw new SyndicateRouteError(404, "Syndicate not found");
        }

        const existingMembership = await tx.syndicateMember.findUnique({ where: { userId } });
        if (existingMembership) {
          throw new SyndicateRouteError(400, "Already in a syndicate");
        }

        const memberCount = await tx.syndicateMember.count({ where: { syndicateId: id } });
        if (memberCount >= SYNDICATE_MAX_MEMBERS) {
          throw new SyndicateRouteError(400, "Syndicate is full");
        }

        const createdMembership = await tx.syndicateMember.create({
          data: {
            syndicateId: id,
            userId,
            role: "member",
          },
        });

        await tx.eventLog.create({
          data: {
            userId,
            type: "syndicate_joined",
            message: "Joined a syndicate",
          },
        });

        return createdMembership;
      });

      return reply.send({ success: true, membership });
    } catch (err) {
      if (err instanceof SyndicateRouteError) {
        return reply.status(err.status).send(err.payload);
      }

      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return reply.status(400).send({ error: "Already in a syndicate" });
      }

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

        await prisma.$transaction([
          prisma.syndicateMember.delete({ where: { id: membership.id } }),
          prisma.syndicate.delete({ where: { id: membership.syndicateId } }),
          prisma.eventLog.create({ data: { userId, type: "syndicate_left", message: "Left and disbanded your syndicate" } }),
        ]);

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

  fastify.get("/leaderboard/syndicates", { preHandler: requireAuth }, async (_request, reply) => {
    try {
      const syndicates = await prisma.syndicate.findMany({
        include: {
          members: { include: { user: { include: { profile: true } } } },
        },
      });

      const leaderboard = syndicates
        .map((s) => ({
          id: s.id,
          name: s.name,
          memberCount: s.members.length,
          totalRp: s.members.reduce((sum, m) => sum + (m.user.profile?.rp ?? 0), 0),
          buffType: s.buffType,
          buffValue: s.buffValue,
        }))
        .sort((a, b) => b.totalRp - a.totalRp)
        .slice(0, 100);

      return reply.send(leaderboard);
    } catch (err) {
      return reply.status(500).send({ error: "Internal server error" });
    }
  });
}
