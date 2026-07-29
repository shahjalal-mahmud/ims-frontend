// src/components/ui/Select.jsx
// Generic <select> with label + error, designed to play nicely with RHF.
//
// Per docs/Component_Architecture.md §3.
//
// `options` accepts either:
//   - an array of { value, label } objects
//   - an array of primitives (used as both value and label)
// An optional `placeholder` option (with value === '') is added
// automatically when `placeholder` is provided.
//
// Same `registerProps` merging pattern as Input — see Input.jsx for
// the comment.

import { forwardRef } from 'react';

const Select = forwardRef(function Select(
  {
    label,
    error,
    hint,
    options = [],
    placeholder,
    className = '',
    containerClassName = '',
    disabled = false,
    registerProps,
    id,
    value,
    onChange,
    ...rest
  },
  ref
) {
  const mergedRef = (node) => {
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
    if (registerProps?.ref) {
      if (typeof registerProps.ref === 'function') registerProps.ref(node);
      else registerProps.ref.current = node;
    }
  };

  const inputId = id || registerProps?.name || rest.name;
  const selectValue = value !== undefined
    ? value
    : (registerProps?.value !== undefined ? registerProps.value : '');

  const handleChange = (e) => {
    if (registerProps?.onChange) registerProps.onChange(e);
    if (onChange) onChange(e);
  };

  return (
    <div className={`form-control w-full ${containerClassName}`.trim()}>
      {label && (
        <label className="label" htmlFor={inputId}>
          <span className="label-text">{label}</span>
        </label>
      )}
      <select
        id={inputId}
        ref={mergedRef}
        disabled={disabled}
        className={`select select-bordered w-full ${error ? 'select-error' : ''} ${className}`.trim()}
        aria-invalid={error ? 'true' : undefined}
        value={selectValue}
        onChange={handleChange}
        onBlur={registerProps?.onBlur}
        name={registerProps?.name}
        {...rest}
      >
        {placeholder !== undefined && (
          <option value="">{placeholder}</option>
        )}
        {options.map((opt) => {
          const isObj = opt && typeof opt === 'object';
          const optValue = isObj ? opt.value : opt;
          const optLabel = isObj ? opt.label : String(opt);
          return (
            <option key={String(optValue)} value={optValue}>
              {optLabel}
            </option>
          );
        })}
      </select>
      {error && (
        <span className="label-text-alt text-error mt-1">{error}</span>
      )}
      {!error && hint && (
        <span className="label-text-alt text-base-content/60 mt-1">{hint}</span>
      )}
    </div>
  );
});

export default Select;
