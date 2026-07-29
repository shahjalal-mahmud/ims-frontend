// src/lib/validators.js
// Zod schemas for every form in the app.
//
// IMPORTANT: each schema here is a *mirror* of the backend's rules
// (see docs/FRONTEND_API_INTEGRATION_GUIDE.md §5.4 and the per-endpoint
// contracts). The frontend is the UX layer — fast inline feedback,
// no round-trip — but the backend is still the source of truth. A 422
// can still come back even if the frontend passed its own validation
// (e.g. a category was deleted between page load and submit, racing
// against a unique-name check). Mutations funnel any 422 through
// `applyServerErrors` (src/lib/errors.js) so backend field errors
// appear on the same form inputs.
//
// Inside each schema: there's no need to comment every `.min()` /
// `.max()` — the rules can be read at a glance. Comments here cover
// WHY the rule exists or WHY a field uses a particular Zod construct
// (e.g. `.coerce` for <select> string values, `.or(z.literal(""))` for
// blank-allowed optional fields).

import { z } from 'zod';

// Login — §1
// Username: required, non-empty.
// Password: required, min 6 chars.
// Backend 401 (bad credentials) is NOT a field error — shown verbatim.
export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// Category — §2
// name: required, max 100 chars.
// Uniqueness is backend-only — race-free at submit time. Server "name already
// exists" messages are shown verbatim under `name` after submit.
export const categorySchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters'),
});

// Supplier — §3
// name: required, max 150 chars.
// phone / email / address: optional, blank-allowed. The `.or(z.literal(""))`
// pair lets the field be either undefined OR "" without triggering errors —
// blanks are normalized to "" on the client and the backend treats blank
// optional fields the same as "not provided". Email, when non-blank, must
// pass Zod's email() format check.
export const supplierSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(150, 'Name must be at most 150 characters'),
  phone: z
    .string()
    .max(30, 'Phone must be at most 30 characters')
    .optional()
    .or(z.literal('')),
  email: z
    .string()
    .email('Email must be a valid email')
    .optional()
    .or(z.literal('')),
  address: z
    .string()
    .max(255, 'Address must be at most 255 characters')
    .optional()
    .or(z.literal('')),
});

// Product — §4
// Mirrors the backend's rules (API guide §5.4). `quantity` is intentionally
// NOT a form field here — it's server-managed via Stock In / Stock Out
// (UI Screens §6 / API guide §4.5).
//
// `categoryId` and `supplierId` are coerced to positive integers so a <select>
// string value ("3") is accepted by the schema without a manual parse step.
export const productSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(150, 'Name must be at most 150 characters'),
  categoryId: z.coerce
    .number({ required_error: 'Category is required' })
    .int()
    .positive('Category is required'),
  supplierId: z.coerce
    .number({ required_error: 'Supplier is required' })
    .int()
    .positive('Supplier is required'),
  purchasePrice: z.coerce
    .number({ required_error: 'Purchase price is required' })
    .min(0, 'Purchase price must be ≥ 0'),
  sellingPrice: z.coerce
    .number({ required_error: 'Selling price is required' })
    .min(0, 'Selling price must be ≥ 0'),
  minStockLevel: z.coerce
    .number()
    .int()
    .min(0, 'Minimum stock level must be a positive integer')
    .optional(),
});

// Stock In — §5
// Mirrors the backend's rules (API guide §4.6 / §5.4).
//   productId     — required, positive int
//   supplierId    — optional, positive int when present
//   quantity      — required, integer > 0
//   purchasePrice — optional, numeric ≥ 0
//   note          — optional, max 255 chars; blank allowed
export const stockInSchema = z.object({
  productId: z.coerce
    .number({ required_error: 'Product is required' })
    .int()
    .positive('Product is required'),
  supplierId: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .or(z.literal('')),
  quantity: z.coerce
    .number({ required_error: 'Quantity is required' })
    .int()
    .positive('Quantity must be greater than 0'),
  purchasePrice: z.coerce
    .number()
    .min(0, 'Purchase price must be ≥ 0')
    .optional()
    .or(z.literal('')),
  note: z
    .string()
    .max(255, 'Note must be at most 255 characters')
    .optional()
    .or(z.literal('')),
});

// Reports — Date Range (Stock In / Stock Out Report) — §7
// Both dates optional; YYYY-MM-DD if provided. If both are present,
// startDate must be <= endDate. The refined error is attached to
// `endDate` per the documented 422 mapping (UI Screens §11).
export const dateRangeSchema = z
  .object({
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be a valid date')
      .optional()
      .or(z.literal('')),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be a valid date')
      .optional()
      .or(z.literal('')),
  })
  .refine(
    (v) =>
      !v.startDate || !v.endDate || v.startDate <= v.endDate,
    {
      message: 'Start date must be before end date',
      path: ['endDate'],
    }
  );

// Stock Out — §6
// Mirrors the backend's rules (API guide §4.7 / §5.4). The schema is a
// factory because the soft-capped max-quantity guard is per-product
// (the available stock is known only at the moment the modal opens for
// a given product). Backend 409 ("Insufficient stock") remains the
// authoritative check — see Error_Handling.md §3.
//   productId     — required, positive int
//   quantity      — required, integer > 0, soft-capped at `availableQty`
//   sellingPrice  — optional, numeric ≥ 0
//   note          — optional, max 255 chars; blank allowed
export const stockOutSchema = (availableQty) =>
  z.object({
    productId: z.coerce
      .number({ required_error: 'Product is required' })
      .int()
      .positive('Product is required'),
    quantity: z.coerce
      .number({ required_error: 'Quantity is required' })
      .int()
      .positive('Quantity must be greater than 0')
      .refine(
        (q) => availableQty == null || q <= availableQty,
        availableQty == null
          ? { message: 'Quantity must be greater than 0' }
          : {
              message: `Only ${availableQty} units available`,
            }
      ),
    sellingPrice: z.coerce
      .number()
      .min(0, 'Selling price must be ≥ 0')
      .optional()
      .or(z.literal('')),
    note: z
      .string()
      .max(255, 'Note must be at most 255 characters')
      .optional()
      .or(z.literal('')),
  });