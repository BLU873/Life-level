const express = require('express');
const { body } = require('express-validator');

const prisma = require('../lib/prisma');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { ApiError } = require('../utils/apiError');
const { asyncHandler } = require('../utils/helpers');
const { calculateQuestRewards } = require('../services/rpgEngine');
const { completeQuest } = require('../services/progressionService');
const {
  CATEGORY_ATTRIBUTE,
  QUEST_DIFFICULTIES,
  VALID_QUEST_CATEGORIES,
} = require('../config/constants');

const router = express.Router();

// Build validation chains. On create all core fields are required; on update
// the same chains become optional so partial edits are allowed.
function questValidation(requireCoreFields) {
  const core = requireCoreFields ? (chain) => chain : (chain) => chain.optional();

  return [
    core(body('title'))
      .exists({ values: 'falsy' }).withMessage('Title is required.')
      .bail()
      .isString().withMessage('Title must be a string.')
      .bail()
      .trim()
      .isLength({ min: 1, max: 120 }).withMessage('Title must be between 1 and 120 characters.'),
    body('description')
      .optional()
      .isString().withMessage('Description must be a string.')
      .bail()
      .trim()
      .isLength({ max: 500 }).withMessage('Description must be 500 characters or fewer.'),
    core(body('category'))
      .exists().withMessage('Category is required.')
      .bail()
      .isString().withMessage('Category must be a string.')
      .bail()
      .isIn(VALID_QUEST_CATEGORIES).withMessage(`Category must be one of: ${VALID_QUEST_CATEGORIES.join(', ')}.`),
    core(body('difficulty'))
      .exists().withMessage('Difficulty is required.')
      .bail()
      .isString().withMessage('Difficulty must be a string.')
      .bail()
      .isIn(QUEST_DIFFICULTIES).withMessage(`Difficulty must be one of: ${QUEST_DIFFICULTIES.join(', ')}.`),
    body('isRecurring')
      .optional()
      .isBoolean().withMessage('isRecurring must be a boolean.'),
  ];
}

// Rewards are always derived server-side from difficulty (and category for the
// attribute). The client is never allowed to submit authoritative reward values.
function rewardData(category, difficulty) {
  const attribute = CATEGORY_ATTRIBUTE[category];
  const rewards = calculateQuestRewards({ category, difficulty, attribute });
  return {
    attribute,
    xpReward: rewards.xpEarned,
    goldReward: rewards.goldEarned,
  };
}

// Ownership check: quests are scoped to req.userId. A missing quest or one that
// belongs to another user returns the same 404 so existence is never leaked.
async function findOwnedQuest(userId, questId, include = undefined) {
  const quest = await prisma.quest.findFirst({ where: { id: questId, userId }, include });
  if (!quest) {
    throw ApiError.notFound('QUEST_NOT_FOUND', 'Quest not found.');
  }
  return quest;
}

/**
 * GET /api/quests
 * List the authenticated user's quests with optional filters:
 *   ?status=active|completed|all   (default: all)
 *   ?category=CODING
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const { status = 'all', category } = req.query;

    if (!['all', 'active', 'completed'].includes(status)) {
      throw ApiError.badRequest('INVALID_STATUS', `status must be one of: all, active, completed.`);
    }

    const where = { userId: req.userId };
    if (status === 'active') where.isCompleted = false;
    if (status === 'completed') where.isCompleted = true;
    if (category) {
      if (!VALID_QUEST_CATEGORIES.includes(category)) {
        throw ApiError.badRequest('INVALID_CATEGORY', `category must be one of: ${VALID_QUEST_CATEGORIES.join(', ')}.`);
      }
      where.category = category;
    }

    const quests = await prisma.quest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: { quests } });
  })
);

/**
 * POST /api/quests
 * Create a quest. Rewards and attribute are calculated by the backend.
 */
