// src/components/ui/Badge.jsx
// Status tag — used for stock status (in stock / low / out) and
// category tags.
//
// Variants per docs/UI_Design_System.md §1:
//   success → badge-success
//   warning → badge-warning
//   danger  → badge-error
//   neutral → badge-neutral
//   info    → badge-info
//
// Generic: this file has zero knowledge of products or stock levels —
// the StockStatusBadge wrapper (src/components/domain/StockStatusBadge.jsx)
// decides which variant to render based on quantity vs minStockLevel.

const VARIANT_CLASSES = {
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-error',
  neutral: 'badge-neutral',
  info: 'badge-info',
};

export default function Badge({ variant = 'neutral', className = '', children, ...rest }) {
  const variantClass = VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.neutral;
  return (
    <span
      className={`badge badge-soft ${variantClass} rounded-full ${className}`.trim()}
      {...rest}
    >
      {children}
    </span>
  );
}
