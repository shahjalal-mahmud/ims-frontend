# Form Validation

**Library:** Zod schemas + React Hook Form (`@hookform/resolvers/zod`). Frontend rules mirror the backend's validation (API guide §5.4) so users get instant feedback, but the backend remains the source of truth — every `422` response is still mapped onto the form after submit (see `Error-Handling.md` §422).

General pattern:

```js
// lib/validators.js
import { z } from "zod";

export const categorySchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters"),
});
```

```jsx
// component
const form = useForm({ resolver: zodResolver(categorySchema) });
```

On submit failure with a `422`, merge backend field errors into RHF via `form.setError(field, { message })` — see `Error-Handling.md` §422 for the shared helper.

---

## 1. Login

| Field      | Frontend rule              | Error message                            |
| ---------- | -------------------------- | ---------------------------------------- |
| `username` | required, non-empty string | "Username is required"                   |
| `password` | required, min 6 chars      | "Password must be at least 6 characters" |

Backend `401` (bad credentials) is **not** a field error — show it as a form-level/toast message verbatim ("Invalid username or password"), never attach it to a specific field (the backend intentionally doesn't say which field is wrong).

```js
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
```

---

## 2. Category Form

| Field  | Frontend rule           | Error message                                              |
| ------ | ----------------------- | ---------------------------------------------------------- |
| `name` | required, max 100 chars | "Name is required" / "Name must be at most 100 characters" |

Uniqueness (case-insensitive) is **backend-only** — the frontend cannot know the full category list is race-free at submit time. On `422` with a "name already exists" style message, show it verbatim under the `name` field rather than inventing frontend copy.

```js
export const categorySchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters"),
});
```

---

## 3. Supplier Form

| Field     | Frontend rule                            | Error message                                              |
| --------- | ---------------------------------------- | ---------------------------------------------------------- |
| `name`    | required, max 150 chars                  | "Name is required" / "Name must be at most 150 characters" |
| `phone`   | optional, max 30 chars                   | "Phone must be at most 30 characters"                      |
| `email`   | optional, valid email format if provided | "Email must be a valid email"                              |
| `address` | optional, max 255 chars                  | "Address must be at most 255 characters"                   |

```js
export const supplierSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(150, "Name must be at most 150 characters"),
  phone: z
    .string()
    .max(30, "Phone must be at most 30 characters")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .email("Email must be a valid email")
    .optional()
    .or(z.literal("")),
  address: z
    .string()
    .max(255, "Address must be at most 255 characters")
    .optional()
    .or(z.literal("")),
});
```

---

## 4. Product Form

| Field           | Frontend rule                                                                           | Error message                                    |
| --------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `name`          | required, max 150 chars                                                                 | "Name is required"                               |
| `categoryId`    | required, must select a category                                                        | "Category is required"                           |
| `supplierId`    | required, must select a supplier                                                        | "Supplier is required"                           |
| `purchasePrice` | required, number ≥ 0                                                                    | "Purchase price must be a number ≥ 0"            |
| `sellingPrice`  | required, number ≥ 0                                                                    | "Selling price must be a number ≥ 0"             |
| `minStockLevel` | optional, integer ≥ 0 (defaults to 5 server-side if omitted)                            | "Minimum stock level must be a positive integer" |
| `quantity`      | **not a form field** — never rendered as editable, never included in the submit payload | —                                                |

```js
export const productSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(150, "Name must be at most 150 characters"),
  categoryId: z.coerce
    .number({ required_error: "Category is required" })
    .int()
    .positive(),
  supplierId: z.coerce
    .number({ required_error: "Supplier is required" })
    .int()
    .positive(),
  purchasePrice: z.coerce
    .number({ required_error: "Purchase price is required" })
    .min(0, "Purchase price must be ≥ 0"),
  sellingPrice: z.coerce
    .number({ required_error: "Selling price is required" })
    .min(0, "Selling price must be ≥ 0"),
  minStockLevel: z.coerce
    .number()
    .int()
    .min(0, "Minimum stock level must be a positive integer")
    .optional(),
});
```

> On edit, `PUT /products/update.php` accepts a **partial** payload — but the frontend form still validates the full schema on submit (all visible fields), then sends only the fields the form manages. Don't send `quantity` even if it appears (read-only) in the edit view.

---

## 5. Stock In

| Field           | Frontend rule                   | Error message                                              |
| --------------- | ------------------------------- | ---------------------------------------------------------- |
| `productId`     | required, must select a product | "Product is required"                                      |
| `supplierId`    | optional                        | —                                                          |
| `quantity`      | required, integer > 0           | "Quantity is required" / "Quantity must be greater than 0" |
| `purchasePrice` | optional, number ≥ 0            | "Purchase price must be a number ≥ 0"                      |
| `note`          | optional, max 255 chars         | "Note must be at most 255 characters"                      |

```js
export const stockInSchema = z.object({
  productId: z.coerce
    .number({ required_error: "Product is required" })
    .int()
    .positive(),
  supplierId: z.coerce.number().int().positive().optional(),
  quantity: z.coerce
    .number({ required_error: "Quantity is required" })
    .int()
    .positive("Quantity must be greater than 0"),
  purchasePrice: z.coerce
    .number()
    .min(0, "Purchase price must be ≥ 0")
    .optional(),
  note: z
    .string()
    .max(255, "Note must be at most 255 characters")
    .optional()
    .or(z.literal("")),
});
```

---

## 6. Stock Out

| Field          | Frontend rule                                                                                                                        | Error message                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `productId`    | required, must select a product                                                                                                      | "Product is required"                                                                                    |
| `quantity`     | required, integer > 0, **soft-capped** at the product's known current stock (client-side guard only; backend `409` is authoritative) | "Quantity is required" / "Quantity must be greater than 0" / "Only N units available" (client-side hint) |
| `sellingPrice` | optional, number ≥ 0                                                                                                                 | "Selling price must be a number ≥ 0"                                                                     |
| `note`         | optional, max 255 chars                                                                                                              | "Note must be at most 255 characters"                                                                    |

```js
export const stockOutSchema = (availableQty) =>
  z.object({
    productId: z.coerce
      .number({ required_error: "Product is required" })
      .int()
      .positive(),
    quantity: z.coerce
      .number({ required_error: "Quantity is required" })
      .int()
      .positive("Quantity must be greater than 0")
      .refine((q) => availableQty == null || q <= availableQty, {
        message: `Only ${availableQty} units available`,
      }),
    sellingPrice: z.coerce
      .number()
      .min(0, "Selling price must be ≥ 0")
      .optional(),
    note: z
      .string()
      .max(255, "Note must be at most 255 characters")
      .optional()
      .or(z.literal("")),
  });
```

The client-side max-quantity check is a UX nicety, not a security boundary — always submit and let the backend's `409 Insufficient stock` response be the final word (race conditions between two open tabs are only caught server-side).

---

## 7. Reports — Date Range (Stock In / Stock Out Report)

| Field       | Frontend rule                                                          | Error message                        |
| ----------- | ---------------------------------------------------------------------- | ------------------------------------ |
| `startDate` | optional, `YYYY-MM-DD` format if provided                              | "Start date must be a valid date"    |
| `endDate`   | optional, `YYYY-MM-DD` format; if both present, `startDate <= endDate` | "Start date must be before end date" |

```js
export const dateRangeSchema = z
  .object({
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be a valid date")
      .optional()
      .or(z.literal("")),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be a valid date")
      .optional()
      .or(z.literal("")),
  })
  .refine((v) => !v.startDate || !v.endDate || v.startDate <= v.endDate, {
    message: "Start date must be before end date",
    path: ["endDate"],
  });
```

---

## 8. Mapping backend `422` onto forms

Shared helper, used by every mutation's error handler:

```js
// lib/errors.js
export function applyServerErrors(form, errors) {
  if (!errors) return;
  Object.entries(errors).forEach(([field, message]) => {
    form.setError(field, { type: "server", message });
  });
}
```

Called from a mutation's `onError`:

```js
onError: (err) => {
  if (err.response?.status === 422) {
    applyServerErrors(form, err.response.data.errors);
  } else {
    // handled generically — see Error-Handling.md
  }
};
```

Backend messages are already user-safe (API guide §5.4) — display them verbatim rather than re-writing, except for the light "prettify" pass described there for a couple of common suffixes ("is required", "must be numeric").
