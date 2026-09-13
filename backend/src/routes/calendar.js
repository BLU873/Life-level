const express = require('express');
const { query } = require('express-validator');

const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');
const { getActivityCalendar } = require('../services/calendarService');
const prisma = require('../lib/prisma');

const router = express.Router();

/**
 * GET /api/calendar
 * Per-day activity aggregates over a trailing window.
 *   ?days=N (default 84, capped at 366)
 */
router.get(
  '/',
  authenticate,
  query('days').optional().isInt({ min: 1, max: 366 }).withMessage('days must be between 1 and 366.'),
  validate,
  asyncHandler(async (req, res) => {
    const days = req.query.days ? parseInt(req.query.days, 10) : 84;
    const calendar = await getActivityCalendar(prisma, req.userId, days);
    return res.json({ success: true, data: { calendar, days: calendar.length } });
  })
);

module.exports = router;