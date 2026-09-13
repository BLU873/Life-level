const express = require('express');
const router = express.Router();

const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');
const { syncAchievementDefinitions } = require('../services/achievementService');

/**
 * GET /api/achievements
 * Return the six achievement definitions merged with the authenticated user's
 * unlock state. unlockedAt is null until the achievement is earned.
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    await syncAchievementDefinitions(prisma);

    const [defs, unlocked] = await Promise.all([
      prisma.achievementDefinition.findMany({ orderBy: { code: 'asc' } }),
      prisma.userAchievement.findMany({
        where: { userId: req.userId },
        select: { unlockedAt: true, achievement: { select: { code: true } } },
      }),
    ]);

    const unlockedByCode = new Map(unlocked.map((u) => [u.achievement.code, u.unlockedAt]));

    const achievements = defs.map((definition) => ({
      id: definition.id,
      code: definition.code,
      name: definition.name,
      description: definition.description,
      unlockedAt: unlockedByCode.get(definition.code) ?? null,
    }));

    return res.json({ success: true, data: { achievements } });
  })
);

module.exports = router;