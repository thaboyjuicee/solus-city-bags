import { FastifyRequest, FastifyReply } from "fastify";
import { verifyToken, JwtPayload } from "./jwt";

// Extend Fastify request type to carry decoded user
declare module "fastify" {
  interface FastifyRequest {
    user: JwtPayload;
  }
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    reply.status(401).send({ error: "Missing authorization token" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    request.user = verifyToken(token);
  } catch {
    reply.status(401).send({ error: "Invalid or expired token" });
    return;
  }
}
