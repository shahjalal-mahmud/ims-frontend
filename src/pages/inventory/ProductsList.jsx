// src/pages/inventory/ProductsList.jsx
// Searchable, filterable, paginated Products list. The busiest screen in
// the app. Per docs/UI_Screens.md §5.
//
// URL search params are the single source of truth for filters/pagination
// (State_Management.md §4): search, categoryId, supplierId, lowStockOnly,
// page, limit. The debounced search writes the URL after 250ms of idle
// typing so we don't spam the network or the history stack (per the
// FRONTEND_API_INTEGRATION_GUIDE.md §6.5 debounce guidance).
//
// Two empty states — "no products at all" vs "no products match filters"
// (UI Screens §5). Filters drive the list endpoint via useProducts() with
// placeholderData: keepPreviousData so changing page/filter doesn't blank
// the table (State_Management.md §1).
//
// Delete on the list — 409 verbatim message ("Cannot delete product with
// existing stock history"), 404 → refresh the list (UI Screens §5 +
// Error_Handling.md §3).

import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Plus,
  Pencil,
  Trash2,
  CircleAlert,
  RotateCw,
  Package,
  Search,
  TriangleAlert,
  ArrowDownToLine,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Pagination from '../../components/ui/Pagination';
import SearchBar from '../../components/ui/SearchBar';
import Select from '../../components/ui/Select';
import StockStatusBadge from '../../components/domain/StockStatusBadge';
import StockInModal from '../../components/domain/StockInModal';
import {
  useCategories,
} from '../../queries/useCategoryQueries';
import {
  useSuppliers,
} from '../../queries/useSupplierQueries';
import {
  useDeleteProduct,
  useProducts,
} from '../../queries/useProductQueries';
import { useCreateStockIn } from '../../queries/useStockInQueries';
import { useDebounce } from '../../lib/useDebounce';
import { getErrorMessage } from '../../lib/errors';
import { formatCurrency } from '../../lib/format';

// Default filter values — used when a param is missing.
const DEFAULTS = {
  search: '',
  categoryId: '',
  supplierId: '',
  lowStockOnly: false,
  page: 1,
  limit: 20,
};

function readFilters(searchParams) {
  const page = Number(searchParams.get('page') ?? DEFAULTS.page);
  return {
    search: searchParams.get('search') ?? DEFAULTS.search,
    categoryId: searchParams.get('categoryId') ?? DEFAULTS.categoryId,
    supplierId: searchParams.get('supplierId') ?? DEFAULTS.supplierId,
    lowStockOnly: searchParams.get('lowStockOnly') === 'true',
    page: Number.isFinite(page) && page >= 1 ? page : DEFAULTS.page,
    limit: Number(searchParams.get('limit') ?? DEFAULTS.limit) || DEFAULTS.limit,
  };
}

function buildParams(filters) {
  // Drop empty defaults so the URL stays clean.
  const params = {};
  if (filters.search) params.search = filters.search;
  if (filters.categoryId) params.categoryId = filters.categoryId;
  if (filters.supplierId) params.supplierId = filters.supplierId;
  if (filters.lowStockOnly) params.lowStockOnly = 'true';
  if (filters.page && filters.page !== 1) params.page = String(filters.page);
  if (filters.limit && filters.limit !== DEFAULTS.limit) {
    params.limit = String(filters.limit);
  }
  return params;
}

// `lowStockOnly` is sent as the string "true"/"false" per the API guide §4.5.
function filtersToQuery(filters) {
  return {
    ...filters,
    lowStockOnly: filters.lowStockOnly ? 'true' : 'false',
  };
}

