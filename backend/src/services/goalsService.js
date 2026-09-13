const prisma = require('../lib/prisma');
const { GOAL_REWARDS, DEFAULT_DAILY_QUEST_GOAL, DEFAULT_WEEKLY_QUEST_GOAL } = require('../config/constants');
const { ApiError } = require('../utils/apiError');
const { dayKey, startOfWeek } = require('../utils/date');
const { getDailyProgress } = require('./dailyProgressService');
const { getWeeklyProgress } = require('./weeklyProgressService');
const { applyFlatGrant } = require('./rpgEngine');

/**
 * Daily / weekly quest goals.
 *
 * Goals are stored on the Character (server-authoritative, never client-set
 * beyond the stored preference). Completing a goal grants a one-time reward
 * keyed to the claim columns — a claim can never be repeated for the same day
 * or week, even if the API is called twice.
 */

const GOAL_SCOPES = ['DAILY', 'WEEKLY'];

function sameDay(a, b) {
  return dayKey(a) === dayKey(b || null);
}

function sameWeek(a, b) {
  return dayKey(startOfWeek(a)) === dayKey(startOfWeek(b || null));
}

async function getGoalStatus(userId, date = new Date()) {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw ApiError.notFound('CHARACTER_NOT_FOUND', 'Character not found.');

  const daily = await getDailyProgress(prisma, userId, date);
  const weekly = await getWeeklyProgress(prisma, userId, date);

  const dailyComplete = daily.completedQuests >= character.dailyQuestGoal;
  const weeklyComplete = weekly.questsCompleted >= character.weeklyQuestGoal;

  return {
    date: dayKey(date),
    daily: {
      goal: character.dailyQuestGoal,
      completed: daily.completedQuests,
      isComplete: dailyComplete,
      claimed: character.dailyGoalClaimedAt ? sameDay(character.dailyGoalClaimedAt, date) : false,
      canClaim: dailyComplete,
      reward: GOAL_REWARDS.DAILY,
    },
    weekly: {
      goal: character.weeklyQuestGoal,
      completed: weekly.questsCompleted,
      isComplete: weeklyComplete,
      claimed: character.weeklyGoalClaimedAt ? sameWeek(character.weeklyGoalClaimedAt, date) : false,
      canClaim: weeklyComplete,
      reward: GOAL_REWARDS.WEEKLY,
    },
  };
}

async function setGoals(userId, { daily, weekly }) {
  return prisma.character.update({
    where: { userId },
    data: {
      dailyQuestGoal: daily,
      weeklyQuestGoal: weekly,
    },
    select: { dailyQuestGoal: true, weeklyQuestGoal: true },
  });
}

async function claimGoal(userId, scope, date = new Date()) {
  if (!GOAL_SCOPES.includes(scope)) {
    throw ApiError.badRequest('INVALID_SCOPE', `scope must be one of: ${GOAL_SCOPES.join(', ')}.`);
  }

  return prisma.$transaction(async (tx) => {
    const character = await tx.character.findUnique({ where: { userId } });
    if (!character) throw ApiError.notFound('CHARACTER_NOT_FOUND', 'Character not found.');

    const reward = GOAL_REWARDS[scope];
    let completed = false;

    if (scope === 'DAILY') {
      const daily = await getDailyProgress(tx, userId, date);
      completed = daily.completedQuests >= character.dailyQuestGoal;
      if (completed && character.dailyGoalClaimedAt && sameDay(character.dailyGoalClaimedAt, date)) {
        throw ApiError.conflict('GOAL_ALREADY_CLAIMED', 'Your daily goal reward was already claimed today.');
      }
    } else {
      const weekly = await getWeeklyProgress(tx, userId, date);
      completed = weekly.questsCompleted >= character.weeklyQuestGoal;
      if (completed && character.weeklyGoalClaimedAt && sameWeek(character.weeklyGoalClaimedAt, date)) {
        throw ApiError.conflict('GOAL_ALREADY_CLAIMED', 'Your weekly goal reward was already claimed this week.');
      }
    }

    if (!completed) {
      throw ApiError.conflict('GOAL_NOT_COMPLETE', 'This goal has not been reached yet.');
    }

    const progression = applyFlatGrant({ character, xp: reward.xp, gold: reward.gold });

    const claimedAt = new Date();
    const data = {
      totalXP: progression.totalXP,
      level: progression.levelAfter,
      currentXP: progression.xpIntoCurrentLevel,
      gold: progression.totalGold,
    };
    if (scope === 'DAILY') data.dailyGoalClaimedAt = claimedAt;
    else data.weeklyGoalClaimedAt = claimedAt;

    const updated = await tx.character.update({ where: { userId }, data });

    const history = await tx.xpHistory.create({
      data: {
        userId,
        type: 'GOAL_CLAIM',
        description: scope === 'DAILY' ? 'Claimed the daily goal reward' : 'Claimed the weekly goal reward',
        xpChange: reward.xp,
        goldChange: reward.gold,
        levelBefore: progression.levelBefore,
        levelAfter: progression.levelAfter,
        newLevel: progression.levelAfter,
        metadata: JSON.stringify({ scope }),
      },
    });

    return {
      scope,
      rewards: reward,
      progression: {
        levelBefore: progression.levelBefore,
        levelAfter: progression.levelAfter,
        leveledUp: progression.leveledUp,
        totalXP: progression.totalXP,
        xpIntoCurrentLevel: progression.xpIntoCurrentLevel,
        xpRequiredForNextLevel: progression.xpRequiredForNextLevel,
        progressPercentage: progression.progressPercentage,
      },
      character: { gold: progression.totalGold, level: progression.levelAfter },
      history,
    };
  });
}

module.exports = { getGoalStatus, setGoals, claimGoal, GOAL_SCOPES, DEFAULT_DAILY_QUEST_GOAL, DEFAULT_WEEKLY_QUEST_GOAL };