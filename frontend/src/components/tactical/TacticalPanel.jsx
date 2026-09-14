export default function TacticalPanel({ children, className = '', variant = 'default', brackets = false, scan = false, clip = true }) {
  const variants = {
    default: 'border-line bg-surface',
    elevated: 'border-line-2 bg-surface-2',
    ghost: 'border-line bg-surface-2/60',
    danger: 'border-danger/30 bg-danger/5',
    gold: 'border-warning/30 bg-warning/5',
    steel: 'border-line-2 bg-surface-3',
  };

  const classes = [
    clip ? 'tact-clip' : '',
    brackets ? 'tact-brackets' : '',
    scan ? 'tact-scan' : '',
    variants[variant],
    'relative rounded-md border p-4',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <section className={classes}>{children}</section>;
}