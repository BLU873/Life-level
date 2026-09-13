const prisma = require('../lib/prisma');
const { FOCUS_COMPLETE_REWARD, FOCUS_MODES, FOCUS_DEFAULT_SECONDS } = require('../config/constants');
const { applyFlatGrant } = require('./rpgEngine');
const { evaluateAchievements } = require('./achievementService');
const { ApiError } = require('../utils/apiError');
const { startOfDay, endOfDay, startOfWeek, endOfWeek, addDays } = require('../utils/date');

/**
 * Focus sessions (Pomodoro / Flow).
 *
 * Timing is authoritative on the server: elapsed seconds are always derived
 * from the session's stored timestamps at mutation time, never trusted from
 * the client. Normal completion grants a small flat reward; cancelling keeps
 * the elapsed time but grants nothing.
 */

const SESSION_STATES = { ACTIVE: 'ACTIVE', PAUSED: 'PAUSED', COMPLETED: 'COMPLETED', CANCELLED: 'CANCELLED' };

function formatMinutes(totalSeconds) {
  const mins = Math.max(1, Math.round(totalSeconds / 60));
  return mins === 1 ? '1 minute' : `${mins} minutes`;
}

/** Ensure the user never has more than one live (running or paused) session. */
async function activeSession(userId, tx = prisma) {
  return tx.focusSession.findFirst({
    where: { userId, status: { in: [SESSION_STATES.ACTIVE, SESSION_STATES.PAUSED] } },
  });
}

async function startFocus(userId, { mode = 'POMODORO', plannedSeconds, questId }) {
  return prisma.$transaction(async (tx) => {
    if (await activeSession(userId, tx)) {
      throw ApiError.conflict('FOCUS_ALREADY_RUNNING', 'A focus session is already running. Complete or cancel it first.');
    }

    if (questId) {
      const quest = await tx.quest.findFirst({ where: { id: questId, userId } });
      if (!quest) throw ApiError.notFound('QUEST_NOT_FOUND', 'Quest not found.');
    }

    const config = FOCUS_MODES[mode] || FOCUS_MODES.POMODORO;
    const planned = Number.isInteger(plannedSeconds) && plannedSeconds > 0 ? plannedSeconds : FOCUS_DEFAULT_SECONDS;

    const session = await tx.focusSession.create({
      data: {
        userId,
        questId: questId || null,
        mode: config === FOCUS_MODES.POMODORO ? 'POMODORO' : mode,
        plannedSeconds: planned,
        status: SESSION_STATES.ACTIVE,
        startedAt: new Date(),
      },
    });

    return session;
  });
}

async function pauseFocus(userId, sessionId) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.focusSession.findFirst({ where: { id: sessionId, userId } });
    if (!session) throw ApiError.notFound('FOCUS_NOT_FOUND', 'Focus session not found.');
    if (session.status !== SESSION_STATES.ACTIVE) {
      throw ApiError.conflict('FOCUS_NOT_ACTIVE', 'Only an active focus session can be paused.');
    }

    const increment = Math.max(0, Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000));
    const updated = await tx.focusSession.update({
      where: { id: session.id },
      data: { totalSeconds: session.totalSeconds + increment, status: SESSION_STATES.PAUSED },
    });
    return updated;
  });
}

async function resumeFocus(userId, sessionId) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.focusSession.findFirst({ where: { id: sessionId, userId } });
    if (!session) throw ApiError.notFound('FOCUS_NOT_FOUND', 'Focus session not found.');
    if (session.status !== SESSION_STATES.PAUSED) {
      throw ApiError.conflict('FOCUS_NOT_PAUSED', 'Only a paused focus session can be resumed.');
    }

    const updated = await tx.focusSession.update({
      where: { id: session.id },
      data: { status: SESSION_STATES.ACTIVE, startedAt: new Date() },
    });
    return updated;
  });
}

async function cancelFocus(userId, sessionId) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.focusSession.findFirst({ where: { id: sessionId, userId } });
    if (!session) throw ApiError.notFound('FOCUS_NOT_FOUND', 'Focus session not found.');
    if (session.status === SESSION_STATES.COMPLETED || session.status === SESSION_STATES.CANCELLED) {
      throw ApiError.conflict('FOCUS_CLOSED', 'This focus session is already closed.');
    }

    const increment =
      session.status === SESSION_STATES.ACTIVE
        ? Math.max(0, Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000))
        : 0;
    const updated = await tx.focusSession.update({
      where: { id: session.id },
      data: {
        totalSeconds: session.totalSeconds + increment,
        status: SESSION_STATES.CANCELLED,
      },
    });
    return updated;
  });
}

