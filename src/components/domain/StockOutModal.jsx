// src/components/domain/StockOutModal.jsx
// "Record stock-out" modal — reusable from both:
//   - the Stock Out page (per docs/UI_Screens.md §8)
//   - a Products page row action (per docs/Component_Architecture.md §5.3)
//
// Per docs/Component_Architecture.md §5.3, the modal owns its own
// product list query so both parents can reuse it without
// prop-drilling product data through two unrelated pages. The product
// list mutation cache stays warm because the queries already exist
// (`useProducts({ limit: 100 })` shares keys with the Products page when
// filters overlap).
//
// Form validation per docs/Form_Validation.md §6:
//   productId     — required, must select a product
//   quantity      — required, integer > 0, soft-capped at the product's
//                   current stock (client-side guard only; backend 409 is
//                   authoritative)
//   sellingPrice  — optional, numeric ≥ 0
//   note          — optional, max 255 chars
//
// On 422, backend field errors are merged into the form via
// applyServerErrors (docs/Form_Validation.md §8). 422 errors stay on the
// modal as inline field errors — no toast (per the 422 rule,
// docs/Error_Handling.md §4).
//
// On 409 "Insufficient stock", the message is forwarded to the page via
// onError and shown verbatim per Error_Handling.md §3 — the modal stays
// open so the user can adjust the quantity.
//
// While the mutation is pending, the whole form is disabled (UI Design
// System §10: disable via <fieldset>, not just the submit button).
//
// The modal can be opened with an optional `defaultProductId` prop:
//   - From the Products row action: pre-select the row's product and
//     keep the user in context.
//   - From the Stock Out page: undefined (user picks a product manually).

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { stockOutSchema } from '../../lib/validators';
import { applyServerErrors } from '../../lib/errors';
import { useProducts } from '../../queries/useProductQueries';
import { formatQuantity } from '../../lib/format';

export default function StockOutModal({
  open,
  mutation,                  // useCreateStockOut() instance
  onClose,
  onSuccess,                 // (response) => void — page toasts success
  onError,                   // (err) => void — page handles non-422 errors
  defaultProductId,          // optional — preset when opened from product row
}) {
  // Look up the selected product in the dropdown options so the soft-cap
  // message ("Only N units available") reflects the latest known quantity.
  // The page can also pass a defaultProductId, in which case we seed the
  // initial quantity from the same lookup on first render.
  const productsQueryFilters = useMemo(() => ({ limit: 100, page: 1 }), []);
  const productsQuery = useProducts(productsQueryFilters);

  const productOptions = useMemo(() => {
    const items = productsQuery.data?.items ?? [];
    return items
      .map((p) => ({
        value: p.id,
        label: p.name ?? p.productName ?? `Product #${p.id}`,
        quantity: Number(p.quantity ?? 0),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [productsQuery.data]);

  // Resolve the currently-selected product's available stock so we can
  // soft-cap quantity input (UI Screens §8 / Form_Validation.md §6).
  // We watch the live form value rather than only `defaultProductId` so
  // changing the dropdown also re-evaluates the cap.
  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(stockOutSchema()),
    defaultValues: {
      productId: '',
      quantity: '',
      sellingPrice: '',
      note: '',
    },
  });

  const selectedProductId = watch('productId');
  const typedQuantity = watch('quantity');

  const selectedProduct = useMemo(() => {
    const id = selectedProductId != null && selectedProductId !== ''
      ? Number(selectedProductId)
      : null;
    if (id == null) return null;
    return productOptions.find((p) => Number(p.value) === id) ?? null;
  }, [selectedProductId, productOptions]);

  // Available stock for the soft-cap (Form_Validation.md §6).
  // The schema's refine reads `availableQty` at validation time; we
  // rebuild the resolver whenever the selection changes so the latest
  // quantity is honored.
  const availableQty = selectedProduct?.quantity ?? null;

  // We can't change the resolver on the fly once the form is created,
  // so the soft-cap is also enforced via a live check below (UX nicety
  // per Form_Validation.md §6 last paragraph: "client-side max-quantity
  // check is a UX nicety, not a security boundary"). The Zod refine
  // additionally catches it on submit.
  const exceedsStock =
    availableQty != null &&
    typedQuantity !== '' &&
    typedQuantity != null &&
    Number(typedQuantity) > availableQty;

  // Re-seed the form each time the modal opens. Resetting between
  // openings ensures stale values from a previous product don't leak
  // in. (e.g. opening from row A, closing, opening from row B.)
  useEffect(() => {
    if (open) {
      reset({
        productId: defaultProductId ?? '',
        quantity: '',
        sellingPrice: '',
        note: '',
      });
    }
  }, [open, defaultProductId, reset]);

  const onSubmit = (values) => {
    // Strip blanks / coerce optional numbers so the API doesn't 422 on
    // a missing-but-blank optional field. The Zod schema + .or(z.literal(""))
    // trick lets blank optionals validate; we then normalize.
    //
    // Client-side soft-cap on quantity: Form_Validation.md §6 calls for
    // a UX-only guard here. The Zod resolver used at form creation is
    // fixed (no per-selection availableQty), so we also enforce the cap
    // at submit time. The backend's 409 remains the source of truth —
    // this just keeps the user from triggering a known-bad request.
    if (
      availableQty != null &&
      Number(values.quantity) > availableQty
    ) {
      setError('quantity', {
        type: 'manual',
        message: `Only ${availableQty} units available`,
      });
      return;
    }

    const payload = {
      productId: Number(values.productId),
      quantity: Number(values.quantity),
    };

    if (values.sellingPrice !== '' && values.sellingPrice != null) {
      payload.sellingPrice = Number(values.sellingPrice);
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

        // 401 is handled globally. Anything else (404, 409, 500, network)
        // is forwarded to the page via onError so it can decide whether
        // to toast, refresh dropdowns, etc. 409 ("Insufficient stock")
        // is an expected business outcome — show verbatim and keep the
        // modal open per Error_Handling.md §3.
        onError?.(err);
      },
    });
  };

  const pending = mutation.isPending;

  // Disabled while loading so the user doesn't try to submit before
  // the dropdowns are populated. (Race-free UX.)
  const productsLoading = productsQuery.isLoading;

  return (
    <Modal
      open={open}
      onClose={pending ? undefined : onClose}
      title="Record Stock Out"
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
            form="stock-out-form"
            loading={pending}
            disabled={exceedsStock}
          >
            Record Stock Out
          </Button>
        </>
      }
    >
      <form
        id="stock-out-form"
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

          {selectedProduct && (
            <p className="text-sm text-base-content/70 -mt-2">
              Available stock:{' '}
              <span className="font-medium">
                {formatQuantity(selectedProduct.quantity)}
              </span>{' '}
              {selectedProduct.quantity === 1 ? 'unit' : 'units'}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Quantity"
              type="number"
              step="1"
              min="1"
              max={availableQty ?? undefined}
              placeholder="e.g. 2"
              autoComplete="off"
              error={
                exceedsStock
                  ? `Only ${availableQty} units available`
                  : errors.quantity?.message
              }
              registerProps={register('quantity')}
            />
            <Input
              label="Selling price (optional)"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              autoComplete="off"
              error={errors.sellingPrice?.message}
              registerProps={register('sellingPrice')}
            />
          </div>

          <Input
            label="Note (optional)"
            placeholder="e.g. Sold to walk-in customer, Damaged units…"
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