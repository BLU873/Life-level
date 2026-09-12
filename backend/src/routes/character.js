const express = require('express');
const router = express.Router();

const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { ApiError } = require('../utils/apiError');
const { asyncHandler } = require('../utils/helpers');
const { calculateLevelProgress } = require('../services/rpgEngine');

/**
 * GET /api/character
 * Return the authenticated user's character with live level progress.
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const character = await prisma.character.findUnique({ where: { userId: req.userId } });
    if (!character) {
      throw ApiError.notFound('CHARACTER_NOT_FOUND', 'Character not found.');
    }

    const progress = calculateLevelProgress(character.totalXP);

    return res.json({
      success: true,
      data: {
        character: {
          ...character,
          currentLevel: progress.currentLevel,
          xpIntoCurrentLevel: progress.xpIntoCurrentLevel,
          xpRequiredForNextLevel: progress.xpRequiredForNextLevel,
          progressPercentage: progress.progressPercentage,
        },
      },
    });
  })
);

module.exports = router;