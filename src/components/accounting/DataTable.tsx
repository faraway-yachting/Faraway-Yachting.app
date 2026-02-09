'use client';

import { ReactNode } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";

export interface Column<T> {
  key: string;
  header: ReactNode;
  render?: (row: T) => ReactNode;
  align?: "left" | "center" | "right";
  width?: string;
  /** Show this column prominently at the top of the mobile card */
  primary?: boolean;
  /** Hide this column on mobile */
  hideOnMobile?: boolean;
  /** Plain text label for mobile card view. Falls back to header if it's a string. */
  mobileLabel?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

function getColumnLabel<T>(column: Column<T>): string {
  if (column.mobileLabel) return column.mobileLabel;
  if (typeof column.header === "string") return column.header;
  return column.key;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  emptyMessage = "No data available",
  onRowClick,
}: DataTableProps<T>) {
  const isMobile = useIsMobile();

  if (isMobile) {
    const primaryCol = columns.find((c) => c.primary) || columns[0];
    const detailCols = columns.filter((c) => c !== primaryCol && !c.hideOnMobile);

    if (data.length === 0) {
      return (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-500">
          {emptyMessage}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {data.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm ${
              onRowClick ? "cursor-pointer active:bg-gray-50" : ""
            }`}
            onClick={() => onRowClick?.(row)}
          >
            {/* Primary value */}
            <div className="mb-2 text-sm font-semibold text-gray-900">
              {primaryCol.render
                ? primaryCol.render(row)
                : (row[primaryCol.key]?.toString() || "—")}
            </div>

            {/* Key-value pairs */}
            <dl className="space-y-1">
              {detailCols.map((col) => (
                <div key={col.key} className="flex items-start justify-between gap-2">
                  <dt className="shrink-0 text-xs font-medium text-gray-500">
                    {getColumnLabel(col)}
                  </dt>
                  <dd className="text-right text-sm text-gray-900">
                    {col.render
                      ? col.render(row)
                      : (row[col.key]?.toString() || "—")}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  style={column.width ? { width: column.width } : undefined}
                  className={`px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 ${
                    column.align === "right"
                      ? "text-right"
                      : column.align === "center"
                      ? "text-center"
                      : "text-left"
                  }`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-sm text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={`hover:bg-gray-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      style={column.width ? { width: column.width } : undefined}
                      className={`px-4 py-3 text-sm text-gray-900 whitespace-nowrap ${
                        column.align === "right"
                          ? "text-right"
                          : column.align === "center"
                          ? "text-center"
                          : "text-left"
                      }`}
                    >
                      {column.render
                        ? column.render(row)
                        : row[column.key]?.toString() || "-"}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
