'use client';

import { CheckCircle, AlertCircle, AlertTriangle, XCircle, Eye, Lightbulb } from 'lucide-react';
import { BankFeedLine, BankFeedStatus } from '@/data/banking/bankReconciliationTypes';

interface BankFeedListProps {
  bankLines: BankFeedLine[];
  selectedLineId?: string;
  onSelectLine: (lineId: string) => void;
  onQuickMatch: (lineId: string) => void;
  onIgnore: (lineId: string) => void;
}

export function BankFeedList({
  bankLines,
  selectedLineId,
  onSelectLine,
  onQuickMatch,
  onIgnore,
}: BankFeedListProps) {
  const getStatusIcon = (status: BankFeedStatus) => {
    switch (status) {
      case 'matched':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'partially_matched':
        return <CheckCircle className="h-4 w-4 text-yellow-600" />;
      case 'missing_record':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'needs_review':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case 'ignored':
        return <XCircle className="h-4 w-4 text-gray-400" />;
      case 'unmatched':
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: BankFeedStatus) => {
    const styles: Record<BankFeedStatus, string> = {
      matched: 'bg-green-100 text-green-800',
      partially_matched: 'bg-yellow-100 text-yellow-800',
      missing_record: 'bg-red-100 text-red-800',
      needs_review: 'bg-orange-100 text-orange-800',
      ignored: 'bg-gray-100 text-gray-600',
      unmatched: 'bg-yellow-100 text-yellow-800',
    };

    const labels: Record<BankFeedStatus, string> = {
      matched: 'Matched',
      partially_matched: 'Partial',
      missing_record: 'Missing',
      needs_review: 'Review',
      ignored: 'Ignored',
      unmatched: 'Unmatched',
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${styles[status]}`}>
        {getStatusIcon(status)}
        {labels[status]}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getAmountColor = (amount: number) => {
    return amount >= 0 ? 'text-green-700' : 'text-red-700';
  };

  const getConfidenceBadge = (score?: number) => {
    if (!score) return null;

    const color = score >= 80 ? 'bg-green-100 text-green-800' : score >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800';

    return (
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${color}`}>
        <Lightbulb className="h-3 w-3" />
        {score}%
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Bank Feed Lines</h3>
          <span className="text-xs text-gray-500">{bankLines.length} transactions</span>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {bankLines.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 px-4">
            <AlertCircle className="h-12 w-12 text-gray-400 mb-3" />
            <h3 className="text-sm font-medium text-gray-900">No transactions</h3>
            <p className="text-xs text-gray-500 text-center mt-1">
              No bank transactions match the current filters.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {bankLines.map((line) => {
              const isSelected = line.id === selectedLineId;
              const hasMatches = line.matches.length > 0;
              const hasSuggestions = line.confidenceScore && line.confidenceScore > 0;

              // Derive actual status from matches - if matches exist, it's matched
              // This handles cases where database status is out of sync
              const actualStatus: BankFeedStatus = hasMatches
                ? 'matched'
                : line.status;

              // Calculate actual matched amount from matches if database value is incorrect
              const actualMatchedAmount = hasMatches
                ? line.matches.reduce((sum, m) => sum + m.matchedAmount, 0)
                : line.matchedAmount;

              return (
                <div
                  key={line.id}
                  onClick={() => onSelectLine(line.id)}
                  className={`p-4 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-50 border-l-4 border-l-blue-600'
                      : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                  }`}
                >
                  {/* Top row: Date, Status, Amount */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-600">
                        {formatDate(line.transactionDate)}
                      </span>
                      {getStatusBadge(actualStatus)}
                      {hasSuggestions && !hasMatches && getConfidenceBadge(line.confidenceScore)}
                    </div>
                    <div className={`text-sm font-bold ${getAmountColor(line.amount)}`}>
                      {formatAmount(line.amount, line.currency)}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mb-2">
                    <p className="text-sm text-gray-900 line-clamp-2">{line.description}</p>
                    {line.reference && (
                      <p className="text-xs text-gray-500 mt-0.5">Ref: {line.reference}</p>
                    )}
                  </div>

                  {/* Match info */}
                  {hasMatches && (
                    <div className="mb-2">
                      <div className="text-xs text-gray-600">
                        {line.matches.length} match{line.matches.length > 1 ? 'es' : ''} •{' '}
                        {formatAmount(actualMatchedAmount, line.currency)} matched
                      </div>
                      {actualMatchedAmount < Math.abs(line.amount) && (
                        <div className="text-xs text-orange-600 font-medium">
                          Remaining: {formatAmount(Math.abs(line.amount) - actualMatchedAmount, line.currency)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Quick actions */}
                  <div className="flex items-center gap-2 mt-2">
                    {actualStatus === 'unmatched' && hasSuggestions && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickMatch(line.id);
                        }}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                      >
                        <Lightbulb className="h-3 w-3" />
                        Quick Match
                      </button>
                    )}
                    {actualStatus === 'unmatched' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onIgnore(line.id);
                        }}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      >
                        <XCircle className="h-3 w-3" />
                        Ignore
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectLine(line.id);
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded transition-colors ml-auto"
                    >
                      <Eye className="h-3 w-3" />
                      Details
                    </button>
                  </div>

                  {/* Running balance indicator */}
                  {line.runningBalance !== undefined && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <div className="text-xs text-gray-500">
                        Running Balance: {formatAmount(line.runningBalance, line.currency)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer with keyboard hint */}
      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-500 text-center">
          Use <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">↑</kbd>{' '}
          <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">↓</kbd>{' '}
          to navigate
        </p>
      </div>
    </div>
  );
}
