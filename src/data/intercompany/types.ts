/**
 * Intercompany Charter Fee Types
 *
 * Tracks money distribution between company entities.
 * No P&L impact - purely for managing intercompany transfers.
 */

export type CharterFeeStatus = 'pending' | 'settled';

export interface IntercompanyCharterFee {
  id: string;
  receiptId: string;
  receiptNumber: string;
  agencyCompanyId: string;
  ownerCompanyId: string;
  projectId: string;
  charterType: string;
  charterDate: string;
  charterFeeAmount: number;
  currency: string;
  status: CharterFeeStatus;
  settledDate?: string;
  settlementReference?: string;
  createdAt: string;
  updatedAt: string;
}

/** Enriched fee with joined names for display */
export interface IntercompanyCharterFeeWithNames extends IntercompanyCharterFee {
  agencyCompanyName?: string;
  ownerCompanyName?: string;
  projectName?: string;
}

/** Settlement summary grouped by owner company */
export interface IntercompanySettlementSummary {
  ownerCompanyId: string;
  ownerCompanyName: string;
  totalPending: number;
  pendingCount: number;
  currency: string;
}
