const prisma = require('../lib/prisma');
const { calculateQuestRewards, applyQuestCompletion } = require('./rpgEngine');
const { calculateStreak } = require('./streakService');
const { ApiError } = require('../utils/apiError');

/**
 * Complete a quest and apply the full RPG progression atomically.
 *
 * Everything — reward calculation, character update, streak update, quest
 * completion flag, QuestCompletion record and XPHistory record — happens
 * inside a single Prisma transaction. If any step fails, nothing is partially
 * persisted.
 *
 * Reward values come exclusively from the existing engine + constants; the
 * client only ever identifies the quest.
 */
async function completeQuest(userId, questId) {
  return prisma.$transaction(async (tx) => {
    const quest = await tx.quest.findFirst({ where: { id: questId, userId } });
    if (!quest) {
      throw ApiError.notFound('QUEST_NOT_FOUND', 'Quest not found.');
    }
    if (quest.isCompleted) {
      throw ApiError.conflict('QUEST_ALREADY_COMPLETED', 'This quest is already completed.');
    }

    const character = await tx.character.findUnique({ where: { userId } });
    if (!character) {
      throw ApiError.notFound('CHARACTER_NOT_FOUND', 'Character not found.');
    }

    // Authoritative server-side values.
    const rewards = calculateQuestRewards(quest);
    // Same-day completions never double-increment the streak (handled by the
    // date diff in streakService); participates in the same transaction.
    const streak = calculateStreak(character.currentStreak, character.longestStreak, character.lastActiveDate);

    const progression = applyQuestCompletion({ character, rewards, streak });

    // Build the character update. Attribute is applied to the mapped field.
    // Stored level/currentXP stay consistent with the derived values.
    const characterUpdate = {
      totalXP: progression.totalXP,
      level: progression.levelAfter,
      currentXP: progression.xpIntoCurrentLevel,
      gold: character.gold + rewards.goldEarned,
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastActiveDate: streak.lastActiveDate,
    };
    characterUpdate[progression.attributeType.toLowerCase()] = progression.attributeAfter;

    const updatedCharacter = await tx.character.update({ where: { userId }, data: characterUpdate });

    const updatedQuest = await tx.quest.update({
      where: { id: quest.id },
      data: { isCompleted: true, completedAt: new Date() },
    });

    const completion = await tx.questCompletion.create({
      data: {
        questId: quest.id,
        userId,
        xpEarned: rewards.xpEarned,
        goldEarned: rewards.goldEarned,
        attributeGained: rewards.attribute,
        attributePoints: rewards.attributePoints,
      },
    });

    const history = await tx.xpHistory.create({
      data: {
        userId,
        questId: quest.id,
        type: 'QUEST_COMPLETION',
        description: `Completed quest "${quest.title}"`,
        xpChange: rewards.xpEarned,
        goldChange: rewards.goldEarned,
        levelBefore: progression.levelBefore,
        levelAfter: progression.levelAfter,
        newLevel: progression.levelAfter,
        streakBefore: character.currentStreak,
        streakAfter: streak.currentStreak,
        attributeType: progression.attributeType,
        attributeChange: progression.attributeChange,
        metadata: JSON.stringify({
          questId: quest.id,
          category: quest.category,
          difficulty: quest.difficulty,
          isRecurring: quest.isRecurring,
        }),
      },
    });

    return { quest: updatedQuest, completion, progression, character: updatedCharacter, history };
  });
}

module.exports = { completeQuest };