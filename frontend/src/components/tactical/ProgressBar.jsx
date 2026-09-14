import { motion } from 'framer-motion';

export default function ProgressBar({ value = 0, max = 100, segments = 0, color = 'accent', className = '' }) {
  const pct = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));
  const fillColor = color === 'tact' ? 'bg-tact' : color === 'success' ? 'bg-success' : color === 'warning' ? 'bg-warning' : color === 'danger' ? 'bg-danger' : 'bg-accent';

  const fill = (
    <motion.div
      className={`h-full ${fillColor}`}
      initial={{ width: 0 }}
      animate={{ width: `${pct}%` }}
      transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
    />
  );

  if (segments > 0) {
    const filledSegments = Math.floor((pct / 100) * segments);
    return (
      <div className={`flex w-full gap-[3px] ${className}`}>
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-[1px] ${i < filledSegments ? fillColor : 'bg-surface-3'}`}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-[1px] bg-surface-3 ${className}`}>
      {fill}
    </div>
  );
}