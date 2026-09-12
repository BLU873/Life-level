const { DIFFICULTIES, BASE_XP, BASE_GOLD, xpForLevel, levelFromTotalXP } = require('../config/constants');

// --- XP / Level primitives ------------------------------------------------
// The XP curve lives in constants.js (100 * level^1.5). These wrappers keep it
// in a single location while exposing a clean API for routes and services.

/** Total XP required to reach the given level. */
function getXPRequiredForLevel(level) {
  return xpForLevel(level);
}

/** Current level from a cumulative total XP figure. */
function calculateLevelFromXP(totalXP) {
  return levelFromTotalXP(totalXP);
}

/**
 * Level progress for a cumulative total XP figure.
 * Returns { currentLevel, xpIntoCurrentLevel, xpRequiredForNextLevel, totalXP, progressPercentage }
 */
function calculateLevelProgress(totalXP) {
  const progress = getXPProgress(totalXP);
  return {
    currentLevel: progress.level,
    xpIntoCurrentLevel: progress.currentXP,
    xpRequiredForNextLevel: progress.xpForNextLevel,
    totalXP: progress.xpTotal,
    progressPercentage: Math.round(progress.progress * 1000) / 10,
  };
}

// --- Rewards ---------------------------------------------------------------

/**
 * Calculate rewards for completing a quest.
 * All calculations happen server-side to prevent cheating.
 */
function calculateQuestRewards(quest) {
  const difficulty = DIFFICULTIES[quest.difficulty] || DIFFICULTIES.EASY;

  return {
    xpEarned: Math.floor(BASE_XP * difficulty.xpMultiplier),
    goldEarned: Math.floor(BASE_GOLD * difficulty.goldMultiplier),
    attributePoints: difficulty.attributePoints,
    attribute: quest.attribute || quest.category,
  };
}

// --- Level-up helpers ------------------------------------------------------

/**
 * Check if adding XP causes a level up.
 * Returns the new level and whether a level-up occurred.
 */
function checkLevelUp(currentTotalXP, xpToAdd) {
  const oldLevel = levelFromTotalXP(currentTotalXP);
  const newLevel = levelFromTotalXP(currentTotalXP + xpToAdd);

  return {
    oldLevel,
    newLevel,
    leveledUp: newLevel > oldLevel,
    levelsGained: newLevel - oldLevel,
  };
}

/**
 * Calculate current XP progress within the current level.
 * Level 1 starts at 0 total XP (the curve's level-1 threshold is unused), so
 * progress is never negative for fresh characters.
 */
function getXPProgress(totalXP) {
  const level = levelFromTotalXP(totalXP);
  const levelStartXP = level === 1 ? 0 : xpForLevel(level);
  const levelEndXP = xpForLevel(level + 1);
  const xpInLevel = Math.max(0, totalXP - levelStartXP);
  const xpNeeded = levelEndXP - levelStartXP;

  return {
    level,
    currentXP: xpInLevel,
    xpForNextLevel: xpNeeded,
    xpTotal: totalXP,
    progress: xpNeeded > 0 ? Math.min(xpInLevel / xpNeeded, 1) : 1,
  };
}

// --- Progression application ----------------------------------------------

/**
 * Pure application of rewards to a character snapshot. Handles an arbitrary
 * number of level jumps in one step from a large XP reward.
 *
 * Input:
 *   character - Character row (needs totalXP and the 5 attribute fields)
 *   rewards   - Output of calculateQuestRewards
 *   streak    - Output of streakService.calculateStreak
 *
 * Returns the resulting progression snapshot. Does not touch the database.
 */
function applyQuestCompletion({ character, rewards, streak }) {
  const attributeType = rewards.attribute;
  const attributeBefore = character[attributeType.toLowerCase()] ?? 0;
  const levelBefore = levelFromTotalXP(character.totalXP);
  const totalXP = character.totalXP + rewards.xpEarned;
  const levelAfter = levelFromTotalXP(totalXP);
  const progress = getXPProgress(totalXP);

  return {
    xpEarned: rewards.xpEarned,
    goldEarned: rewards.goldEarned,
    attributeType,
    attributeBefore,
    attributeAfter: attributeBefore + rewards.attributePoints,
    attributeChange: rewards.attributePoints,
    levelBefore,
    levelAfter,
    leveledUp: levelAfter > levelBefore,
    levelsGained: levelAfter - levelBefore,
    totalXP,
    xpIntoCurrentLevel: progress.currentXP,
    xpRequiredForNextLevel: progress.xpForNextLevel,
    progressPercentage: Math.round(progress.progress * 1000) / 10,
    streak,
  };
}

module.exports = {
  getXPRequiredForLevel,
  calculateLevelFromXP,
  calculateLevelProgress,
  calculateQuestRewards,
  checkLevelUp,
  getXPProgress,
  applyQuestCompletion,
};