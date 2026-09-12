/*
  Warnings:

  - Added the required column `userId` to the `QuestCompletion` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_QuestCompletion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "xpEarned" INTEGER NOT NULL,
    "goldEarned" INTEGER NOT NULL,
    "attributeGained" TEXT NOT NULL,
    "attributePoints" INTEGER NOT NULL,
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuestCompletion_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuestCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_QuestCompletion" ("attributeGained", "attributePoints", "completedAt", "goldEarned", "id", "questId", "xpEarned") SELECT "attributeGained", "attributePoints", "completedAt", "goldEarned", "id", "questId", "xpEarned" FROM "QuestCompletion";
DROP TABLE "QuestCompletion";
ALTER TABLE "new_QuestCompletion" RENAME TO "QuestCompletion";
CREATE TABLE "new_XPHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "questId" TEXT,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "xpChange" INTEGER NOT NULL DEFAULT 0,
    "goldChange" INTEGER NOT NULL DEFAULT 0,
    "levelBefore" INTEGER,
    "levelAfter" INTEGER,
    "newLevel" INTEGER,
    "attributeType" TEXT,
    "attributeChange" INTEGER,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "XPHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "XPHistory_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_XPHistory" ("createdAt", "description", "goldChange", "id", "metadata", "newLevel", "type", "userId", "xpChange") SELECT "createdAt", "description", "goldChange", "id", "metadata", "newLevel", "type", "userId", "xpChange" FROM "XPHistory";
DROP TABLE "XPHistory";
ALTER TABLE "new_XPHistory" RENAME TO "XPHistory";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
