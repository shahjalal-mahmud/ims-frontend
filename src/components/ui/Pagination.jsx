// src/components/ui/Pagination.jsx
// Simple prev/next + page-number buttons.
//
// Generic: this file knows nothing about products or stock-out
// records. It just renders the pagination controls and calls
// `onPageChange(nextPage)` when the user clicks. The page hands it
// the current `page` and the `totalPages` it got from the backend's
// `pagination` object — that's the whole API.
//
// On the layout side: it builds a compact list `1 … (page-1) page
// (page+1) … totalPages` so the controls stay narrow even when
// `totalPages` is large. Returns null when there's only one page —
// no point rendering controls for a single page.

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

  // Build the compact page list. If there are 7 or fewer pages, show
  // every page button. Otherwise show 1 … neighbors … last, with the
  // current page and its neighbors in the middle.
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