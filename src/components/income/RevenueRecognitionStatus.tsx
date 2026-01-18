'use client';

import { AlertCircle, CheckCircle, Clock, HelpCircle } from 'lucide-react';

interface RevenueRecognitionStatusProps {
  charterDateTo?: string;
  receiptStatus: string;
  showWarningOnly?: boolean; // Only show when there's a warning (no dates)
}

/**
 * Displays the revenue recognition status for a receipt based on charter dates.
 *
 * Status logic:
 * - Charter date has passed: Revenue is recognized (green)
 * - Charter date in future: Revenue will be recognized on charter date (yellow)
 * - No charter date: Needs review - revenue is deferred (orange warning)
 */
export function RevenueRecognitionStatus({
  charterDateTo,
  receiptStatus,
  showWarningOnly = false,
}: RevenueRecognitionStatusProps) {
  // Don't show for draft or void receipts
  if (receiptStatus === 'draft' || receiptStatus === 'void') {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Determine recognition status
  let status: 'recognized' | 'pending' | 'needs_review';
  let message: string;
  let daysUntil: number | null = null;

  if (!charterDateTo) {
    status = 'needs_review';
    message = 'Missing charter dates - Revenue is deferred until review';
  } else {
    const charterEnd = new Date(charterDateTo);
    charterEnd.setHours(0, 0, 0, 0);

    if (charterEnd <= today) {
      status = 'recognized';
      message = `Revenue recognized (Charter completed: ${formatDate(charterDateTo)})`;
    } else {
      status = 'pending';
      daysUntil = Math.ceil((charterEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      message = `Revenue will be recognized on ${formatDate(charterDateTo)} (${daysUntil} day${daysUntil === 1 ? '' : 's'})`;
    }
  }

  // If showWarningOnly and status is recognized, don't show anything
  if (showWarningOnly && status === 'recognized') {
    return null;
  }

  // Style configurations based on status
  const styles = {
    recognized: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: <CheckCircle className="h-4 w-4 text-green-600" />,
      label: 'Recognized',
    },
    pending: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: <Clock className="h-4 w-4 text-yellow-600" />,
      label: 'Pending',
    },
    needs_review: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-800',
      icon: <AlertCircle className="h-4 w-4 text-orange-600" />,
      label: 'Needs Review',
    },
  };

  const style = styles[status];

  return (
    <div className={`${style.bg} border ${style.border} rounded-lg p-3 mt-3`}>
      <div className="flex items-start gap-2">
        {style.icon}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${style.text}`}>
              Revenue Recognition: {style.label}
            </span>
          </div>
          <p className={`text-xs ${style.text} mt-0.5`}>{message}</p>
          {status === 'needs_review' && (
            <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
              <HelpCircle className="h-3 w-3" />
              Add charter dates above or approve for immediate recognition in Revenue Recognition dashboard
            </p>
          )}
          {status === 'pending' && (
            <p className="text-xs text-yellow-600 mt-1">
              Payment is held in &quot;Charter Deposits Received&quot; until the service is completed
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
