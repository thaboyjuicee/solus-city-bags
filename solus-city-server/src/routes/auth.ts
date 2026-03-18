import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { signToken } from "../lib/jwt";
import { SHIELD_DURATION_HOURS } from "../lib/constants";

function generateNonce(): string {
  const bytes = nacl.randomBytes(16);
  return Buffer.from(bytes).toString("hex");
}

const verifyBody = z.object({
  wallet: z.string().min(32).max(44),
  message: z.string(),
  signature: z.string(), // base58-encoded
});

export default async function authRoutes(
  fastify: FastifyInstance,
  { prisma }: { prisma: PrismaClient }
) {
  // GET /auth/challenge?wallet=<pubkey>
  // Upsert user + profile, return nonce + message
  fastify.get<{ Querystring: { wallet: string } }>("/auth/challenge", async (request, reply) => {
    const wallet = request.query.wallet;
    if (!wallet || wallet.length < 32) {
      return reply.status(400).send({ error: "Invalid wallet address" });
    }

    const nonce = generateNonce();
    const message = `Sign in to Solus City: ${nonce}`;
    const shieldUntil = new Date(Date.now() + SHIELD_DURATION_HOURS * 3600 * 1000);

    try {
      const user = await prisma.user.upsert({
        where: { wallet },
        update: {},
        create: { wallet },
      });

      await prisma.profile.upsert({
        where: { userId: user.id },
        update: { pendingNonce: nonce },
        create: {
          userId: user.id,
          shieldUntil,
          pendingNonce: nonce,
        },
      });

      return reply.send({ nonce, message });
    } catch (err) {
      request.log.error(err, "auth/challenge error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  // POST /auth/verify
  // Verify Solana ed25519 signature, return JWT
  fastify.post("/auth/verify", async (request, reply) => {
    const parsed = verifyBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    }

    const { wallet, message, signature } = parsed.data;

    try {
      const user = await prisma.user.findUnique({
        where: { wallet },
        include: { profile: true },
      });

      if (!user || !user.profile) {
        return reply.status(400).send({ error: "Wallet not registered. Call /auth/challenge first." });
      }

      const { pendingNonce } = user.profile;
      if (!pendingNonce) {
        return reply.status(400).send({ error: "No pending nonce. Call /auth/challenge first." });
      }

      // Verify the message matches what we expect
      const expectedMessage = `Sign in to Solus City: ${pendingNonce}`;
      if (message !== expectedMessage) {
        return reply.status(401).send({ error: "Message mismatch" });
      }

      // Verify ed25519 signature
      // signature: base58 → bytes; message: utf8 → bytes; wallet: base58 → pubkey bytes
      let sigBytes: Uint8Array;
      let msgBytes: Uint8Array;
      let pubkeyBytes: Uint8Array;
      try {
        sigBytes = bs58.decode(signature);
        msgBytes = Buffer.from(message, "utf8");
        pubkeyBytes = bs58.decode(wallet);
      } catch {
        return reply.status(400).send({ error: "Invalid signature or wallet encoding" });
      }

      const valid = nacl.sign.detached.verify(msgBytes, sigBytes, pubkeyBytes);
      if (!valid) {
        return reply.status(401).send({ error: "Signature verification failed" });
      }

      // Clear nonce atomically (single-use). If count is 0, another request already consumed it.
      const consumed = await prisma.profile.updateMany({
        where: { userId: user.id, pendingNonce },
        data: { pendingNonce: null },
      });
      if (consumed.count !== 1) {
        return reply.status(409).send({ error: "Challenge already used. Please request a new challenge." });
      }

      const token = signToken({ userId: user.id, wallet });
      return reply.send({ token });
    } catch (err) {
      request.log.error(err, "auth/verify error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });
}
