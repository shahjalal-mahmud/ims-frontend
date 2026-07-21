// src/components/domain/StockInModal.jsx
// "Record stock-in" modal — reusable from both:
//   - the Stock In page (per docs/UI_Screens.md §7)
//   - a Products page row action (per docs/Component_Architecture.md §5.3)
//
// Per docs/Component_Architecture.md §5.3, the modal owns its own
// product/supplier list queries so both parents can reuse it without
// prop-drilling product data through two unrelated pages. The product
// list mutation cache stays warm because the queries already exist
// (`useProducts({ limit: 100 })` shares keys with the Products page when
// filters overlap).
//
// Form validation per docs/Form_Validation.md §5:
//   productId     — required, must select a product
//   supplierId    — optional
//   quantity      — required, integer > 0
//   purchasePrice — optional, numeric ≥ 0
//   note          — optional, max 255 chars
//
// On 422, backend field errors are merged into the form via
// applyServerErrors (docs/Form_Validation.md §8). 422 errors stay on the
// modal as inline field errors — no toast (per the 422 rule,
// docs/Error_Handling.md §4).
//
// While the mutation is pending, the whole form is disabled (UI Design
// System §10: disable via <fieldset>, not just the submit button).
//
// The modal can be opened with an optional `defaultProductId` prop:
//   - From the Products row action: pre-select the row's product and
//     keep the user in context.
//   - From the Stock In page: undefined (user picks a product manually).

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { stockInSchema } from '../../lib/validators';
import { applyServerErrors } from '../../lib/errors';
import { useProducts } from '../../queries/useProductQueries';
import { useSuppliers } from '../../queries/useSupplierQueries';

export default function StockInModal({
  open,
  mutation,                  // useCreateStockIn() instance
  onClose,
  onSuccess,                 // (response) => void — page toasts success
  onError,                   // (err) => void — page handles non-422 errors
  defaultProductId,          // optional — preset when opened from product row
}) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(stockInSchema),
    defaultValues: {
      productId: '',
      supplierId: '',
      quantity: '',
      purchasePrice: '',
      note: '',
    },
  });

  // Re-seed the form each time the modal opens. Resetting between
  // openings ensures stale values from a previous product don't leak
  // in. (e.g. opening from row A, closing, opening from row B.)
  useEffect(() => {
    if (open) {
      reset({
        productId: defaultProductId ?? '',
        supplierId: '',
        quantity: '',
        purchasePrice: '',
        note: '',
      });
    }
  }, [open, defaultProductId, reset]);

  // Product + supplier lists — owned here per docs/Component_Architecture.md
  // §5.3 ("the modal owns its own product-list query when it's a
  // self-contained modal opened from multiple places").
  //
  // We request a generous page size so users see all products in the
  // dropdown without paginating. (Stock-in is a small admin action so
  // this isn't a perf concern.)
  // Stabilize the filter object so the query key doesn't churn on
  // every render (State_Management.md §4 keeps keys stable).
  const productsQueryFilters = useMemo(() => ({ limit: 100, page: 1 }), []);
  const productsQuery = useProducts(productsQueryFilters);
  const suppliersQuery = useSuppliers();

  // Shape options for the Select component. We accept products in both
  // shapes the API might hand back: flat id/name or wrapped in
  // { id, name } objects — derived `productName` for safety.
  const productOptions = useMemo(() => {
    const items = productsQuery.data?.items ?? [];
    return items
      .map((p) => ({
        value: p.id,
        label: p.name ?? p.productName ?? `Product #${p.id}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [productsQuery.data]);

  const supplierOptions = useMemo(() => {
    const items = suppliersQuery.data ?? [];
    return items
      .map((s) => ({ value: s.id, label: s.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [suppliersQuery.data]);

  const onSubmit = (values) => {
    // Strip blanks / coerce optional numbers so the API doesn't 422 on
    // a missing-but-blank optional field. The Zod schema + .or(z.literal(""))
    // trick lets blank optionals validate; we then normalize.
    const payload = {
      productId: values.productId,
      quantity: Number(values.quantity),
    };

    if (values.supplierId !== '' && values.supplierId != null) {
      payload.supplierId = Number(values.supplierId);
    }
    if (values.purchasePrice !== '' && values.purchasePrice != null) {
      payload.purchasePrice = Number(values.purchasePrice);
    }
    if (values.note) {
      payload.note = values.note;
    }

    mutation.mutate(payload, {
      onSuccess: (response) => {
        onSuccess?.(response);
        onClose?.();
      },
      onError: (err) => {
        const status = err.response?.status;

        // 422: field-level validation from the backend. Per
        // docs/Error_Handling.md §4 — never toast field errors, always
        // map them onto the form.
        if (status === 422) {
          applyServerErrors({ setError }, err.response.data?.errors);
          return;
        }

        // 401 is handled globally. Anything else (404, 500, network) is
        // forwarded to the page via onError so it can decide whether
        // to toast, refresh dropdowns, etc.
        onError?.(err);
      },
    });
  };

  const pending = mutation.isPending;

  // Disabled while loading so the user doesn't try to submit before
  // the dropdowns are populated. (Race-free UX.)
  const productsLoading = productsQuery.isLoading;
  const suppliersLoading = suppliersQuery.isLoading;

  return (
    <Modal
      open={open}
      onClose={pending ? undefined : onClose}
      title="Record Stock In"
      pending={pending}
      closeOnBackdrop={!pending}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="stock-in-form"
            loading={pending}
          >
            Record Stock In
          </Button>
        </>
      }
    >
      <form
        id="stock-in-form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4"
      >
        <fieldset
          disabled={pending}
          className="flex flex-col gap-4 m-0 p-0 border-0"
        >
          <Select
            label="Product"
            options={productOptions}
            placeholder={
              productsLoading ? 'Loading products…' : 'Select a product…'
            }
            disabled={productsLoading}
            error={errors.productId?.message}
            registerProps={register('productId')}
          />

          <Select
            label="Supplier (optional)"
            options={supplierOptions}
            placeholder={
              suppliersLoading ? 'Loading suppliers…' : 'Select a supplier…'
            }
            disabled={suppliersLoading}
            error={errors.supplierId?.message}
            registerProps={register('supplierId')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Quantity"
              type="number"
              step="1"
              min="1"
              placeholder="e.g. 10"
              autoComplete="off"
              error={errors.quantity?.message}
              registerProps={register('quantity')}
            />
            <Input
              label="Purchase price (optional)"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              autoComplete="off"
              error={errors.purchasePrice?.message}
              registerProps={register('purchasePrice')}
            />
          </div>

          <Input
            label="Note (optional)"
            placeholder="e.g. Initial stock, Restock from supplier X…"
            autoComplete="off"
            maxLength={255}
            error={errors.note?.message}
            registerProps={register('note')}
          />
        </fieldset>
      </form>
    </Modal>
  );
}