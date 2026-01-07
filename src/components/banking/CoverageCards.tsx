'use client';

import { FileText, CheckCircle, AlertCircle, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';
import { ReconciliationStats } from '@/data/banking/bankReconciliationTypes';

interface CoverageCardsProps {
  stats: ReconciliationStats;
  onFilterByStatus: (status: string) => void;
}

export function CoverageCards({ stats, onFilterByStatus }: CoverageCardsProps) {
  const cards = [
    {
      title: 'Imported Bank Lines',
      value: stats.totalBankLines,
      subtitle: 'in date range',
      icon: FileText,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-100',
      filterStatus: 'all',
    },
    {
      title: 'Matched',
      value: stats.matchedLines,
      subtitle: `${((stats.matchedLines / (stats.totalBankLines || 1)) * 100).toFixed(1)}% of total`,
      icon: CheckCircle,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-100',
      filterStatus: 'matched',
    },
    {
      title: 'Unmatched',
      value: stats.unmatchedLines,
      subtitle: 'needs attention',
      icon: AlertCircle,
      iconColor: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      filterStatus: 'unmatched',
    },
    {
      title: 'Missing in System',
      value: stats.missingRecordLines,
      subtitle: 'bank feed exists, no system record',
      icon: AlertTriangle,
      iconColor: 'text-red-600',
      bgColor: 'bg-red-100',
      filterStatus: 'missing_record',
      highlight: true,
    },
    {
      title: 'System Not in Bank',
      value: stats.systemRecordsNotInBank,
      subtitle: 'marked paid, not found in bank',
      icon: TrendingUp,
      iconColor: 'text-orange-600',
      bgColor: 'bg-orange-100',
      filterStatus: 'system-not-in-bank',
    },
    {
      title: 'Net Difference',
      value: `${Math.abs(stats.netDifference).toLocaleString()}`,
      subtitle: 'bank vs system movement',
      icon: DollarSign,
      iconColor: stats.netDifference === 0 ? 'text-green-600' : 'text-red-600',
      bgColor: stats.netDifference === 0 ? 'bg-green-100' : 'bg-red-100',
      filterStatus: 'discrepancy',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <button
            key={index}
            onClick={() => card.filterStatus && onFilterByStatus(card.filterStatus)}
            className={`relative p-4 bg-white rounded-lg border border-gray-200 hover:border-[#5A7A8F] hover:shadow-md transition-all text-left ${
              card.highlight ? 'ring-2 ring-red-200' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.bgColor}`}>
                <Icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
              {card.highlight && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                  Important
                </span>
              )}
            </div>

            <div className="mt-2">
              <p className="text-sm font-medium text-gray-600">{card.title}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
              <p className="text-xs text-gray-500 mt-1">{card.subtitle}</p>
            </div>

            {card.filterStatus && (
              <div className="absolute bottom-2 right-2">
                <span className="text-xs text-[#5A7A8F] font-medium">Click to filter →</span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
