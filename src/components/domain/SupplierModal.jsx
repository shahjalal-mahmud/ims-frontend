// src/components/domain/SupplierModal.jsx
// Create / edit form for a Supplier.
// Per docs/Component_Architecture.md §4 and docs/UI_Screens.md §4.
//
// Mirror of CategoryModal — RHF + Zod, inline 422 errors via
// applyServerErrors (docs/Form_Validation.md §8). All §422 field errors
// stay on the modal as inline errors; nothing is toasted from inside
// (per the 422 rule, docs/Error_Handling.md §4).
//
// Form fields (Form_Validation.md §3):
//   name     — required, max 150
//   phone    — optional, max 30, blank-allowed
//   email    — optional, valid email format, blank-allowed
//   address  — optional, max 255, blank-allowed
//
// The whole form is disabled via <fieldset> while the mutation is pending
// (UI Design System §10).

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { supplierSchema } from '../../lib/validators';
import { applyServerErrors } from '../../lib/errors';

export default function SupplierModal({
  open,
  mode = 'create', // 'create' | 'edit'
  initialValue,    // supplier object when editing (needs { id, name, phone, email, address })
  mutation,        // useCreateSupplier() / useUpdateSupplier() instance
  onClose,
  onSuccess,       // (response) => void — page toasts success
  onError,         // (err) => void — page handles non-422 errors
}) {
  const isEdit = mode === 'edit';

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: initialValue?.name ?? '',
      phone: initialValue?.phone ?? '',
      email: initialValue?.email ?? '',
      address: initialValue?.address ?? '',
    },
  });

  // Re-seed the form whenever a different supplier is being edited
  // (or when transitioning create → edit in the same page session).
  useEffect(() => {
    if (open) {
      reset({
        name: initialValue?.name ?? '',
        phone: initialValue?.phone ?? '',
        email: initialValue?.email ?? '',
        address: initialValue?.address ?? '',
      });
    }
  }, [open, initialValue, reset]);

  const onSubmit = (values) => {
    // Build the payload — blank optional fields are passed through as
    // empty strings; the backend accepts blanks for optional fields. (See
    // docs/Form_Validation.md §3 — `.or(z.literal(""))` keeps blanks valid.)
    const payload = {
      name: values.name,
      phone: values.phone ?? '',
      email: values.email ?? '',
      address: values.address ?? '',
    };

    const args = isEdit ? { id: initialValue.id, ...payload } : payload;

    mutation.mutate(args, {
      onSuccess: (response) => {
        onSuccess?.(response);
        onClose?.();
      },
      onError: (err) => {
        const status = err.response?.status;

        // 422: field-level validation from the backend.
        if (status === 422) {
          applyServerErrors({ setError }, err.response.data?.errors);
          return;
        }

        // 401 is handled globally. Anything else (404, 500, network) is
        // forwarded to the page via onError.
        onError?.(err);
      },
    });
  };

  const pending = mutation.isPending;

  return (
    <Modal
      open={open}
      onClose={pending ? undefined : onClose}
      title={isEdit ? 'Edit Supplier' : 'New Supplier'}
      pending={pending}
      closeOnBackdrop={!pending}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="supplier-form"
            loading={pending}
          >
            {isEdit ? 'Save changes' : 'Create'}
          </Button>
        </>
      }
    >
      <form
        id="supplier-form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4"
      >
        <fieldset
          disabled={pending}
          className="flex flex-col gap-4 m-0 p-0 border-0"
        >
          <Input
            label="Name"
            placeholder="e.g. Acme Wholesale"
            autoFocus
            autoComplete="organization"
            maxLength={150}
            error={errors.name?.message}
            registerProps={register('name')}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone (optional)"
              type="tel"
              placeholder="e.g. +1 555 123 4567"
              autoComplete="tel"
              maxLength={30}
              error={errors.phone?.message}
              registerProps={register('phone')}
            />
            <Input
              label="Email (optional)"
              type="email"
              placeholder="e.g. orders@acme.com"
              autoComplete="email"
              maxLength={255}
              error={errors.email?.message}
              registerProps={register('email')}
            />
          </div>
          <Input
            label="Address (optional)"
            placeholder="Street, city, country"
            autoComplete="street-address"
            maxLength={255}
            error={errors.address?.message}
            registerProps={register('address')}
          />
        </fieldset>
      </form>
    </Modal>
  );
}
