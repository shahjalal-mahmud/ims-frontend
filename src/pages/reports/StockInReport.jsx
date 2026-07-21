// src/pages/reports/StockInReport.jsx
// Stock-in totals over a date range. Per docs/UI_Screens.md §11.
//
// Layout:
//   - Date range picker (startDate, endDate) — both optional, debounced
//     300ms after edit (docs/FRONTEND_API_INTEGRATION_GUIDE.md §6.5
//     "report date pickers — 300ms debounce").
//   - DataTable: items
//   - Totals footer (totalQuantityIn, totalCost) — matches UI Screens §11.
//
// Filter state lives in URL search params (State_Management.md §4). The
// query key is the URL range, so a date change yields a new cache entry
// and `placeholderData: keepPreviousData` keeps the table stable across
// refetches.
//
// Validation (docs/Form_Validation.md §7 + docs/UI_Screens.md §11):
//   - Both dates optional.
//   - YYYY-MM-DD format if provided.
//   - If both present, startDate <= endDate.
//   - 422 from the backend → "startDate must be before endDate" shown
//     near the date inputs. Client-side we also enforce the same rule
//     before submitting so the user gets instant feedback without
//     waiting on the network round trip.
//
// Loading → DataTable skeleton rows.
// Empty   → "No stock-in records in this range" empty state.
// Error   → standard banner with retry.

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowDownToLine,
  CircleAlert,
  RotateCw,
} from 'lucide-react';
import { dateRangeSchema } from '../../lib/validators';
import Card from '../../components/ui/Card';
import DataTable from '../../components/ui/DataTable';
import EmptyState from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';
import { useStockInReport } from '../../queries/useReportQueries';
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

export default function StockInReport() {
  const [searchParams, setSearchParams] = useSearchParams();
  const range = useMemo(() => readRange(searchParams), [searchParams]);

  // Local "draft" mirrors the URL range; users type into the draft,
  // the draft is debounced, and the debounced values flow back into
  // the URL (and into the query key).
  const [draft, setDraft] = useState(range);
  const debouncedDraft = useDebounce(draft, 300);

  // Push the debounced draft into the URL once it settles. We don't
  // also write on every keystroke — that would spam the history stack
  // and fire a network request per character. Skip the no-op write.
  useEffect(() => {
    if (
      debouncedDraft.startDate === range.startDate &&
      debouncedDraft.endDate === range.endDate
    ) {
      return;
    }
    setSearchParams(buildParams(debouncedDraft), { replace: true });
    // We intentionally depend on the debounced values, not `range`, to
    // avoid an update loop. The URL is the source of truth on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedDraft.startDate, debouncedDraft.endDate]);

  // Client-side validation (same rules as the backend). Returns a
  // per-field error object so we can render inline messages near the
  // inputs (UI Screens §11). Empty object means valid.
  const clientErrors = useMemo(() => {
    const result = dateRangeSchema.safeParse({
      startDate: draft.startDate || '',
      endDate: draft.endDate || '',
    });
    if (result.success) return {};
    // Zod issues → keyed by field name. Surface the first issue per field.
    const errs = {};
    for (const issue of result.error.issues) {
      const path = issue.path?.[0];
      if (path && !errs[path]) errs[path] = issue.message;
    }
    return errs;
  }, [draft.startDate, draft.endDate]);

  // Don't fire the query if the client-side rule fails — that gives the
  // user instant feedback without a round trip. If the client is happy
  // but the backend still 422s (race / drift), we surface the server
  // message below the inputs.
  const canQuery =
    !clientErrors.startDate && !clientErrors.endDate;

  const queryRange = canQuery
    ? {
        startDate: debouncedDraft.startDate || undefined,
        endDate: debouncedDraft.endDate || undefined,
      }
    : { startDate: undefined, endDate: undefined };

  const { data, isLoading, isError, error, refetch, isFetching } =
    useStockInReport(queryRange);

  const items = data?.items ?? [];
  const totals = data?.totals;

  // Server-side 422 — surface errors by field (Error_Handling.md §4).
  // The error shape: { success, data, message, errors: { startDate|endDate } }.
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
      key: 'supplierName',
      header: 'Supplier',
      render: (row) => row.supplierName || '—',
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
      key: 'note',
      header: 'Note',
      render: (row) => row.note || '—',
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="sr-only">Stock In Report</h2>
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
              <p className="font-medium text-error">Couldn't load stock-in report</p>
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

      {/* Date range filter (UI Screens §11 + Form_Validation.md §7) */}
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
            icon={ArrowDownToLine}
            title="No stock-in records in this range"
            description="Adjust the date range or record a stock-in to see results here."
          />
        }
      />

      <Card className="flex flex-wrap items-center justify-end gap-x-8 gap-y-2 bg-base-200">
        <div className="text-sm">
          <span className="text-base-content/60 mr-2">Total quantity in:</span>
          <span className="font-semibold">
            {isLoading || !canQuery ? '—' : formatQuantity(totals?.totalQuantityIn ?? 0)}
          </span>
        </div>
        <div className="text-sm">
          <span className="text-base-content/60 mr-2">Total cost:</span>
          <span className="font-semibold">
            {isLoading || !canQuery ? '—' : formatCurrency(totals?.totalCost ?? 0)}
          </span>
        </div>
      </Card>
    </div>
  );
}
