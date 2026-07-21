// src/components/ui/Input.jsx
// Wraps RHF's `register()` and renders label + input + error in one place.
// Per docs/Component_Architecture.md §3 and docs/UI_Design_System.md §10.
//
// Label sits ABOVE the input (not floating). Error renders directly below
// the field in `text-error text-sm`. Pass any extra input props (type,
// autoComplete, placeholder, etc.) through `...rest`.
//
// Important: this component spreads register's ref/onChange/onBlur/name
// straight onto the underlying input. Callers that use it via RHF
// typically spread `{...register('field')}` into `registerProps`.

import { forwardRef } from 'react';

const Input = forwardRef(function Input(
  {
    label,
    error,
    hint,
    type = 'text',
    className = '',
    containerClassName = '',
    disabled = false,
    registerProps, // { ref, onChange, onBlur, name }
    id,
    ...rest
  },
  ref
) {
  // Merge the forwarded ref with RHF's register ref so both work.
  const inputRef = (node) => {
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
    if (registerProps?.ref) {
      if (typeof registerProps.ref === 'function') registerProps.ref(node);
      else registerProps.ref.current = node;
    }
  };

  const inputId = id || registerProps?.name || rest.name;

  return (
    <div className={`form-control w-full ${containerClassName}`.trim()}>
      {label && (
        <label className="label" htmlFor={inputId}>
          <span className="label-text">{label}</span>
        </label>
      )}
      <input
        id={inputId}
        ref={inputRef}
        type={type}
        disabled={disabled}
        className={`input input-bordered w-full ${error ? 'input-error' : ''} ${className}`.trim()}
        aria-invalid={error ? 'true' : undefined}
        onChange={registerProps?.onChange}
        onBlur={registerProps?.onBlur}
        name={registerProps?.name}
        {...rest}
      />
      {error && (
        <span className="label-text-alt text-error mt-1">{error}</span>
      )}
      {!error && hint && (
        <span className="label-text-alt text-base-content/60 mt-1">{hint}</span>
      )}
    </div>
  );
});

export default Input;
