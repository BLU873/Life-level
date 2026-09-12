const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');
const { getInventory, equipItem, unequipItem } = require('../services/shopService');

/**
 * GET /api/inventory
 * The authenticated user's owned items with item data, newest first.
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const items = await getInventory(req.userId);
    return res.json({ success: true, data: { items } });
  })
);

/**
 * POST /api/inventory/:itemId/equip
 * Equip an owned item. :itemId is the OwnedItem id returned by GET /api/inventory.
 * Users can only equip items they own. Mutually exclusive types automatically
 * unequip the previously equipped item of the same type.
 */
router.post(
  '/:itemId/equip',
  authenticate,
  asyncHandler(async (req, res) => {
    const item = await equipItem(req.userId, req.params.itemId);
    return res.json({ success: true, data: { item } });
  })
);

/**
 * POST /api/inventory/:itemId/unequip
 * Unequip an owned item. :itemId is the OwnedItem id.
 */
router.post(
  '/:itemId/unequip',
  authenticate,
  asyncHandler(async (req, res) => {
    const item = await unequipItem(req.userId, req.params.itemId);
    return res.json({ success: true, data: { item } });
  })
);

module.exports = router;