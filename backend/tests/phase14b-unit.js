/**
 * Phase 14B unit tests — pure XP-economy + operator-evolution ladder (no DB,
 * no server). Covers:
 *  - XP curve thresholds at levels 1, 2, 5, 10, 15, 20, 25, 30, 35, 40, 50
 *  - the existing-user no-downgrade invariant (test account snapshot)
 *  - every earning identity: OPERATIONS / FOCUS / ROUTINES / GOALS / ACHIEVEMENTS
 *  - routine reward flat grants crossing a level boundary
 *  - reward ordering sanity (routine < focus < operations)
 *  - operator visual ladder + per-step evolution detection (frontend lib)
 */
const { pathToFileURL } = require('url');
const { getXPProgress, applyFlatGrant, calculateLevelProgress, calculateQuestRewards } = require('../src/services/rpgEngine');
const constants = require('../src/config/constants');
const { levelFromTotalXP, xpForLevel, DIFFICULTIES, BASE_XP, BASE_GOLD } = constants;

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

// --- XP curve thresholds (cumulative XP required to REACH level N) ----------
const CURVE = [
  [1, 100],
  [2, 282],
  [5, 1118],
  [10, 3162],
  [15, 5809],
  [20, 8944],
  [25, 12500],
  [30, 16431],
  [35, 20706],
  [40, 25298],
  [50, 35355],
];
for (const [level, cumulative] of CURVE) {
  assert(`curve: cumulative XP to reach level ${level} is ${cumulative}`, xpForLevel(level) === cumulative);
  assert(`curve: levelFromTotalXP(${cumulative}) === ${level}`, levelFromTotalXP(cumulative) === level);
  assert(`curve: one under level ${level} is still level ${Math.max(1, level - 1)}`, levelFromTotalXP(cumulative - 1) === Math.max(1, level - 1));
}

// --- Existing-user no-downgrade invariant -----------------------------------
// Test-account snapshot (end of Phase 13): totalXP 3550 must still map to
// level 10 under the unchanged curve (3162 <= 3550 < 3648 -> level 11).
assert('no-downgrade: totalXP 3550 stays level 10', levelFromTotalXP(3550) === 10);
assert('no-downgrade: next milestone 15 at 5809', levelFromTotalXP(5809) === 15);

// --- Earning identities ------------------------------------------------------
// OPERATIONS: larger, deliberate (50 / 100 / 150 XP, 10 / 20 / 30 gold, 2/3/5 pts).
assert('operations: EASY rewards', (() => { const r = calculateQuestRewards({ difficulty: 'EASY', attribute: 'STRENGTH' }); return r.xpEarned === 50 && r.goldEarned === 10 && r.attributePoints === 2; })());
assert('operations: MEDIUM rewards', (() => { const r = calculateQuestRewards({ difficulty: 'MEDIUM', attribute: 'STRENGTH' }); return r.xpEarned === 100 && r.goldEarned === 20 && r.attributePoints === 3; })());
assert('operations: HARD rewards', (() => { const r = calculateQuestRewards({ difficulty: 'HARD', attribute: 'STRENGTH' }); return r.xpEarned === 150 && r.goldEarned === 30 && r.attributePoints === 5; })());
assert('operations: BASE_XP/BASE_GOLD constants', BASE_XP === 50 && BASE_GOLD === 10);

// FOCUS: moderate time-on-task reward.
assert('focus: flat reward 10 XP / 2 gold', constants.FOCUS_COMPLETE_REWARD.xp === 10 && constants.FOCUS_COMPLETE_REWARD.gold === 2);

// ROUTINES: small consistency reward (new in Phase 14B).
assert('routines: small reward 5 XP / 1 gold', constants.ROUTINE_COMPLETE_REWARD.xp === 5 && constants.ROUTINE_COMPLETE_REWARD.gold === 1);

// GOALS: moderate milestone rewards.
assert('goals: daily 50 XP / 10 gold', constants.GOAL_REWARDS.DAILY.xp === 50 && constants.GOAL_REWARDS.DAILY.gold === 10);
assert('goals: weekly 150 XP / 30 gold', constants.GOAL_REWARDS.WEEKLY.xp === 150 && constants.GOAL_REWARDS.WEEKLY.gold === 30);

// ACHIEVEMENTS: recognition-only ledger rows (no economy injection).
assert('achievements: definitions exist', constants.ACHIEVEMENTS.length >= 11);

// REWARD_REDEEMED: REDEMPTION is spending, never earning, and not payable.
assert('redeem: not defined as an earnable', !constants.ACHIEVEMENTS.some((a) => a.code === 'REWARD_REDEEMED'));

