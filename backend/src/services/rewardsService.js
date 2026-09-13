const prisma = require('../lib/prisma');
const { REWARD_MIN_COST, REWARD_MAX_COST } = require('../config/constants');
const { ApiError } = require('../utils/apiError');

/**
 * Custom rewards — self-defined rewards the player can redeem with gold.
 *
 * Redeeming is atomic: ownership, balance and cost are all enforced inside a
 * single transaction so gold can never go negative and one reward can never be
 * redeemed twice at the same time. Redemptions land in the XPHistory ledger
 * (type REWARD_REDEEMED with a negative goldChange).
 */

function assertCost(cost) {
  if (!Number.isInteger(cost) || cost < REWARD_MIN_COST || cost > REWARD_MAX_COST) {
    throw ApiError.badRequest('INVALID_COST', `cost must be an integer between ${REWARD_MIN_COST} and ${REWARD_MAX_COST}.`);
  }
}

async function listRewards(userId) {
  return prisma.customReward.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
}

async function createReward(userId, { name, cost }) {
  assertCost(cost);
  const reward = await prisma.customReward.create({
    data: { userId, name: name.trim(), cost },
  });
  return reward;
}

async function deleteReward(userId, rewardId) {
  const reward = await prisma.customReward.findFirst({ where: { id: rewardId, userId } });
  if (!reward) throw ApiError.notFound('REWARD_NOT_FOUND', 'Reward not found.');
  await prisma.customReward.delete({ where: { id: rewardId } });
  return { message: 'Reward deleted.' };
}

async function redeemReward(userId, rewardId) {
  return prisma.$transaction(async (tx) => {
    const reward = await tx.customReward.findFirst({ where: { id: rewardId, userId } });
    if (!reward) throw ApiError.notFound('REWARD_NOT_FOUND', 'Reward not found.');

    const character = await tx.character.findUnique({ where: { userId } });
    if (!character) throw ApiError.notFound('CHARACTER_NOT_FOUND', 'Character not found.');
    if (character.gold < reward.cost) {
      throw ApiError.conflict('INSUFFICIENT_GOLD', 'You do not have enough gold for this reward.');
    }

    const updated = await tx.character.update({
      where: { userId },
      data: { gold: character.gold - reward.cost },
    });

    const history = await tx.xpHistory.create({
      data: {
        userId,
        type: 'REWARD_REDEEMED',
        description: `Redeemed reward "${reward.name}"`,
        goldChange: -reward.cost,
        metadata: JSON.stringify({ rewardId: reward.id, cost: reward.cost }),
      },
    });

    return { reward, character: { gold: updated.gold }, history };
  });
}

module.exports = { listRewards, createReward, deleteReward, redeemReward };