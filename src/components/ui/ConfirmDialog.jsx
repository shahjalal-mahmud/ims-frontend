// src/components/ui/ConfirmDialog.jsx
// Thin wrapper over Modal for delete confirmations.
//
// Generic by construction — it never names a specific resource. Pass
// a `title`, `message`, `confirmLabel`, the `danger` flag for delete
// style, and the `pending` mutation state. Used by every list page
// that needs a delete confirmation step.
//
// Per docs/Component_Architecture.md §3.

import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  pending = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal
      open={open}
      onClose={pending ? undefined : onCancel}
      title={title}
      pending={pending}
      closeOnBackdrop={!pending}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={pending}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-base-content/80">{message}</p>
    </Modal>
  );
}
