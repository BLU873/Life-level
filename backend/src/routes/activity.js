const express = require('express');
const router = express.Router();

const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');

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

module.exports = router;