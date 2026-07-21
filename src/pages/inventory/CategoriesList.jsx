// src/pages/inventory/CategoriesList.jsx
// CRUD for product categories. Per docs/UI_Screens.md §3.
//
// Page owns the data fetch (via useCategories) and the mutation handles
// (create / update / delete). Domain components (CategoryModal) receive
// the mutation objects as props so they stay presentational.
//
// Loading → DataTable skeleton.
// Error   → error banner with retry.
// Empty   → EmptyState with "Add your first category" CTA opening the
//           create modal.

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, CircleAlert, RotateCw, Tags } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import CategoryModal from '../../components/domain/CategoryModal';
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '../../queries/useCategoryQueries';
import { getErrorMessage } from '../../lib/errors';
import { formatDate } from '../../lib/format';

export default function CategoriesList() {
  const { data, isLoading, isError, error, refetch, isFetching } =
    useCategories();

  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  // Modal state — `null` means closed. Object shape:
  //   { mode: 'create' } | { mode: 'edit', category }
  const [modal, setModal] = useState(null);

  // Delete confirmation state — single source of truth for which category
  // is queued for deletion (null = closed).
  const [deleting, setDeleting] = useState(null);

  // Open create modal — closes via onClose inside CategoryModal.
  const openCreate = () => setModal({ mode: 'create' });

  // Open edit modal, prefilling from the already-loaded list row
  // (UI Screens §3: no extra get.php call needed).
  const openEdit = (category) => setModal({ mode: 'edit', category });

  const closeModal = () => setModal(null);
  const cancelDelete = () => setDeleting(null);

  // Mutations wired through the modal/confirm handlers below are page-level
  // because that's where toasts and navigation live.

  const onCreateSuccess = (response) => {
    toast.success(response?.data?.message || 'Category created');
  };

  const onUpdateSuccess = (response) => {
    toast.success(response?.data?.message || 'Category updated');
  };

  const onDeleteSuccess = (response) => {
    toast.success(response?.data?.message || 'Category deleted');
  };

  const onMutationError = (err) => {
    const status = err?.response?.status;
    if (status === 401) return; // global interceptor handles it
    toast.error(getErrorMessage(err));
  };

  // Delete-confirm body uses the documented copy exactly: no mention of
  // 409 / blocking, since `ON DELETE SET NULL` means deletion never blocks
  // (UI Screens §3).
  const deleteMessage = deleting
    ? `Are you sure you want to delete "${deleting.name}"? Existing products in this category will become uncategorized.`
    : '';

  // Row actions — `Pencil` for edit, `Trash2` for delete.
  // Using `btn btn-ghost btn-sm btn-square` per UI Design System §6 (icon-only).
  const renderRowActions = (category) => (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-square"
        onClick={() => openEdit(category)}
        aria-label={`Edit ${category.name}`}
      >
        <Pencil size={16} />
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-square text-error"
        onClick={() => setDeleting(category)}
        aria-label={`Delete ${category.name}`}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );

  const columns = [
    { key: 'name', header: 'Name' },
    {
      key: 'createdAt',
      header: 'Created',
      render: (row) => formatDate(row.createdAt),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="sr-only">Categories</h2>
        <div className="flex items-center gap-2">
          {isFetching && !isLoading && (
            <span className="text-xs text-base-content/60">Refreshing…</span>
          )}
          <Button variant="primary" onClick={openCreate}>
            <Plus size={16} />
            Add Category
          </Button>
        </div>
      </div>

      {isError && (
        <Card className="border-error/40 bg-error/5">
          <div className="flex items-start gap-3">
            <CircleAlert size={20} className="text-error shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-error">Couldn't load categories</p>
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
        data={data ?? []}
        isLoading={isLoading}
        rowActions={renderRowActions}
        rowKey="id"
        emptyState={
          <EmptyState
            icon={Tags}
            title="No categories yet"
            description="Add your first category to start organizing your products."
            action={{ label: 'Add your first category', onClick: openCreate }}
          />
        }
      />

      {modal && (
        <CategoryModal
          open
          mode={modal.mode}
          initialValue={modal.category}
          mutation={modal.mode === 'edit' ? updateMutation : createMutation}
          onClose={closeModal}
          onSuccess={(response) => {
            if (modal.mode === 'edit') onUpdateSuccess(response);
            else onCreateSuccess(response);
          }}
          onError={onMutationError}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Delete category"
        message={deleteMessage}
        confirmLabel="Delete"
        danger
        pending={deleteMutation.isPending}
        onConfirm={() => {
          if (!deleting) return;
          deleteMutation.mutate(deleting.id, {
            onSuccess: (response) => {
              onDeleteSuccess(response);
              setDeleting(null);
            },
            onError: (err) => {
              // No 409 case for categories (UI Screens §3 / API guide §4.3).
              // Just toast on any other failure and leave the dialog open
              // so the user can retry without losing context.
              onMutationError(err);
            },
          });
        }}
        onCancel={cancelDelete}
      />
    </div>
  );
}
