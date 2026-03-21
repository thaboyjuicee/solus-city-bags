import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { requireAuth } from "../lib/auth";

const leaderboardQuery = z.object({
  type: z.enum(["season", "pvp", "crime", "syndicates", "territories"]).optional(),
});

export default async function leaderboardRoutes(
  fastify: FastifyInstance,
  { prisma }: { prisma: PrismaClient }
) {
  fastify.get("/leaderboard", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;
    const parsed = leaderboardQuery.safeParse(request.query ?? {});
    const type = parsed.success ? parsed.data.type ?? "pvp" : "pvp";

    try {
      if (type === "pvp") {
        const profiles = await prisma.profile.findMany({
          take: 50,
          orderBy: [{ rp: "desc" }, { level: "desc" }],
          include: { user: true },
        });
        return reply.send({
          type,
          entries: profiles.map((profile, index) => ({
            rank: index + 1,
            userId: profile.userId,
            name: profile.name,
            wallet: profile.user.wallet,
            rp: profile.rp,
            level: profile.level,
            seasonScore: profile.seasonScore,
            isMe: profile.userId === userId,
          })),
        });
      }

      if (type === "syndicates") {
        const syndicates = await prisma.syndicate.findMany({
          take: 50,
          orderBy: [{ seasonPoints: "desc" }, { territoryCount: "desc" }, { warRating: "desc" }],
          include: { _count: { select: { members: true } } },
        });

        return reply.send({
          type,
          entries: syndicates.map((syndicate, index) => ({
            rank: index + 1,
            userId: syndicate.id,
            name: syndicate.name,
            score: syndicate.seasonPoints,
            seasonPoints: syndicate.seasonPoints,
            territoryCount: syndicate.territoryCount,
            warRating: syndicate.warRating,
            membersCount: syndicate._count.members,
            isMe: false,
          })),
        });
      }

      if (type === "territories") {
        const territories = await prisma.territory.findMany({
          where: { active: true },
          orderBy: { sortOrder: "asc" },
        });
        const controls = await prisma.territoryControl.findMany({
          where: { territoryId: { in: territories.map((territory) => territory.id) } },
          include: { syndicate: true },
        });
        const controlByTerritory = new Map(controls.map((control) => [control.territoryId, control]));
        const entries = territories
          .map((territory) => {
            const control = controlByTerritory.get(territory.id);
            return {
              userId: territory.id,
              name: territory.name,
              score: control?.influence ?? 0,
              territoryOwner: control?.syndicate.name ?? "Unclaimed",
              bonusType: territory.bonusType,
              bonusValue: territory.bonusValue,
            };
          })
          .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

        return reply.send({
          type,
          entries: entries.map((entry, index) => ({
            rank: index + 1,
            ...entry,
            isMe: false,
          })),
        });
      }

      const season = await prisma.season.findFirst({
        where: { status: "active", startsAt: { lte: new Date() }, endsAt: { gt: new Date() } },
        orderBy: { startsAt: "desc" },
      });

      if (!season) return reply.send({ type, entries: [] });

      const rows = await prisma.seasonParticipation.findMany({
        where: { seasonId: season.id },
        orderBy: type === "crime" ? [{ crimeScore: "desc" }, { score: "desc" }] : [{ score: "desc" }, { createdAt: "asc" }],
        take: 50,
        include: { user: { include: { profile: true } } },
      });

      return reply.send({
        type,
        seasonId: season.id,
        entries: rows.map((row, index) => ({
          rank: index + 1,
          userId: row.userId,
          name: row.user.profile?.name ?? row.user.wallet.slice(0, 6),
          wallet: row.user.wallet,
          score: type === "crime" ? row.crimeScore : row.score,
          pvpScore: row.pvpScore,
          crimeScore: row.crimeScore,
          missionScore: row.missionScore,
          level: row.user.profile?.level ?? 1,
          rp: row.user.profile?.rp ?? 0,
          isMe: row.userId === userId,
        })),
      });
    } catch (err) {
      request.log.error(err, "/leaderboard error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });
}
