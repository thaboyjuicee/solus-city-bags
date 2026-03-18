import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../lib/auth";

export default async function eventsRoutes(
  fastify: FastifyInstance,
  { prisma }: { prisma: PrismaClient }
) {
  // GET /events — recent event log for the user
  fastify.get("/events", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;

    try {
      const events = await prisma.eventLog.findMany({
        where: { userId },
        orderBy: { ts: "desc" },
        take: 30,
      });

      return reply.send(events);
    } catch (err) {
      request.log.error(err, "/events error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });
}
