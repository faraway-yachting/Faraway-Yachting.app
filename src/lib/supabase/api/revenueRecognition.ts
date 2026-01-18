/**
 * Revenue Recognition API
 *
 * Supabase API functions for managing revenue recognition records.
 * This wraps the revenue recognition service for consistent API patterns.
 */

import {
  createDeferredRevenueRecord,
  getPendingRecognition,
  getItemsNeedingReview,
  getRecordsReadyForRecognition,
  recognizeRevenueManually,
  processAutomaticRecognition,
  updateCharterDates,
  getDeferredRevenueSummary,
  getById,
  getByReceiptId,
  getRecentlyRecognized,
  hasUnrecognizedRevenue,
  getRevenueAccountCode,
} from '@/lib/accounting/revenueRecognitionService';

import type {
  RevenueRecognition,
  CreateRevenueRecognitionInput,
  RevenueRecognitionTrigger,
  PendingRevenueRecognitionView,
  DeferredRevenueSummary,
} from '@/data/revenueRecognition/types';

export const revenueRecognitionApi = {
  /**
   * Create a deferred revenue record when a receipt is paid
   */
  async create(input: CreateRevenueRecognitionInput): Promise<RevenueRecognition> {
    return createDeferredRevenueRecord(input);
  },

  /**
   * Get revenue recognition record by ID
   */
  async getById(id: string): Promise<RevenueRecognition | null> {
    return getById(id);
  },

  /**
   * Get all revenue recognition records for a receipt
   */
  async getByReceiptId(receiptId: string): Promise<RevenueRecognition[]> {
    return getByReceiptId(receiptId);
  },

  /**
   * Get all pending revenue recognition records
   */
  async getPending(companyId?: string): Promise<PendingRevenueRecognitionView[]> {
    return getPendingRecognition(companyId);
  },

  /**
   * Get items that need review (missing charter dates)
   */
  async getNeedsReview(companyId?: string): Promise<PendingRevenueRecognitionView[]> {
    return getItemsNeedingReview(companyId);
  },

  /**
   * Get records ready for automatic recognition
   */
  async getReadyForRecognition(): Promise<RevenueRecognition[]> {
    return getRecordsReadyForRecognition();
  },

  /**
   * Get recently recognized revenue
   */
  async getRecentlyRecognized(
    companyId?: string,
    limit?: number
  ): Promise<RevenueRecognition[]> {
    return getRecentlyRecognized(companyId, limit);
  },

  /**
   * Manually recognize revenue
   */
  async recognize(
    recognitionId: string,
    recognizedBy: string,
    trigger: RevenueRecognitionTrigger,
    recognitionDate?: string
  ): Promise<RevenueRecognition> {
    return recognizeRevenueManually(recognitionId, recognizedBy, trigger, recognitionDate);
  },

  /**
   * Process automatic recognition for all ready records
   */
  async processAutomatic(
    systemUserId?: string
  ): Promise<{ recognized: number; errors: string[] }> {
    return processAutomaticRecognition(systemUserId);
  },

  /**
   * Update charter dates for a needs_review record
   */
  async updateDates(
    recognitionId: string,
    charterDateFrom: string,
    charterDateTo: string
  ): Promise<RevenueRecognition> {
    return updateCharterDates(recognitionId, charterDateFrom, charterDateTo);
  },

  /**
   * Get deferred revenue summary for dashboard
   */
  async getSummary(companyId: string): Promise<DeferredRevenueSummary> {
    return getDeferredRevenueSummary(companyId);
  },

  /**
   * Check if a receipt has any unrecognized revenue
   */
  async hasUnrecognized(receiptId: string): Promise<boolean> {
    return hasUnrecognizedRevenue(receiptId);
  },

  /**
   * Get the revenue account code for a charter type
   */
  getRevenueAccountCode,
};
