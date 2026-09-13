import { spawnSync } from 'node:child_process';

const databaseUrl = process.env.DATABASE_URL || '';

if (!databaseUrl.includes('postgres')) {
  console.log('[Database] Skipping PostgreSQL schema push for local development.');
  process.exit(0);
}

const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(command, [
  'prisma',
  'db',
  'push',
  '--schema=prisma/schema.postgres.prisma',
  '--skip-generate',
], { stdio: 'inherit' });

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);