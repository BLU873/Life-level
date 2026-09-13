const { addDays, dayKey, startOfDay } = require('../utils/date');

/**
 * Activity calendar — per-day aggregates over a trailing window (default 84
 * days) derived from the same real ledgers as the rest of the app. Every dot
 * in the calendar is backed by an actual completed quest, focus session,
 * routine tick or reward redemption.
 */
async function getActivityCalendar(db, userId, days = 84) {
  const window = Math.min(366, Math.max(1, days));
  const end = startOfDay(new Date());
  const start = addDays(end, -(window - 1));

  const [completions, focusSessions, routineTicks, goalClaims, redemptions] = await Promise.all([
    db.questCompletion.findMany({
      where: { userId, completedAt: { gte: start } },
      select: { completedAt: true },
    }),
    db.focusSession.findMany({
      where: { userId, status: 'COMPLETED', completedAt: { gte: start } },
      select: { completedAt: true, totalSeconds: true },
    }),
    db.xpHistory.findMany({
      where: { userId, type: 'ROUTINE_COMPLETE', createdAt: { gte: start } },
      select: { createdAt: true },
    }),
    db.xpHistory.findMany({
      where: { userId, type: 'GOAL_CLAIM', createdAt: { gte: start } },
      select: { createdAt: true },
    }),
    db.xpHistory.findMany({
      where: { userId, type: 'REWARD_REDEEMED', createdAt: { gte: start } },
      select: { createdAt: true, goldChange: true },
    }),
  ]);

  const buckets = new Map();

  function bucket(key) {
    if (!buckets.has(key)) {
      buckets.set(key, { date: key, quests: 0, focusSeconds: 0, routines: 0, goals: 0, goldChange: 0 });
    }
    return buckets.get(key);
  }

  for (const c of completions) bucket(dayKey(c.completedAt)).quests += 1;
  for (const f of focusSessions) bucket(dayKey(f.completedAt)).focusSeconds += f.totalSeconds;
  for (const r of routineTicks) bucket(dayKey(r.createdAt)).routines += 1;
  for (const g of goalClaims) bucket(dayKey(g.createdAt)).goals += 1;
  for (const r of redemptions) bucket(dayKey(r.createdAt)).goldChange += r.goldChange;

  const daysOut = [];
  for (let i = 0; i < window; i++) {
    const key = dayKey(addDays(start, i));
    daysOut.push(buckets.get(key) || { date: key, quests: 0, focusSeconds: 0, routines: 0, goals: 0, goldChange: 0 });
  }
  return daysOut;
}

module.exports = { getActivityCalendar };