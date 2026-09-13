const express = require('express');
const { body, param } = require('express-validator');

const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');
const { listRewards, createReward, deleteReward, redeemReward } = require('../services/rewardsService');

const router = express.Router();

/**
 * GET /api/rewards
 * The user's custom rewards.
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const rewards = await listRewards(req.userId);
    return res.json({ success: true, data: { rewards } });
  })
);

/**
 * POST /api/rewards
 *   { name, cost }
 */
router.post(
  '/',
  authenticate,
  body('name')
    .exists({ values: 'falsy' }).withMessage('Name is required.')
    .bail()
    .isString().withMessage('Name must be a string.')
    .bail()
    .trim()
    .isLength({ min: 1, max: 120 }).withMessage('Name must be between 1 and 120 characters.'),
  body('cost').isInt({ min: 10, max: 100000 }).withMessage('cost must be between 10 and 100000.'),
  validate,
  asyncHandler(async (req, res) => {
    const reward = await createReward(req.userId, { name: req.body.name, cost: req.body.cost });
    return res.status(201).json({ success: true, data: { reward } });
  })
);

/**
 * DELETE /api/rewards/:id
 */
router.delete(
  '/:id',
  authenticate,
  param('id').isUUID().withMessage('Reward id must be a valid UUID.'),
  validate,
  asyncHandler(async (req, res) => {
    const result = await deleteReward(req.userId, req.params.id);
    return res.json({ success: true, data: result });
  })
);

/**
 * POST /api/rewards/:id/redeem
 * Redeem a reward against gold (atomic; balance can never go negative).
 */
router.post(
  '/:id/redeem',
  authenticate,
  param('id').isUUID().withMessage('Reward id must be a valid UUID.'),
  validate,
  asyncHandler(async (req, res) => {
    const result = await redeemReward(req.userId, req.params.id);
    return res.json({ success: true, data: result });
  })
);

module.exports = router;