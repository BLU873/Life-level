const express = require('express');
const { body, param, query } = require('express-validator');

const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');
const {
  startFocus,
  pauseFocus,
  resumeFocus,
  cancelFocus,
  completeFocus,
  getActiveSession,
  getFocusHistory,
} = require('../services/focusService');
const { FOCUS_MODES, FOCUS_MIN_SECONDS, FOCUS_MAX_SECONDS } = require('../config/constants');

const router = express.Router();

/**
 * GET /api/focus
 * Active session (running or paused), if any.
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const session = await getActiveSession(req.userId);
    const history = await getFocusHistory(req.userId);
    return res.json({ success: true, data: { session, history } });
  })
);

/**
 * GET /api/focus/history
 * Totals for today / this week / this month.
 */
router.get(
  '/history',
  authenticate,
  asyncHandler(async (req, res) => {
    const history = await getFocusHistory(req.userId);
    return res.json({ success: true, data: history });
  })
);

/**
 * POST /api/focus
 * Start a focus session.
 *   { mode: 'POMODORO' | 'FLOW', plannedSeconds?: number, questId?: string }
 */
router.post(
  '/',
  authenticate,
  body('mode').optional().isIn(Object.keys(FOCUS_MODES)).withMessage(`mode must be one of: ${Object.keys(FOCUS_MODES).join(', ')}.`),
  body('plannedSeconds').optional().isInt({ min: FOCUS_MIN_SECONDS, max: FOCUS_MAX_SECONDS }).withMessage(`plannedSeconds must be between ${FOCUS_MIN_SECONDS} and ${FOCUS_MAX_SECONDS}.`),
  body('questId').optional().isString().withMessage('questId must be a string.'),
  validate,
  asyncHandler(async (req, res) => {
    const session = await startFocus(req.userId, req.body);
    return res.status(201).json({ success: true, data: { session } });
  })
);

const sessionParam = param('id').isUUID().withMessage('Session id must be a valid UUID.');

/**
 * POST /api/focus/:id/pause
 */
router.post(
  '/:id/pause',
  authenticate,
  sessionParam,
  validate,
  asyncHandler(async (req, res) => {
    const session = await pauseFocus(req.userId, req.params.id);
    return res.json({ success: true, data: { session } });
  })
);

/**
 * POST /api/focus/:id/resume
 */
router.post(
  '/:id/resume',
  authenticate,
  sessionParam,
  validate,
  asyncHandler(async (req, res) => {
    const session = await resumeFocus(req.userId, req.params.id);
    return res.json({ success: true, data: { session } });
  })
);

/**
 * POST /api/focus/:id/complete
 * Completes the session, grants the flat focus reward and evaluates
 * achievements — all atomically.
 */
router.post(
  '/:id/complete',
  authenticate,
  sessionParam,
  validate,
  asyncHandler(async (req, res) => {
    const result = await completeFocus(req.userId, req.params.id);
    return res.json({ success: true, data: result });
  })
);

/**
 * POST /api/focus/:id/cancel
 */
router.post(
  '/:id/cancel',
  authenticate,
  sessionParam,
  validate,
  asyncHandler(async (req, res) => {
    const session = await cancelFocus(req.userId, req.params.id);
    return res.json({ success: true, data: { session } });
  })
);

module.exports = router;