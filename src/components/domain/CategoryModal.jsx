// src/components/domain/CategoryModal.jsx
// Create / edit form for a Category.
// Per docs/Component_Architecture.md §4 and docs/UI_Screens.md §3.
//
// RHF + Zod (categorySchema). On 422, backend field errors are merged into
// the form via applyServerErrors (docs/Form_Validation.md §8). 422 errors
// stay on the modal as inline field errors — no toast (per the 422 rule).
//
// Any non-422 error is forwarded to the page via `onError` so it can decide
// to close + toast, refresh the list, etc. We do NOT toast from inside the
// modal; toasts live at the page level.
//
// While the mutation is pending, the whole form is disabled (UI Design
// System §10: disable the form via <fieldset>, not just the submit
// button — keeps inputs, selects, and submit all locked consistently).

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { categorySchema } from '../../lib/validators';
import { applyServerErrors } from '../../lib/errors';

export default function CategoryModal({
  open,
  mode = 'create', // 'create' | 'edit'
  initialValue,    // category object when editing (needs { id, name })
  mutation,        // useCreateCategory() / useUpdateCategory() instance
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
    resolver: zodResolver(categorySchema),
    defaultValues: { name: initialValue?.name ?? '' },
  });

  // Re-seed the form whenever a different category is being edited
  // (or when transitioning create → edit in the same page session).
  useEffect(() => {
    if (open) {
      reset({ name: initialValue?.name ?? '' });
    }
  }, [open, initialValue, reset]);

  const onSubmit = (values) => {
    const args = isEdit
      ? { id: initialValue.id, name: values.name }
      : { name: values.name };

    mutation.mutate(args, {
      onSuccess: (response) => {
        onSuccess?.(response);
        onClose?.();
      },
      onError: (err) => {
        const status = err.response?.status;

        // 422: field-level validation from the backend (e.g. duplicate name).
        // Per docs/Error_Handling.md §4 — never toast field errors, always
        // map them onto the form.
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
      title={isEdit ? 'Edit Category' : 'New Category'}
      pending={pending}
      closeOnBackdrop={!pending}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="category-form"
            loading={pending}
          >
            {isEdit ? 'Save changes' : 'Create'}
          </Button>
        </>
      }
    >
      <form
        id="category-form"
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
            placeholder="e.g. Beverages"
            autoFocus
            autoComplete="off"
            maxLength={100}
            error={errors.name?.message}
            registerProps={register('name')}
          />
        </fieldset>
      </form>
    </Modal>
  );
}
