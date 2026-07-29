// src/components/domain/ProductFormFields.jsx
// Shared field set for create + edit. Per docs/Component_Architecture.md §4
// and docs/UI_Screens.md §6.
//
// Fields:
//   name              required, max 150
//   categoryId        required, from existing categories
//   supplierId        required, from existing suppliers
//   purchasePrice     required, numeric ≥ 0
//   sellingPrice      required, numeric ≥ 0
//   minStockLevel     optional, integer ≥ 0 (server defaults to 5)
//   quantity          — NOT a form field. On edit, rendered as a read-only
//                       label so the user can see the current quantity
//                       without being able to edit it (quantity is server
//                       managed through Stock In / Stock Out).
//
// The component accepts the full RHF `register` mapping and the current
// `errors` object. Category/Supplier lists are passed in as `options`
// shaped `{ id, name }` — the parent fetches them via useCategories /
// useSuppliers and is responsible for the loading/empty states.

import { useMemo } from 'react';
import Input from '../ui/Input';
import Select from '../ui/Select';

export default function ProductFormFields({
  register,
  errors,
  categories = [],
  suppliers = [],
  mode = 'create', // 'create' | 'edit'
  quantity,        // shown read-only when editing
}) {
  // Memoize the option lists so referential equality is stable across
  // re-renders. The Select component reads from these on every render
  // to build its <option> children — recreating the array each render
  // would still work but is wasteful and makes React diff a fresh key
  // set every time.
  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.id, label: c.name })),
    [categories]
  );
  const supplierOptions = useMemo(
    () => suppliers.map((s) => ({ value: s.id, label: s.name })),
    [suppliers]
  );

  return (
    <div className="flex flex-col gap-4">
      <Input
        label="Name"
        placeholder="e.g. Cola 330ml"
        autoFocus
        autoComplete="off"
        maxLength={150}
        error={errors.name?.message}
        registerProps={register('name')}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Category"
          options={categoryOptions}
          placeholder="Select a category…"
          error={errors.categoryId?.message}
          registerProps={register('categoryId')}
        />
        <Select
          label="Supplier"
          options={supplierOptions}
          placeholder="Select a supplier…"
          error={errors.supplierId?.message}
          registerProps={register('supplierId')}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Purchase price"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          error={errors.purchasePrice?.message}
          registerProps={register('purchasePrice')}
        />
        <Input
          label="Selling price"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          error={errors.sellingPrice?.message}
          registerProps={register('sellingPrice')}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
        <Input
          label="Minimum stock level (optional)"
          type="number"
          step="1"
          min="0"
          placeholder="5"
          error={errors.minStockLevel?.message}
          registerProps={register('minStockLevel')}
        />

        {/* Read-only quantity — edit mode only. New products start at 0
            and there's no editable quantity field on create. (docs/UI_Screens.md
            §6 + docs/FRONTEND_API_INTEGRATION_GUIDE.md §4.5) */}
        {mode === 'edit' && quantity !== undefined && quantity !== null && (
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Current quantity</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full bg-base-200 cursor-not-allowed"
              value={quantity}
              readOnly
              disabled
              aria-readonly="true"
              tabIndex={-1}
            />
            <span className="label-text-alt text-base-content/60 mt-1">
              Quantity is managed through Stock In / Stock Out.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}