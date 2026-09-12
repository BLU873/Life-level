import { forwardRef } from 'react';
import { motion } from 'framer-motion';

const variants = {
  primary: 'bg-accent text-on-accent hover:bg-accent-2 shadow-sm',
  secondary: 'bg-surface text-text border border-line hover:bg-surface-2 hover:border-line-2 shadow-sm',
  ghost: 'text-text-2 hover:text-text hover:bg-surface-2',
  danger: 'border border-danger/25 bg-danger/5 text-danger hover:bg-danger/10',
  gold: 'border border-warning/30 bg-warning/5 text-warning hover:bg-warning/10',
};

const sizes = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-9 px-4 text-sm',
  lg: 'h-11 px-5 text-[15px]',
};

const Button = forwardRef(
  ({ children, variant = 'primary', size = 'md', className = '', disabled = false, loading = false, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileHover={disabled ? {} : { scale: 1.01 }}
        whileTap={disabled ? {} : { scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={`
          inline-flex items-center justify-center gap-2
          rounded-lg font-medium whitespace-nowrap
          transition-colors duration-150 select-none
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50
          focus-visible:ring-offset-2 focus-visible:ring-offset-bg
          disabled:opacity-50 disabled:pointer-events-none
          ${variants[variant]} ${sizes[size]} ${className}
        `}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
export default Button;