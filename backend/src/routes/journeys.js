const express = require('express');
const { body, param } = require('express-validator');

const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');
const { listJourneys, createJourney, deleteJourney } = require('../services/journeyService');
const { JOURNEY_TYPES, JOURNEY_MIN_DAYS, JOURNEY_MAX_DAYS } = require('../config/constants');

const router = express.Router();

/**
 * GET /api/journeys
 * Journeys and challenges with derived progress.
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const journeys = await listJourneys(req.userId);
    return res.json({ success: true, data: { journeys } });
  })
);

/**
 * POST /api/journeys
 *   { title, totalDays, kind?: 'JOURNEY' | 'CHALLENGE' }
 */
router.post(
  '/',
  authenticate,
  body('title')
    .exists({ values: 'falsy' }).withMessage('Title is required.')
    .bail()
    .isString().withMessage('Title must be a string.')
    .bail()
    .trim()
    .isLength({ min: 1, max: 120 }).withMessage('Title must be between 1 and 120 characters.'),
  body('totalDays').isInt({ min: JOURNEY_MIN_DAYS, max: JOURNEY_MAX_DAYS }).withMessage(`totalDays must be between ${JOURNEY_MIN_DAYS} and ${JOURNEY_MAX_DAYS}.`),
  body('kind').optional().isIn(JOURNEY_TYPES).withMessage(`kind must be one of: ${JOURNEY_TYPES.join(', ')}.`),
  validate,
  asyncHandler(async (req, res) => {
    const journey = await createJourney(req.userId, {
      title: req.body.title,
      totalDays: req.body.totalDays,
      kind: req.body.kind || 'JOURNEY',
    });
    return res.status(201).json({ success: true, data: { journey } });
  })
);

/**
 * DELETE /api/journeys/:id
 */
router.delete(
  '/:id',
  authenticate,
  param('id').isUUID().withMessage('Journey id must be a valid UUID.'),
  validate,
  asyncHandler(async (req, res) => {
    const result = await deleteJourney(req.userId, req.params.id);
    return res.json({ success: true, data: result });
  })
);

module.exports = router;