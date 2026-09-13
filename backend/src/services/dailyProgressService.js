const { startOfDay, endOfDay, dayKey } = require('../utils/date');

/**
 * Today's Arc — the player's quest arc for a single day.
 *
 * Derived purely from real data (Quest rows created today + QuestCompletion
 * rows completed today), never fabricated. A day with zero quests returns the
 * clear empty state (isComplete: false) so the UI can show "nothing planned".
 *
 * `db` may be the shared Prisma client (route) or a transaction handle
 * (inside a completion transaction) so the Arc is always read consistently
 * with the mutation that just happened.
 */
async function getDailyProgress(db, userId, date = new Date()) {
  const start = startOfDay(date);
  const end = endOfDay(date);

  const [totalQuests, completions] = await Promise.all([
    db.quest.count({ where: { userId, createdAt: { gte: start, lt: end } } }),
    db.questCompletion.findMany({
      where: { userId, completedAt: { gte: start, lt: end } },
      select: { xpEarned: true, goldEarned: true, attributeGained: true, attributePoints: true, completedAt: true },
    }),
  ]);

  const completedQuests = completions.length;
  const attributeChanges = completions.reduce((acc, c) => {
    const key = c.attributeGained.toLowerCase();
    acc[key] = (acc[key] || 0) + c.attributePoints;
    return acc;
  }, {});

  return {
    date: dayKey(start),
    totalQuests,
    completedQuests,
    remainingQuests: Math.max(0, totalQuests - completedQuests),
    completionPercentage: totalQuests > 0 ? Math.min(100, Math.round((completedQuests / totalQuests) * 100)) : 0,
    xpEarned: completions.reduce((sum, c) => sum + c.xpEarned, 0),
    goldEarned: completions.reduce((sum, c) => sum + c.goldEarned, 0),
    attributeChanges,
    activeDays: completions.length > 0 ? 1 : 0,
    isComplete: totalQuests > 0 && completedQuests >= totalQuests,
  };
}

module.exports = { getDailyProgress };