async function completeFocus(userId, sessionId) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.focusSession.findFirst({ where: { id: sessionId, userId } });
    if (!session) throw ApiError.notFound('FOCUS_NOT_FOUND', 'Focus session not found.');
    if (session.status === SESSION_STATES.COMPLETED || session.status === SESSION_STATES.CANCELLED) {
      throw ApiError.conflict('FOCUS_CLOSED', 'This focus session is already closed.');
    }

    const increment =
      session.status === SESSION_STATES.ACTIVE
        ? Math.max(0, Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000))
        : 0;
    const totalSeconds = session.totalSeconds + increment;

    const updated = await tx.focusSession.update({
      where: { id: session.id },
      data: { totalSeconds, status: SESSION_STATES.COMPLETED, completedAt: new Date() },
    });

    const character = await tx.character.findUnique({ where: { userId } });
    if (!character) throw ApiError.notFound('CHARACTER_NOT_FOUND', 'Character not found.');

    const progression = applyFlatGrant({
      character,
      xp: FOCUS_COMPLETE_REWARD.xp,
      gold: FOCUS_COMPLETE_REWARD.gold,
    });

    await tx.character.update({
      where: { userId },
      data: {
        totalXP: progression.totalXP,
        level: progression.levelAfter,
        currentXP: progression.xpIntoCurrentLevel,
        gold: progression.totalGold,
      },
    });

    const history = await tx.xpHistory.create({
      data: {
        userId,
        type: 'FOCUS_COMPLETE',
        description: `Completed a ${formatMinutes(totalSeconds)} ${updated.mode === 'POMODORO' ? 'pomodoro' : 'focus'} session`,
        xpChange: FOCUS_COMPLETE_REWARD.xp,
        goldChange: FOCUS_COMPLETE_REWARD.gold,
        levelBefore: progression.levelBefore,
        levelAfter: progression.levelAfter,
        newLevel: progression.levelAfter,
        metadata: JSON.stringify({ sessionId: updated.id, mode: updated.mode, totalSeconds }),
      },
    });

    const { newlyUnlocked } = await evaluateAchievements(tx, userId);

    return {
      session: updated,
      progression: {
        levelBefore: progression.levelBefore,
        levelAfter: progression.levelAfter,
        leveledUp: progression.leveledUp,
        totalXP: progression.totalXP,
        xpIntoCurrentLevel: progression.xpIntoCurrentLevel,
        xpRequiredForNextLevel: progression.xpRequiredForNextLevel,
        progressPercentage: progression.progressPercentage,
      },
      rewards: { xp: FOCUS_COMPLETE_REWARD.xp, gold: FOCUS_COMPLETE_REWARD.gold },
      character: { gold: progression.totalGold, level: progression.levelAfter },
      history,
      newAchievements: newlyUnlocked,
    };
  });
}

/** Active (running or paused) session, if any, for the dashboard timer. */
async function getActiveSession(userId) {
  return prisma.focusSession.findFirst({
    where: { userId, status: { in: [SESSION_STATES.ACTIVE, SESSION_STATES.PAUSED] } },
  });
}

/**
 * Focus history: total focus seconds and completed-session count for today,
 * this week and this month.
 */
async function getFocusHistory(userId) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const counts = await prisma.focusSession.count({
    where: { userId, status: SESSION_STATES.COMPLETED },
  });

  const ranges = [
    { scope: 'today', start: todayStart, end: endOfDay(now) },
    { scope: 'week', start: weekStart, end: endOfWeek(now) },
    { scope: 'month', start: monthStart, end: addDays(monthStart, 32) },
  ];

  const out = { sessionsCompleted: counts, today: { seconds: 0 }, week: { seconds: 0 }, month: { seconds: 0 } };
  for (const { scope, start, end } of ranges) {
    const rows = await prisma.focusSession.findMany({
      where: { userId, status: SESSION_STATES.COMPLETED, completedAt: { gte: start, lt: end } },
      select: { totalSeconds: true },
    });
    out[scope] = { seconds: rows.reduce((sum, r) => sum + r.totalSeconds, 0) };
  }
  return out;
}

module.exports = {
  startFocus,
  pauseFocus,
  resumeFocus,
  cancelFocus,
  completeFocus,
  getActiveSession,
  getFocusHistory,
};