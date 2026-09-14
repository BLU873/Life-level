const RARITY_STYLES = {
  COMMON: 'text-steel border-line bg-surface-2',
  UNCOMMON: 'text-success border-success/25 bg-success/5',
  RARE: 'text-warning border-warning/30 bg-warning/5',
  EPIC: 'text-creativity border-creativity/30 bg-creativity/5',
  LEGENDARY: 'text-tact border-tact/30 bg-tact/10',
};

export default function RarityBadge({ rarity, className = '' }) {
  const key = String(rarity || 'COMMON').toUpperCase();
  const style = RARITY_STYLES[key] || RARITY_STYLES.COMMON;

  return (
    <span
      className={`
        inline-flex items-center rounded-[3px] border px-1.5 py-0.5
        font-mono text-[10px] uppercase tracking-[0.16em]
        ${style}
        ${className}
      `}
    >
      {key}
    </span>
  );
}