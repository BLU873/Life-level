-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- Recreate ShopItem: rename "category" to "type", add "metadata".
CREATE TABLE "new_ShopItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "rarity" TEXT NOT NULL DEFAULT 'COMMON',
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "isAvailable" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_ShopItem" ("id", "name", "description", "type", "price", "rarity", "isAvailable")
SELECT "id", "name", "description", "category", "price", "rarity", "isAvailable" FROM "ShopItem";
DROP TABLE "ShopItem";
ALTER TABLE "new_ShopItem" RENAME TO "ShopItem";

-- Recreate OwnedItem: add "quantity", cascade shop item deletion.
CREATE TABLE "new_OwnedItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "shopItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "purchasedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isEquipped" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "OwnedItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OwnedItem_shopItemId_fkey" FOREIGN KEY ("shopItemId") REFERENCES "ShopItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_OwnedItem" ("id", "userId", "shopItemId", "quantity", "purchasedAt", "isEquipped")
SELECT "id", "userId", "shopItemId", "quantity", "purchasedAt", "isEquipped" FROM "OwnedItem";
DROP TABLE "OwnedItem";
ALTER TABLE "new_OwnedItem" RENAME TO "OwnedItem";

-- CreateIndex
CREATE UNIQUE INDEX "OwnedItem_userId_shopItemId_key" ON "OwnedItem"("userId", "shopItemId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;