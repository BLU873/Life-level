const TIER_STYLES = {
  recruit: 'text-steel border-line bg-surface-2',
  initiate: 'text-success border-success/25 bg-success/5',
  operative: 'text-warning border-warning/30 bg-warning/5',
  veteran: 'text-creativity border-creativity/30 bg-creativity/5',
  elite: 'text-tact border-tact/30 bg-tact/10',
  commander: 'text-tact border-tact/50 bg-tact/15',
};

export function tierForLevel(level = 1) {
  if (level >= 30) return 'commander';
  if (level >= 20) return 'elite';
  if (level >= 10) return 'veteran';
  if (level >= 5) return 'operative';
  return 'recruit';
}

export default function RankBadge({ rankName, level, className = '' }) {
  const tier = tierForLevel(level);
  const style = TIER_STYLES[tier] || TIER_STYLES.recruit;

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-[3px] border px-2 py-0.5
        font-mono text-[10px] uppercase tracking-[0.16em]
        ${style}
        ${className}
      `}
    >
      <span className="opacity-80" aria-hidden="true">
        {tier === 'recruit' ? '▸' : '▰'}
      </span>
      {rankName}
    </span>
  );
}