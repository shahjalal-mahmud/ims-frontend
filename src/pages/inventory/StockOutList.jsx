// src/pages/inventory/StockOutList.jsx
// Stock-out history page. Per docs/UI_Screens.md §8.
//
// Layout:
//   - Top: "Record Stock Out" button + filter (product id select)
//   - DataTable: paginated stock-out records
//     (product, quantity, sellingPrice, note, createdAt)
//   - Pagination footer
//   - StockOutModal (opened from the top button)
//
// URL search params (State_Management.md §4) own the filter state:
//   productId, page, limit. (No debounced search here — no search field.)
//
// Loading → DataTable skeleton rows (UI_Design_System.md §12).
// Empty   → "No stock movements yet — Record a stock-out." with CTA
//           (UI_Screens.md §8 + §6.9 "stock-in / stock-out list" copy).
// Error   → error banner with retry, same shape as StockInList / ProductsList.
//
// Error handling for the modal's mutations (Error_Handling.md §1 / §3 / §5):
//   - 422 → handled inside the modal as inline field errors (no toast).
//   - 404 → toast backend's verbatim message ("Product not found"); refresh
//           the product dropdown so the now-missing productId clears.
//   - 409 → "Insufficient stock: only N units available" — expected
//           business outcome, shown verbatim and the modal STAYS OPEN
//           so the user can adjust the quantity (Error_Handling.md §3).
//   - 500 → generic fallback toast ("Something went wrong. Please try
//           again."); the transaction rolls back so input is preserved.
//   - Network → generic toast via getErrorMessage.

import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowUpFromLine,
  CircleAlert,
  Package,
  Plus,
  RotateCw,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import Select from '../../components/ui/Select';
import StockOutModal from '../../components/domain/StockOutModal';
import {
  useCreateStockOut,
  useStockOutList,
} from '../../queries/useStockOutQueries';
import { useProducts } from '../../queries/useProductQueries';
import { getErrorMessage } from '../../lib/errors';
import {
  formatCurrency,
  formatDateTime,
  formatQuantity,
} from '../../lib/format';

// Default filter values — used when a param is missing.
const DEFAULTS = {
  productId: '',
  page: 1,
  limit: 20,
};

function readFilters(searchParams) {
  const page = Number(searchParams.get('page') ?? DEFAULTS.page);
  return {
    productId: searchParams.get('productId') ?? DEFAULTS.productId,
    page: Number.isFinite(page) && page >= 1 ? page : DEFAULTS.page,
    limit: Number(searchParams.get('limit') ?? DEFAULTS.limit) || DEFAULTS.limit,
  };
}

function buildParams(filters) {
  // Drop empty defaults so the URL stays clean.
  const params = {};
  if (filters.productId) params.productId = filters.productId;
  if (filters.page && filters.page !== 1) params.page = String(filters.page);
  if (filters.limit && filters.limit !== DEFAULTS.limit) {
    params.limit = String(filters.limit);
  }
  return params;
}

