-- CreateTable
CREATE TABLE "RoomMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'USER',
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoomMessage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "FocusRoom" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoomMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    "chatEnabled" BOOLEAN NOT NULL DEFAULT true,
    "ownerId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    CONSTRAINT "FocusRoom_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_FocusRoom" ("agendaMode", "agendaText", "closedAt", "code", "createdAt", "id", "isActive", "name", "ownerId", "passwordHash") SELECT "agendaMode", "agendaText", "closedAt", "code", "createdAt", "id", "isActive", "name", "ownerId", "passwordHash" FROM "FocusRoom";
DROP TABLE "FocusRoom";
ALTER TABLE "new_FocusRoom" RENAME TO "FocusRoom";
CREATE UNIQUE INDEX "FocusRoom_code_key" ON "FocusRoom"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "RoomMessage_roomId_createdAt_idx" ON "RoomMessage"("roomId", "createdAt");
