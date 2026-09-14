// Operation vocabulary — single source of truth for the War Room page.
// Mirrors the backend's VALID_QUEST_CATEGORIES and QUEST_DIFFICULTIES
// exactly; do not add values the API does not accept.

export const CATEGORIES = [
  { value: 'STUDY', label: 'Study' },
  { value: 'CODING', label: 'Coding' },
  { value: 'FITNESS', label: 'Fitness' },
  { value: 'HEALTH', label: 'Health' },
  { value: 'CREATIVE', label: 'Creative' },
  { value: 'SOCIAL', label: 'Social' },
  { value: 'PERSONAL', label: 'Personal' },
];

export const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]));

export const DIFFICULTIES = [
  { value: 'EASY', label: 'Easy' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HARD', label: 'Hard' },
];

export const DIFFICULTY_LABEL = Object.fromEntries(DIFFICULTIES.map((d) => [d.value, d.label]));

// Attribute points per difficulty — mirrors the backend's DIFFICULTIES table
// (EASY 2 / MEDIUM 3 / HARD 5). Display-only; authoritative rewards are always
// calculated server-side on completion.
export const DIFFICULTY_ATTRIBUTE_POINTS = {
  EASY: 2,
  MEDIUM: 3,
  HARD: 5,
};

// Attribute names — mirrors the backend's CATEGORY_ATTRIBUTE mapping
// (quest.attribute is always one of these uppercase codes).
export const ATTRIBUTE_NAME = {
  INTELLECT: 'Intellect',
  STRENGTH: 'Strength',
  DISCIPLINE: 'Discipline',
  CREATIVITY: 'Creativity',
  SOCIAL: 'Social',
};

// Subtle tactical status per difficulty — steel/gold/red, not a rainbow rarity.
export const DIFFICULTY_STATUS = {
  EASY: 'available',
  MEDIUM: 'warning',
  HARD: 'danger',
};

// Today's Arc attribute changes (lower-case keys from the API) -> display name.
export const ATTRIBUTE_LABEL = {
  intellect: 'Intellect',
  strength: 'Strength',
  discipline: 'Discipline',
  creativity: 'Creativity',
  social: 'Social',
};