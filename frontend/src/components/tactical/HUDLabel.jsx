export default function HUDLabel({ children, className = '', tone = 'accent' }) {
  const tones = {
    accent: 'text-tact',
    cream: 'text-cream',
    steel: 'text-steel',
    danger: 'text-danger',
    warning: 'text-warning',
    success: 'text-success',
    command: 'text-accent',
    outpost: 'text-warning',
    operations: 'text-tact',
    intel: 'text-info',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        font-mono text-[11px] uppercase tracking-[0.18em]
        ${tones[tone] || tones.accent}
        ${className}
      `}
    >
      <span className="inline-block h-px w-2.5 bg-current opacity-70" aria-hidden="true" />
      {children}
    </span>
  );
}