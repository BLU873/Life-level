const express = require('express');
const { query } = require('express-validator');

const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');
const { getIntel, CATEGORIES } = require('../services/intelService');

const router = express.Router();

/**
 * GET /api/intel
 * Normalized field intelligence from public keyless sources.
 *   ?category=TECH|CODING|SPORTS|FITNESS|GAMING (optional; omit for all)
 *   ?limit=N            (optional, max items, default 40, cap 50)
 *   ?refresh=1          (optional, bypass the short in-memory cache)
 *
 * Failure is reported per category inside data.failedCategories — an offline
 * source never turns into a 5xx for the client.
 */
router.get(
  '/',
  authenticate,
  query('category').optional().isIn(CATEGORIES).withMessage(`category must be one of: ${CATEGORIES.join(', ')}.`),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be between 1 and 50.'),
  query('refresh').optional().isIn(['0', '1']).withMessage('refresh must be 0 or 1.'),
  validate,
  asyncHandler(async (req, res) => {
    const data = await getIntel({
      category: req.query.category ? req.query.category.toUpperCase() : null,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 40,
      force: req.query.refresh === '1',
    });
    return res.json({ success: true, data });
  })
);

module.exports = router;