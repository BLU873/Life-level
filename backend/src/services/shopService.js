const prisma = require('../lib/prisma');
const { Prisma } = require('@prisma/client');
const { ApiError } = require('../utils/apiError');

// Cosmetic types that are mutually exclusive — equipping one automatically
// unequips the other equipped item of the same type.
const NON_EXCLUSIVE_TYPES = ['BADGE'];

function parseMetadata(raw) {
  try {
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
}

function serializeItem(item, owned = false) {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    type: item.type,
    price: item.price,
    rarity: item.rarity,
    metadata: parseMetadata(item.metadata),
    isAvailable: item.isAvailable,
    owned,
  };
}

function serializeOwned(owned) {
  return {
    id: owned.id,
    quantity: owned.quantity,
    acquiredAt: owned.purchasedAt,
    isEquipped: owned.isEquipped,
    item: {
      id: owned.shopItem.id,
      name: owned.shopItem.name,
      description: owned.shopItem.description,
      type: owned.shopItem.type,
      price: owned.shopItem.price,
      rarity: owned.shopItem.rarity,
      metadata: parseMetadata(owned.shopItem.metadata),
      isAvailable: owned.shopItem.isAvailable,
    },
  };
}

async function getShopCatalog(userId) {
  const [items, owned] = await Promise.all([
    prisma.shopItem.findMany({ orderBy: [{ type: 'asc' }, { price: 'asc' }] }),
    prisma.ownedItem.findMany({ where: { userId }, select: { shopItemId: true } }),
  ]);
  const ownedIds = new Set(owned.map((o) => o.shopItemId));
  const character = await prisma.character.findUnique({ where: { userId }, select: { gold: true } });

  return {
    items: items.map((item) => serializeItem(item, ownedIds.has(item.id))),
    gold: character?.gold ?? 0,
  };
}

async function purchaseItem(userId, itemId) {
  try {
    return await prisma.$transaction(async (tx) => {
      const item = await tx.shopItem.findUnique({ where: { id: itemId } });
      if (!item || !item.isAvailable) {
        throw ApiError.notFound('SHOP_ITEM_NOT_FOUND', 'Item not found or unavailable.');
      }
      if (item.price < 0) {
        throw ApiError.conflict('INVALID_ITEM_PRICE', 'Item price is invalid.');
      }

      const existing = await tx.ownedItem.findUnique({
        where: { userId_shopItemId: { userId, shopItemId: itemId } },
      });
      if (existing) {
        throw ApiError.conflict('ITEM_ALREADY_OWNED', 'You already own this item.');
      }

      const character = await tx.character.findUnique({ where: { userId } });
      if (!character) {
        throw ApiError.notFound('CHARACTER_NOT_FOUND', 'Character not found.');
      }
      if (character.gold < item.price) {
        throw ApiError.conflict('INSUFFICIENT_GOLD', 'You do not have enough gold.');
      }

      const updatedCharacter = await tx.character.update({
        where: { userId },
        data: { gold: { decrement: item.price } },
      });

      const ownedItem = await tx.ownedItem.create({
        data: { userId, shopItemId: item.id, quantity: 1 },
      });

      return {
        gold: updatedCharacter.gold,
        boughtItem: serializeItem(item, true),
        ownedItem: serializeOwned({
          ...ownedItem,
          shopItem: item,
        }),
      };
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw ApiError.conflict('ITEM_ALREADY_OWNED', 'You already own this item.');
    }
    throw err;
  }
}

async function getInventory(userId) {
  const ownedItems = await prisma.ownedItem.findMany({
    where: { userId },
    include: { shopItem: true },
    orderBy: { purchasedAt: 'desc' },
  });
  return ownedItems.map(serializeOwned);
}

async function equipItem(userId, ownedItemId) {
  return prisma.$transaction(async (tx) => {
    const owned = await tx.ownedItem.findUnique({
      where: { id: ownedItemId },
      include: { shopItem: true },
    });
    if (!owned || owned.userId !== userId) {
      throw ApiError.notFound('ITEM_NOT_OWNED', 'You do not own this item.');
    }

    if (!NON_EXCLUSIVE_TYPES.includes(owned.shopItem.type)) {
      await tx.ownedItem.updateMany({
        where: {
          userId,
          isEquipped: true,
          shopItem: { type: owned.shopItem.type },
        },
        data: { isEquipped: false },
      });
    }

    const updated = await tx.ownedItem.update({
      where: { id: owned.id },
      data: { isEquipped: true },
    });

    return serializeOwned({ ...updated, shopItem: owned.shopItem });
  });
}

async function unequipItem(userId, ownedItemId) {
  return prisma.$transaction(async (tx) => {
    const owned = await tx.ownedItem.findUnique({
      where: { id: ownedItemId },
      include: { shopItem: true },
    });
    if (!owned || owned.userId !== userId) {
      throw ApiError.notFound('ITEM_NOT_OWNED', 'You do not own this item.');
    }

    const updated = await tx.ownedItem.update({
      where: { id: owned.id },
      data: { isEquipped: false },
    });

    return serializeOwned({ ...updated, shopItem: owned.shopItem });
  });
}

module.exports = {
  getShopCatalog,
  purchaseItem,
  getInventory,
  equipItem,
  unequipItem,
};