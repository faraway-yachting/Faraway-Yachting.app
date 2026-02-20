/**
 * Revenue Recognition Service
 *
 * Implements proper accrual-basis revenue recognition:
 * - Revenue is only recognized in P&L when charter service is completed
 * - Payments received before charter completion go to "Charter Deposits Received" (2300)
 * - Supports automatic recognition (by date) and manual recognition (user trigger)
 */

import { createClient } from '@/lib/supabase/client';
import type {
  RevenueRecognition,
  RevenueRecognitionStatus,
  RevenueRecognitionTrigger,
  CreateRevenueRecognitionInput,
  PendingRevenueRecognitionView,
  DeferredRevenueSummary,
} from '@/data/revenueRecognition/types';
import {
  determineInitialStatus,
  DEFERRED_REVENUE_ACCOUNT,
} from '@/data/revenueRecognition/types';
import { charterTypeAccountCodes, type CharterType } from '@/data/income/types';
import type { Currency } from '@/data/company/types';
import { accountingEventsApi } from '@/lib/supabase/api/accountingEvents';
import type { ManagementFeeEventData } from '@/lib/accounting/eventTypes';

/**
 * Create a deferred revenue record when a receipt is paid
 * This is called when the receipt is created/paid and the charter hasn't happened yet
 */
export async function createDeferredRevenueRecord(
  input: CreateRevenueRecognitionInput
): Promise<RevenueRecognition> {
  const supabase = createClient();

  // Determine initial status based on charter dates
  const initialStatus = determineInitialStatus(input.charterDateTo);

  const record = {
    company_id: input.companyId,
    project_id: input.projectId,
    receipt_id: input.receiptId || null,
    receipt_line_item_id: input.receiptLineItemId || null,
    invoice_id: input.invoiceId || null,
    booking_id: input.bookingId || null,
    charter_date_from: input.charterDateFrom || null,
    charter_date_to: input.charterDateTo || null,
    recognition_status: initialStatus,
    amount: input.amount,
    currency: input.currency,
    fx_rate: input.fxRate,
    thb_amount: input.thbAmount,
    deferred_revenue_account: DEFERRED_REVENUE_ACCOUNT,
    revenue_account: input.revenueAccount,
    charter_type: input.charterType || null,
    description: input.description || null,
    client_name: input.clientName || null,
    created_by: input.createdBy || null,
    // If already past charter date, set recognition details
    ...(initialStatus === 'recognized'
      ? {
          recognition_date: new Date().toISOString().split('T')[0],
          recognition_trigger: 'automatic' as RevenueRecognitionTrigger,
        }
      : {}),
  };

  const { data, error } = await supabase
    .from('revenue_recognition' as any)
    .insert([record])
    .select()
    .single();

  if (error) {
    throw new Error(error.message || error.details || error.hint || 'Failed to create revenue recognition record');
  }

  return mapDbRowToRevenueRecognition(data as unknown as Record<string, unknown>);
}

/**
 * Get all pending revenue recognition records
 */
export async function getPendingRecognition(
  companyId?: string
): Promise<PendingRevenueRecognitionView[]> {
  const supabase = createClient();

  let query = supabase
    .from('pending_revenue_recognition' as any)
    .select('*')
    .order('charter_date_to', { ascending: true, nullsFirst: true });

  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return ((data as unknown as Record<string, unknown>[]) ?? []).map(mapDbRowToPendingView);
}

/**
 * Get items that need review (missing charter dates)
 */
export async function getItemsNeedingReview(
  companyId?: string
): Promise<PendingRevenueRecognitionView[]> {
  const supabase = createClient();

  let query = supabase
    .from('revenue_recognition' as any)
    .select(`
      *,
      projects(name),
      receipts(receipt_number)
    `)
    .eq('recognition_status', 'needs_review')
    .order('created_at', { ascending: false });

  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  const { data, error } = await query;

  if (error) throw error;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data as any[]) ?? []).map((row) => ({
    id: row.id,
    companyId: row.company_id,
    projectId: row.project_id,
    projectName: row.projects?.name || 'Unknown Project',
    receiptId: row.receipt_id || undefined,
    receiptNumber: row.receipts?.receipt_number || undefined,
    bookingId: row.booking_id || undefined,
    charterDateFrom: row.charter_date_from || undefined,
    charterDateTo: row.charter_date_to || undefined,
    amount: parseFloat(row.amount),
    currency: row.currency,
    thbAmount: parseFloat(row.thb_amount),
    revenueAccount: row.revenue_account,
    charterType: row.charter_type as CharterType | undefined,
    clientName: row.client_name || undefined,
    description: row.description || undefined,
    recognitionStatus: row.recognition_status as RevenueRecognitionStatus,
    createdAt: row.created_at,
    statusLabel: 'Needs Review - Missing Charter Dates',
    daysUntilRecognition: undefined,
  }));
}

