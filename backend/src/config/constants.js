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

// Title thresholds. A player's title is derived from their level (never stored).
const RANKS = [
  { minLevel: 30, code: 'MASTER',     name: 'Master' },
  { minLevel: 20, code: 'ADVANCED',   name: 'Advanced' },
  { minLevel: 10, code: 'DISCIPLINED', name: 'Disciplined' },
  { minLevel: 5,  code: 'RISING',     name: 'Rising' },
  { minLevel: 1,  code: 'BEGINNER',   name: 'Beginner' },
];

// Resolve the rank for a level. RANKS is ordered high -> low, so the first
// matching threshold wins. The lowest entry doubles as the fallback.
function rankForLevel(level) {
  const rank = RANKS.find((r) => level >= r.minLevel) || RANKS[RANKS.length - 1];
  return { code: rank.code, name: rank.name };
}

// Character attribute columns (camelCase, ordered for deterministic tie-breaks).
const ATTRIBUTE_FIELDS = ['intellect', 'strength', 'discipline', 'creativity', 'social'];

// Daily / weekly quest goals with one-time claim rewards (can never double-claim).
const DEFAULT_DAILY_QUEST_GOAL = 3;
const DEFAULT_WEEKLY_QUEST_GOAL = 15;
const GOAL_REWARDS = {
  DAILY: { xp: 50, gold: 10 },
  WEEKLY: { xp: 150, gold: 30 },
};

// Focus session defaults and completion reward.
const FOCUS_MODES = {
  POMODORO: { label: 'Pomodoro', focusSeconds: 25 * 60, breakSeconds: 5 * 60 },
  FLOW: { label: 'Flow', focusSeconds: 45 * 60, breakSeconds: null },
};
const FOCUS_DEFAULT_SECONDS = 25 * 60;
const FOCUS_COMPLETE_REWARD = { xp: 10, gold: 2 };
const FOCUS_MIN_SECONDS = 60;
const FOCUS_MAX_SECONDS = 6 * 3600;

// Character identity presets. keys are stable identifiers; RONIN points at the
// project's own hero art where one exists, the rest render as emblem cards.
const AVATAR_PRESETS = [
  { key: 'turtle', label: 'Turtle' },
  { key: 'ronin', label: 'Ronin' },
  { key: 'runner', label: 'Runner' },
  { key: 'scholar', label: 'Scholar' },
  { key: 'creator', label: 'Creator' },
];
const AVATAR_UPLOAD_LIMIT = 2 * 1024 * 1024; // 2 MB
const AVATAR_IMAGE_MAX_LENGTH = 500000; // base64 characters stored server-side

// Custom reward constraints.
const REWARD_MIN_COST = 10;
const REWARD_MAX_COST = 100000;

// Journey / challenge constraints.
const JOURNEY_MIN_DAYS = 3;
const JOURNEY_MAX_DAYS = 100;
const JOURNEY_TYPES = ['JOURNEY', 'CHALLENGE'];

// Routine periods.
const ROUTINE_PERIODS = ['MORNING', 'AFTERNOON', 'EVENING'];

// Achievement definitions. Requirements are intentionally data-driven and
// centralized here; every check is satisfied from real progression data only
// (never fabricated). Codes are stable identifiers used across the DB and API.
const ACHIEVEMENTS = [
  {
    code: 'FIRST_STEP',
    name: 'First Step',
    description: 'Complete your first quest.',
    requirements: { type: 'QUESTS_COMPLETED', count: 1 },
  },
  {
    code: 'SHOWING_UP',
    name: 'Showing Up',
    description: 'Complete quests on 7 different active days.',
    requirements: { type: 'ACTIVE_DAYS', count: 7 },
  },
  {
    code: 'SCHOLAR',
    name: 'Scholar',
    description: 'Earn at least 500 Intellect points.',
    requirements: { type: 'ATTRIBUTE_VALUE', attribute: 'INTELLECT', value: 500 },
  },
  {
    code: 'BUILDER',
    name: 'Builder',
    description: 'Complete 10 Coding quests.',
    requirements: { type: 'CATEGORY_QUESTS', category: 'CODING', count: 10 },
  },
  {
    code: 'BALANCED',
    name: 'Balanced',
    description: 'Raise at least 3 different attributes above 1.',
    requirements: { type: 'ATTRIBUTES_ELEVATED', count: 3 },
  },
  {
    code: 'CONSISTENT',
    name: 'Consistent',
    description: 'Reach a 14-day streak.',
    requirements: { type: 'STREAK', count: 14 },
  },
  {
    code: 'FOCUSED',
    name: 'Focused',
    description: 'Complete 5 focus sessions.',
    requirements: { type: 'FOCUS_SESSIONS', count: 5 },
  },
  {
    code: 'ROUTINED',
    name: 'Routined',
    description: 'Tick off routine activity on 7 different days.',
    requirements: { type: 'ROUTINE_DAYS', count: 7 },
  },
  {
    code: 'WEEK_WARRIOR',
    name: 'Week Warrior',
    description: 'Complete your weekly quest goal in a single week.',
    requirements: { type: 'WEEKLY_GOAL_COMPLETED' },
  },
  {
    code: 'JOURNEY_STARTED',
    name: 'Journey Started',
    description: 'Begin your first journey or challenge.',
    requirements: { type: 'JOURNEYS_STARTED', count: 1 },
  },
  {
    code: 'MASTER_OF_ONE',
    name: 'Master of One',
    description: 'Raise any single attribute to 400.',
    requirements: { type: 'MAX_ATTRIBUTE', value: 400 },
  },
];

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
  RANKS,
  rankForLevel,
  ATTRIBUTE_FIELDS,
  DEFAULT_DAILY_QUEST_GOAL,
  DEFAULT_WEEKLY_QUEST_GOAL,
  GOAL_REWARDS,
  FOCUS_MODES,
  FOCUS_DEFAULT_SECONDS,
  FOCUS_COMPLETE_REWARD,
  FOCUS_MIN_SECONDS,
  FOCUS_MAX_SECONDS,
  AVATAR_PRESETS,
  AVATAR_UPLOAD_LIMIT,
  AVATAR_IMAGE_MAX_LENGTH,
  REWARD_MIN_COST,
  REWARD_MAX_COST,
  JOURNEY_MIN_DAYS,
  JOURNEY_MAX_DAYS,
  JOURNEY_TYPES,
  ROUTINE_PERIODS,
  ACHIEVEMENTS,
};
