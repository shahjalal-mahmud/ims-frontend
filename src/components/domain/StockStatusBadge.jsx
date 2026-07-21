// src/components/domain/StockStatusBadge.jsx
// Wraps the generic `Badge` primitive and derives success / warning / danger
// from a product's `quantity` vs `minStockLevel`. Per docs/Component_Architecture.md
// §4 and docs/UI_Design_System.md §1.
//
// Variant rules (intentionally simple — the report screens and Dashboard
// widget use the same logic):
//   - danger  → quantity is 0 (out of stock)
//   - warning → quantity > 0 AND quantity <= minStockLevel (low stock)
//   - success → quantity > minStockLevel (in stock)
//
// If `minStockLevel` is missing/null we treat it as 0, so a product with
// a known quantity of N is always success unless N is 0.

import Badge from '../ui/Badge';
import { formatQuantity } from '../../lib/format';

export default function StockStatusBadge({ quantity, minStockLevel = 0, product }) {
  // Defensive: accept either flat (quantity/minStockLevel) or wrapped
  // (product: {...}) shapes — the report endpoint and list endpoint
  // return different field names in some cases.
  const qty = quantity ?? product?.quantity ?? 0;
  const min = minStockLevel ?? product?.minStockLevel ?? 0;

  const numQty = Number(qty) || 0;
  const numMin = Number(min) || 0;

  if (numQty <= 0) {
    return <Badge variant="danger">Out of stock ({formatQuantity(0)})</Badge>;
  }
  if (numQty <= numMin) {
    return (
      <Badge variant="warning">
        Low stock ({formatQuantity(numQty)} / min {formatQuantity(numMin)})
      </Badge>
    );
  }
  return <Badge variant="success">In stock ({formatQuantity(numQty)})</Badge>;
}