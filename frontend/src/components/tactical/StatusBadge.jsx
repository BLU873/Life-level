const STATUS_STYLES = {
  ready: 'text-success border-success/30 bg-success/5',
  active: 'text-tact border-tact/30 bg-tact/10',
  available: 'text-text-2 border-line-2 bg-surface-2',
  locked: 'text-steel border-line bg-surface-2',
  warning: 'text-warning border-warning/30 bg-warning/5',
  danger: 'text-danger border-danger/30 bg-danger/5',
  pending: 'text-warning border-warning/30 bg-warning/5',
  muted: 'text-steel border-line bg-surface-2',
};

const STATUS_DOTS = {
  ready: 'bg-success',
  active: 'bg-tact',
  available: 'bg-steel',
  locked: 'bg-steel',
  warning: 'bg-warning',
  danger: 'bg-danger',
  pending: 'bg-warning',
  muted: 'bg-steel',
};

export default function StatusBadge({ status = 'ready', label, className = '' }) {
  const key = String(status).toLowerCase();
  const style = STATUS_STYLES[key] || STATUS_STYLES.ready;
  const dot = STATUS_DOTS[key] || STATUS_DOTS.ready;

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-[3px] border px-1.5 py-0.5
        font-mono text-[10px] uppercase tracking-[0.16em]
        ${style}
        ${className}
      `}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden="true" />
      {label || key}
    </span>
  );
}