/**
 * Phase 8 unit tests — pure engine/reporting logic (no database, no server):
 *  - multi-level jumps from a single large XP reward (impossible via a single
 *    quest completion on the live API, so verified directly against the engine)
 *  - level curve thresholds
 *  - rank thresholds
 *  - one-step level progress application
 */
const { checkLevelUp, getXPProgress, applyQuestCompletion, applyFlatGrant, calculateLevelProgress } = require('../src/services/rpgEngine');
const { levelFromTotalXP, xpForLevel, rankForLevel } = require('../src/config/constants');

let passed = 0;
let failed = 0;
function assert(name, cond) {
  if (cond) {
    passed += 1;
    console.log(`  ok  ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${name}`);
  }
}

// 16: multi-level jump (single reward, engine level).
const jump = checkLevelUp(0, 5000);
assert('multi-level jump from a single 5000 XP grant', jump.leveledUp && jump.levelsGained === jump.newLevel - jump.oldLevel && jump.newLevel >= 10);

// Level curve thresholds: reaching level N requires 100 * N^1.5 total XP.
assert('level 1 base threshold', levelFromTotalXP(0) === 1 && levelFromTotalXP(100) === 1);
assert('level 2 at 282 XP', levelFromTotalXP(281) === 1 && levelFromTotalXP(282) === 2);
assert('level 3 at 519 XP', levelFromTotalXP(519) === 3);
assert('level 4 at 800 XP', levelFromTotalXP(800) === 4);
assert('level 5 at 1118 XP', levelFromTotalXP(1118) === 5);
assert('level 10 at 3162 XP', levelFromTotalXP(3162) === 10 && xpForLevel(10) === 3162);

// One-step progression application with a big reward (pure function).
const snap = {
  totalXP: 100,
  intellect: 1,
  strength: 1,
  discipline: 1,
  creativity: 1,
  social: 1,
};
const applied = applyQuestCompletion({
  character: snap,
  rewards: { xpEarned: 5000, goldEarned: 90, attributePoints: 5, attribute: 'STRENGTH' },
  streak: { currentStreak: 1, longestStreak: 1, lastActiveDate: new Date(), streakChanged: false },
});
assert('applyQuestCompletion handles an arbitrary jump in one step', applied.levelsGained >= 8 && applied.attributeAfter === 6 && applied.levelAfter === levelFromTotalXP(5100));

// getXPProgress edge cases
assert('fresh character progress is never negative', getXPProgress(0).currentXP === 0 && getXPProgress(0).level === 1);
assert('progress capped at 100% within a level', calculateLevelProgress(0).progressPercentage === 0 && calculateLevelProgress(3162 - 1).progressPercentage <= 100);

// Flat grants (focus sessions / goal claims): no attribute change, pure XP/gold.
const flat = applyFlatGrant({ character: { totalXP: 100, gold: 42 }, xp: 50, gold: 10 });
assert('applyFlatGrant adds XP and gold without touching attributes', flat.totalXP === 150 && flat.totalGold === 52 && flat.xpEarned === 50 && flat.goldEarned === 10 && flat.leveledUp === false);
const flat2 = applyFlatGrant({ character: { totalXP: 281, gold: 0 }, xp: 50, gold: 2 });
assert('applyFlatGrant can cross a level boundary', flat2.totalXP === 331 && flat2.levelAfter === 2 && flat2.leveledUp === true && flat2.levelBefore === 1);
assert('applyFlatGrant reports level progress', flat2.xpIntoCurrentLevel === 49 && flat2.progressPercentage > 0);

// Rank thresholds
assert('rank thresholds', rankForLevel(1).code === 'BEGINNER' && rankForLevel(4).code === 'BEGINNER');
assert('rank RISING from level 5', rankForLevel(5).code === 'RISING' && rankForLevel(9).code === 'RISING');
assert('rank DISCIPLINED from level 10', rankForLevel(10).code === 'DISCIPLINED' && rankForLevel(19).code === 'DISCIPLINED');
assert('rank ADVANCED from level 20', rankForLevel(20).code === 'ADVANCED' && rankForLevel(29).code === 'ADVANCED');
assert('rank MASTER from level 30', rankForLevel(30).code === 'MASTER' && rankForLevel(61).code === 'MASTER');

console.log(`\nPASS ${passed} / ${passed + failed}`);
if (failed > 0) process.exitCode = 1;