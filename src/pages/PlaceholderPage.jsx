// src/pages/PlaceholderPage.jsx
// Shared placeholder for routes whose real implementations land in
// later milestones. Renders an EmptyState so the route is reachable and
// visually consistent with the rest of the app, but signals that the
// page isn't finished.

import EmptyState from '../components/ui/EmptyState';

export default function PlaceholderPage({ title, description }) {
  return (
    <EmptyState
      title={title || 'Coming soon'}
      description={
        description ||
        'This screen will be implemented in a later milestone.'
      }
    />
  );
}
