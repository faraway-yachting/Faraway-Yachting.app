'use client';

import { WhtFromCustomerSummary, WhtToSupplierSummary } from '@/data/finances/types';

interface WhtSummaryBoxProps {
  summary: WhtFromCustomerSummary | WhtToSupplierSummary;
  type: 'from-customer' | 'to-supplier';
}

const currencySymbols: Record<string, string> = {
  THB: '฿',
  USD: '$',
  EUR: '€',
  SGD: 'S$',
};

function formatPeriod(period: string): string {
  const [year, month] = period.split('-');
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  return `${monthNames[parseInt(month) - 1]} ${year}`;
}

function getStatusColor(status: string): { bg: string; text: string; dot: string } {
  switch (status) {
    case 'complete':
    case 'filed':
    case 'reconciled':
      return { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' };
    case 'partial':
    case 'submitted':
      return { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' };
    case 'pending':
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500' };
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'complete':
      return 'Complete';
    case 'filed':
      return 'Filed';
    case 'reconciled':
      return 'Reconciled';
    case 'partial':
      return 'Partial';
    case 'submitted':
      return 'Submitted';
    case 'pending':
    default:
      return 'Pending';
  }
}

export function WhtSummaryBox({ summary, type }: WhtSummaryBoxProps) {
  const statusColors = getStatusColor(summary.status);
  const isToSupplier = type === 'to-supplier' && 'pnd3Amount' in summary;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      {/* Company & Period */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-900">{summary.companyName}</h4>
        <span className="text-sm text-gray-500">{formatPeriod(summary.period)}</span>
      </div>

      {/* Amount */}
      <div className="mb-3">
        <p className="text-2xl font-bold text-gray-900">
          ฿{summary.totalWhtAmount.toLocaleString()}
        </p>
        <p className="text-sm text-gray-500">
          {summary.transactionCount} transaction{summary.transactionCount !== 1 ? 's' : ''}
        </p>
      </div>

      {/* PND breakdown for WHT to Supplier */}
      {isToSupplier && (
        <div className="grid grid-cols-2 gap-2 mb-3 pt-2 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-500">PND3 (Individual)</p>
            <p className="text-sm font-medium text-gray-700">
              ฿{(summary as WhtToSupplierSummary).pnd3Amount.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">PND53 (Corporate)</p>
            <p className="text-sm font-medium text-gray-700">
              ฿{(summary as WhtToSupplierSummary).pnd53Amount.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Due date for WHT to Supplier */}
      {isToSupplier && 'dueDate' in summary && (
        <div className="mb-3 pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-500">Due Date</p>
          <p className="text-sm font-medium text-gray-700">
            {new Date((summary as WhtToSupplierSummary).dueDate).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        </div>
      )}

      {/* Status Badge */}
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${statusColors.bg}`}>
        <span className={`w-2 h-2 rounded-full ${statusColors.dot}`}></span>
        <span className={`text-xs font-medium ${statusColors.text}`}>
          {getStatusLabel(summary.status)}
        </span>
      </div>
    </div>
  );
}