// ============================================================================
// Management Fee Auto-Trigger
// ============================================================================

/**
 * Get the management company (Faraway Yachting)
 * The management company is always Faraway Yachting for all projects
 */
async function getManagementCompany(): Promise<{ id: string; name: string } | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('companies')
    .select('id, name')
    .ilike('name', '%Faraway Yachting%')
    .limit(1)
    .single();

  if (error || !data) {
    console.warn('Management company (Faraway Yachting) not found:', error);
    return null;
  }

  return { id: data.id, name: data.name };
}

/**
 * Get project details including management fee percentage
 */
async function getProjectWithFee(projectId: string): Promise<{
  id: string;
  name: string;
  company_id: string;
  management_fee_percentage: number | null;
} | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('projects')
    .select('id, name, company_id, management_fee_percentage')
    .eq('id', projectId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Get company name by ID
 */
async function getCompanyName(companyId: string): Promise<string> {
  const supabase = createClient();

  const { data } = await supabase
    .from('companies')
    .select('name')
    .eq('id', companyId)
    .single();

  return data?.name || 'Unknown Company';
}

/**
 * Auto-trigger management fee when revenue is recognized
 * Called after revenue recognition is completed
 */
async function triggerManagementFee(
  revenueRecord: RevenueRecognition,
  recognitionDate: string
): Promise<void> {
  // Skip if no project - can't calculate management fee without project
  if (!revenueRecord.projectId) {
    return;
  }

  // Get project details with management fee percentage
  const project = await getProjectWithFee(revenueRecord.projectId);
  if (!project) {
    console.warn(`Project ${revenueRecord.projectId} not found for management fee calculation`);
    return;
  }

  // Skip if no management fee configured
  const feePercentage = project.management_fee_percentage;
  if (!feePercentage || feePercentage <= 0) {
    return;
  }

  // Get management company (Faraway Yachting)
  const managementCompany = await getManagementCompany();
  if (!managementCompany) {
    console.warn('Management company not found - skipping management fee');
    return;
  }

  // Skip if project company is same as management company (no intercompany fee needed)
  if (project.company_id === managementCompany.id) {
    return;
  }

  // Calculate management fee
  const grossIncome = revenueRecord.thbAmount;
  const feeAmount = grossIncome * (feePercentage / 100);

  // Get project company name
  const projectCompanyName = await getCompanyName(project.company_id);

  // Prepare event data
  const eventData: ManagementFeeEventData = {
    periodFrom: revenueRecord.charterDateFrom || recognitionDate,
    periodTo: revenueRecord.charterDateTo || recognitionDate,
    projectId: project.id,
    projectName: project.name,
    projectCompanyId: project.company_id,
    managementCompanyId: managementCompany.id,
    feePercentage: feePercentage,
    grossIncome: grossIncome,
    feeAmount: feeAmount,
    currency: 'THB',
  };

  // Create and process management fee event
  try {
    const result = await accountingEventsApi.createAndProcess(
      'MANAGEMENT_FEE_RECOGNIZED',
      recognitionDate,
      [project.company_id, managementCompany.id], // Both companies affected
      eventData as unknown as Record<string, unknown>,
      'revenue_recognition',
      revenueRecord.id,
      revenueRecord.recognizedBy || undefined
    );

    if (result.success) {
      console.log(`Management fee event created: ${feeAmount} THB (${feePercentage}% of ${grossIncome} THB) for ${project.name}`);
    } else {
      console.error(`Failed to create management fee event: ${result.error}`);
    }
  } catch (error) {
    console.error('Error creating management fee event:', error);
  }
}

/**
 * Get records ready for automatic recognition (charter date has passed)
 */
export async function getRecordsReadyForRecognition(): Promise<RevenueRecognition[]> {
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('revenue_recognition' as any)
    .select('*')
    .eq('recognition_status', 'pending')
    .lte('charter_date_to', today);

  if (error) throw error;

  return ((data as unknown as Record<string, unknown>[]) ?? []).map(mapDbRowToRevenueRecognition);
}

/**
 * Manually recognize revenue
 */
export async function recognizeRevenueManually(
  recognitionId: string,
  recognizedBy: string | null,
  trigger: RevenueRecognitionTrigger,
  recognitionDate?: string
): Promise<RevenueRecognition> {
  const supabase = createClient();

  const finalStatus: RevenueRecognitionStatus =
    trigger === 'immediate' ? 'manual_recognized' : 'recognized';

  const finalRecognitionDate = recognitionDate || new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('revenue_recognition' as any)
    .update({
      recognition_status: finalStatus,
      recognition_date: finalRecognitionDate,
      recognition_trigger: trigger,
      recognized_by: recognizedBy,
      updated_at: new Date().toISOString(),
    })
    .eq('id', recognitionId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message || error.details || error.hint || 'Failed to recognize revenue');
  }

  const revenueRecord = mapDbRowToRevenueRecognition(data as unknown as Record<string, unknown>);

  // TODO: Create the recognition journal entry here
  // Dr: Charter Deposits Received (2300)
  // Cr: Revenue (4010-4070)

  // Auto-trigger management fee based on project's management_fee_percentage
  // This creates intercompany journal entries between project company and Faraway Yachting
  await triggerManagementFee(revenueRecord, finalRecognitionDate);

  return revenueRecord;
}

