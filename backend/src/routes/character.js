const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { ApiError } = require('../utils/apiError');
const { asyncHandler } = require('../utils/helpers');
const { calculateLevelProgress } = require('../services/rpgEngine');
const { getCharacterProfile } = require('../services/characterService');
const { getDailyProgress } = require('../services/dailyProgressService');
const { setPreset, setUpload, clearAvatar, PRESET_KEYS } = require('../services/avatarService');

/**
 * GET /api/character
 * Return the authenticated user's character with live level progress plus the
 * Phase 8 derived metadata (rank, lifetime stats, attribute leaders) and
 * Today's Arc.
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const character = await prisma.character.findUnique({ where: { userId: req.userId } });
    if (!character) {
      throw ApiError.notFound('CHARACTER_NOT_FOUND', 'Character not found.');
    }

    const profile = await getCharacterProfile(req.userId);
    const dailyProgress = await getDailyProgress(prisma, req.userId);
    const progress = calculateLevelProgress(character.totalXP);

    return res.json({
      success: true,
      data: {
        character: {
          ...profile,
          currentLevel: progress.currentLevel,
          xpIntoCurrentLevel: progress.xpIntoCurrentLevel,
          xpRequiredForNextLevel: progress.xpRequiredForNextLevel,
          progressPercentage: progress.progressPercentage,
        },
        dailyProgress,
      },
    });
  })
);

/**
 * PUT /api/character/avatar
 * Choose a preset identity.   { key }
 */
router.put(
  '/avatar',
  authenticate,
  body('key').isString().withMessage('key must be a string.').bail().isIn(PRESET_KEYS).withMessage(`key must be one of: ${PRESET_KEYS.join(', ')}.`),
  validate,
  asyncHandler(async (req, res) => {
    const character = await setPreset(req.userId, req.body.key);
    return res.json({ success: true, data: { character } });
  })
);

/**
 * PUT /api/character/avatar/upload
 * Upload a custom avatar image (PNG/JPEG/WebP data URI, max 2 MB decoded).
 *   { image }
 */
router.put(
  '/avatar/upload',
  authenticate,
  body('image').isString().withMessage('image must be a data URI string.'),
  validate,
  asyncHandler(async (req, res) => {
    const character = await setUpload(req.userId, req.body.image);
    return res.json({ success: true, data: { character } });
  })
);

/**
 * DELETE /api/character/avatar
 * Clear the custom identity back to the default preset.
 */
router.delete(
  '/avatar',
  authenticate,
  asyncHandler(async (req, res) => {
    const character = await clearAvatar(req.userId);
    return res.json({ success: true, data: { character } });
  })
);

module.exports = router;