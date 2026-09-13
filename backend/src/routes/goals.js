const express = require('express');
const { body, param, query } = require('express-validator');

const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');
const { getGoalStatus, setGoals, claimGoal } = require('../services/goalsService');
const { GOAL_SCOPES } = require('../services/goalsService');

const router = express.Router();

/**
 * GET /api/goals
 * Current daily/weekly goal progress, claim state and rewards.
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const status = await getGoalStatus(req.userId);
    return res.json({ success: true, data: status });
  })
);

/**
 * PUT /api/goals
 * Set goal targets (stored server-side; rewards still only come from with the
 * completion rules).
 *   { daily: 3, weekly: 15 }
 */
router.put(
  '/',
  authenticate,
  body('daily').isInt({ min: 1, max: 50 }).withMessage('daily goal must be between 1 and 50.'),
  body('weekly').isInt({ min: 5, max: 500 }).withMessage('weekly goal must be between 5 and 500.'),
  validate,
  asyncHandler(async (req, res) => {
    const character = await setGoals(req.userId, { daily: req.body.daily, weekly: req.body.weekly });
    return res.json({ success: true, data: { character } });
  })
);

/**
 * POST /api/goals/:scope/claim
 * Claim the daily or weekly goal reward (one claim per day/week).
 */
router.post(
  '/:scope/claim',
  authenticate,
  param('scope').custom((v) => GOAL_SCOPES.includes(v.toUpperCase())).withMessage(`scope must be one of: ${GOAL_SCOPES.join(', ')}.`),
  validate,
  asyncHandler(async (req, res) => {
    const result = await claimGoal(req.userId, req.params.scope.toUpperCase());
    return res.json({ success: true, data: result });
  })
);

module.exports = router;