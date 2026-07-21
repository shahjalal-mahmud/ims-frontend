// src/components/ui/Loader.jsx
// Full-page or inline spinner.
// Per docs/UI_Design_System.md §12.

export default function Loader({ size = 'md', inline = false, className = '' }) {
  // DaisyUI loading sizes: loading-xs, loading-sm, loading-md, loading-lg
  const sizeClass =
    size === 'sm' ? 'loading-sm' :
    size === 'lg' ? 'loading-lg' :
    size === 'xl' ? 'loading-xl' : 'loading-md';

  if (inline) {
    return (
      <span
        className={`loading loading-spinner ${sizeClass} text-primary ${className}`.trim()}
        role="status"
        aria-label="Loading"
      />
    );
  }

  return (
    <div className={`flex items-center justify-center p-6 ${className}`.trim()}>
      <span
        className={`loading loading-spinner ${sizeClass} text-primary`}
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
