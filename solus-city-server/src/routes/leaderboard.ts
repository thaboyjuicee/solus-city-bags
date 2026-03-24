import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { requireAuth } from "../lib/auth";
import { computeAPDP } from "../lib/game";
import { getHallOfFameFeed } from "../lib/seasons/history";
import { serializeHallOfFameEntry } from "../lib/serializers/seasons";
import { displayName } from "../lib/player/displayName";

const leaderboardQuery = z.object({
  type: z.enum(["season", "pvp", "crime", "syndicates", "territories", "prestige", "hall_of_fame"]).optional(),
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
        const season = await prisma.season.findFirst({
          where: { status: "active", startsAt: { lte: new Date() }, endsAt: { gt: new Date() } },
          orderBy: { startsAt: "desc" },
        });

        if (!season) return reply.send({ type, entries: [] });

        const rows = await prisma.seasonParticipation.findMany({
          where: { seasonId: season.id },
          orderBy: [{ pvpScore: "desc" }, { score: "desc" }, { createdAt: "asc" }],
          take: 50,
          include: { user: { include: { profile: true } } },
        });
        const combatStats = await Promise.all(
          rows.map(async (row) => ({
            userId: row.userId,
            ...(await computeAPDP(row.userId, prisma)),
          }))
        );
        const combatByUserId = new Map(combatStats.map((entry) => [entry.userId, entry]));

        return reply.send({
          type,
          seasonId: season.id,
          entries: rows.map((row, index) => ({
            rank: index + 1,
            userId: row.userId,
            name: displayName(row.user.profile?.name, row.user.wallet),
            wallet: row.user.wallet,
            rp: row.user.profile?.rp ?? 0,
            level: row.user.profile?.level ?? 1,
            ap: combatByUserId.get(row.userId)?.ap ?? 0,
            dp: combatByUserId.get(row.userId)?.dp ?? 0,
            score: row.pvpScore,
            seasonScore: row.score,
            pvpScore: row.pvpScore,
            crimeScore: row.crimeScore,
            missionScore: row.missionScore,
            isMe: row.userId === userId,
          })),
        });
      }

      if (type === "prestige") {
        const profiles = await prisma.profile.findMany({
          take: 50,
          orderBy: [{ prestigeLevel: "desc" }, { prestigePoints: "desc" }, { rp: "desc" }],
          include: { user: true },
        });
        return reply.send({
          type,
          entries: profiles.map((profile, index) => ({
            rank: index + 1,
            userId: profile.userId,
            name: displayName(profile.name, profile.user.wallet),
            wallet: profile.user.wallet,
            level: profile.level,
            prestigeLevel: profile.prestigeLevel,
            prestigePoints: profile.prestigePoints,
            score: profile.prestigeLevel,
            isMe: profile.userId === userId,
          })),
        });
      }

      if (type === "hall_of_fame") {
        const entries = await getHallOfFameFeed(prisma, 50);
        return reply.send({
          type,
          entries: entries.map((entry) => {
            const serialized = serializeHallOfFameEntry(entry);
            const display = (serialized.display ?? {}) as Record<string, unknown>;
            return {
              rank: serialized.rank,
              userId: serialized.user?.id ?? serialized.syndicate?.id ?? serialized.id,
              name:
                (typeof display.name === "string" && display.name) ||
                serialized.user?.name ||
                serialized.syndicate?.name ||
                serialized.category,
              category: serialized.category,
              seasonName: serialized.season.name,
              score: typeof display.score === "number" ? display.score : 0,
              display,
              isMe: serialized.user?.id === userId,
            };
          }),
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
      const combatStats = await Promise.all(
        rows.map(async (row) => ({
          userId: row.userId,
          ...(await computeAPDP(row.userId, prisma)),
        }))
      );
      const combatByUserId = new Map(combatStats.map((entry) => [entry.userId, entry]));

      return reply.send({
        type,
        seasonId: season.id,
        entries: rows.map((row, index) => ({
          rank: index + 1,
          userId: row.userId,
          name: displayName(row.user.profile?.name, row.user.wallet),
          wallet: row.user.wallet,
          score: type === "crime" ? row.crimeScore : row.score,
          pvpScore: row.pvpScore,
          crimeScore: row.crimeScore,
          missionScore: row.missionScore,
          level: row.user.profile?.level ?? 1,
          rp: row.user.profile?.rp ?? 0,
          ap: combatByUserId.get(row.userId)?.ap ?? 0,
          dp: combatByUserId.get(row.userId)?.dp ?? 0,
          isMe: row.userId === userId,
        })),
      });
    } catch (err) {
      request.log.error(err, "/leaderboard error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });
}

