import { forwardRef, useId } from 'react';

const EntryField = forwardRef(
  ({ label, error, hint, className = '', ...props }, ref) => {
    const id = useId();

    return (
      <div className={`entry-field ${className}`}>
        <label htmlFor={id} className="entry-field__label">
          {label}
        </label>
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          className={`entry-field__input${error ? ' is-invalid' : ''}`}
          {...props}
        />
        {error ? (
          <p className="entry-field__error">{error}</p>
        ) : hint ? (
          <p className="entry-field__hint">{hint}</p>
        ) : null}
      </div>
    );
  }
);

EntryField.displayName = 'EntryField';
export default EntryField;