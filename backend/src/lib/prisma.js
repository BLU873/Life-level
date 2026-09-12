const { PrismaClient } = require('@prisma/client');

// A single PrismaClient is shared across the whole backend.
const prisma = new PrismaClient();

module.exports = prisma;