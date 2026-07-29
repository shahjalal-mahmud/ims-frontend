// src/components/ui/DataTable.jsx
// Generic table renderer used by every list page (Products, Categories,
// Suppliers, Stock In, Stock Out, all four reports).
//
// Reusable by construction — this file knows nothing about categories
// or products. Callers describe their columns and pass plain row
// data; the table does the rest.
//
// `columns` is an array of:
//   { key, header, render?(row), className?, headerClassName? }
// `data` is the rows array.
// `isLoading` → render skeleton rows inside the table.
// `emptyState` → shown inside the table when data.length === 0.
// `rowActions` is an optional React node (or a function (row) => node)
// rendered as a final cell on every row.

import Skeleton from './Skeleton';
import EmptyState from './EmptyState';

export default function DataTable({
  columns,
  data = [],
  isLoading = false,
  emptyState,
  rowActions,
  rowKey = 'id',
  skeletonRows = 6,
  className = '',
}) {
  const showSkeleton = isLoading;
  const showEmpty = !isLoading && data.length === 0;

  return (
    <div className={`overflow-x-auto border border-base-300 rounded-lg bg-base-100 ${className}`.trim()}>
      <table className="table table-zebra w-full">
        <thead className="bg-base-200">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left ${col.headerClassName ?? ''}`.trim()}
              >
                {col.header}
              </th>
            ))}
            {rowActions && (
              <th className="px-4 py-3 text-right">Actions</th>
            )}
          </tr>
        </thead>
        <tbody>
          {showSkeleton &&
            Array.from({ length: skeletonRows }).map((_, i) => (
              <tr key={`sk-${i}`}>
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <Skeleton variant="text" />
                  </td>
                ))}
                {rowActions && (
                  <td className="px-4 py-3 text-right">
                    <Skeleton variant="text" className="w-16 inline-block" />
                  </td>
                )}
              </tr>
            ))}

          {showEmpty && (
            <tr>
              <td
                colSpan={columns.length + (rowActions ? 1 : 0)}
                className="p-0"
              >
                <div className="p-4">
                  {emptyState || (
                    <EmptyState
                      title="No data"
                      description="There's nothing here yet."
                    />
                  )}
                </div>
              </td>
            </tr>
          )}

          {!showSkeleton && !showEmpty &&
            data.map((row) => (
              <tr key={row[rowKey] ?? JSON.stringify(row)}>
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 ${col.className ?? ''}`.trim()}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
                {rowActions && (
                  <td className="px-4 py-3 text-right">
                    {typeof rowActions === 'function' ? rowActions(row) : rowActions}
                  </td>
                )}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}