import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { requireAuth } from "../lib/auth";
import { executePrestige, previewPrestige } from "../lib/seasons/prestige";

const prestigeBody = z.object({
  confirm: z.boolean().optional(),
});

export default async function prestigeRoutes(
  fastify: FastifyInstance,
  { prisma }: { prisma: PrismaClient }
) {
  fastify.get("/prestige/preview", { preHandler: requireAuth }, async (request, reply) => {
    try {
      const preview = await previewPrestige(prisma, request.user.userId);
      return reply.send({ preview });
    } catch (err) {
      request.log.error(err, "/prestige/preview error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.post("/prestige/execute", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = prestigeBody.safeParse(request.body ?? {});
    if (!parsed.success || !parsed.data.confirm) {
      return reply.status(400).send({ error: "Prestige confirmation required" });
    }

    try {
      const result = await prisma.$transaction((tx) => executePrestige(tx, request.user.userId));
      return reply.send({
        success: true,
        preview: result.preview,
        profile: {
          prestigeLevel: result.profile.prestigeLevel,
          prestigePoints: result.profile.prestigePoints,
          cash: result.profile.cash,
          vaultCash: result.profile.vaultCash,
          maxEnergy: result.profile.maxEnergy,
          maxNerve: result.profile.maxNerve,
          maxHappiness: result.profile.maxHappiness,
        },
      });
    } catch (err) {
      request.log.error(err, "/prestige/execute error");
      return reply.status(400).send({ error: err instanceof Error ? err.message : "Prestige failed" });
    }
  });
}

