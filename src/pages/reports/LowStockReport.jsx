// src/pages/reports/LowStockReport.jsx
// Low Stock Report page. Per docs/UI_Screens.md §10.
//
// Renders products at or below their `minStockLevel`. Read-only.
//
// Layout:
//   - DataTable (product, quantity, minStockLevel, "Order N more" hint)
//   - Loading → skeleton rows (UI_Design_System.md §12).
//   - Empty   → HAPPY-PATH empty state — "All products are above their
//               minimum stock level." Calm copy, NOT alarming (UI Screens
//               §10 + API guide §6.9). Uses the success badge color.
//   - Error   → standard banner with retry.
//
// The same query backs the Dashboard low-stock widget (Milestone 8 exit
// criteria) — `useLowStockReport` is the single source of truth for the
// data shape. Both consumers receive the same array of { productId,
// productName, quantity, minStockLevel, shortBy }.
//
// Per UI Screens §10 the page is read-only — no row actions, no edit
// entry points on this screen.

import { CircleAlert, Package, RotateCw, TriangleAlert } from 'lucide-react';
import Card from '../../components/ui/Card';
import DataTable from '../../components/ui/DataTable';
import EmptyState from '../../components/ui/EmptyState';
import { useLowStockReport } from '../../queries/useReportQueries';
import { getErrorMessage } from '../../lib/errors';
import { formatQuantity } from '../../lib/format';

export default function LowStockReport() {
  const { data, isLoading, isError, error, refetch, isFetching } =
    useLowStockReport();

  const items = data ?? [];

  const columns = [
    {
      key: 'productName',
      header: 'Product',
      render: (row) => row.productName ?? `Product #${row.productId}`,
    },
    {
      key: 'quantity',
      header: 'On hand',
      render: (row) => formatQuantity(row.quantity),
    },
    {
      key: 'minStockLevel',
      header: 'Min stock',
      render: (row) => formatQuantity(row.minStockLevel),
    },
    {
      key: 'shortBy',
      header: 'Short by',
      render: (row) => {
        // Prefer the server-computed `shortBy`; fall back to client math.
        const short =
          row.shortBy ?? Math.max(0, Number(row.minStockLevel ?? 0) - Number(row.quantity ?? 0));
        return (
          <span className="inline-flex items-center gap-1 text-warning font-medium">
            <TriangleAlert size={14} aria-hidden="true" />
            Order {formatQuantity(short)} more
          </span>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="sr-only">Low Stock Report</h2>
        <div className="flex items-center gap-2">
          {isFetching && !isLoading && (
            <span className="text-xs text-base-content/60">Refreshing…</span>
          )}
        </div>
      </div>

      {isError && (
        <Card className="border-error/40 bg-error/5">
          <div className="flex items-start gap-3">
            <CircleAlert size={20} className="text-error shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-error">Couldn't load low-stock report</p>
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

      <DataTable
        columns={columns}
        data={items}
        isLoading={isLoading}
        rowKey="productId"
        emptyState={
          // UI Screens §10: "✅ Happy path — All products are above their
          // minimum stock level." Calm, success-toned — NOT alarming.
          <EmptyState
            icon={Package}
            title="All products are above their minimum stock level"
            description="Nothing needs reordering right now."
            className="border-success/40"
          />
        }
      />
    </div>
  );
}