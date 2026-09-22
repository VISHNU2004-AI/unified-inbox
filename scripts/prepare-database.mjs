import { spawnSync } from 'node:child_process';

const configuredDatabaseUrl = process.env.DATABASE_URL;
const isLocalDatabaseUrl = configuredDatabaseUrl?.includes('@localhost:') || configuredDatabaseUrl?.includes('@127.0.0.1:');
const databaseUrl =
  (configuredDatabaseUrl && !(process.env.VERCEL && isLocalDatabaseUrl) ? configuredDatabaseUrl : '') ||
  process.env.DATABASE__POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE__POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE__POSTGRES_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  '';

process.env.DATABASE_URL = databaseUrl;

if (!databaseUrl.includes('postgres')) {
  console.log('[Database] Skipping PostgreSQL schema push for local development.');
  process.exit(0);
}

const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(command, [
  'prisma',
  'db',
  'push',
  '--schema=prisma/schema.prisma',
  '--skip-generate',
], { stdio: 'inherit' });

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);