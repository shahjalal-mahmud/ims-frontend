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