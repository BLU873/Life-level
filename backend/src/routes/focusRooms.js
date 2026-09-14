const express = require('express');
const { body, param } = require('express-validator');

const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');
const {
  createRoom,
  joinRoom,
  getRoom,
  heartbeat,
  leaveRoom,
  myRoom,
  startSession,
  pauseSession,
  resumeSession,
  stopSession,
  SESSION_PRESETS,
} = require('../services/focusRoomService');

const router = express.Router();

// NOTE: /join and /mine are registered before /:code so the literal paths
// are never captured as a room code.
const questIdChain = (field) =>
  body(field)
    .optional({ values: 'undefined' })
    .custom((value) => value === null || typeof value === 'string')
    .withMessage('questId must be a string or null.');

/**
 * POST /api/focus-rooms
 * Create a room. The creator joins automatically as owner.
 */
router.post(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const room = await createRoom(req.userId);
    return res.status(201).json({ success: true, data: { room } });
  })
);

/**
 * POST /api/focus-rooms/join
 * Join by public room code. Idempotent: rejoining returns the same room.
 *   { code: 'V7K9P', questId?: string | null }
 */
router.post(
  '/join',
  authenticate,
  body('code').exists().withMessage('Room code is required.').bail().isString().withMessage('Room code must be a string.'),
  questIdChain('questId'),
  validate,
  asyncHandler(async (req, res) => {
    const { room, rejoined } = await joinRoom(req.userId, req.body.code, req.body.questId);
    return res.status(rejoined ? 200 : 201).json({ success: true, data: { room, rejoined } });
  })
);

/**
 * GET /api/focus-rooms/mine
 * The caller's active room, or null. Powers the room page bootstrap and the
 * Command entry point.
 */
router.get(
  '/mine',
  authenticate,
  asyncHandler(async (req, res) => {
    const room = await myRoom(req.userId);
    return res.json({ success: true, data: { room } });
  })
);

const codeParam = param('code').isString().withMessage('Room code must be a string.');

/**
 * GET /api/focus-rooms/:code
 * Room lobby state. Only visible to active members (others get 404).
 */
router.get(
  '/:code',
  authenticate,
  codeParam,
  validate,
  asyncHandler(async (req, res) => {
    const room = await getRoom(req.userId, req.params.code);
    return res.json({ success: true, data: { room } });
  })
);

/**
 * POST /api/focus-rooms/:code/heartbeat
 * Presence ping (also refreshes the optional public goal).
 *   { questId?: string | null }
 */
router.post(
  '/:code/heartbeat',
  authenticate,
  codeParam,
  questIdChain('questId'),
  validate,
  asyncHandler(async (req, res) => {
    const room = await heartbeat(req.userId, req.params.code, req.body.questId);
    return res.json({ success: true, data: { room } });
  })
);

/**
 * POST /api/focus-rooms/:code/session
 * Host starts the shared session. One active session per room; starting
 * never touches personal timers, operations, or progression.
 *   { durationSeconds?: 900 | 1500 | 2700 | 3600 | 5400 }
 */
router.post(
  '/:code/session',
  authenticate,
  codeParam,
  body('durationSeconds')
    .optional()
    .isInt()
    .withMessage('durationSeconds must be an integer.')
    .bail()
    .custom((v) => SESSION_PRESETS.includes(Number(v)))
    .withMessage(`durationSeconds must be one of: ${SESSION_PRESETS.join(', ')}.`),
  validate,
  asyncHandler(async (req, res) => {
    const room = await startSession(req.userId, req.params.code, req.body.durationSeconds ?? 1500);
    return res.status(201).json({ success: true, data: { room } });
  })
);

/**
 * POST /api/focus-rooms/:code/session/pause — host only.
 */
router.post(
  '/:code/session/pause',
  authenticate,
  codeParam,
  validate,
  asyncHandler(async (req, res) => {
    const room = await pauseSession(req.userId, req.params.code);
    return res.json({ success: true, data: { room } });
  })
);

/**
 * POST /api/focus-rooms/:code/session/resume — host only.
 */
router.post(
  '/:code/session/resume',
  authenticate,
  codeParam,
  validate,
  asyncHandler(async (req, res) => {
    const room = await resumeSession(req.userId, req.params.code);
    return res.json({ success: true, data: { room } });
  })
);

/**
 * POST /api/focus-rooms/:code/session/stop — host only. Ends the session;
 * the room, members, operations, and progression are untouched.
 */
router.post(
  '/:code/session/stop',
  authenticate,
  codeParam,
  validate,
  asyncHandler(async (req, res) => {
    const room = await stopSession(req.userId, req.params.code);
    return res.json({ success: true, data: { room } });
  })
);

/**
 * POST /api/focus-rooms/:code/leave
 * Leave the room. Ownership transfers to the earliest remaining member;
 * an emptied room closes. Never touches progression or operations.
 */
router.post(
  '/:code/leave',
  authenticate,
  codeParam,
  validate,
  asyncHandler(async (req, res) => {
    const result = await leaveRoom(req.userId, req.params.code);
    return res.json({ success: true, data: result });
  })
);

module.exports = router;
