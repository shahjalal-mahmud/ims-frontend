// src/pages/reports/InventoryReport.jsx
// Full inventory snapshot with stock value, optionally filtered by
// category. Per docs/UI_Screens.md §9.
//
// Layout:
//   - Top: category <select> filter + "Export CSV" button
//   - DataTable: product, category, supplier, quantity, purchasePrice,
//     sellingPrice, stockValue
//   - Totals footer row rendered BELOW the table — totalQuantity and
//     totalStockValue (DataTable doesn't have a footer slot, so we
//     render a custom Card under the table for clarity).
//
// CSV export (UI Screens §9, API guide §4.8): the export is built
// client-side from the React Query `data` we already have in memory —
// no extra API request. Disabled while the table is loading or empty.
//
// Filter state lives in URL search params (State_Management.md §4) so
// the filtered view is shareable. The category <select> is populated
// from `useCategories()`.
//
// Loading → DataTable skeleton rows.
// Empty   → "No products in inventory" empty state.
// Error   → standard banner with retry.

import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CircleAlert,
  Download,
  FileBarChart2,
  RotateCw,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import EmptyState from '../../components/ui/EmptyState';
import Select from '../../components/ui/Select';
import { useInventoryReport } from '../../queries/useReportQueries';
import { useCategories } from '../../queries/useCategoryQueries';
import { getErrorMessage } from '../../lib/errors';
import { formatCurrency, formatQuantity } from '../../lib/format';

// -- URL filter helpers -------------------------------------------------------
function readCategory(searchParams) {
  return searchParams.get('categoryId') ?? '';
}

function buildParams(categoryId) {
  const params = {};
  if (categoryId) params.categoryId = categoryId;
  return params;
}

