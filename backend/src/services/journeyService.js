const prisma = require('../lib/prisma');
const { JOURNEY_TYPES, JOURNEY_MIN_DAYS, JOURNEY_MAX_DAYS } = require('../config/constants');
const { ApiError } = require('../utils/apiError');
const { dayKey, startOfDay, addDays } = require('../utils/date');

/**
 * Journeys & challenges — multi-day programs (e.g. "30 days of coding").
 *
 * Progress is derived strictly from real quest completions that landed during
 * the program window: each distinct active day since the start of the program
 * counts as one completed "day" (swordsman-style: days cannot be skipped ahead
 * past the elapsed program). No fabricated progress, ever.
 */
async function computeProgress(db, journey, now = new Date()) {
  const start = startOfDay(journey.startedAt);
  const todayStart = startOfDay(now);
  const elapsedDays = Math.max(0, Math.floor((todayStart.getTime() - start.getTime()) / 86400000)) + 1;

  const completions = await db.questCompletion.findMany({
    where: { userId: journey.userId, completedAt: { gte: start } },
    select: { completedAt: true },
  });
  const activeDays = new Set(completions.map((c) => dayKey(c.completedAt))).size;

  return {
    currentDay: Math.min(elapsedDays, journey.totalDays),
    totalDays: journey.totalDays,
    activeDays: Math.min(activeDays, journey.totalDays),
    complete: activeDays >= journey.totalDays,
    progressPercentage: journey.totalDays > 0 ? Math.min(100, Math.round((activeDays / journey.totalDays) * 100)) : 0,
  };
}

async function listJourneys(userId) {
  const journeys = await prisma.journey.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  const now = new Date();
  const results = [];
  for (const journey of journeys) {
    results.push({ ...journey, ...(await computeProgress(prisma, journey, now)) });
  }
  return results;
}

async function createJourney(userId, { title, totalDays, kind = 'JOURNEY' }) {
  if (!JOURNEY_TYPES.includes(kind)) {
    throw ApiError.badRequest('INVALID_KIND', `kind must be one of: ${JOURNEY_TYPES.join(', ')}.`);
  }
  const days = Math.min(JOURNEY_MAX_DAYS, Math.max(JOURNEY_MIN_DAYS, totalDays));
  return prisma.journey.create({
    data: { userId, title: title.trim(), totalDays: days, kind },
  });
}

async function deleteJourney(userId, journeyId) {
  const journey = await prisma.journey.findFirst({ where: { id: journeyId, userId } });
  if (!journey) throw ApiError.notFound('JOURNEY_NOT_FOUND', 'Journey or challenge not found.');
  await prisma.journey.delete({ where: { id: journeyId } });
  return { message: 'Journey deleted.' };
}

module.exports = { listJourneys, createJourney, deleteJourney, computeProgress };