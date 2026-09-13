const { rankForLevel, ATTRIBUTE_FIELDS } = require('../config/constants');
const { dayKey } = require('../utils/date');
const { getWeeklyProgress } = require('./weeklyProgressService');

/**
 * Character profile — the live character plus the derived progression
 * metadata Phase 8 surfaces on the character/dashboard UI:
 * level progress, rank/title, streak, lifetime stats, strongest attribute
 * (deterministic tie-break) and fastest-growing attribute this week
 * (null when there is no data yet).
 */
async function getCharacterProfile(userId, date = new Date()) {
  const character = await require('../lib/prisma').character.findUnique({ where: { userId } });
  if (!character) return null;

  const completions = await require('../lib/prisma').questCompletion.findMany({
    where: { userId },
    select: { completedAt: true },
  });

  const activeDaySet = new Set();
  for (const c of completions) activeDaySet.add(dayKey(c.completedAt));

  const rank = rankForLevel(character.level);

  const strongestAttribute = strongest(character);
  const fastestGrowingAttribute = await fastestGrowing(userId, date);

  return {
    ...character,
    rank,
    totalQuestsCompleted: completions.length,
    activeDays: activeDaySet.size,
    strongestAttribute: strongestAttribute ? strongestAttribute.toUpperCase() : null,
    fastestGrowingAttribute,
  };
}

/** Highest attribute value with a deterministic tie-break order. */
function strongest(character) {
  let best = null;
  let bestValue = -1;
  for (const field of ATTRIBUTE_FIELDS) {
    if (character[field] > bestValue) {
      best = field;
      bestValue = character[field];
    }
  }
  return best;
}

/** The single attribute with the most points earned this week, or null. */
async function fastestGrowing(userId, date) {
  const weekly = await getWeeklyProgress(require('../lib/prisma'), userId, date);
  const gains = weekly.attributes;
  let best = null;
  let bestValue = 0;
  for (const field of ATTRIBUTE_FIELDS) {
    const value = gains[field] || 0;
    if (value > bestValue) {
      best = field;
      bestValue = value;
    }
  }
  return bestValue > 0 ? best.toUpperCase() : null;
}

module.exports = { getCharacterProfile };