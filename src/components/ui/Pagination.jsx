// src/components/ui/Pagination.jsx
// Simple prev/next + page-number buttons.
// Per docs/Component_Architecture.md §3.
// Driven by the backend's `pagination` object — we just call onPageChange.

import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({
  page = 1,
  totalPages = 1,
  onPageChange,
  className = '',
}) {
  if (totalPages <= 1) return null;

  const goTo = (next) => {
    if (next < 1 || next > totalPages) return;
    if (next === page) return;
    onPageChange?.(next);
  };

  // Build a compact list: 1 … (page-1) page (page+1) … totalPages
  const pages = [];
  const push = (n) => pages.push(n);
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) push(i);
  } else {
    push(1);
    if (page > 4) push('…');
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) push(i);
    if (page < totalPages - 3) push('…');
    push(totalPages);
  }

  return (
    <nav
      className={`flex items-center justify-end gap-1 mt-3 ${className}`.trim()}
      aria-label="Pagination"
    >
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-square"
        onClick={() => goTo(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft size={16} />
      </button>
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} className="px-2 text-base-content/40">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => goTo(p)}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </button>
        )
      )}
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-square"
        onClick={() => goTo(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}
