const { ACHIEVEMENTS, ATTRIBUTE_FIELDS } = require('../config/constants');
const { dayKey, startOfWeek, endOfWeek } = require('../utils/date');

/**
 * Achievements service.
 *
 * Definitions live centrally in config/constants (ACHIEVEMENTS) and are kept
 * in sync with the AchievementDefinition table. Unlocks are computed from real
 * progression data only and recorded in UserAchievement with a matching
 * XPHistory ledger row (type ACHIEVEMENT_UNLOCK), atomically with the quest
 * completion that triggered them.
 */

/** Upsert the central achievement definitions so the table is never stale. */
async function syncAchievementDefinitions(db = require('../lib/prisma')) {
  await Promise.all(
    ACHIEVEMENTS.map((a) =>
      db.achievementDefinition.upsert({
        where: { code: a.code },
        update: { name: a.name, description: a.description, requirements: JSON.stringify(a.requirements) },
        create: {
          code: a.code,
          name: a.name,
          description: a.description,
          requirements: JSON.stringify(a.requirements),
        },
      })
    )
  );
}

/**
 * Evaluate achievements against real progression data and grant any that are
 * not yet unlocked. Returns newly unlocked achievements in the order they were
 * granted.
 *
 * `db` is either the shared client (standalone) or the active transaction
 * (inside completeQuest / focus completion) so unlocks persist atomically with
 * the originating action.
 */
async function evaluateAchievements(db, userId) {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);
  const [defs, character, completions, focusSessions, routineActivity, journeys] = await Promise.all([
    db.achievementDefinition.findMany(),
    db.character.findUnique({ where: { userId } }),
    db.questCompletion.findMany({
      where: { userId },
      select: { completedAt: true, quest: { select: { category: true } } },
    }),
    db.focusSession.count({ where: { userId, status: 'COMPLETED' } }),
    db.xpHistory.findMany({
      where: { userId, type: 'ROUTINE_COMPLETE' },
      select: { createdAt: true },
    }),
    db.journey.count({ where: { userId } }),
  ]);

  if (!character) return { newlyUnlocked: [] };

  const unlockedRows = await db.userAchievement.findMany({
    where: { userId },
    select: { achievement: { select: { code: true } } },
  });
  const unlockedCodes = new Set(unlockedRows.map((r) => r.achievement.code));

  const codingsCompleted = completions.filter((c) => c.quest.category === 'CODING').length;
  const weekCompletions = completions.filter((c) => {
    const t = new Date(c.completedAt);
    return t >= weekStart && t < weekEnd;
  }).length;
  const maxAttribute = Math.max(...ATTRIBUTE_FIELDS.map((f) => character[f]));

  const stats = {
    completionsCompleted: completions.length,
    activeDays: new Set(completions.map((c) => dayKey(c.completedAt))).size,
    codingsCompleted,
    attributesElevated: ATTRIBUTE_FIELDS.filter((f) => character[f] > 1).length,
    focusSessions,
    routineDays: new Set(routineActivity.map((r) => dayKey(r.createdAt))).size,
    journeysStarted: journeys,
    weekQuests: weekCompletions,
    weeklyGoalCompleted: weekCompletions >= character.weeklyQuestGoal,
    maxAttribute,
  };

  const newlyUnlocked = [];
  for (const achievement of ACHIEVEMENTS) {
    if (unlockedCodes.has(achievement.code)) continue;

    if (!requirementsMet(achievement.requirements, character, stats)) continue;

    const def = defs.find((d) => d.code === achievement.code);
    if (!def) continue;

    await db.userAchievement.create({
      data: { userId, achievementId: def.id },
    });
    await db.xpHistory.create({
      data: {
        userId,
        type: 'ACHIEVEMENT_UNLOCK',
        description: `Achievement unlocked: ${achievement.name}`,
        metadata: JSON.stringify({ code: achievement.code }),
      },
    });

    newlyUnlocked.push({
      code: achievement.code,
      name: achievement.name,
      description: achievement.description,
      unlockedAt: new Date().toISOString(),
    });
  }

  return { newlyUnlocked };
}

function requirementsMet(requirements, character, stats) {
  switch (requirements.type) {
    case 'QUESTS_COMPLETED':
      return stats.completionsCompleted >= requirements.count;
    case 'ACTIVE_DAYS':
      return stats.activeDays >= requirements.count;
    case 'ATTRIBUTE_VALUE':
      return character[requirements.attribute.toLowerCase()] >= requirements.value;
    case 'CATEGORY_QUESTS':
      if (requirements.category !== 'CODING') return false;
      return stats.codingsCompleted >= requirements.count;
    case 'ATTRIBUTES_ELEVATED':
      return stats.attributesElevated >= requirements.count;
    case 'STREAK':
      return character.longestStreak >= requirements.count;
    case 'FOCUS_SESSIONS':
      return stats.focusSessions >= requirements.count;
    case 'ROUTINE_DAYS':
      return stats.routineDays >= requirements.count;
    case 'WEEKLY_GOAL_COMPLETED':
      return stats.weeklyGoalCompleted;
    case 'JOURNEYS_STARTED':
      return stats.journeysStarted >= requirements.count;
    case 'MAX_ATTRIBUTE':
      return stats.maxAttribute >= requirements.value;
    default:
      return false;
  }
}

module.exports = { syncAchievementDefinitions, evaluateAchievements };