// src/components/ui/Skeleton.jsx
// Placeholder blocks for tables/cards while isLoading.
// Variants:
//   row   → table-row-shaped placeholder
//   card  → dashboard KPI card-sized block
//   text  → single line
// Per docs/UI_Design_System.md §12.

const VARIANT_CLASSES = {
  row: 'h-10 w-full',
  card: 'h-28 w-full',
  text: 'h-4 w-full',
  kpi: 'h-24 w-full',
};

export default function Skeleton({
  variant = 'text',
  count = 1,
  className = '',
  circle = false,
}) {
  const base = VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.text;
  const radius = circle ? 'rounded-full' : 'rounded-md';

  if (count <= 1) {
    return (
      <div
        className={`skeleton ${base} ${radius} ${className}`.trim()}
        aria-hidden="true"
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`skeleton ${base} ${radius} ${className}`.trim()}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
