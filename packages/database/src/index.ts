import { PrismaClient } from "../generated/client";

declare global {
  // eslint-disable-next-line no-var
  var __flashdropPrisma__: PrismaClient | undefined;
}

export const prisma =
  global.__flashdropPrisma__ ??
  new PrismaClient({
    log: ["warn", "error"]
  });

if (process.env.NODE_ENV !== "production") {
  global.__flashdropPrisma__ = prisma;
}

export * from "../generated/client";
