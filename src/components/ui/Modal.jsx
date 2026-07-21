// src/components/ui/Modal.jsx
// DaisyUI <dialog>-based modal. Traps focus, closes on Esc/backdrop.
// Per docs/Component_Architecture.md §3 and docs/UI_Design_System.md §9.
//
// `open` controls visibility. `onClose` is invoked when the user dismisses
// via Esc or backdrop click — but NOT while a mutation is in flight
// (`pending` prop), so a user can't lose their input mid-submit.

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const SIZE_CLASSES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
};

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  pending = false,
  closeOnBackdrop = true,
}) {
  const dialogRef = useRef(null);

  // Drive the native <dialog> open state.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Sync cancel (Esc / dialog::cancel) → onClose.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e) => {
      if (pending) {
        e.preventDefault();
        return;
      }
      onClose?.();
    };

    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  }, [onClose, pending]);

  // Backdrop click handling — clicking outside the dialog content closes
  // it (unless `closeOnBackdrop` is false, e.g. while a mutation is pending).
  const handleClick = (e) => {
    if (pending || !closeOnBackdrop) return;
    if (e.target === dialogRef.current) {
      onClose?.();
    }
  };

  const sizeClass = SIZE_CLASSES[size] ?? SIZE_CLASSES.md;

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      onClick={handleClick}
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div className={`modal-box bg-base-100 ${sizeClass} rounded-lg`}>
        {title && (
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 id="modal-title" className="text-lg font-medium">
              {title}
            </h3>
            <button
              type="button"
              className="btn btn-square btn-ghost btn-sm"
              onClick={onClose}
              aria-label="Close"
              disabled={pending}
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div className="py-2">{children}</div>
        {footer && (
          <div className="modal-action mt-4">{footer}</div>
        )}
      </div>
    </dialog>
  );
}
