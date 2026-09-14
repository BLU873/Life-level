export default function SectionHeader({ index, title, action, className = '', tone = 'tact' }) {
  const tones = {
    tact: 'text-tact',
    accent: 'text-accent',
    warning: 'text-warning',
    info: 'text-info',
    steel: 'text-steel',
    success: 'text-success',
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {index != null && (
        <span className={`font-mono text-xs tabular-nums ${tones[tone] || tones.tact}`}>
          {String(index).padStart(2, '0')}
        </span>
      )}
      <h2 className="font-ui text-sm font-bold uppercase tracking-[0.14em] text-text">
        {title}
      </h2>
      <span className="h-[1px] flex-1 bg-line" aria-hidden="true" />
      {action}
    </div>
  );
}