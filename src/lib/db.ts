/**
 * MadrashaOS — Prisma Client Singleton
 *
 * Session B0.1 — PostgreSQL Setup + Connection
 *
 * Why a singleton: Next.js dev mode hot-reloads modules, which would
 * create a new PrismaClient on every reload → exhaust DB connections.
 * This pattern stores the client on `globalThis` so it survives HMR.
 *
 * The client is generated from `prisma/schema.prisma` and lives at
 * `src/generated/prisma`. Run `bunx prisma generate` after schema changes.
 */

import { PrismaClient } from "@/generated/prisma";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Only log queries in development (not production — performance)
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
