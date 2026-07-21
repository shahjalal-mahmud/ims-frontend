// src/pages/inventory/StockInList.jsx
// Stock-in history page. Per docs/UI_Screens.md §7.
//
// Layout:
//   - Top: "Record Stock In" button + filter (product id select)
//   - DataTable: paginated stock-in records
//     (product, supplier, qty, purchasePrice, note, createdAt)
//   - Pagination footer
//   - StockInModal (opened from the top button)
//
// URL search params (State_Management.md §4) own the filter state:
//   productId, page, limit. (No debounced search here — no search field.)
//
// Loading → DataTable skeleton rows (UI_Design_System.md §12).
// Empty   → "No stock movements yet — Record a stock-in." with CTA
//           (UI_Screens.md §7 + §6.9 "stock-in / stock-out list" copy).
// Error   → error banner with retry, same shape as CategoriesList/SuppliersList.
//
// Error handling for the modal's mutations (Error_Handling.md §1 / §3 / §5):
//   - 422 → handled inside the modal as inline field errors (no toast).
//   - 404 → toast backend's verbatim message ("Product not found"); refresh
//           the product dropdown so the now-missing productId clears.
//   - 500 → toast "Couldn't record stock in. Nothing was changed."
//           verbatim (the API guide §4.6 calls for this reassurance since
//           the transaction rolls back).
//   - Network → generic toast via getErrorMessage.

import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowDownToLine,
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
import StockInModal from '../../components/domain/StockInModal';
import {
  useCreateStockIn,
  useStockInList,
} from '../../queries/useStockInQueries';
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

export default function StockInList() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => readFilters(searchParams), [searchParams]);

  // The product <select> needs ALL products so the user can filter by
  // any of them. Pull a generous page-1 list — limit 100. (If the
  // catalog grows past that later we'd add a searchable combobox,
  // out of scope for v1.) Stabilize the filter object so the query key
  // doesn't churn on every render (State_Management.md §4).
  const productsFilterQueryFilters = useMemo(() => ({ limit: 100, page: 1 }), []);
  const productsFilterQuery = useProducts(productsFilterQueryFilters);

  const stockInQueryFilters = useMemo(
    () => ({
      productId: filters.productId || undefined,
      page: filters.page,
      limit: filters.limit,
    }),
    [filters.productId, filters.page, filters.limit]
  );
  const stockInQuery = useStockInList(stockInQueryFilters);
  const createMutation = useCreateStockIn();

  // Modal state — `null` means closed. The Stock In page has no
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

  // onSuccess — toast the backend's verbatim `message` (e.g. "Stock in
  // recorded") then close. The modal itself closes the dialog on a
  // successful mutate; we don't need to close it from here. (Kept
  // minimal so the optimistic-quantity patch inside useCreateStockIn's
  // onSuccess actually runs before the user sees the toast.)
  const onModalSuccess = (response) => {
    toast.success(response?.data?.message || 'Stock in recorded');
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
  // matrix). We keep the modal open for 500/network so the user can
  // retry without losing input — only 404 forces a dropdown refresh
  // (the productId was stale).
  const onModalError = (err) => {
    const status = err?.response?.status;
    if (status === 401) return; // global interceptor

    if (status === 404) {
      // Product doesn't exist / was deleted. Per docs/UI_Screens.md §7:
      // toast verbatim, refresh product dropdown so the stale option
      // disappears.
      toast.error(
        err.response.data?.message || 'Product not found'
      );
      productsFilterQuery.refetch?.();
      return;
    }

    if (status === 500) {
      // Verbatim per docs/Error_Handling.md §5 + FRONTEND_API_INTEGRATION_GUIDE.md
      // §4.6 — the transaction rolled back, so the user is reassured
      // their data wasn't partially applied.
      toast.error("Couldn't record stock in. Nothing was changed.");
      return;
    }

    // Network / unknown — generic fallback.
    toast.error(getErrorMessage(err));
  };

  // -- Render ----------------------------------------------------------------
  const items = stockInQuery.data?.items ?? [];
  const pagination = stockInQuery.data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;

  const isLoading = stockInQuery.isLoading;
  const isError = stockInQuery.isError;
  const error = stockInQuery.error;

  // Dropdown options — derived from the products query, sorted A-Z for
  // predictable UX (backend doesn't promise an order).
  const productFilterOptions = useMemo(() => {
    const list = productsFilterQuery.data?.items ?? [];
    return [...list]
      .map((p) => ({ value: p.id, label: p.name ?? p.productName ?? `Product #${p.id}` }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [productsFilterQuery.data]);

  const columns = [
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
      render: (row) => formatQuantity(row.quantity),
    },
    {
      key: 'purchasePrice',
      header: 'Purchase Price',
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
    {
      key: 'createdAt',
      header: 'Recorded',
      render: (row) => formatDateTime(row.createdAt),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="sr-only">Stock In</h2>
        <div className="flex items-center gap-2">
          {stockInQuery.isFetching && !isLoading && (
            <span className="text-xs text-base-content/60">Refreshing…</span>
          )}
          <Button variant="primary" onClick={openModal}>
            <Plus size={16} />
            Record Stock In
          </Button>
        </div>
      </div>

      {isError && (
        <Card className="border-error/40 bg-error/5">
          <div className="flex items-start gap-3">
            <CircleAlert size={20} className="text-error shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-error">Couldn't load stock-in history</p>
              <p className="text-sm text-base-content/70">{getErrorMessage(error)}</p>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => stockInQuery.refetch?.()}
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
              title="No stock-in records match"
              description="Try clearing the filter to see all stock-in records."
              action={{ label: 'Clear filters', onClick: clearFilters }}
            />
          ) : (
            <EmptyState
              icon={ArrowDownToLine}
              title="No stock movements yet"
              description="Record your first stock-in to start tracking inventory."
              action={{ label: 'Record a stock-in', onClick: openModal }}
            />
          )
        }
      />

      <Pagination
        page={filters.page}
        totalPages={totalPages}
        onPageChange={(p) => updateFilters({ page: p })}
      />

      <StockInModal
        open={modalOpen}
        mutation={createMutation}
        onClose={closeModal}
        onSuccess={onModalSuccess}
        onError={onModalError}
      />
    </div>
  );
}