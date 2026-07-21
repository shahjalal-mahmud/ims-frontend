// src/components/ui/SearchBar.jsx
// Generic search input. Debouncing is the caller's responsibility (per
// docs/Component_Architecture.md §3 — "useDebounce is used by the caller").
// Per docs/UI_Design_System.md §5, icon is `Search`.

import { Search } from 'lucide-react';

export default function SearchBar({
  value = '',
  onChange,
  onClear,
  placeholder = 'Search…',
  className = '',
  disabled = false,
}) {
  const handleClear = () => {
    if (onChange) onChange({ target: { value: '' } });
    if (onClear) onClear();
  };

  return (
    <label
      className={`input input-bordered flex items-center gap-2 w-full max-w-sm ${className}`.trim()}
    >
      <Search size={16} className="text-base-content/50" aria-hidden="true" />
      <input
        type="search"
        className="grow"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        aria-label="Search"
      />
      {value && !disabled && (
        <button
          type="button"
          className="btn btn-ghost btn-xs btn-square"
          onClick={handleClear}
          aria-label="Clear search"
        >
          ×
        </button>
      )}
    </label>
  );
}
