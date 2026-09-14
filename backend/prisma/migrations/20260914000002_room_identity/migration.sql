-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FocusRoom" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'SQUAD ROOM',
    "passwordHash" TEXT,
    "agendaMode" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "agendaText" TEXT NOT NULL DEFAULT '',
    "ownerId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    CONSTRAINT "FocusRoom_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_FocusRoom" ("closedAt", "code", "createdAt", "id", "isActive", "ownerId") SELECT "closedAt", "code", "createdAt", "id", "isActive", "ownerId" FROM "FocusRoom";
DROP TABLE "FocusRoom";
ALTER TABLE "new_FocusRoom" RENAME TO "FocusRoom";
CREATE UNIQUE INDEX "FocusRoom_code_key" ON "FocusRoom"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
