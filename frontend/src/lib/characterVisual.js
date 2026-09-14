export const OPERATOR_IMAGE_RONIN =
  'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260831_123709_183f0065-efb2-4bb2-a849-13aaa5af2f3f.png&w=1920&q=85';

export const OPERATOR_IMAGE_1 = '/assets/operators/operator-level-5.png';

export const OPERATOR_IMAGE_2 = '/assets/operators/operator-level-10.png';

export const OPERATOR_IMAGE_15 = '/assets/operators/operator-level-15.jpg';

export const OPERATOR_IMAGE_20 = '/assets/operators/operator-level-20.png';

export const OPERATOR_IMAGE_25 = '/assets/operators/operator-level-25.png';

export const OPERATOR_IMAGE_30 = '/assets/operators/operator-level-30.png';

export const OPERATOR_IMAGE_35 = '/assets/operators/operator-level-35.png';

export const OPERATOR_IMAGE_40 = '/assets/operators/operator-level-40.png';

// Ordered operator evolution tiers. Each step is the visual a character
// "evolves" into at a given level. Level 1 uses the Ronin hero art; the rest
// are static operator assets.
export const OPERATOR_VISUAL_TIERS = [
  { minLevel: 40, src: OPERATOR_IMAGE_40 },
  { minLevel: 35, src: OPERATOR_IMAGE_35 },
  { minLevel: 30, src: OPERATOR_IMAGE_30 },
  { minLevel: 25, src: OPERATOR_IMAGE_25 },
  { minLevel: 20, src: OPERATOR_IMAGE_20 },
  { minLevel: 15, src: OPERATOR_IMAGE_15 },
  { minLevel: 10, src: OPERATOR_IMAGE_2 },
  { minLevel: 5, src: OPERATOR_IMAGE_1 },
];

// Levels at which the operator visual changes (5, 10, 15, ... 40).
export const OPERATOR_VISUAL_MILESTONES = OPERATOR_VISUAL_TIERS.map((t) => t.minLevel).sort((a, b) => a - b);

export function getCharacterVisual(level) {
  const tier = OPERATOR_VISUAL_TIERS.find((t) => level >= t.minLevel);
  if (tier) return tier.src;
  return OPERATOR_IMAGE_RONIN;
}

// Visual tiers crossed by a single progression step (levelBefore -> levelAfter).
// Only real crossings are returned; a step that does not cross a milestone is
// empty. Handles multi-level leaps defensively (one tier per milestone).
export function getOperatorEvolution(levelBefore, levelAfter) {
  const before = Number(levelBefore) || 1;
  const after = Number(levelAfter) || before;
  return OPERATOR_VISUAL_MILESTONES.filter((m) => before < m && after >= m);
}

export function preloadOperatorVisuals(level) {
  const srcs = [getCharacterVisual(level)];
  const nextMilestone = OPERATOR_VISUAL_MILESTONES.find((m) => level < m);
  if (nextMilestone) {
    const nextTier = OPERATOR_VISUAL_TIERS.find((t) => t.minLevel === nextMilestone);
    if (nextTier) srcs.push(nextTier.src);
  }
  srcs.forEach((src) => {
    const img = new Image();
    img.src = src;
  });
}