export default function ProductsList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => readFilters(searchParams), [searchParams]);
  const debouncedSearch = useDebounce(filters.search, 250);

  // The query uses the DEBOUNCED search so typing doesn't fire a request
  // per keystroke. Other filters are applied immediately.
  const queryFilters = useMemo(
    () => filtersToQuery({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch]
  );

  const productsQuery = useProducts(queryFilters);
  const categoriesQuery = useCategories();
  const suppliersQuery = useSuppliers();
  const deleteMutation = useDeleteProduct();
  const createStockInMutation = useCreateStockIn();

  // Local delete-confirmation state — `null` = closed.
  const [deleting, setDeleting] = useState(null);

  // Stock-in modal state — `null` means closed; an object opens the
  // modal pre-selected to that product (per docs/UI_Screens.md §5 row
  // action "Record Stock In": opened inline without leaving the list).
  const [stockInFor, setStockInFor] = useState(null);

  // -- Filter mutation helpers -------------------------------------------------
  // Always reset page to 1 when a non-page filter changes (State_Management.md §4).
  const updateFilters = (patch) => {
    const next = { ...filters, ...patch };
    // When changing search / category / supplier / lowStockOnly, drop page.
    if (
      'search' in patch ||
      'categoryId' in patch ||
      'supplierId' in patch ||
      'lowStockOnly' in patch
    ) {
      next.page = 1;
    }
    setSearchParams(buildParams(next));
  };

  const clearFilters = () => {
    setSearchParams({});
  };

  // -- Handlers --------------------------------------------------------------
  const handleDelete = () => {
    if (!deleting) return;
    deleteMutation.mutate(deleting.id, {
      onSuccess: (response) => {
        toast.success(response?.data?.message || 'Product deleted');
        setDeleting(null);
      },
      onError: (err) => {
        const status = err?.response?.status;
        if (status === 409) {
          // Verbatim per UI Screens §5 / API guide §4.5 / Error_Handling.md §3.
          toast.error(
            err.response.data?.message ||
              'Cannot delete product with existing stock history'
          );
          return;
        }
        if (status === 404) {
          toast.error('Product not found');
          // Per §4.5: refresh the list.
          productsQuery.refetch?.();
          setDeleting(null);
          return;
        }
        if (status === 401) return; // global interceptor
        toast.error(getErrorMessage(err));
      },
    });
  };

  // Stock-in modal handlers (row-action entry point). The success
  // optimistic-quantity patch inside useCreateStockIn updates the
  // visible row's Stock badge immediately; invalidation refetches
  // pick up any server-side drift on the next render / focus.
  const closeStockInModal = () => setStockInFor(null);

  const onStockInSuccess = (response) => {
    toast.success(response?.data?.message || 'Stock in recorded');
    // The mutation's onSuccess already patched every cached product
    // list with newProductQuantity; no extra work needed here beyond
    // the toast.
  };

  const onStockInError = (err) => {
    const status = err?.response?.status;
    if (status === 401) return; // global interceptor

    if (status === 404) {
      // The product was deleted while the modal was open; close the
      // modal and refresh the products list so the dead row disappears
      // (docs/UI_Screens.md §7 + Error_Handling.md §1 row 4).
      toast.error(err.response.data?.message || 'Product not found');
      productsQuery.refetch?.();
      setStockInFor(null);
      return;
    }

    if (status === 500) {
      // Verbatim per docs/Error_Handling.md §5 + API guide §4.6 —
      // transaction rolled back, so we reassure the user nothing was
      // partially applied.
      toast.error("Couldn't record stock in. Nothing was changed.");
      return;
    }

    // Network / unknown — generic fallback (modal stays open).
    toast.error(getErrorMessage(err));
  };

  // -- Render ----------------------------------------------------------------
  const items = productsQuery.data?.items ?? [];
  const pagination = productsQuery.data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;

  const isLoading = productsQuery.isLoading;
  const isError = productsQuery.isError;
  const error = productsQuery.error;

  // Are any non-default filters active? Used for the "no products match
  // filters" empty state (vs the "no products at all" one).
  const filtersActive =
    !!filters.search ||
    !!filters.categoryId ||
    !!filters.supplierId ||
    filters.lowStockOnly;

  const renderRowActions = (product) => (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-square"
        onClick={() => navigate(`/inventory/products/${product.id}/edit`)}
        aria-label={`Edit ${product.name}`}
      >
        <Pencil size={16} />
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-square text-success"
        onClick={() => setStockInFor(product)}
        aria-label={`Record stock in for ${product.name}`}
      >
        <ArrowDownToLine size={16} />
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-square text-error"
        onClick={() => setDeleting(product)}
        aria-label={`Delete ${product.name}`}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => (
        <button
          type="button"
          className="font-medium text-left hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          onClick={() => navigate(`/inventory/products/${row.id}/edit`)}
        >
          {row.name}
        </button>
      ),
    },
    {
      key: 'categoryName',
      header: 'Category',
      render: (row) => row.categoryName ?? row.category?.name ?? '—',
    },
    {
      key: 'supplierName',
      header: 'Supplier',
      render: (row) => row.supplierName ?? row.supplier?.name ?? '—',
    },
    {
      key: 'sellingPrice',
      header: 'Price',
      render: (row) =>
        row.sellingPrice !== undefined && row.sellingPrice !== null
          ? formatCurrency(row.sellingPrice)
          : '—',
    },
    {
      key: 'quantity',
      header: 'Stock',
      render: (row) => (
        <StockStatusBadge
          quantity={row.quantity}
          minStockLevel={row.minStockLevel}
        />
      ),
    },
  ];

  // Dropdown options — derived from queries.
  const categoryOptions = useMemo(
    () => (categoriesQuery.data ?? []).map((c) => ({ value: c.id, label: c.name })),
    [categoriesQuery.data]
  );
  const supplierOptions = useMemo(
    () => (suppliersQuery.data ?? []).map((s) => ({ value: s.id, label: s.name })),
    [suppliersQuery.data]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="sr-only">Products</h2>
        <div className="flex items-center gap-2">
          {productsQuery.isFetching && !isLoading && (
            <span className="text-xs text-base-content/60">Refreshing…</span>
          )}
          <Button variant="primary" onClick={() => navigate('/inventory/products/new')}>
            <Plus size={16} />
            Add Product
          </Button>
        </div>
      </div>

      {isError && (
        <Card className="border-error/40 bg-error/5">
          <div className="flex items-start gap-3">
            <CircleAlert size={20} className="text-error shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-error">Couldn't load products</p>
              <p className="text-sm text-base-content/70">{getErrorMessage(error)}</p>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => productsQuery.refetch?.()}
            >
              <RotateCw size={14} />
              Retry
            </button>
          </div>
        </Card>
      )}

      {/* Filter bar */}
      <Card className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex-1 min-w-60">
          <SearchBar
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            placeholder="Search by name…"
          />
        </div>
        <div className="w-full sm:w-56">
          <Select
            label="Category"
            options={categoryOptions}
            placeholder="All categories"
            value={filters.categoryId}
            onChange={(e) => updateFilters({ categoryId: e.target.value })}
          />
        </div>
        <div className="w-full sm:w-56">
          <Select
            label="Supplier"
            options={supplierOptions}
            placeholder="All suppliers"
            value={filters.supplierId}
            onChange={(e) => updateFilters({ supplierId: e.target.value })}
          />
        </div>
        <label className="form-control cursor-pointer">
          <span className="label-text mb-1">Low stock only</span>
          <span className="flex items-center gap-2 h-10">
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={filters.lowStockOnly}
              onChange={(e) => updateFilters({ lowStockOnly: e.target.checked })}
            />
            <TriangleAlert
              size={16}
              className={filters.lowStockOnly ? 'text-warning' : 'text-base-content/40'}
            />
          </span>
        </label>
      </Card>

      <DataTable
        columns={columns}
        data={items}
        isLoading={isLoading}
        rowActions={renderRowActions}
        rowKey="id"
        emptyState={
          filtersActive ? (
            <EmptyState
              icon={Search}
              title="No products match your filters"
              description="Try clearing the filters to see all products."
              action={{ label: 'Clear filters', onClick: clearFilters }}
            />
          ) : (
            <EmptyState
              icon={Package}
              title="No products yet"
              description="Add your first product to start managing inventory."
              action={{
                label: 'Add your first product',
                onClick: () => navigate('/inventory/products/new'),
              }}
            />
          )
        }
      />

      <Pagination
        page={filters.page}
        totalPages={totalPages}
        onPageChange={(p) => updateFilters({ page: p })}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Delete product"
        message={
          deleting
            ? `Are you sure you want to delete "${deleting.name}"? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        danger
        pending={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />

      {stockInFor && (
        <StockInModal
          open
          mutation={createStockInMutation}
          defaultProductId={stockInFor.id}
          onClose={closeStockInModal}
          onSuccess={onStockInSuccess}
          onError={onStockInError}
        />
      )}
    </div>
  );
}
