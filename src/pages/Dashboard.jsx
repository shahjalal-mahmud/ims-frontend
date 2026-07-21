// src/pages/Dashboard.jsx
// Milestone 2 Dashboard. KPIs + recent activity + low-stock alert.
// Per docs/UI_Screens.md §2 and docs/FRONTEND_API_INTEGRATION_GUIDE.md §4.2.
//
// Loading → Skeleton KPI cards.
// Error   → Retry banner in place of the cards (per UI Screens §2).
// Clicking the Low-Stock KPI navigates to /reports/low-stock.

import { useNavigate } from 'react-router-dom';
import {
  Package,
  Tags,
  Truck,
  Boxes,
  TriangleAlert,
  CircleAlert,
  RotateCw,
} from 'lucide-react';
import { useDashboardSummary } from '../queries/useDashboardQuery';
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

  const errorMessage = isError ? getErrorMessage(error) : null;

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

      {/* Low-stock alert (only when there are shortages — happy path hides it) */}
      {!isLoading && !isError && (data?.lowStockCount ?? 0) > 0 && (
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
