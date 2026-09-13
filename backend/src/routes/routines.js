const express = require('express');
const { body, param } = require('express-validator');

const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');
const {
  listRoutines,
  createRoutine,
  addRoutineItem,
  updateRoutine,
  reorderItems,
  completeItem,
  deleteRoutine,
} = require('../services/routinesService');
const { ROUTINE_PERIODS } = require('../config/constants');

const router = express.Router();

const nameChain = body('name')
  .exists({ values: 'falsy' }).withMessage('Name is required.')
  .bail()
  .isString().withMessage('Name must be a string.')
  .bail()
  .trim()
  .isLength({ min: 1, max: 120 }).withMessage('Name must be between 1 and 120 characters.');

const titleChain = body('title')
  .exists({ values: 'falsy' }).withMessage('Title is required.')
  .bail()
  .isString().withMessage('Title must be a string.')
  .bail()
  .trim()
  .isLength({ min: 1, max: 120 }).withMessage('Title must be between 1 and 120 characters.');

const uuids = (where) => param(where).isUUID().withMessage('Id must be a valid UUID.');

/**
 * GET /api/routines
 * Routines grouped by period with today's per-item completion flags.
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const routines = await listRoutines(req.userId);
    return res.json({ success: true, data: { routines } });
  })
);

/**
 * POST /api/routines
 *   { name, period, items?: [{ title }] }
 */
router.post(
  '/',
  authenticate,
  nameChain,
  body('period').isIn(ROUTINE_PERIODS).withMessage(`period must be one of: ${ROUTINE_PERIODS.join(', ')}.`),
  body('items').optional().isArray({ max: 20 }).withMessage('items must be an array of at most 20 { title } objects.'),
  body('items.*.title')
    .isString().withMessage('Item titles must be strings.')
    .bail()
    .trim()
    .isLength({ min: 1, max: 120 }).withMessage('Item titles must be between 1 and 120 characters.'),
  validate,
  asyncHandler(async (req, res) => {
    const routine = await createRoutine(req.userId, { name: req.body.name, period: req.body.period, items: req.body.items || [] });
    return res.status(201).json({ success: true, data: { routine } });
  })
);

/**
 * PUT /api/routines/:id
 * Rename a routine.   { name }
 */
router.put(
  '/:id',
  authenticate,
  uuids('id'),
  nameChain,
  validate,
  asyncHandler(async (req, res) => {
    const routine = await updateRoutine(req.userId, req.params.id, { name: req.body.name });
    return res.json({ success: true, data: { routine } });
  })
);

/**
 * DELETE /api/routines/:id
 */
router.delete(
  '/:id',
  authenticate,
  uuids('id'),
  validate,
  asyncHandler(async (req, res) => {
    const result = await deleteRoutine(req.userId, req.params.id);
    return res.json({ success: true, data: result });
  })
);

/**
 * POST /api/routines/:id/items
 * Add an item to a routine.   { title }
 */
router.post(
  '/:id/items',
  authenticate,
  uuids('id'),
  titleChain,
  validate,
  asyncHandler(async (req, res) => {
    const item = await addRoutineItem(req.userId, req.params.id, req.body.title);
    return res.status(201).json({ success: true, data: { item } });
  })
);

/**
 * PUT /api/routines/:id/items/order
 * Reorder items.   { itemIds: [uuid...] }
 */
router.put(
  '/:id/items/order',
  authenticate,
  uuids('id'),
  body('itemIds').isArray({ min: 1 }).withMessage('itemIds must be a non-empty array.').bail(),
  body('itemIds.*').isString().withMessage('itemIds entries must be strings.'),
  validate,
  asyncHandler(async (req, res) => {
    const items = await reorderItems(req.userId, req.params.id, req.body.itemIds);
    return res.json({ success: true, data: { items } });
  })
);

/**
 * POST /api/routines/:id/items/:itemId/complete
 * Tick an item complete for today (idempotent per day).
 */
router.post(
  '/:id/items/:itemId/complete',
  authenticate,
  uuids('id'),
  uuids('itemId'),
  validate,
  asyncHandler(async (req, res) => {
    const result = await completeItem(req.userId, req.params.id, req.params.itemId);
    return res.json({ success: true, data: result });
  })
);

module.exports = router;