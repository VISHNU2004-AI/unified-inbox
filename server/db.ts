import { PrismaClient } from '@prisma/client';

const configuredDatabaseUrl = process.env.DATABASE_URL;
const isLocalDatabaseUrl = configuredDatabaseUrl?.includes('@localhost:') || configuredDatabaseUrl?.includes('@127.0.0.1:');

if (!configuredDatabaseUrl || (process.env.VERCEL && isLocalDatabaseUrl)) {
  process.env.DATABASE_URL =
    process.env.DATABASE__POSTGRES_PRISMA_URL ||
    process.env.DATABASE__POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_DATABASE_URL ||
    process.env.DATABASE_URL_UNPOOLED;
}

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
