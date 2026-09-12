// Quest categories used by the app. Each maps to a character attribute.
const QUEST_CATEGORIES = {
  STUDY: 'STUDY',
  CODING: 'CODING',
  FITNESS: 'FITNESS',
  HEALTH: 'HEALTH',
  CREATIVE: 'CREATIVE',
  SOCIAL: 'SOCIAL',
  PERSONAL: 'PERSONAL',
};

// Single source of truth: quest category -> character attribute.
const CATEGORY_ATTRIBUTE = {
  STUDY: 'INTELLECT',
  CODING: 'INTELLECT',
  FITNESS: 'STRENGTH',
  HEALTH: 'DISCIPLINE',
  CREATIVE: 'CREATIVITY',
  SOCIAL: 'SOCIAL',
  PERSONAL: 'DISCIPLINE',
};

// Attribute categories (the values CATEGORY_ATTRIBUTE points to).
const CATEGORIES = {
  INTELLECT: 'INTELLECT',
  STRENGTH: 'STRENGTH',
  DISCIPLINE: 'DISCIPLINE',
  CREATIVITY: 'CREATIVITY',
  SOCIAL: 'SOCIAL',
};

// Quest difficulty levels with reward multipliers
const DIFFICULTIES = {
  EASY:       { label: 'Easy',       xpMultiplier: 1.0, goldMultiplier: 1.0, attributePoints: 2 },
  MEDIUM:     { label: 'Medium',     xpMultiplier: 2.0, goldMultiplier: 2.0, attributePoints: 3 },
  HARD:       { label: 'Hard',       xpMultiplier: 3.0, goldMultiplier: 3.0, attributePoints: 5 },
};

// Difficulty levels accepted when creating/updating quests (derived from DIFFICULTIES).
const QUEST_DIFFICULTIES = Object.keys(DIFFICULTIES);

// Quest category values accepted by the API (derived from QUEST_CATEGORIES).
const VALID_QUEST_CATEGORIES = Object.values(QUEST_CATEGORIES);

// Base reward values
const BASE_XP = 50;
const BASE_GOLD = 10;

// XP required for a given level: 100 * level^1.5
function xpForLevel(level) {
  return Math.floor(100 * Math.pow(level, 1.5));
}

// Calculate which level a total XP amount corresponds to
function levelFromTotalXP(totalXP) {
  let level = 1;
  while (xpForLevel(level + 1) <= totalXP) {
    level++;
  }
  return level;
}

module.exports = {
  QUEST_CATEGORIES,
  CATEGORY_ATTRIBUTE,
  CATEGORIES,
  DIFFICULTIES,
  QUEST_DIFFICULTIES,
  VALID_QUEST_CATEGORIES,
  BASE_XP,
  BASE_GOLD,
  xpForLevel,
  levelFromTotalXP,
};
