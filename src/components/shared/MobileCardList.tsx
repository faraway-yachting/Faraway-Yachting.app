'use client';

import { ReactNode } from 'react';

export interface MobileCardColumn<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  primary?: boolean;
  hidden?: boolean;
}

interface MobileCardListProps<T> {
  columns: MobileCardColumn<T>[];
  data: T[];
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  renderActions?: (row: T) => ReactNode;
}

export function MobileCardList<T extends Record<string, any>>({
  columns,
  data,
  emptyMessage = 'No data available',
  onRowClick,
  renderActions,
}: MobileCardListProps<T>) {
  const primaryCol = columns.find((c) => c.primary) || columns[0];
  const detailCols = columns.filter((c) => c !== primaryCol && !c.hidden);

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
            onRowClick ? 'cursor-pointer active:bg-gray-50' : ''
          }`}
          onClick={() => onRowClick?.(row)}
        >
          {/* Primary value */}
          <div className="mb-2 text-sm font-semibold text-gray-900">
            {primaryCol.render
              ? primaryCol.render(row)
              : (row[primaryCol.key]?.toString() || '—')}
          </div>

          {/* Key-value pairs */}
          <dl className="space-y-1">
            {detailCols.map((col) => (
              <div key={col.key} className="flex items-start justify-between gap-2">
                <dt className="shrink-0 text-xs font-medium text-gray-500">
                  {col.label}
                </dt>
                <dd className="text-right text-sm text-gray-900">
                  {col.render
                    ? col.render(row)
                    : (row[col.key]?.toString() || '—')}
                </dd>
              </div>
            ))}
          </dl>

          {/* Action buttons */}
          {renderActions && (
            <div
              className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3"
              onClick={(e) => e.stopPropagation()}
            >
              {renderActions(row)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
