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