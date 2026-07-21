// src/components/domain/KpiCard.jsx
// One metric tile on the Dashboard. Label, value, optional icon, optional
// trend/link. Pure presentation — receives all data via props.
// Per docs/Component_Architecture.md §4 and docs/UI_Design_System.md §8.

import Card from '../ui/Card';

export default function KpiCard({
  label,
  value,
  icon: Icon,
  iconClassName = 'text-primary',
  valueClassName = '',
  footer,
  onClick,
  className = '',
}) {
  const interactive = typeof onClick === 'function';

  const content = (
    <Card
      className={`flex flex-col gap-2 ${interactive ? 'cursor-pointer hover:border-primary/40 transition-colors' : ''} ${className}`.trim()}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-base-content/70">{label}</span>
        {Icon && <Icon size={20} className={iconClassName} aria-hidden="true" />}
      </div>
      <div className={`text-3xl font-bold ${valueClassName}`.trim()}>{value}</div>
      {footer && (
        <div className="text-xs text-base-content/60">{footer}</div>
      )}
    </Card>
  );

  if (!interactive) return content;

  return (
    <button
      type="button"
      className="text-left w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
      onClick={onClick}
    >
      {content}
    </button>
  );
}
