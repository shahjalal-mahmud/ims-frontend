// src/lib/format.js
// Shared presentation helpers — currency, date, quantity formatters.
// See docs/Component_Architecture.md for where these are consumed.
//
// Designed for displaying data, not for parse-coercion: anything that
// needs to parse a string into a number should do so at the edge
// (Zod schema / form input) so this file stays free of try/catch and
// stays trivially testable.
//
// All formatters guard against null / undefined / NaN — empty or
// malformed input degrades to a sensible default ('0' or empty
// string) rather than throwing, so a missing field on a row never
// crashes the table.

const numberFmt = new Intl.NumberFormat('en-US');
const currencyFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

/** Format an integer-style quantity (no decimals, thousands separators). */
export function formatQuantity(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '0';
  }
  return numberFmt.format(Number(value));
}

/** Format a monetary value, defaulting to USD. Returns "$1,234.56". */
export function formatCurrency(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return currencyFmt.format(0);
  return currencyFmt.format(n);
}

/** Format a date-only value (YYYY-MM-DD or ISO string). Returns "Jul 21, 2026". */
export function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Format a date+time. Returns "Jul 21, 2026, 14:05". */
export function formatDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Compact relative time, e.g. "5m ago", "3h ago", "2d ago". */
export function formatRelativeTime(value) {
  if (!value) return '';
  const d = new Date(value).getTime();
  if (Number.isNaN(d)) return '';
  const diffMs = Date.now() - d;
  if (diffMs < 0) return 'just now';

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(days / 365);
  return `${years}y ago`;
}
