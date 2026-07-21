# UI Design System

Decide these once, before building screens, so components come out consistent instead of drifting page to page. Implemented with Tailwind CSS + DaisyUI; DaisyUI provides the component primitives, Tailwind config provides the tokens below.

---

## 1. Colors

Use DaisyUI's semantic color roles rather than raw hex values in components — this is what makes the light/dark theme toggle (`ThemeContext`, see `State-Management.md`) work for free.

| Role               | Usage                                                   | DaisyUI class prefix            |
| ------------------ | ------------------------------------------------------- | ------------------------------- |
| `primary`          | Primary actions (Save, Add, Login submit)               | `btn-primary`, `text-primary`   |
| `secondary`        | Secondary actions (Cancel button outline, filters)      | `btn-secondary`                 |
| `accent`           | Sparingly — highlights, active nav item                 | `text-accent`                   |
| `neutral`          | Sidebar/topbar backgrounds, default text                | `bg-neutral`                    |
| `success`          | Success toasts, "in stock" badge, 2xx confirmations     | `badge-success`, `text-success` |
| `warning`          | Low-stock badge, non-blocking validation hints          | `badge-warning`                 |
| `error`            | Error toasts, out-of-stock badge, delete/danger buttons | `btn-error`, `badge-error`      |
| `info`             | Neutral informational banners                           | `alert-info`                    |
| `base-100/200/300` | Page/card/border backgrounds (light↔dark aware)         | `bg-base-100`, etc.             |

Two DaisyUI themes configured in `tailwind.config.js`: a light theme and a dark theme, toggled via `data-theme` on `<html>` (see `State-Management.md` §`ThemeContext`). Pick DaisyUI's built-in `light`/`dark` themes as a starting point, or a custom pair — but lock the palette before building pages so `Badge`/`Button` variants map onto real theme colors, not one-off hex codes.

---

## 2. Typography

| Token           | Tailwind class                 | Usage                                  |
| --------------- | ------------------------------ | -------------------------------------- |
| Page title      | `text-2xl font-semibold`       | `Topbar` page heading, per screen      |
| Section heading | `text-lg font-medium`          | Card headers, modal titles             |
| Body            | `text-sm` / `text-base`        | Table cells, form labels, general copy |
| Muted/helper    | `text-sm text-base-content/60` | Field hints, empty-state descriptions  |
| Numeric/KPI     | `text-3xl font-bold`           | Dashboard KPI values                   |

Font: system UI stack (Tailwind default) unless a brand font is specified — don't introduce a webfont without a reason, it's one more network dependency for an internal tool.

---

## 3. Spacing

Stick to Tailwind's default scale — no custom spacing tokens needed for an app this size.

