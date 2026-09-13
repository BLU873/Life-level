const { startOfWeek, endOfWeek, addDays, dayKey } = require('../utils/date');

/**
 * Weekly progress — aggregates for the week (Monday -> Sunday) containing the
 * given date, including the 7-day `daily` breakdown used to render the weekly
 * arc/chart. All figures come from real QuestCompletion rows.
 *
 * `db` may be the shared Prisma client or a transaction handle.
 */
async function getWeeklyProgress(db, userId, date = new Date()) {
  const weekStart = startOfWeek(date);
  const weekEnd = endOfWeek(date);

  const [completions, character] = await Promise.all([
    db.questCompletion.findMany({
      where: { userId, completedAt: { gte: weekStart, lt: weekEnd } },
      select: { xpEarned: true, goldEarned: true, attributeGained: true, attributePoints: true, completedAt: true },
    }),
    db.character.findUnique({
      where: { userId },
      select: { currentStreak: true, longestStreak: true },
    }),
  ]);

  const attributes = completions.reduce((acc, c) => {
    const key = c.attributeGained.toLowerCase();
    acc[key] = (acc[key] || 0) + c.attributePoints;
    return acc;
  }, {});

  const daily = Array.from({ length: 7 }, (_, i) => {
    const dayStart = addDays(weekStart, i);
    const dayEnd = addDays(dayStart, 1);
    const dayCompletions = completions.filter((c) => c.completedAt >= dayStart && c.completedAt < dayEnd);
    return {
      date: dayKey(dayStart),
      questsCompleted: dayCompletions.length,
      xpEarned: dayCompletions.reduce((sum, c) => sum + c.xpEarned, 0),
      goldEarned: dayCompletions.reduce((sum, c) => sum + c.goldEarned, 0),
    };
  });

  return {
    weekStart: dayKey(weekStart),
    weekEnd: dayKey(addDays(weekStart, 6)),
    questsCompleted: completions.length,
    xpEarned: completions.reduce((sum, c) => sum + c.xpEarned, 0),
    goldEarned: completions.reduce((sum, c) => sum + c.goldEarned, 0),
    activeDays: new Set(completions.map((c) => dayKey(c.completedAt))).size,
    attributes,
    currentStreak: character?.currentStreak ?? 0,
    longestStreak: character?.longestStreak ?? 0,
    daily,
  };
}

module.exports = { getWeeklyProgress };