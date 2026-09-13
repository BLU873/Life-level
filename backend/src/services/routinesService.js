const prisma = require('../lib/prisma');
const { ROUTINE_PERIODS } = require('../config/constants');
const { ApiError } = require('../utils/apiError');
const { startOfDay, endOfDay } = require('../utils/date');

/**
 * Routines — simple per-day checklists grouped by period (morning / afternoon /
 * evening). Routine activity is recorded as ROUTINE_COMPLETE history rows (one
 * per item, per day) so the app never has to fabricate "habit days".
 */

const MAX_ITEMS_PER_ROUTINE = 20;
const MAX_ROUTINES_PER_USER = 9;
const MAX_TITLE_LENGTH = 120;

function serialize(items) {
  return [...items].sort((a, b) => a.position - b.position);
}

async function listRoutines(userId, date = new Date()) {
  const routines = await prisma.routine.findMany({
    where: { userId },
    orderBy: [{ period: 'asc' }, { position: 'asc' }, { createdAt: 'asc' }],
    include: { items: { orderBy: { position: 'asc' } } },
  });

  const todayStart = startOfDay(date);
  const todayEnd = endOfDay(date);
  const ticks = await prisma.xpHistory.findMany({
    where: { userId, type: 'ROUTINE_COMPLETE', createdAt: { gte: todayStart, lt: todayEnd } },
    select: { metadata: true },
  });
  const tickedToday = new Set(
    ticks.map((t) => {
      try {
        const meta = JSON.parse(t.metadata || '{}');
        return meta.itemId;
      } catch {
        return null;
      }
    })
  );

  return routines.map((routine) => ({
    ...routine,
    items: routine.items.map((item) => ({ ...item, completedToday: tickedToday.has(item.id) })),
  }));
}

async function createRoutine(userId, { name, period, items = [] }) {
  const count = await prisma.routine.count({ where: { userId } });
  if (count >= MAX_ROUTINES_PER_USER) {
    throw ApiError.conflict('ROUTINE_LIMIT_REACHED', `You can have at most ${MAX_ROUTINES_PER_USER} routines.`);
  }
  const last = await prisma.routine.findFirst({
    where: { userId, period },
    orderBy: { position: 'desc' },
    select: { position: true },
  });

  const routine = await prisma.$transaction(async (tx) => {
    const created = await tx.routine.create({
      data: {
        userId,
        name: name.trim(),
        period,
        position: (last?.position ?? -1) + 1,
        items: {
          create: items.map((item, index) => ({ title: item.title.trim(), position: index })),
        },
      },
      include: { items: { orderBy: { position: 'asc' } } },
    });
    return created;
  });

  return routine;
}

async function addRoutineItem(userId, routineId, title) {
  const routine = await prisma.routine.findFirst({ where: { id: routineId, userId } });
  if (!routine) throw ApiError.notFound('ROUTINE_NOT_FOUND', 'Routine not found.');

  const itemCount = await prisma.routineItem.count({ where: { routineId } });
  if (itemCount >= MAX_ITEMS_PER_ROUTINE) {
    throw ApiError.conflict('ITEM_LIMIT_REACHED', `Routines can hold at most ${MAX_ITEMS_PER_ROUTINE} items.`);
  }
  const last = await prisma.routineItem.findFirst({
    where: { routineId },
    orderBy: { position: 'desc' },
    select: { position: true },
  });

  return prisma.routineItem.create({
    data: { routineId, title: title.trim(), position: (last?.position ?? -1) + 1 },
  });
}

async function updateRoutine(userId, routineId, { name }) {
  const routine = await prisma.routine.findFirst({ where: { id: routineId, userId } });
  if (!routine) throw ApiError.notFound('ROUTINE_NOT_FOUND', 'Routine not found.');
  return prisma.routine.update({ where: { id: routineId }, data: { name: name.trim() } });
}

async function reorderItems(userId, routineId, itemIds) {
  const routine = await prisma.routine.findFirst({ where: { id: routineId, userId } });
  if (!routine) throw ApiError.notFound('ROUTINE_NOT_FOUND', 'Routine not found.');

  const items = await prisma.routineItem.findMany({ where: { routineId } });
  const ownedIds = new Set(items.map((i) => i.id));
  if (itemIds.length !== items.length || itemIds.some((id) => !ownedIds.has(id))) {
    throw ApiError.badRequest('INVALID_ORDER', 'itemIds must be a permutation of the routine items.');
  }

  await prisma.$transaction(
    itemIds.map((id, index) => prisma.routineItem.update({ where: { id }, data: { position: index } }))
  );
  return prisma.routineItem.findMany({ where: { routineId }, orderBy: { position: 'asc' } });
}

/** Mark an item done for today. Idempotent per day; writes a history ledger row. */
async function completeItem(userId, routineId, itemId) {
  const routine = await prisma.routine.findFirst({ where: { id: routineId, userId } });
  if (!routine) throw ApiError.notFound('ROUTINE_NOT_FOUND', 'Routine not found.');
  const item = await prisma.routineItem.findFirst({ where: { id: itemId, routineId } });
  if (!item) throw ApiError.notFound('ITEM_NOT_FOUND', 'Routine item not found.');

  const now = new Date();
  const existing = await prisma.xpHistory.findFirst({
    where: {
      userId,
      type: 'ROUTINE_COMPLETE',
      metadata: JSON.stringify({ routineId, itemId }),
      createdAt: { gte: startOfDay(now), lt: endOfDay(now) },
    },
  });
  if (existing) {
    return { item, alreadyCompleted: true, today: true };
  }

  const history = await prisma.xpHistory.create({
    data: {
      userId,
      type: 'ROUTINE_COMPLETE',
      description: `Completed routine item "${item.title}"`,
      metadata: JSON.stringify({ routineId, itemId }),
    },
  });
  return { item, alreadyCompleted: false, history };
}

async function deleteRoutine(userId, routineId) {
  const routine = await prisma.routine.findFirst({ where: { id: routineId, userId } });
  if (!routine) throw ApiError.notFound('ROUTINE_NOT_FOUND', 'Routine not found.');
  await prisma.routine.delete({ where: { id: routineId } });
  return { message: 'Routine deleted.' };
}

module.exports = {
  listRoutines,
  createRoutine,
  addRoutineItem,
  updateRoutine,
  reorderItems,
  completeItem,
  deleteRoutine,
};