| Context                | Spacing                                                                                |
| ---------------------- | -------------------------------------------------------------------------------------- |
| Page container padding | `p-4 md:p-6`                                                                           |
| Card padding           | `p-4` or `p-6` for larger feature cards                                                |
| Form field gap         | `gap-4` (vertical stack)                                                               |
| Table cell padding     | `px-4 py-3` (DaisyUI `table` default is close to this — don't override unless cramped) |
| Button group gap       | `gap-2`                                                                                |

---

## 4. Border Radius

| Element         | Radius                         |
| --------------- | ------------------------------ |
| Buttons, inputs | `rounded-md` (DaisyUI default) |
| Cards, modals   | `rounded-lg`                   |
| Badges          | `rounded-full`                 |

Keep one radius scale app-wide — don't mix `rounded-sm` buttons with `rounded-xl` cards.

---

## 5. Icons

**Library:** Lucide React. Standard size `16` (inline, buttons) or `20` (nav, section headers). Import per-icon (`import { Plus, Trash2 } from 'lucide-react'`) — never the whole icon set.

| Use               | Icon                |
| ----------------- | ------------------- |
| Add / Create      | `Plus`              |
| Edit              | `Pencil`            |
| Delete            | `Trash2`            |
| Search            | `Search`            |
| Filter            | `SlidersHorizontal` |
| Low stock warning | `TriangleAlert`     |
| Stock in          | `ArrowDownToLine`   |
| Stock out         | `ArrowUpFromLine`   |
| Dashboard         | `LayoutDashboard`   |
| Categories        | `Tags`              |
| Suppliers         | `Truck`             |
| Reports           | `FileBarChart2`     |
| Logout            | `LogOut`            |
| Theme toggle      | `Sun` / `Moon`      |
| Close (modal)     | `X`                 |
| Success toast     | `CircleCheck`       |
| Error toast       | `CircleX`           |

---

## 6. Buttons

Built on DaisyUI `btn` classes, wrapped by the shared `Button` component (`Component-Architecture.md` §3).

| Variant         | Class                             | Usage                                     |
| --------------- | --------------------------------- | ----------------------------------------- |
| Primary         | `btn btn-primary`                 | Save, Submit, Add                         |
| Secondary/Ghost | `btn btn-ghost` / `btn-outline`   | Cancel                                    |
| Danger          | `btn btn-error`                   | Delete confirm                            |
| Icon-only       | `btn btn-square btn-ghost btn-sm` | Row actions (edit/delete icons in tables) |

Loading state: `btn` + DaisyUI's `loading` spinner span, button `disabled` while a mutation is `isPending`. Never show two loading indicators (e.g. skeleton _and_ spinner) for the same action.

---

## 7. Tables

`DataTable` (see `Component-Architecture.md`) standard shape:

- Header row: `bg-base-200`, sticky if the page scrolls independently of the table.
- Zebra striping via DaisyUI `table-zebra` for readability on long lists.
- Row actions right-aligned, icon-only buttons.
- Empty state and loading skeleton render _inside_ the table container (same width/position as real rows) so the layout doesn't jump.
- Pagination footer directly below the table, not floated elsewhere on the page.

---

## 8. Cards

Used for: Dashboard KPIs, form wrappers on narrower pages, empty states. `bg-base-100 border border-base-300 rounded-lg p-4 shadow-sm`. Don't stack shadows — one elevation level app-wide, reserve a heavier shadow only for `Modal`.

---

## 9. Modals

DaisyUI `<dialog>`-based. Standard structure: title, body (form or confirmation text), footer with Cancel (ghost) + primary action right-aligned. Max width `max-w-md` for simple forms (category/supplier), `max-w-lg` for richer forms (stock in/out, product). Closes on Esc and backdrop click unless a mutation is in flight (disable backdrop-close while `isPending` to avoid losing input mid-submit).

---

## 10. Forms

- Label above input, not floating labels (simpler, more accessible for a data-entry-heavy internal tool).
- Error text directly beneath the field, `text-error text-sm`, only rendered when present.
- Required fields: no asterisk convention needed if nearly every field is required — instead mark **optional** fields explicitly (`(optional)` suffix on the label), since that's the minority case here (see `Form-Validation.md`).
- Disable the whole form (`fieldset disabled`) while a submit mutation is pending, not just the submit button — prevents edits mid-flight.

---

## 11. Toast

`react-hot-toast`, top-right, default duration ~4s for success, ~6s for error (give errors more time to read). Icons: `CircleCheck` (success, green), `CircleX` (error, red) — configure once in `main.jsx`'s `<Toaster/>` `toastOptions`, don't pass custom icons per call site.

---

## 12. Loading & Skeletons

| Surface                                       | Pattern                                                                                                                                                       |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full page first paint                         | Centered `Loader` (spinner)                                                                                                                                   |
| Table/list first load                         | `Skeleton` rows, 5–8 placeholders matching real row height                                                                                                    |
| Dashboard KPI cards                           | `Skeleton` blocks matching `KpiCard` dimensions                                                                                                               |
| Button submit                                 | Inline spinner inside the button (DaisyUI `loading` span), button disabled                                                                                    |
| Modal form submit                             | Same as button submit, plus disable the rest of the form fields                                                                                               |
| Background refetch (filters changed, refocus) | Keep previous data visible (`keepPreviousData`); show a thin top progress bar or a subtle `isFetching` indicator near the search bar — never blank the screen |

Rule from the API guide, carried through: never replace already-rendered data with a full-page spinner just because a background refetch started.
