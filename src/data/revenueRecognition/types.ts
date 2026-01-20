import { Currency } from '@/data/company/types';
import { CharterType } from '@/data/income/types';

// Recognition status - matches database enum
export type RevenueRecognitionStatus =
  | 'pending'           // Waiting for charter to complete
  | 'recognized'        // Revenue recognized in P&L
  | 'needs_review'      // Missing charter dates, flagged for review
  | 'manual_recognized'; // Manually recognized despite no charter dates

// Recognition trigger type - matches database enum
export type RevenueRecognitionTrigger =
  | 'automatic'   // charterDateTo passed (scheduled/cron)
  | 'manual'      // User marked booking as completed
  | 'immediate';  // No charter dates, user approved immediate recognition

// Main revenue recognition record
export interface RevenueRecognition {
  id: string;
  companyId: string;
  projectId: string;

  // Source documents
  receiptId?: string;
  receiptLineItemId?: string;
  invoiceId?: string;
  bookingId?: string;

  // Charter dates
  charterDateFrom?: string; // ISO date
  charterDateTo?: string;   // ISO date

  // Recognition tracking
  recognitionStatus: RevenueRecognitionStatus;

  // Amounts
  amount: number;
  currency: Currency;
  fxRate: number;
  thbAmount: number;

  // Account codes
  deferredRevenueAccount: string; // Default: '2300' (Charter Deposits Received)
  revenueAccount: string;         // 4010-4070 based on charter type

  // Charter type
  charterType?: CharterType;

  // Recognition details
  recognitionDate?: string;       // ISO date - when revenue was recognized
  recognitionTrigger?: RevenueRecognitionTrigger;
  recognizedBy?: string;          // User ID

  // Journal entry references
  deferredJournalEntryId?: string;    // Dr Bank, Cr Deferred Revenue
  recognitionJournalEntryId?: string; // Dr Deferred Revenue, Cr Revenue

  // Description
  description?: string;
  clientName?: string;

  // Metadata
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Input for creating a new revenue recognition record
export interface CreateRevenueRecognitionInput {
  companyId: string;
  projectId: string;
  receiptId?: string;
  receiptLineItemId?: string;
  invoiceId?: string;
  bookingId?: string;
  charterDateFrom?: string;
  charterDateTo?: string;
  amount: number;
  currency: Currency;
  fxRate: number;
  thbAmount: number;
  revenueAccount: string;
  charterType?: CharterType;
  description?: string;
  clientName?: string;
  createdBy?: string;
}

// Input for recognizing revenue
export interface RecognizeRevenueInput {
  recognitionId: string;
  recognizedBy: string;
  trigger: RevenueRecognitionTrigger;
  recognitionDate?: string; // Defaults to today
}

// View for pending recognition dashboard
export interface PendingRevenueRecognitionView {
  id: string;
  companyId: string;
  projectId: string;
  projectName: string;
  receiptId?: string;
  receiptNumber?: string;
  bookingId?: string;
  charterDateFrom?: string;
  charterDateTo?: string;
  amount: number;
  currency: Currency;
  thbAmount: number;
  revenueAccount: string;
  charterType?: CharterType;
  clientName?: string;
  description?: string;
  recognitionStatus: RevenueRecognitionStatus;
  createdAt: string;
  statusLabel: string;
  daysUntilRecognition?: number;
}

// Summary statistics for dashboard
export interface DeferredRevenueSummary {
  totalThb: number;
  pendingCount: number;
  needsReviewCount: number;
}

// Status labels for UI display
export const recognitionStatusLabels: Record<RevenueRecognitionStatus, string> = {
  pending: 'Pending',
  recognized: 'Recognized',
  needs_review: 'Needs Review',
  manual_recognized: 'Manually Recognized',
};

// Status colors for UI
export const recognitionStatusColors: Record<RevenueRecognitionStatus, { bg: string; text: string }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  recognized: { bg: 'bg-green-100', text: 'text-green-800' },
  needs_review: { bg: 'bg-orange-100', text: 'text-orange-800' },
  manual_recognized: { bg: 'bg-blue-100', text: 'text-blue-800' },
};

// Trigger labels for UI
export const recognitionTriggerLabels: Record<RevenueRecognitionTrigger, string> = {
  automatic: 'Automatic (Charter Completed)',
  manual: 'Manual (Booking Completed)',
  immediate: 'Immediate Recognition',
};

// Helper to determine initial status based on charter dates
export function determineInitialStatus(
  charterDateTo?: string
): RevenueRecognitionStatus {
  if (!charterDateTo) {
    return 'needs_review';
  }

  const charterEnd = new Date(charterDateTo);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  charterEnd.setHours(0, 0, 0, 0);

  if (charterEnd <= today) {
    // Charter already completed - should be recognized immediately
    return 'recognized';
  }

  return 'pending';
}

// Helper to check if revenue is ready for automatic recognition
export function isReadyForRecognition(record: RevenueRecognition): boolean {
  if (record.recognitionStatus !== 'pending') {
    return false;
  }

  if (!record.charterDateTo) {
    return false;
  }

  const charterEnd = new Date(record.charterDateTo);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  charterEnd.setHours(0, 0, 0, 0);

  return charterEnd <= today;
}

// Deferred revenue account code
export const DEFERRED_REVENUE_ACCOUNT = '2300'; // Charter Deposits Received