/**
 * Process automatic recognition for all ready records
 * Called by cron job or manual trigger
 */
export async function processAutomaticRecognition(
  systemUserId?: string
): Promise<{ recognized: number; errors: string[] }> {
  const records = await getRecordsReadyForRecognition();
  const errors: string[] = [];
  let recognized = 0;

  for (const record of records) {
    try {
      await recognizeRevenueManually(
        record.id,
        systemUserId || 'system',
        'automatic',
        record.charterDateTo // Recognize on the charter end date
      );
      recognized++;
    } catch (err) {
      errors.push(`Failed to recognize ${record.id}: ${err}`);
    }
  }

  return { recognized, errors };
}

/**
 * Update charter dates for a needs_review record
 */
export async function updateCharterDates(
  recognitionId: string,
  charterDateFrom: string,
  charterDateTo: string
): Promise<RevenueRecognition> {
  const supabase = createClient();

  // Determine new status based on updated dates
  const newStatus = determineInitialStatus(charterDateTo);

  const updates: Record<string, unknown> = {
    charter_date_from: charterDateFrom,
    charter_date_to: charterDateTo,
    recognition_status: newStatus === 'recognized' ? 'recognized' : 'pending',
    updated_at: new Date().toISOString(),
  };

  // If the charter has already passed, set recognition details
  if (newStatus === 'recognized') {
    updates.recognition_date = new Date().toISOString().split('T')[0];
    updates.recognition_trigger = 'automatic';
  }

  const { data, error } = await supabase
    .from('revenue_recognition' as any)
    .update(updates)
    .eq('id', recognitionId)
    .select()
    .single();

  if (error) throw error;

  return mapDbRowToRevenueRecognition(data as unknown as Record<string, unknown>);
}

/**
 * Get deferred revenue summary for dashboard
 */
export async function getDeferredRevenueSummary(
  companyId: string
): Promise<DeferredRevenueSummary> {
  const supabase = createClient();

  const { data, error } = await (supabase.rpc as any)('get_deferred_revenue_balance', {
    p_company_id: companyId,
  });

  if (error) throw error;

  const result = data?.[0] || { total_thb: 0, pending_count: 0, needs_review_count: 0 };

  return {
    totalThb: parseFloat(result.total_thb) || 0,
    pendingCount: parseInt(result.pending_count) || 0,
    needsReviewCount: parseInt(result.needs_review_count) || 0,
  };
}

/**
 * Get revenue recognition record by ID
 */
export async function getById(id: string): Promise<RevenueRecognition | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('revenue_recognition' as any)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return mapDbRowToRevenueRecognition(data as unknown as Record<string, unknown>);
}

/**
 * Get all revenue recognition records for a receipt
 */
