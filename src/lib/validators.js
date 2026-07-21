// src/lib/validators.js
// Zod schemas for forms. See docs/Form_Validation.md.

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