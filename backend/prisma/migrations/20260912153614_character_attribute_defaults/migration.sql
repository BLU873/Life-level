-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Character" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "currentXP" INTEGER NOT NULL DEFAULT 0,
    "totalXP" INTEGER NOT NULL DEFAULT 0,
    "gold" INTEGER NOT NULL DEFAULT 0,
    "intellect" INTEGER NOT NULL DEFAULT 1,
    "strength" INTEGER NOT NULL DEFAULT 1,
    "discipline" INTEGER NOT NULL DEFAULT 1,
    "creativity" INTEGER NOT NULL DEFAULT 1,
    "social" INTEGER NOT NULL DEFAULT 1,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActiveDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Character_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Character" ("createdAt", "creativity", "currentStreak", "currentXP", "discipline", "displayName", "gold", "id", "intellect", "lastActiveDate", "level", "longestStreak", "social", "strength", "totalXP", "updatedAt", "userId") SELECT "createdAt", "creativity", "currentStreak", "currentXP", "discipline", "displayName", "gold", "id", "intellect", "lastActiveDate", "level", "longestStreak", "social", "strength", "totalXP", "updatedAt", "userId" FROM "Character";
DROP TABLE "Character";
ALTER TABLE "new_Character" RENAME TO "Character";
CREATE UNIQUE INDEX "Character_userId_key" ON "Character"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
