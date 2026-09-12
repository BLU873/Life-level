import { forwardRef, useId } from 'react';

const Input = forwardRef(({ label, error, hint, className = '', ...props }, ref) => {
  const id = useId();

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-[13px] font-medium text-text-2">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        className={`
          h-10 w-full rounded-lg bg-surface
          border border-line px-3.5 text-sm
          text-text placeholder:text-text-3
          transition-all duration-150
          focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/25
          ${error ? 'border-danger focus:border-danger focus:ring-danger/25' : ''}
          ${className}
        `}
        {...props}
      />
      {error ? (
        <p className="text-[13px] text-danger">{error}</p>
      ) : hint ? (
        <p className="text-[13px] text-text-3">{hint}</p>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;