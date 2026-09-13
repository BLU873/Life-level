require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const { syncAchievementDefinitions } = require('../src/services/achievementService');
const prisma = new PrismaClient();

// Premium LIFE//LEVEL cosmetic catalogue. All items are cosmetic only.
// metadata holds the cosmetic configuration consumed by the frontend.
const shopItems = [
  {
    name: 'Monolith',
    description: 'A clean, minimal frame with a single sharp edge.',
    type: 'PROFILE_FRAME',
    price: 400,
    rarity: 'COMMON',
    metadata: { style: 'monolith' },
  },
  {
    name: 'Arc',
    description: 'A soft rounded frame that frames your profile with warmth.',
    type: 'PROFILE_FRAME',
    price: 850,
    rarity: 'UNCOMMON',
    metadata: { style: 'arc' },
  },
  {
    name: 'Focus',
    description: 'A calm warm-terracotta theme tuned for deep concentration.',
    type: 'THEME',
    price: 500,
    rarity: 'UNCOMMON',
    metadata: { accent: 'ember' },
  },
  {
    name: 'Dawn',
    description: 'A warm amber theme that grows with you through the day.',
    type: 'THEME',
    price: 950,
    rarity: 'RARE',
    metadata: { accent: 'amber' },
  },
  {
    name: 'Scholar',
    description: 'Awards hours of focused study.',
    type: 'BADGE',
    price: 250,
    rarity: 'UNCOMMON',
    metadata: { motif: 'scroll' },
  },
  {
    name: 'Runner',
    description: 'Awards consistent, disciplined movement.',
    type: 'BADGE',
    price: 250,
    rarity: 'UNCOMMON',
    metadata: { motif: 'track' },
  },
  {
    name: 'Creator',
    description: 'Awards original work and creative risk.',
    type: 'BADGE',
    price: 250,
    rarity: 'UNCOMMON',
    metadata: { motif: 'pen' },
  },
  {
    name: 'Pioneer',
    description: 'For the very first explorers of LIFE//LEVEL.',
    type: 'BADGE',
    price: 1200,
    rarity: 'EPIC',
    metadata: { motif: 'compass' },
  },
];

async function main() {
  console.log('Seeding shop catalogue...');

  // Upsert so catalogue changes are applied without ever deleting player-owned
  // items or forcing users to lose their inventory.
  let created = 0;
  let updated = 0;
  for (const item of shopItems) {
    const data = { ...item, metadata: JSON.stringify(item.metadata) };
    const existing = await prisma.shopItem.findFirst({ where: { name: item.name } });
    if (existing) {
      await prisma.shopItem.update({ where: { id: existing.id }, data });
      updated += 1;
    } else {
      await prisma.shopItem.create({ data });
      created += 1;
    }
  }

  // Remove legacy catalogue entries that are no longer part of the seed, but
  // only when no player owns them — owned items always persist.
  const names = shopItems.map((i) => i.name);
  const removed = await prisma.shopItem.deleteMany({
    where: { name: { notIn: names }, ownedBy: { none: {} } },
  });

  console.log(`Seeded ${shopItems.length} shop items (${created} created, ${updated} updated).`);
  if (removed.count > 0) console.log(`Removed ${removed.count} legacy catalogue entries.`);

  // Phase 8: sync the centralized achievement definitions.
  await syncAchievementDefinitions(prisma);
  console.log('Seeded achievement definitions.');

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });