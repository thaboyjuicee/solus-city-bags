import "dotenv/config";
import Fastify from "fastify";
import type { FastifyReply } from "fastify";
import { PrismaClient } from "@prisma/client";

import authRoutes from "./routes/auth";
import meRoutes from "./routes/me";
import shopRoutes from "./routes/shop";
import { ensureSeedData } from "./lib/seedData";
import targetsRoutes from "./routes/targets";
import battleRoutes from "./routes/battle";
import leaderboardRoutes from "./routes/leaderboard";
import gymRoutes from "./routes/gym";
import crimeRoutes from "./routes/crimes";
import eventsRoutes from "./routes/events";
import attackLogsRoutes from "./routes/attackLogs";
import syndicateRoutes from "./routes/syndicates";
import bagsRoutes from "./routes/bags";
import hospitalRoutes from "./routes/hospital";
import slsRoutes from "./routes/sls";

const fastify = Fastify({ logger: true });

const NODE_ENV = process.env.NODE_ENV ?? "development";
const PORT = parseInt(process.env.PORT ?? "3000", 10);
const databaseUrl = process.env.DATABASE_URL;
const publicDatabaseUrl = process.env.DATABASE_PUBLIC_URL;
const jwtSecret = process.env.JWT_SECRET;
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "*";
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? "60000", 10);
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX ?? "120", 10);

type RateLimitBucket = { count: number; resetAt: number };
const rateBuckets = new Map<string, RateLimitBucket>();

function withSecurityHeaders(reply: FastifyReply) {
  reply.header("X-Content-Type-Options", "nosniff");
  reply.header("X-Frame-Options", "DENY");
  reply.header("Referrer-Policy", "no-referrer");
  reply.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (NODE_ENV !== "development") {
    reply.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  reply.header("Access-Control-Allow-Origin", CORS_ORIGIN);
  reply.header("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
  reply.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function isRateLimitedPath(path: string): boolean {
  if (path === "/health" || path === "/") return false;
  return true;
}

const resolvedDatabaseUrl = (() => {
  if (!databaseUrl) {
    return databaseUrl;
  }

  if (
    NODE_ENV === "development" &&
    databaseUrl.includes("postgres.railway.internal") &&
    publicDatabaseUrl
  ) {
    return publicDatabaseUrl;
  }

  return databaseUrl;
})();

if (!resolvedDatabaseUrl) {
  console.error("DATABASE_URL is required. Set it in server environment.");
}

if (!jwtSecret) {
  console.error("JWT_SECRET is required. Set it in server environment.");
}

if (databaseUrl && databaseUrl.includes("localhost") && NODE_ENV !== "development") {
  console.error(
    "DATABASE_URL points to localhost. This will fail on hosted deployments unless PostgreSQL is also local."
  );
}

if (!databaseUrl || !jwtSecret) {
  process.exit(1);
}

const trimmedDatabaseUrl = resolvedDatabaseUrl?.trim();

if (!trimmedDatabaseUrl || !/postgres(ql)?:\/\/.+/.test(trimmedDatabaseUrl)) {
  console.error("DATABASE_URL is not a valid PostgreSQL URL.");
  process.exit(1);
}

process.env.DATABASE_URL = trimmedDatabaseUrl;
const prisma = new PrismaClient();

fastify.addHook("onRequest", async (request, reply) => {
  withSecurityHeaders(reply);

  if (request.method === "OPTIONS") {
    reply.status(204).send();
    return;
  }

  if (!isRateLimitedPath(request.url)) {
    return;
  }

  const now = Date.now();
  const routeKey = `${request.method}:${request.url.split("?")[0]}`;
  const key = `${request.ip}:${routeKey}`;
  const current = rateBuckets.get(key);

  if (!current || now >= current.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return;
  }

  if (current.count >= RATE_LIMIT_MAX) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    reply.header("Retry-After", `${retryAfterSeconds}`);
    reply.status(429).send({ error: "Too many requests" });
    return;
  }

  current.count += 1;
  rateBuckets.set(key, current);
});

// Health check — no auth required
fastify.get("/health", async (_request, _reply) => {
  return { status: "ok" };
});

fastify.get("/", async (_request, _reply) => {
  return {
    service: "Solus City API",
    status: "ok",
  };
});

// Some mobile wallet adapters may probe /null or /favicon.ico from identity metadata.
// Return a tiny no-content response to avoid noisy 404s in edge logs.
fastify.get("/null", async (_request, reply) => {
  return reply.status(204).send();
});

fastify.get("/favicon.ico", async (_request, reply) => {
  return reply.status(204).send();
});

// Register route plugins with shared prisma instance
const pluginOpts = { prisma };
fastify.register(authRoutes, pluginOpts);
fastify.register(meRoutes, pluginOpts);
fastify.register(shopRoutes, pluginOpts);
fastify.register(targetsRoutes, pluginOpts);
fastify.register(battleRoutes, pluginOpts);
fastify.register(leaderboardRoutes, pluginOpts);
fastify.register(gymRoutes, pluginOpts);
fastify.register(crimeRoutes, pluginOpts);
fastify.register(eventsRoutes, pluginOpts);
fastify.register(attackLogsRoutes, pluginOpts);
fastify.register(syndicateRoutes, pluginOpts);
fastify.register(bagsRoutes, pluginOpts);
fastify.register(hospitalRoutes, pluginOpts);
fastify.register(slsRoutes, pluginOpts);

// Global error handler — never leak raw Prisma errors
fastify.setErrorHandler((error, _request, reply) => {
  fastify.log.error(error);
  reply.status(500).send({ error: "Internal server error" });
});

const start = async () => {
  try {
    console.log(`Starting Solus City API in ${NODE_ENV} mode on port ${PORT}`);
    await prisma.$connect();
    await ensureSeedData(prisma);
    await fastify.listen({ port: PORT, host: "0.0.0.0" });
    fastify.log.info(`Solus City API running on port ${PORT}`);
  } catch (err) {
    if (err instanceof Error) {
      fastify.log.error(err.message);
    } else {
      fastify.log.error(err);
    }
    process.exit(1);
  }
};

start();
