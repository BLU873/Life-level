-- AlterTable
ALTER TABLE "User" ADD COLUMN     "playerTag" TEXT;

-- CreateTable
CREATE TABLE "FocusRoom" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "FocusRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomMembership" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goalQuestId" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "RoomMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FocusRoom_code_key" ON "FocusRoom"("code");

-- CreateIndex
CREATE UNIQUE INDEX "User_playerTag_key" ON "User"("playerTag");

-- CreateIndex
CREATE INDEX "RoomMembership_roomId_leftAt_idx" ON "RoomMembership"("roomId", "leftAt");

-- CreateIndex
CREATE INDEX "RoomMembership_userId_leftAt_idx" ON "RoomMembership"("userId", "leftAt");

-- AddForeignKey
ALTER TABLE "FocusRoom" ADD CONSTRAINT "FocusRoom_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomMembership" ADD CONSTRAINT "RoomMembership_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "FocusRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomMembership" ADD CONSTRAINT "RoomMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomMembership" ADD CONSTRAINT "RoomMembership_goalQuestId_fkey" FOREIGN KEY ("goalQuestId") REFERENCES "Quest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
