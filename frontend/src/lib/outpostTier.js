const TIERS = [
  {
    key: 'recruit',
    label: 'RECRUIT BASE',
    intensity: 1,
    tagClass: 'border-steel/40 text-steel',
    connectorClass: 'from-steel/30 via-steel/20 to-steel/30',
    spineClass: 'from-steel/25 via-steel/15 to-steel/25',
    railClass: 'bg-steel/25',
    nodeClass: 'bg-steel/30',
    gridOpacity: 0.3,
    coreBorderClass: 'border-tact/40',
    coreHaloClass: '',
    facilityGlow: false,
  },
  {
    key: 'field',
    label: 'FIELD BASE',
    intensity: 2,
    tagClass: 'border-warning/40 text-warning',
    connectorClass: 'from-warning/40 via-warning/25 to-warning/40',
    spineClass: 'from-warning/35 via-warning/20 to-warning/35',
    railClass: 'bg-warning/40',
    nodeClass: 'bg-warning/40',
    gridOpacity: 0.55,
    coreBorderClass: 'border-warning/50',
    coreHaloClass: 'shadow-[0_0_24px_rgba(217,164,65,0.08)]',
    facilityGlow: true,
  },
  {
    key: 'vanguard',
    label: 'VANGUARD BASE',
    intensity: 3,
    tagClass: 'border-warning/60 text-warning',
    connectorClass: 'from-warning/55 via-warning/35 to-warning/55',
    spineClass: 'from-warning/50 via-warning/30 to-warning/50',
    railClass: 'bg-warning/60',
    nodeClass: 'bg-warning/60',
    gridOpacity: 0.8,
    coreBorderClass: 'border-warning/60',
    coreHaloClass: 'shadow-[0_0_32px_rgba(217,164,65,0.15)]',
    facilityGlow: true,
  },
];

export function getOutpostTier(level) {
  const lv = Number(level) || 1;
  if (lv >= 10) return TIERS[2];
  if (lv >= 5) return TIERS[1];
  return TIERS[0];
}