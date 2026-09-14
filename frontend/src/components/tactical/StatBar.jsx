import { motion } from 'framer-motion';

const ATTRIBUTE_COLORS = {
  intellect: 'bg-intellect',
  strength: 'bg-strength',
  discipline: 'bg-discipline',
  creativity: 'bg-creativity',
  social: 'bg-social',
  accent: 'bg-accent',
  tact: 'bg-tact',
};

export default function StatBar({ label, value = 0, max = 100, color = 'accent', showValue = true, className = '' }) {
  const pct = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));
  const fill = ATTRIBUTE_COLORS[color] || ATTRIBUTE_COLORS.accent;

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        {label ? (
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-steel">
            {label}
          </span>
        ) : (
          <span />
        )}
        {showValue && (
          <span className="font-mono text-xs tabular-nums text-text-2">
            {Math.round(value)}
            {max ? `/${max}` : ''}
          </span>
        )}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-[1px] bg-surface-3">
        <motion.div
          className={`h-full ${fill}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
        />
      </div>
    </div>
  );
}