router.post(
  '/',
  authenticate,
  questValidation(true),
  validate,
  asyncHandler(async (req, res) => {
    const { title, description, category, difficulty, isRecurring } = req.body;
    const rewards = rewardData(category, difficulty);

    const quest = await prisma.quest.create({
      data: {
        userId: req.userId,
        title: title.trim(),
        description: description ? description.trim() : '',
        category,
        difficulty,
        isRecurring: isRecurring === true,
        ...rewards,
      },
    });

    return res.status(201).json({ success: true, data: { quest } });
  })
);

/**
 * GET /api/quests/:id
 * Return a single quest belonging to the authenticated user.
 */
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const quest = await findOwnedQuest(req.userId, req.params.id);
    return res.json({ success: true, data: { quest } });
  })
);

/**
 * PUT /api/quests/:id
 * Edit editable fields. If category/difficulty changes, rewards are recalculated.
 * Completion state can never be mutated through this endpoint.
 */
router.put(
  '/:id',
  authenticate,
  questValidation(false),
  validate,
  asyncHandler(async (req, res) => {
    const existing = await findOwnedQuest(req.userId, req.params.id);

    const data = {};
    if (req.body.title !== undefined) data.title = req.body.title.trim();
    if (req.body.description !== undefined) data.description = req.body.description ? req.body.description.trim() : '';
    if (req.body.isRecurring !== undefined) data.isRecurring = req.body.isRecurring;

    const categoryChanged = req.body.category !== undefined;
    const difficultyChanged = req.body.difficulty !== undefined;
    if (categoryChanged) data.category = req.body.category;
    if (difficultyChanged) data.difficulty = req.body.difficulty;

    if (categoryChanged || difficultyChanged) {
      Object.assign(data, rewardData(data.category ?? existing.category, data.difficulty ?? existing.difficulty));
    }

    const quest = await prisma.quest.update({ where: { id: existing.id }, data });
    return res.json({ success: true, data: { quest } });
  })
);

/**
 * DELETE /api/quests/:id
 * Delete a quest owned by the authenticated user.
 */
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const existing = await findOwnedQuest(req.userId, req.params.id);
    await prisma.quest.delete({ where: { id: existing.id } });
    return res.json({ success: true, data: { message: 'Quest deleted.' } });
  })
);

/**
 * POST /api/quests/:id/complete
 * Complete a quest and apply the full RPG progression (XP, gold, attribute,
 * level, streak) atomically. The frontend only identifies the quest; every
 * reward value is derived server-side inside a single transaction.
 */
router.post(
  '/:id/complete',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await completeQuest(req.userId, req.params.id);

    return res.json({
      success: true,
      data: {
        quest: result.quest,
        completion: {
          xpEarned: result.completion.xpEarned,
          goldEarned: result.completion.goldEarned,
          // Backward-compatible keys used by the Phase 2 Quests page.
          attributeGained: result.completion.attributeGained,
          attributePoints: result.completion.attributePoints,
          // Canonical Phase 3 names.
          attributeType: result.completion.attributeGained,
          attributeChange: result.completion.attributePoints,
          completedAt: result.completion.completedAt,
        },
        progression: {
          levelBefore: result.progression.levelBefore,
          levelAfter: result.progression.levelAfter,
          leveledUp: result.progression.leveledUp,
          levelsGained: result.progression.levelsGained,
          totalXP: result.progression.totalXP,
          xpIntoCurrentLevel: result.progression.xpIntoCurrentLevel,
          xpRequiredForNextLevel: result.progression.xpRequiredForNextLevel,
          progressPercentage: result.progression.progressPercentage,
        },
        streak: {
          current: result.progression.streak.currentStreak,
          longest: result.progression.streak.longestStreak,
          streakChanged: result.progression.streak.streakChanged,
        },
        character: result.character,
        newAchievements: result.newAchievements,
        dailyProgress: result.dailyProgress,
      },
    });
  })
);

module.exports = router;