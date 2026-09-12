export default function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-surface-2 text-text-2 border-line',
    accent: 'bg-accent/10 text-accent border-accent/20',
    blue: 'bg-intellect/10 text-intellect border-intellect/20',
    green: 'bg-success/10 text-success border-success/20',
    gold: 'bg-warning/10 text-warning border-warning/20',
    red: 'bg-danger/10 text-danger border-danger/20',
    pink: 'bg-creativity/10 text-creativity border-creativity/20',
  };

  return (
    <span className={`
      inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5
      text-xs font-medium
      ${variants[variant]}
      ${className}
    `}>
      {children}
    </span>
  );
}