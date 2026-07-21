// src/pages/reports/StockOutReport.jsx
// Stock-out totals over a date range. Per docs/UI_Screens.md §12.
//
// Mirrors the Stock In Report (§11) structurally — same date-range
// picker pattern, same debounce, same client-side validation, same
// 422 handling. The only differences:
//   - Endpoint: /reports/stock_out_report.php
//   - Totals: totalQuantityOut + totalRevenue (vs totalCost for stock-in)
//   - Icon: ArrowUpFromLine (out) instead of ArrowDownToLine (in)
//   - "No stock-out records in this range" empty copy.

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowUpFromLine,
  CircleAlert,
  RotateCw,
} from 'lucide-react';
import { dateRangeSchema } from '../../lib/validators';
import Card from '../../components/ui/Card';
import DataTable from '../../components/ui/DataTable';
import EmptyState from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';
import { useStockOutReport } from '../../queries/useReportQueries';
import { useDebounce } from '../../lib/useDebounce';
import { getErrorMessage } from '../../lib/errors';
import { formatCurrency, formatDate, formatQuantity } from '../../lib/format';

// URL helpers -----------------------------------------------------------------
function readRange(searchParams) {
  return {
    startDate: searchParams.get('startDate') ?? '',
    endDate: searchParams.get('endDate') ?? '',
  };
}

function buildParams(range) {
  const params = {};
  if (range.startDate) params.startDate = range.startDate;
  if (range.endDate) params.endDate = range.endDate;
  return params;
}

export default function StockOutReport() {
  const [searchParams, setSearchParams] = useSearchParams();
  const range = useMemo(() => readRange(searchParams), [searchParams]);

  const [draft, setDraft] = useState(range);
  const debouncedDraft = useDebounce(draft, 300);

  useEffect(() => {
    if (
      debouncedDraft.startDate === range.startDate &&
      debouncedDraft.endDate === range.endDate
    ) {
      return;
    }
    setSearchParams(buildParams(debouncedDraft), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedDraft.startDate, debouncedDraft.endDate]);

  const clientErrors = useMemo(() => {
    const result = dateRangeSchema.safeParse({
      startDate: draft.startDate || '',
      endDate: draft.endDate || '',
    });
    if (result.success) return {};
    const errs = {};
    for (const issue of result.error.issues) {
      const path = issue.path?.[0];
      if (path && !errs[path]) errs[path] = issue.message;
    }
    return errs;
  }, [draft.startDate, draft.endDate]);

  const canQuery = !clientErrors.startDate && !clientErrors.endDate;

  const queryRange = canQuery
    ? {
        startDate: debouncedDraft.startDate || undefined,
        endDate: debouncedDraft.endDate || undefined,
      }
    : { startDate: undefined, endDate: undefined };

  const { data, isLoading, isError, error, refetch, isFetching } =
    useStockOutReport(queryRange);

  const items = data?.items ?? [];
  const totals = data?.totals;

  const serverErrors = useMemo(() => {
    if (error?.response?.status !== 422) return {};
    return error.response.data?.errors ?? {};
  }, [error]);

  const startError = serverErrors.startDate || clientErrors.startDate || undefined;
  const endError = serverErrors.endDate || clientErrors.endDate || undefined;

  const errorBanner = isError && error?.response?.status !== 422;

  const columns = [
    {
      key: 'createdAt',
      header: 'Date',
      render: (row) => formatDate(row.createdAt ?? row.date),
    },
    {
      key: 'productName',
      header: 'Product',
      render: (row) => row.productName ?? `Product #${row.productId}`,
    },
    {
      key: 'quantity',
      header: 'Quantity',
      className: 'text-right',
      render: (row) => formatQuantity(row.quantity),
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
      key: 'note',
      header: 'Note',
      render: (row) => row.note || '—',
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="sr-only">Stock Out Report</h2>
        <div className="flex items-center gap-2">
          {isFetching && !isLoading && (
            <span className="text-xs text-base-content/60">Refreshing…</span>
          )}
        </div>
      </div>

      {errorBanner && (
        <Card className="border-error/40 bg-error/5">
          <div className="flex items-start gap-3">
            <CircleAlert size={20} className="text-error shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-error">
                Couldn't load stock-out report
              </p>
              <p className="text-sm text-base-content/70">
                {getErrorMessage(error)}
              </p>
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

      <Card className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 min-w-40">
          <Input
            type="date"
            label="Start date"
            value={draft.startDate}
            onChange={(e) =>
              setDraft((d) => ({ ...d, startDate: e.target.value }))
            }
            error={startError}
          />
        </div>
        <div className="flex-1 min-w-40">
          <Input
            type="date"
            label="End date"
            value={draft.endDate}
            onChange={(e) =>
              setDraft((d) => ({ ...d, endDate: e.target.value }))
            }
            error={endError}
          />
        </div>
      </Card>

      <DataTable
        columns={columns}
        data={items}
        isLoading={isLoading && canQuery}
        rowKey={(row) =>
          row.id ?? `${row.productId}-${row.createdAt ?? ''}`
        }
        emptyState={
          <EmptyState
            icon={ArrowUpFromLine}
            title="No stock-out records in this range"
            description="Adjust the date range or record a stock-out to see results here."
          />
        }
      />

      <Card className="flex flex-wrap items-center justify-end gap-x-8 gap-y-2 bg-base-200">
        <div className="text-sm">
          <span className="text-base-content/60 mr-2">Total quantity out:</span>
          <span className="font-semibold">
            {isLoading || !canQuery
              ? '—'
              : formatQuantity(totals?.totalQuantityOut ?? 0)}
          </span>
        </div>
        <div className="text-sm">
          <span className="text-base-content/60 mr-2">Total revenue:</span>
          <span className="font-semibold">
            {isLoading || !canQuery
              ? '—'
              : formatCurrency(totals?.totalRevenue ?? 0)}
          </span>
        </div>
      </Card>
    </div>
  );
}