export async function getByReceiptId(receiptId: string): Promise<RevenueRecognition[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('revenue_recognition' as any)
    .select('*')
    .eq('receipt_id', receiptId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return ((data as unknown as Record<string, unknown>[]) ?? []).map(mapDbRowToRevenueRecognition);
}

/**
 * Batch-fetch revenue recognition records for multiple receipt IDs.
 * Replaces the N+1 pattern of calling getByReceiptId() per receipt.
 */
export async function getByReceiptIds(receiptIds: string[]): Promise<RevenueRecognition[]> {
  if (receiptIds.length === 0) return [];

  const supabase = createClient();

  const { data, error } = await supabase
    .from('revenue_recognition' as any)
    .select('*')
    .in('receipt_id', receiptIds)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return ((data as unknown as Record<string, unknown>[]) ?? []).map(mapDbRowToRevenueRecognition);
}

/**
 * Get recently recognized revenue (for dashboard)
 */
export async function getRecentlyRecognized(
  companyId?: string,
  limit: number = 50
): Promise<RevenueRecognition[]> {
  const supabase = createClient();

  let query = supabase
    .from('revenue_recognition' as any)
    .select('*')
    .in('recognition_status', ['recognized', 'manual_recognized'])
    .order('recognition_date', { ascending: false })
    .limit(limit);

  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return ((data as unknown as Record<string, unknown>[]) ?? []).map(mapDbRowToRevenueRecognition);
}

/**
 * Check if a receipt has any unrecognized revenue
 */
export async function hasUnrecognizedRevenue(receiptId: string): Promise<boolean> {
  const supabase = createClient();

  const { count, error } = await supabase
    .from('revenue_recognition' as any)
    .select('*', { count: 'exact', head: true })
    .eq('receipt_id', receiptId)
    .in('recognition_status', ['pending', 'needs_review']);

  if (error) throw error;

  return (count ?? 0) > 0;
}

/**
 * Get the revenue account code for a charter type
 */
export function getRevenueAccountCode(charterType?: CharterType | string): string {
  if (!charterType) return '4490'; // Default revenue
  return charterTypeAccountCodes[charterType as CharterType] || '4490';
}

// ============================================================================
// Helper Functions
// ============================================================================

function mapDbRowToRevenueRecognition(row: Record<string, unknown>): RevenueRecognition {
  return {
    id: row.id as string,
    companyId: row.company_id as string,
    projectId: row.project_id as string,
    receiptId: (row.receipt_id as string) || undefined,
    receiptLineItemId: (row.receipt_line_item_id as string) || undefined,
    invoiceId: (row.invoice_id as string) || undefined,
    bookingId: (row.booking_id as string) || undefined,
    charterDateFrom: (row.charter_date_from as string) || undefined,
    charterDateTo: (row.charter_date_to as string) || undefined,
    recognitionStatus: row.recognition_status as RevenueRecognitionStatus,
    amount: parseFloat(row.amount as string),
    currency: row.currency as Currency,
    fxRate: parseFloat(row.fx_rate as string),
    thbAmount: parseFloat(row.thb_amount as string),
    deferredRevenueAccount: row.deferred_revenue_account as string,
    revenueAccount: row.revenue_account as string,
    charterType: (row.charter_type as CharterType) || undefined,
    recognitionDate: (row.recognition_date as string) || undefined,
    recognitionTrigger: (row.recognition_trigger as RevenueRecognitionTrigger) || undefined,
    recognizedBy: (row.recognized_by as string) || undefined,
    deferredJournalEntryId: (row.deferred_journal_entry_id as string) || undefined,
    recognitionJournalEntryId: (row.recognition_journal_entry_id as string) || undefined,
    description: (row.description as string) || undefined,
    clientName: (row.client_name as string) || undefined,
    notes: (row.notes as string) || undefined,
    createdBy: (row.created_by as string) || undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapDbRowToPendingView(row: Record<string, unknown>): PendingRevenueRecognitionView {
  return {
    id: row.id as string,
    companyId: row.company_id as string,
    projectId: row.project_id as string,
    projectName: (row.project_name as string) || 'Unknown Project',
    receiptId: (row.receipt_id as string) || undefined,
    receiptNumber: (row.receipt_number as string) || undefined,
    bookingId: (row.booking_id as string) || undefined,
    charterDateFrom: (row.charter_date_from as string) || undefined,
    charterDateTo: (row.charter_date_to as string) || undefined,
    amount: parseFloat(row.amount as string),
    currency: row.currency as Currency,
    thbAmount: parseFloat(row.thb_amount as string),
    revenueAccount: row.revenue_account as string,
    charterType: (row.charter_type as CharterType) || undefined,
    clientName: (row.client_name as string) || undefined,
    description: (row.description as string) || undefined,
    recognitionStatus: row.recognition_status as RevenueRecognitionStatus,
    createdAt: row.created_at as string,
    statusLabel: row.status_label as string,
    daysUntilRecognition:
      row.days_until_recognition !== null
        ? parseInt(row.days_until_recognition as string)
        : undefined,
  };
}
