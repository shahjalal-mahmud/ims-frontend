// src/components/domain/RecentActivityList.jsx
// Renders `dashboard.summary.recentActivity` items.
// Per docs/Component_Architecture.md §4 and docs/UI_Screens.md §2.
//
// Items are typed loosely because the API guide doesn't pin the exact
// shape — they include at least { type, productName, quantity, createdAt }
// (and supplierName for stock-in). This renderer picks what it can show.

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Package,
} from 'lucide-react';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import Skeleton from '../ui/Skeleton';
import { formatQuantity, formatRelativeTime } from '../../lib/format';

function resolveVerb(type) {
  if (type === 'stock_in' || type === 'stockIn' || type === 'in') return 'Stock In';
  if (type === 'stock_out' || type === 'stockOut' || type === 'out') return 'Stock Out';
  return type ? String(type) : 'Activity';
}

function ActivityIcon({ type }) {
  if (type === 'stock_in' || type === 'stockIn' || type === 'in') {
    return <ArrowDownToLine size={16} aria-hidden="true" />;
  }
  if (type === 'stock_out' || type === 'stockOut' || type === 'out') {
    return <ArrowUpFromLine size={16} aria-hidden="true" />;
  }
  return <Package size={16} aria-hidden="true" />;
}

function ActivityRow({ item }) {
  const verb = resolveVerb(item.type);
  const productName = item.productName ?? item.product?.name ?? 'Unknown product';
  const qty = item.quantity;
  const supplier = item.supplierName ?? item.supplier?.name;
  const when = item.createdAt ?? item.created_at;

  return (
    <li className="flex items-start gap-3 py-2">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-base-200 text-primary">
        <ActivityIcon type={item.type} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-medium">{verb}</span>
          {qty !== undefined && qty !== null && (
            <>
              {' · '}
              <span className="font-medium">{formatQuantity(qty)}</span>
            </>
          )}
          {' · '}
          <span className="text-base-content/80">{productName}</span>
        </p>
        {supplier && (
          <p className="text-xs text-base-content/60 truncate">
            Supplier: {supplier}
          </p>
        )}
      </div>
      <span className="text-xs text-base-content/60 shrink-0">
        {formatRelativeTime(when)}
      </span>
    </li>
  );
}

export default function RecentActivityList({ items = [], isLoading = false }) {
  if (isLoading) {
    return (
      <Card>
        <div className="flex flex-col gap-3">
          <Skeleton variant="text" className="w-40" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton circle className="w-8 h-8" />
              <Skeleton variant="text" className="flex-1" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!items.length) {
    return (
      <EmptyState
        title="No recent activity"
        description="Stock movements and product changes will appear here once you start recording them."
      />
    );
  }

  return (
    <Card>
      <h3 className="text-lg font-medium mb-2">Recent Activity</h3>
      <ul className="divide-y divide-base-300">
        {items.map((item, i) => (
          <ActivityRow
            key={item.id ?? `${item.type}-${item.createdAt ?? i}-${i}`}
            item={item}
          />
        ))}
      </ul>
    </Card>
  );
}