import { motion } from 'framer-motion';

const VARIANTS = {
  primary: 'bg-tact text-white hover:bg-tact-2',
  ghost: 'bg-transparent text-tact border border-tact/40 hover:bg-tact/10',
  steel: 'bg-surface-2 text-text border border-line hover:bg-surface-3',
  danger: 'bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20',
  gold: 'bg-warning/10 text-warning border border-warning/30 hover:bg-warning/20',
  violet: 'bg-violet-500/15 text-violet-200 border border-violet-400/30 hover:bg-violet-500/25',
};

const SIZES = {
  sm: 'h-8 px-3 text-[11px]',
  md: 'h-10 px-4 text-xs',
  lg: 'h-12 px-6 text-sm',
};

/**
 * Shared class string so links can look like tactical buttons without
 * nesting a <button> inside an <a> (invalid HTML, double tab stop).
 */
export function tacticalButtonClasses(variant = 'primary', size = 'md', className = '') {
  return `
    tact-clip inline-flex items-center justify-center gap-2
    font-ui font-semibold uppercase tracking-[0.16em]
    transition-colors duration-150
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tact/40
    disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0
    ${VARIANTS[variant] || VARIANTS.primary}
    ${SIZES[size] || SIZES.md}
    ${className}
  `;
}

export default function TacticalButton({ children, variant = 'primary', size = 'md', type = 'button', disabled, className = '', ...props }) {
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      disabled={disabled}
      type={type}
      className={tacticalButtonClasses(variant, size, className)}
      {...props}
    >
      {children}
    </motion.button>
  );
}
