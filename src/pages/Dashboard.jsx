// src/pages/Dashboard.jsx
// Milestone 2 Dashboard, extended in Milestone 8. KPIs + recent activity
// + low-stock alert.
// Per docs/UI_Screens.md §2 and docs/FRONTEND_API_INTEGRATION_GUIDE.md
// §4.2.
//
// Loading → Skeleton KPI cards.
// Error   → Retry banner in place of the cards (per UI Screens §2).
// Clicking the Low-Stock KPI / widget navigates to /reports/low-stock.
//
// Milestone 8 change: the Dashboard low-stock widget now reuses the
// SAME data source as the Low Stock Report (`useLowStockReport`) —
// a single network request (and a single cached entry) backs both
// surfaces. See docs/Frontend_Implementation_Roadmap.md §Milestone 8
// exit criteria.

import { useNavigate } from 'react-router-dom';
import {
  Package,
  Tags,
  Truck,
  Boxes,
  TriangleAlert,
  CircleAlert,
  RotateCw,
  PackageOpen,
} from 'lucide-react';
import { useDashboardSummary } from '../queries/useDashboardQuery';
import { useLowStockReport } from '../queries/useReportQueries';
import { getErrorMessage } from '../lib/errors';
import { formatQuantity } from '../lib/format';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import KpiCard from '../components/domain/KpiCard';
import RecentActivityList from '../components/domain/RecentActivityList';

function KpiSkeleton() {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <Skeleton variant="text" className="w-24" />
        <Skeleton circle className="w-5 h-5" />
      </div>
      <Skeleton variant="kpi" className="mt-2" />
    </Card>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch, isFetching } =
    useDashboardSummary();

  // Reuses the same React Query key (`['reports', 'lowStock']`) used
  // by the dedicated Low Stock Report — TanStack Query de-dupes the
  // network call and shares the cached array. The widget renders the
  // top items inline; clicking through goes to /reports/low-stock for
  // the full list. This is the Milestone 8 wiring requirement.
  const { data: lowStock, isLoading: lowStockLoading } = useLowStockReport();

  const errorMessage = isError ? getErrorMessage(error) : null;

  const lowStockItems = lowStock ?? [];
  // Show up to 3 items inline; the report has the full list.
  const preview = lowStockItems.slice(0, 3);

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {isError && (
        <Card className="border-error/40 bg-error/5">
          <div className="flex items-start gap-3">
            <CircleAlert size={20} className="text-error shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-error">Couldn't load dashboard</p>
              <p className="text-sm text-base-content/70">{errorMessage}</p>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => refetch()}
            >
              <RotateCw size={14} />
              Retry
            </button>
          </div>
        </Card>
      )}

      {/* KPI grid */}
      <section
        aria-label="Key performance indicators"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {isLoading ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          <>
            <KpiCard
              label="Total Products"
              value={formatQuantity(data?.totalProducts)}
              icon={Package}
            />
            <KpiCard
              label="Categories"
              value={formatQuantity(data?.totalCategories)}
              icon={Tags}
            />
            <KpiCard
              label="Suppliers"
              value={formatQuantity(data?.totalSuppliers)}
              icon={Truck}
            />
            <KpiCard
              label="Stock Units"
              value={formatQuantity(data?.totalStockUnits)}
              icon={Boxes}
            />
          </>
        )}
      </section>

      {/* Low-stock widget — same data shape as LowStockReport. Hidden
          entirely when there's nothing to show (happy path). When there
          ARE shortages we render an alert card with up to 3 preview
          rows and a "View all →" link into the dedicated report. */}
      {lowStockItems.length > 0 ? (
        <button
          type="button"
          className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-warning rounded-lg"
          onClick={() => navigate('/reports/low-stock')}
        >
          <Card className="border-warning/40 bg-warning/5 hover:border-warning transition-colors">
            <div className="flex items-start gap-3">
              <TriangleAlert
                size={20}
                className="text-warning shrink-0 mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium">
                  {formatQuantity(lowStockItems.length)} product
                  {lowStockItems.length === 1 ? '' : 's'} at or below
                  minimum stock level
                </p>
                <p className="text-sm text-base-content/70">
                  Review and reorder to replenish inventory.
                </p>
                {lowStockLoading ? (
                  <div className="mt-3 text-xs text-base-content/50">
                    Loading…
                  </div>
                ) : (
                  <ul className="mt-3 flex flex-col gap-1">
                    {preview.map((row) => {
                      const short =
                        row.shortBy ??
                        Math.max(
                          0,
                          Number(row.minStockLevel ?? 0) -
                            Number(row.quantity ?? 0)
                        );
                      return (
                        <li
                          key={row.productId}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <span className="inline-flex items-center gap-2 min-w-0">
                            <PackageOpen
                              size={14}
                              className="text-base-content/50 shrink-0"
                              aria-hidden="true"
                            />
                            <span className="truncate">
                              {row.productName ??
                                `Product #${row.productId}`}
                            </span>
                          </span>
                          <span className="text-base-content/70 shrink-0">
                            {formatQuantity(row.quantity)} /{' '}
                            {formatQuantity(row.minStockLevel)}
                            <span className="ml-2 text-warning font-medium">
                              order {formatQuantity(short)}
                            </span>
                          </span>
                        </li>
                      );
                    })}
                    {lowStockItems.length > preview.length && (
                      <li className="text-xs text-base-content/60 mt-1">
                        +{lowStockItems.length - preview.length} more — click
                        to view all
                      </li>
                    )}
                  </ul>
                )}
              </div>
              <span className="text-sm text-primary shrink-0">
                View →
              </span>
            </div>
          </Card>
        </button>
      ) : (
        // Happy path: summary may still report a count from
        // `dashboard.summary.lowStockCount` while the report endpoint is
        // loading or disagrees; the dedicated report is the source of
        // truth for the actual list. Keep the card hidden if the report
        // says nothing.
        !isLoading &&
        !isError && (data?.lowStockCount ?? 0) > 0 &&
        !lowStockLoading && (
          <button
            type="button"
            className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-warning rounded-lg"
            onClick={() => navigate('/reports/low-stock')}
          >
            <Card className="border-warning/40 bg-warning/5 hover:border-warning transition-colors">
              <div className="flex items-start gap-3">
                <TriangleAlert
                  size={20}
                  className="text-warning shrink-0 mt-0.5"
                />
                <div className="flex-1">
                  <p className="font-medium">
                    {formatQuantity(data.lowStockCount)} product
                    {data.lowStockCount === 1 ? '' : 's'} at or below minimum
                    stock level
                  </p>
                  <p className="text-sm text-base-content/70">
                    Review and reorder to replenish inventory.
                  </p>
                </div>
                <span className="text-sm text-primary">View →</span>
              </div>
            </Card>
          </button>
        )
      )}

      {/* Recent activity */}
      <section aria-label="Recent activity">
        <RecentActivityList
          items={data?.recentActivity ?? []}
          isLoading={isLoading}
        />
      </section>

      {isFetching && !isLoading && (
        <div className="text-xs text-base-content/50 self-end">
          Refreshing…
        </div>
      )}
    </div>
  );
}