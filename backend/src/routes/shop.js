const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');
const { getShopCatalog, purchaseItem } = require('../services/shopService');

/**
 * GET /api/shop
 * Authenticated catalog. Each item includes whether the current user owns it,
 * and the player's current gold balance for display.
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const { items, gold } = await getShopCatalog(req.userId);
    return res.json({ success: true, data: { items, gold } });
  })
);

/**
 * POST /api/shop/:itemId/purchase
 * Server-authoritative purchase. The client never supplies a price.
 */
router.post(
  '/:itemId/purchase',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await purchaseItem(req.userId, req.params.itemId);
    return res.json({ success: true, data: result });
  })
);

module.exports = router;