import { forwardRef } from 'react';

const VARIANTS = {
  primary: 'ln-btn ln-btn--primary',
  ghost: 'ln-btn ln-btn--ghost',
};

const EntryButton = forwardRef(
  ({ children, variant = 'primary', className = '', loading = false, disabled = false, fullWidth = false, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`${VARIANTS[variant]}${fullWidth ? ' ln-btn--full' : ''} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <span className="ln-btn__spinner" aria-hidden="true" />
        )}
        <span className="ln-btn__label">{children}</span>
      </button>
    );
  }
);

EntryButton.displayName = 'EntryButton';
export default EntryButton;