export default function StockOutList() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => readFilters(searchParams), [searchParams]);

  // The product <select> needs ALL products so the user can filter by
  // any of them. Pull a generous page-1 list — limit 100. (If the
  // catalog grows past that later we'd add a searchable combobox,
  // out of scope for v1.) Stabilize the filter object so the query key
  // doesn't churn on every render (State_Management.md §4).
  const productsFilterQueryFilters = useMemo(() => ({ limit: 100, page: 1 }), []);
  const productsFilterQuery = useProducts(productsFilterQueryFilters);

  const stockOutQueryFilters = useMemo(
    () => ({
      productId: filters.productId || undefined,
      page: filters.page,
      limit: filters.limit,
    }),
    [filters.productId, filters.page, filters.limit]
  );
  const stockOutQuery = useStockOutList(stockOutQueryFilters);
  const createMutation = useCreateStockOut();

  // Modal state — `null` means closed. The Stock Out page has no
  // pre-filled product row, so we always open the modal without a
  // default productId; the user picks one inside.
  const [modalOpen, setModalOpen] = useState(false);

  // -- Filter mutation helpers -------------------------------------------------
  // Always reset page to 1 when a non-page filter changes.
  const updateFilters = (patch) => {
    const next = { ...filters, ...patch };
    if ('productId' in patch) {
      next.page = 1;
    }
    setSearchParams(buildParams(next));
  };

  const clearFilters = () => setSearchParams({});

  const filtersActive = !!filters.productId;

  // -- Modal handlers ----------------------------------------------------------
  const openModal = () => setModalOpen(true);
  const closeModal = () => setModalOpen(false);

  // onSuccess — toast the backend's verbatim `message` (e.g. "Stock out
  // recorded") then close. The mutation's onSuccess already patched
  // every cached product list with newProductQuantity, so the visible
  // stock badge updates immediately (Frontend_Architecture.md §Optimistic
  // UI). We just need to toast.
  const onModalSuccess = (response) => {
    toast.success(response?.data?.message || 'Stock out recorded');
    // Reset filters to page 1 of the unfiltered list so the user
    // immediately sees their new record (most-recent-first assumed,
    // since backend lists typically order DESC by createdAt).
    if (filters.productId) {
      updateFilters({ productId: '', page: 1 });
    } else {
      // Update URL to reset page (in case we were on page 2+).
      updateFilters({ page: 1 });
    }
  };

  // 422 is handled inside the modal as inline field errors; this
  // callback fires for everything else (Error_Handling.md §1 handling
  // matrix). We keep the modal open for 409/500/network so the user
  // can retry without losing input — only 404 forces a dropdown
  // refresh (the productId was stale, UI Screens §8 + Error_Handling
  // §1 row 4).
  const onModalError = (err) => {
    const status = err?.response?.status;
    if (status === 401) return; // global interceptor

    if (status === 404) {
      // Product doesn't exist / was deleted. Per docs/UI_Screens.md §8:
      // toast verbatim, refresh product dropdown so the stale option
      // disappears.
      toast.error(err.response.data?.message || 'Product not found');
      productsFilterQuery.refetch?.();
      return;
    }

    if (status === 409) {
      // "Insufficient stock: only N units available" — expected
      // business-rule conflict (Error_Handling.md §3). Show verbatim,
      // do NOT close the modal so the user can adjust the quantity.
      toast.error(
        err.response.data?.message || 'Insufficient stock'
      );
      return;
    }

    if (status === 500) {
      // Transaction rolled back (per API guide §4.7); the user is
      // reassured their data wasn't partially applied. We use the
      // generic "Something went wrong" toast here — the "Couldn't
      // record stock out" verbatim copy from Error_Handling.md §5 was
      // written for stock-in; stock-out's docs don't pin a specific
      // 500 copy, so the generic suffices.
      toast.error(getErrorMessage(err));
      return;
    }

    // Network / unknown — generic fallback.
    toast.error(getErrorMessage(err));
  };

  // -- Render ----------------------------------------------------------------
  const items = stockOutQuery.data?.items ?? [];
  const pagination = stockOutQuery.data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;

  const isLoading = stockOutQuery.isLoading;
  const isError = stockOutQuery.isError;
  const error = stockOutQuery.error;

  // Dropdown options — derived from the products query, sorted A-Z for
  // predictable UX (backend doesn't promise an order).
  const productFilterOptions = useMemo(() => {
    const list = productsFilterQuery.data?.items ?? [];
    return [...list]
      .map((p) => ({
        value: p.id,
        label: p.name ?? p.productName ?? `Product #${p.id}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [productsFilterQuery.data]);

  const columns = [
    {
      key: 'productName',
      header: 'Product',
      render: (row) => row.productName ?? `Product #${row.productId}`,
    },
    {
      key: 'quantity',
      header: 'Quantity',
      render: (row) => formatQuantity(row.quantity),
    },
    {
      key: 'sellingPrice',
      header: 'Selling Price',
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
    {
      key: 'createdAt',
      header: 'Recorded',
      render: (row) => formatDateTime(row.createdAt),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="sr-only">Stock Out</h2>
        <div className="flex items-center gap-2">
          {stockOutQuery.isFetching && !isLoading && (
            <span className="text-xs text-base-content/60">Refreshing…</span>
          )}
          <Button variant="primary" onClick={openModal}>
            <Plus size={16} />
            Record Stock Out
          </Button>
        </div>
      </div>

      {isError && (
        <Card className="border-error/40 bg-error/5">
          <div className="flex items-start gap-3">
            <CircleAlert size={20} className="text-error shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-error">Couldn't load stock-out history</p>
              <p className="text-sm text-base-content/70">{getErrorMessage(error)}</p>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => stockOutQuery.refetch?.()}
            >
              <RotateCw size={14} />
              Retry
            </button>
          </div>
        </Card>
      )}

      {/* Filter bar (product only — no search box on this page) */}
      <Card className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 min-w-60">
          <Select
            label="Product"
            options={productFilterOptions}
            placeholder="All products"
            value={filters.productId}
            onChange={(e) => updateFilters({ productId: e.target.value })}
          />
        </div>
      </Card>

      <DataTable
        columns={columns}
        data={items}
        isLoading={isLoading}
        rowKey="id"
        emptyState={
          filtersActive ? (
            <EmptyState
              icon={Package}
              title="No stock-out records match"
              description="Try clearing the filter to see all stock-out records."
              action={{ label: 'Clear filters', onClick: clearFilters }}
            />
          ) : (
            <EmptyState
              icon={ArrowUpFromLine}
              title="No stock movements yet"
              description="Record your first stock-out to start tracking sales."
              action={{ label: 'Record a stock-out', onClick: openModal }}
            />
          )
        }
      />

      <Pagination
        page={filters.page}
        totalPages={totalPages}
        onPageChange={(p) => updateFilters({ page: p })}
      />

      <StockOutModal
        open={modalOpen}
        mutation={createMutation}
        onClose={closeModal}
        onSuccess={onModalSuccess}
        onError={onModalError}
      />
    </div>
  );
}