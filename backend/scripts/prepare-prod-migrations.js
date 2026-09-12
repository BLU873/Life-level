#!/usr/bin/env node
/**
 * Production migration prep.
 *
 * Local development uses SQLite (schema.prisma + prisma/migrations).
 * Production uses a managed PostgreSQL database.
 *
 * This script, run ONLY on the deployment build machine (never locally):
 *   1. replaces prisma/schema.prisma with the PostgreSQL schema
 *      (prisma/schema.pg.prisma) so `prisma generate` produces a PostgreSQL
 *      client, and
 *   2. replaces prisma/migrations with the PostgreSQL migrations
 *      (prisma/migrations-pg) so `prisma migrate deploy` targets Postgres.
 *
 * Usage: node scripts/prepare-prod-migrations.js
 */
const fs = require('fs');
const path = require('path');

const BACKEND = path.resolve(__dirname, '..');
const SCHEMA = path.join(BACKEND, 'prisma', 'schema.prisma');
const SCHEMA_PG = path.join(BACKEND, 'prisma', 'schema.pg.prisma');
const MIGRATIONS = path.join(BACKEND, 'prisma', 'migrations');
const MIGRATIONS_PG = path.join(BACKEND, 'prisma', 'migrations-pg');

function rm(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

if (!fs.existsSync(SCHEMA_PG)) {
  console.error(`[prepare-prod] ${SCHEMA_PG} not found.`);
  process.exit(1);
}
if (!fs.existsSync(MIGRATIONS_PG)) {
  console.error(`[prepare-prod] ${MIGRATIONS_PG} not found.`);
  process.exit(1);
}

fs.copyFileSync(SCHEMA_PG, SCHEMA);
console.log('[prepare-prod] schema.prisma switched to PostgreSQL datamodel.');

rm(MIGRATIONS);
fs.cpSync(MIGRATIONS_PG, MIGRATIONS, { recursive: true });
console.log('[prepare-prod] prisma/migrations replaced with PostgreSQL migrations.');

console.log('[prepare-prod] Next: npx prisma generate && npx prisma migrate deploy && npm run seed');