// Reward ordering sanity: routines (consistency) < focus (moderate) < operations (deliberate).
assert('ordering: routine < focus < operations', constants.ROUTINE_COMPLETE_REWARD.xp < constants.FOCUS_COMPLETE_REWARD.xp && constants.FOCUS_COMPLETE_REWARD.xp < DIFFICULTIES.EASY.xpMultiplier * BASE_XP);
assert('ordering: goal daily ~ easy operation', constants.GOAL_REWARDS.DAILY.xp === DIFFICULTIES.EASY.xpMultiplier * BASE_XP);

// --- Routine reward applies through the same flat-grant engine ---------------
// A routine tick on a level-9 character (2700 XP) grants 5 XP -> 2705: still 9.
const flatNoLevel = applyFlatGrant({ character: { totalXP: 2700, gold: 0 }, xp: constants.ROUTINE_COMPLETE_REWARD.xp, gold: constants.ROUTINE_COMPLETE_REWARD.gold });
assert('routine flat grant: no level change when within range', flatNoLevel.totalXP === 2705 && flatNoLevel.levelAfter === 9 && flatNoLevel.leveledUp === false && flatNoLevel.totalGold === 1);

// A routine tick can still cross a level boundary at the edge of a level.
const flatCross = applyFlatGrant({ character: { totalXP: 3644, gold: 0 }, xp: constants.ROUTINE_COMPLETE_REWARD.xp, gold: constants.ROUTINE_COMPLETE_REWARD.gold });
assert('routine flat grant: can cross a level boundary', flatCross.totalXP === 3649 && flatCross.levelBefore === 10 && flatCross.levelAfter === 11 && flatCross.leveledUp === true);

// Progress must never be negative and percentage must stay bounded.
assert('progress: fresh character 0/282 @ 0%', (() => { const p = getXPProgress(0); return p.currentXP === 0 && p.xpForNextLevel === 282 && p.progress === 0; })());
assert('progress: bounded at the top of a level', (() => { const p = getXPProgress(3647); return p.currentXP >= 0 && p.progress <= 1; })());
assert('progress: 3550 snapshot deepens into level 10', (() => { const p = calculateLevelProgress(3550); return p.currentLevel === 10 && p.xpIntoCurrentLevel === 388 && p.xpRequiredForNextLevel === 486; })());

async function main() {
  // --- Operator evolution ladder (frontend lib, imported as ESM) -----------
  try {
    const visual = await import(pathToFileURL(require.resolve('../../frontend/src/lib/characterVisual.js')).href);
    const tiers = { 1: 'ronin', 4: 'ronin', 5: 'l5', 9: 'l5', 10: 'l10', 14: 'l10', 15: 'l15', 19: 'l15', 20: 'l20', 24: 'l20', 25: 'l25', 29: 'l25', 30: 'l30', 34: 'l30', 35: 'l35', 39: 'l35', 40: 'l40', 41: 'l40', 99: 'l40' };
    for (const [level, tier] of Object.entries(tiers)) {
      const src = visual.getCharacterVisual(Number(level));
      const guard =
        tier === 'ronin' ? src === visual.OPERATOR_IMAGE_RONIN
        : tier === 'l5' ? src === visual.OPERATOR_IMAGE_1
        : tier === 'l10' ? src === visual.OPERATOR_IMAGE_2
        : src === visual[`OPERATOR_IMAGE_${tier.slice(1)}`];
      assert(`operator: level ${level} -> ${tier}`, guard);
    }
    assert('operator: milestones are [5,10,15,20,25,30,35,40]', JSON.stringify(visual.OPERATOR_VISUAL_MILESTONES) === JSON.stringify([5, 10, 15, 20, 25, 30, 35, 40]));
    assert('operator: no evolution on a same-level step', JSON.stringify(visual.getOperatorEvolution(10, 10)) === '[]');
    assert('operator: single milestone crossing 14->15', JSON.stringify(visual.getOperatorEvolution(14, 15)) === '[15]');
    assert('operator: crossing 19->20 is exactly [20]', JSON.stringify(visual.getOperatorEvolution(19, 20)) === '[20]');
    assert('operator: multi-level leap 9->16 crosses 10 and 15', JSON.stringify(visual.getOperatorEvolution(9, 16)) === '[10,15]');
    assert('operator: does not report 5 when already at 6', JSON.stringify(visual.getOperatorEvolution(6, 11)) === '[10]');
    assert('operator: crossing 39->41 is exactly [40]', JSON.stringify(visual.getOperatorEvolution(39, 41)) === '[40]');
    assert('operator: cannot evolve before level 5', JSON.stringify(visual.getOperatorEvolution(1, 4)) === '[]');
  } catch (err) {
    failed += 1;
    console.log(`  FAIL operator ladder import: ${err.message}`);
  }

  console.log(`\nPASS ${passed} / ${passed + failed}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error('Phase 14B unit test error:', err.message || err);
  process.exit(1);
});