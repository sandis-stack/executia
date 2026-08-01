import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { coreAiPrisma?: PrismaClient };

export const prisma =
  globalForPrisma.coreAiPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.coreAiPrisma = prisma;
}
