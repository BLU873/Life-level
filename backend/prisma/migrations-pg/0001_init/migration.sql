-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
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
    "lastActiveDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "xpReward" INTEGER NOT NULL,
    "goldReward" INTEGER NOT NULL,
    "attribute" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestCompletion" (
    "id" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "xpEarned" INTEGER NOT NULL,
    "goldEarned" INTEGER NOT NULL,
    "attributeGained" TEXT NOT NULL,
    "attributePoints" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XPHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questId" TEXT,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "xpChange" INTEGER NOT NULL DEFAULT 0,
    "goldChange" INTEGER NOT NULL DEFAULT 0,
    "levelBefore" INTEGER,
    "levelAfter" INTEGER,
    "newLevel" INTEGER,
    "streakBefore" INTEGER,
    "streakAfter" INTEGER,
    "attributeType" TEXT,
    "attributeChange" INTEGER,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XPHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "rarity" TEXT NOT NULL DEFAULT 'COMMON',
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ShopItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnedItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shopItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isEquipped" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OwnedItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Character_userId_key" ON "Character"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OwnedItem_userId_shopItemId_key" ON "OwnedItem"("userId", "shopItemId");

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestCompletion" ADD CONSTRAINT "QuestCompletion_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestCompletion" ADD CONSTRAINT "QuestCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XPHistory" ADD CONSTRAINT "XPHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XPHistory" ADD CONSTRAINT "XPHistory_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnedItem" ADD CONSTRAINT "OwnedItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnedItem" ADD CONSTRAINT "OwnedItem_shopItemId_fkey" FOREIGN KEY ("shopItemId") REFERENCES "ShopItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;