// -- CSV generation ------------------------------------------------------------
// Escapes values per RFC 4180 (quote when needed, double-quote internal quotes).
function csvCell(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildInventoryCsv(items, totals) {
  const header = [
    'Product',
    'Category',
    'Supplier',
    'Quantity',
    'Purchase Price',
    'Selling Price',
    'Stock Value',
  ];
  const rows = items.map((row) => [
    row.productName ?? '',
    row.category ?? '',
    row.supplier ?? '',
    row.quantity ?? 0,
    row.purchasePrice ?? '',
    row.sellingPrice ?? '',
    row.stockValue ?? '',
  ]);
  const totalsRow = [
    'Totals',
    '',
    '',
    totals?.totalQuantity ?? 0,
    '',
    '',
    totals?.totalStockValue ?? 0,
  ];
  const allRows = [header, ...rows, totalsRow];
  return allRows.map((cols) => cols.map(csvCell).join(',')).join('\r\n');
}

function downloadCsv(filename, csv) {
  // Prepend BOM so Excel opens UTF-8 cleanly.
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function makeCsvFilename(categoryLabel) {
  const stamp = new Date().toISOString().slice(0, 10);
  // Strip anything that would be awkward in a filename.
  const safe = categoryLabel ? categoryLabel.replace(/[^a-zA-Z0-9-_]+/g, '_') : '';
  return `inventory-report${safe ? `-${safe}` : ''}-${stamp}.csv`;
}

export default function InventoryReport() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryId = readCategory(searchParams);

  // Categories power the filter dropdown. Sort A-Z for predictable UX.
  const categoriesQuery = useCategories();
  const categoryOptions = useMemo(() => {
    const list = categoriesQuery.data ?? [];
    return [...list]
      .map((c) => ({ value: c.id, label: c.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [categoriesQuery.data]);

  const { data, isLoading, isError, error, refetch, isFetching } =
    useInventoryReport(categoryId);

  const items = data?.items ?? [];
  const totals = data?.totals;

  // CSV from already-fetched data — no extra API request (UI Screens §9).
  const [exporting, setExporting] = useState(false);
  const exportDisabled = isLoading || items.length === 0 || exporting;

  const handleExport = () => {
    if (exportDisabled) return;
    setExporting(true);
    try {
      const csv = buildInventoryCsv(items, totals);
      const selected = categoryOptions.find((o) => String(o.value) === String(categoryId));
      const filename = makeCsvFilename(selected?.label);
      downloadCsv(filename, csv);
    } finally {
      // Reset quickly so a user can re-export right away.
      setExporting(false);
    }
  };

  const columns = [
    {
      key: 'productName',
      header: 'Product',
      render: (row) => row.productName ?? `Product #${row.productId}`,
    },
    {
      key: 'category',
      header: 'Category',
      render: (row) => row.category || '—',
    },
    {
      key: 'supplier',
      header: 'Supplier',
      render: (row) => row.supplier || '—',
    },
    {
      key: 'quantity',
      header: 'Quantity',
      className: 'text-right',
      render: (row) => formatQuantity(row.quantity),
    },
    {
      key: 'purchasePrice',
      header: 'Purchase Price',
      className: 'text-right',
      render: (row) =>
        row.purchasePrice !== undefined && row.purchasePrice !== null
          ? formatCurrency(row.purchasePrice)
          : '—',
    },
    {
      key: 'sellingPrice',
      header: 'Selling Price',
      className: 'text-right',
      render: (row) =>
        row.sellingPrice !== undefined && row.sellingPrice !== null
          ? formatCurrency(row.sellingPrice)
          : '—',
    },
    {
      key: 'stockValue',
      header: 'Stock Value',
      className: 'text-right font-medium',
      render: (row) =>
        row.stockValue !== undefined && row.stockValue !== null
          ? formatCurrency(row.stockValue)
          : '—',
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="sr-only">Inventory Report</h2>
        <div className="flex items-center gap-2">
          {isFetching && !isLoading && (
            <span className="text-xs text-base-content/60">Refreshing…</span>
          )}
          <Button
            variant="secondary"
            onClick={handleExport}
            disabled={exportDisabled}
            aria-label="Export CSV"
          >
            <Download size={16} />
            Export CSV
          </Button>
        </div>
      </div>

      {isError && (
        <Card className="border-error/40 bg-error/5">
          <div className="flex items-start gap-3">
            <CircleAlert size={20} className="text-error shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-error">Couldn't load inventory report</p>
              <p className="text-sm text-base-content/70">{getErrorMessage(error)}</p>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => refetch()}
            >
              <RotateCw size={14} />
              Retry
            </button>
          </div>
        </Card>
      )}

      {/* Filter bar */}
      <Card className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 min-w-60">
          <Select
            label="Category"
            options={categoryOptions}
            placeholder="All categories"
            value={categoryId}
            onChange={(e) =>
              setSearchParams(buildParams(e.target.value), { replace: true })
            }
          />
        </div>
      </Card>

      <DataTable
        columns={columns}
        data={items}
        isLoading={isLoading}
        rowKey="productId"
        emptyState={
          categoryId ? (
            <EmptyState
              icon={FileBarChart2}
              title="No products in this category"
              description="Try clearing the filter to see all inventory."
              action={{
                label: 'Clear filter',
                onClick: () => setSearchParams({}, { replace: true }),
              }}
            />
          ) : (
            <EmptyState
              icon={FileBarChart2}
              title="No products in inventory"
              description="Add products and record stock-in to populate the inventory report."
            />
          )
        }
      />

      {/* Totals footer (custom — DataTable has no built-in footer slot).
          Mirrors the `data.totals` block from the report endpoint. */}
      <Card className="flex flex-wrap items-center justify-end gap-x-8 gap-y-2 bg-base-200">
        <div className="text-sm">
          <span className="text-base-content/60 mr-2">Total quantity:</span>
          <span className="font-semibold">
            {isLoading ? '—' : formatQuantity(totals?.totalQuantity ?? 0)}
          </span>
        </div>
        <div className="text-sm">
          <span className="text-base-content/60 mr-2">Total stock value:</span>
          <span className="font-semibold">
            {isLoading ? '—' : formatCurrency(totals?.totalStockValue ?? 0)}
          </span>
        </div>
      </Card>
    </div>
  );
}