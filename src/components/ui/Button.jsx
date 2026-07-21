// src/components/ui/Button.jsx
// Single source for every "Save" / "Delete" / "Cancel" button in the app.
// Per docs/Component_Architecture.md §3 and docs/UI_Design_System.md §6.
//
// Variants:
//   primary   → btn-primary      (Save, Submit, Add)
//   secondary → btn-outline      (Cancel)
//   ghost     → btn-ghost        (subtle inline actions)
//   danger    → btn-error        (Delete confirm)
//   icon      → btn-square btn-ghost btn-sm (row actions)
//
// `loading` shows DaisyUI's loading spinner and disables the button.
// Never combines two loading indicators (UI Design System rule).

const VARIANT_CLASSES = {
  primary: 'btn-primary',
  secondary: 'btn-outline',
  ghost: 'btn-ghost',
  danger: 'btn-error',
  icon: 'btn-square btn-ghost btn-sm',
};

export default function Button({
  variant = 'primary',
  type = 'button',
  loading = false,
  disabled = false,
  className = '',
  children,
  ...rest
}) {
  const base = variant === 'icon' ? 'btn' : 'btn';
  const variantClass = VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.primary;
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      className={`${base} ${variantClass} ${className}`.trim()}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <>
          <span className="loading loading-spinner loading-sm" />
          {variant !== 'icon' && <span>Working…</span>}
        </>
      ) : (
        children
      )}
    </button>
  );
}
