// src/pages/inventory/SuppliersList.jsx
// CRUD for suppliers. Per docs/UI_Screens.md §4. Mirrors CategoriesList
// (the two pages share the same architecture; see docs/Frontend_Architecture.md
// §3 layered data flow).
//
// Page owns the data fetch (via useSuppliers) and the mutation handles
// (create / update / delete). Domain components (SupplierModal) receive
// the mutation objects as props so they stay presentational.
//
// Loading → DataTable skeleton.
// Error   → error banner with retry.
// Empty   → EmptyState with "Add your first supplier" CTA opening the
//           create modal.

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, CircleAlert, RotateCw, Truck } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import SupplierModal from '../../components/domain/SupplierModal';
import {
  useCreateSupplier,
  useDeleteSupplier,
  useSuppliers,
  useUpdateSupplier,
} from '../../queries/useSupplierQueries';
import { getErrorMessage } from '../../lib/errors';

export default function SuppliersList() {
  const { data, isLoading, isError, error, refetch, isFetching } =
    useSuppliers();

  const createMutation = useCreateSupplier();
  const updateMutation = useUpdateSupplier();
  const deleteMutation = useDeleteSupplier();

  // Modal state — `null` means closed. Object shape:
  //   { mode: 'create' } | { mode: 'edit', supplier }
  const [modal, setModal] = useState(null);

  // Delete confirmation state — single source of truth for which supplier
  // is queued for deletion (null = closed).
  const [deleting, setDeleting] = useState(null);

  const openCreate = () => setModal({ mode: 'create' });
  const openEdit = (supplier) => setModal({ mode: 'edit', supplier });

  const closeModal = () => setModal(null);
  const cancelDelete = () => setDeleting(null);

  const onCreateSuccess = (response) => {
    toast.success(response?.data?.message || 'Supplier created');
  };

  const onUpdateSuccess = (response) => {
    toast.success(response?.data?.message || 'Supplier updated');
  };

  const onDeleteSuccess = (response) => {
    toast.success(response?.data?.message || 'Supplier deleted');
  };

  const onMutationError = (err) => {
    const status = err?.response?.status;
    if (status === 401) return; // global interceptor handles it
    toast.error(getErrorMessage(err));
  };

  // Delete-confirm body uses the documented copy exactly: no mention of
  // 409 / blocking, since `ON DELETE SET NULL` means deletion never blocks
  // (API guide §4.4 / UI Screens §4).
  const deleteMessage = deleting
    ? `Are you sure you want to delete "${deleting.name}"? Existing products and stock-in records linked to this supplier will become unlinked.`
    : '';

  const renderRowActions = (supplier) => (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-square"
        onClick={() => openEdit(supplier)}
        aria-label={`Edit ${supplier.name}`}
      >
        <Pencil size={16} />
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-square text-error"
        onClick={() => setDeleting(supplier)}
        aria-label={`Delete ${supplier.name}`}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'phone', header: 'Phone', render: (row) => row.phone || '—' },
    { key: 'email', header: 'Email', render: (row) => row.email || '—' },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="sr-only">Suppliers</h2>
        <div className="flex items-center gap-2">
          {isFetching && !isLoading && (
            <span className="text-xs text-base-content/60">Refreshing…</span>
          )}
          <Button variant="primary" onClick={openCreate}>
            <Plus size={16} />
            Add Supplier
          </Button>
        </div>
      </div>

      {isError && (
        <Card className="border-error/40 bg-error/5">
          <div className="flex items-start gap-3">
            <CircleAlert size={20} className="text-error shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-error">Couldn't load suppliers</p>
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
            icon={Truck}
            title="No suppliers yet"
            description="Add your first supplier to start recording stock purchases."
            action={{ label: 'Add your first supplier', onClick: openCreate }}
          />
        }
      />

      {modal && (
        <SupplierModal
          open
          mode={modal.mode}
          initialValue={modal.supplier}
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
        title="Delete supplier"
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
              // No 409 case for suppliers (API guide §4.4 — ON DELETE SET
              // NULL). Just toast on any other failure and leave the
              // dialog open so the user can retry without losing context.
              onMutationError(err);
            },
          });
        }}
        onCancel={cancelDelete}
      />
    </div>
  );
}