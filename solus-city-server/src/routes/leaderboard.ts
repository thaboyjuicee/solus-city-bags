import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../lib/auth";
import { computeAPDP } from "../lib/game";

function truncateWallet(wallet: string): string {
  return wallet.slice(0, 6) + "..." + wallet.slice(-4);
}

export default async function leaderboardRoutes(
  fastify: FastifyInstance,
  { prisma }: { prisma: PrismaClient }
) {
  fastify.get("/leaderboard", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;

    try {
      // Fetch all profiles ordered by RP descending
      const allProfiles = await prisma.profile.findMany({
        orderBy: { rp: "desc" },
        include: { user: true },
      });

      // Build top 100 with rank
      const top100 = allProfiles.slice(0, 100);
      const leaderboard = await Promise.all(
        top100.map(async (profile, index) => {
          const { ap, dp } = await computeAPDP(profile.userId, prisma);
          return {
            rank: index + 1,
            name: profile.name || truncateWallet(profile.user.wallet),
            wallet: truncateWallet(profile.user.wallet),
            rp: profile.rp,
            level: profile.level,
            ap,
            dp,
            isMe: profile.userId === userId,
          };
        })
      );

      // Check if current user is in top 100
      const inTop100 = leaderboard.some((entry) => entry.isMe);

      if (!inTop100) {
        // Find actual rank
        const actualRank = allProfiles.findIndex((p) => p.userId === userId) + 1;
        if (actualRank > 0) {
          const selfProfile = allProfiles[actualRank - 1];
          const { ap, dp } = await computeAPDP(userId, prisma);
          leaderboard.push({
            rank: actualRank,
            name: selfProfile.name || truncateWallet(selfProfile.user.wallet),
            wallet: truncateWallet(selfProfile.user.wallet),
            rp: selfProfile.rp,
            level: selfProfile.level,
            ap,
            dp,
            isMe: true,
          });
        }
      }

      return reply.send(leaderboard);
    } catch (err) {
      request.log.error(err, "/leaderboard error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });
}
