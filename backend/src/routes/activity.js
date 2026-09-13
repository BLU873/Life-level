const express = require('express');
const router = express.Router();

const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');
const { getWeeklyProgress } = require('../services/weeklyProgressService');
const { ApiError } = require('../utils/apiError');

/**
 * GET /api/activity
 * Return the authenticated user's progression history, newest first.
 *   ?limit=N  (default 20, capped at 100)
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const rawLimit = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 20;

    const items = await prisma.xpHistory.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return res.json({ success: true, data: { items } });
  })
);

/**
 * GET /api/activity/weekly
 * Weekly aggregates for the week containing the given date (default: today),
 * including the 7-day breakdown for the weekly arc chart.
 *   ?date=YYYY-MM-DD  (optional)
 */
router.get(
  '/weekly',
  authenticate,
  asyncHandler(async (req, res) => {
    let date = new Date();
    if (req.query.date) {
      const parsed = new Date(`${req.query.date}T12:00:00`);
      if (Number.isNaN(parsed.getTime())) {
        throw ApiError.badRequest('INVALID_DATE', 'date must be in the YYYY-MM-DD format.');
      }
      date = parsed;
    }

    const weekly = await getWeeklyProgress(prisma, req.userId, date);
    return res.json({ success: true, data: weekly });
  })
);

module.exports = router;