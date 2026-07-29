// src/components/ui/EmptyState.jsx
// Used by every list screen — copy varies per page (see
// docs/UI_Screens.md for the per-page wording).
//
// Generic: pass `title`, `description`, optional `icon` (defaults to
// the Inbox icon), and an optional CTA via `action={{ label, onClick }}`.
// Pages pick the icon + copy that match their domain (Packages for
// products, Tags for categories, etc.) — but this file never names a
// specific resource.

import { Inbox } from 'lucide-react';
import Card from './Card';

export default function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
  className = '',
}) {
  return (
    <Card className={`flex flex-col items-center text-center gap-2 py-10 ${className}`.trim()}>
      <Icon size={36} className="text-base-content/40" aria-hidden="true" />
      <h3 className="text-lg font-medium">{title}</h3>
      {description && (
        <p className="text-sm text-base-content/60 max-w-sm">{description}</p>
      )}
      {action && (
        <button
          type="button"
          className="btn btn-primary btn-sm mt-2"
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
    </Card>
  );
}
