import { createClient } from '../client';
import { getNumberFormat, generateDocumentNumber } from '@/data/settings/numberFormats';
import type { DocumentType } from '@/data/settings/numberFormatTypes';
import type { Database } from '../database.types';

type RecycledReceiptNumber = Database['public']['Tables']['recycled_receipt_numbers']['Row'];

/**
 * Document Number Generation API
 *
 * Generates unique, sequential document numbers based on company settings.
 * Numbers are generated using a pattern: PREFIX-YYMMXXXX where XXXX is the sequence.
 * Sequence resets monthly based on the date format configuration.
 *
 * For receipts: Thai accounting requires continuous numbers, so voided receipt
 * numbers are recycled and reused before generating new sequential numbers.
 */

// Table name mapping for each document type
const tableMap: Record<DocumentType, string> = {
  quotation: 'quotations',
  invoice: 'invoices',
  receipt: 'receipts',
  creditNote: 'credit_notes',
  debitNote: 'debit_notes',
  whtCertificate: 'wht_certificates',
};

// Column name for the document number in each table
const numberColumnMap: Record<DocumentType, string> = {
  quotation: 'quotation_number',
  invoice: 'invoice_number',
  receipt: 'receipt_number',
  creditNote: 'credit_note_number',
  debitNote: 'debit_note_number',
  whtCertificate: 'certificate_number',
};

/**
 * Get the current period string based on date format
 */
function getCurrentPeriod(dateFormat: 'YYMM' | 'YYYYMM' | 'MMYY' | 'none'): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  switch (dateFormat) {
    case 'YYMM':
      return `${String(year).slice(-2)}${String(month).padStart(2, '0')}`;
    case 'YYYYMM':
      return `${year}${String(month).padStart(2, '0')}`;
    case 'MMYY':
      return `${String(month).padStart(2, '0')}${String(year).slice(-2)}`;
    case 'none':
      return ''; // No period-based reset
  }
}

/**
 * Get an available recycled receipt number for the company
 * Returns null if no recycled numbers are available or table doesn't exist yet
 */
async function getRecycledReceiptNumber(
  companyId: string
): Promise<RecycledReceiptNumber | null> {
  // Skip if table doesn't exist - check using a simple query first
  // This avoids console errors when migration hasn't been run yet
  try {
    const supabase = createClient();

    // Find the oldest available recycled number (FIFO)
    const { data, error } = await supabase
      .from('recycled_receipt_numbers')
      .select('*')
      .eq('company_id', companyId)
      .is('reused_by_receipt_id', null)
      .order('voided_at', { ascending: true })
      .limit(1);

    if (error) {
      // Silently return null - table might not exist yet (migration not run)
      // or other errors - just fall back to sequential numbers
      return null;
    }

    return data && data.length > 0 ? data[0] : null;
  } catch {
    // Silently handle any unexpected errors - just skip recycled numbers
    return null;
  }
}

/**
 * Mark a recycled receipt number as used
 */
async function markRecycledNumberAsUsed(
  recycledNumberId: string,
  newReceiptId: string
): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase
    .from('recycled_receipt_numbers')
    .update({
      reused_by_receipt_id: newReceiptId,
      reused_at: new Date().toISOString(),
    })
    .eq('id', recycledNumberId);

  if (error) {
    console.error('Error marking recycled number as used:', error);
    return false;
  }

  return true;
}

/**
 * Add a receipt number to the recycled pool when voiding a receipt
 * Returns false if table doesn't exist yet (migration not run) - voiding still works
 */
async function recycleReceiptNumber(
  companyId: string,
  receiptNumber: string,
  voidedReceiptId: string
): Promise<boolean> {
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from('recycled_receipt_numbers')
      .insert({
        company_id: companyId,
        receipt_number: receiptNumber,
        voided_receipt_id: voidedReceiptId,
        voided_at: new Date().toISOString(),
      });

    if (error) {
      // If table doesn't exist yet, just skip recycling (migration not run)
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('Recycled receipt numbers table not yet created. Run migration 018.');
        return false;
      }
      // If duplicate key error, the number is already in the pool
      if (error.code === '23505') {
        console.warn('Receipt number already in recycled pool:', receiptNumber);
        return true;
      }
      console.error('Error recycling receipt number:', error);
      return false;
    }
  } catch {
    // If any error, just skip recycling - voiding still works
    return false;
  }

  return true;
}

/**
 * Generate the next document number for a company
 * For receipts, checks for recycled numbers first (Thai accounting compliance)
 */
export async function getNextDocumentNumber(
  companyId: string,
  docType: DocumentType
): Promise<string> {
  const supabase = createClient();
  const config = getNumberFormat(companyId, docType);
  const tableName = tableMap[docType];
  const numberColumn = numberColumnMap[docType];

  // For receipts, first check for recycled numbers (Thai accounting requirement)
  if (docType === 'receipt') {
    const recycledNumber = await getRecycledReceiptNumber(companyId);
    if (recycledNumber) {
      // Return the recycled number - it will be marked as used when the receipt is saved
      // Store the recycled number info in a temporary way that can be retrieved
      return recycledNumber.receipt_number;
    }
  }

  // Build the prefix pattern to search for
  const currentPeriod = getCurrentPeriod(config.dateFormat);
  const prefix = config.prefix;
  const separator = config.separator;

  // Build search pattern: e.g., "QO-2601" or "INV/2601"
  const searchPattern = currentPeriod
    ? `${prefix}${separator}${currentPeriod}${separator}%`
    : `${prefix}${separator}%`;

  // Query to find the highest sequence number for this period
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from(tableName)
    .select(numberColumn)
    .eq('company_id', companyId)
    .like(numberColumn, searchPattern)
    .order(numberColumn, { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching last document number:', error);
    // Fall back to sequence 1
    return generateDocumentNumber(config, 1);
  }

  let nextSequence = 1;

  if (data && data.length > 0) {
    const lastNumber = data[0][numberColumn] as string;
    // Extract the sequence number from the end
    const parts = lastNumber.split(separator);
    const lastSequenceStr = parts[parts.length - 1];
    const lastSequence = parseInt(lastSequenceStr, 10);

    if (!isNaN(lastSequence)) {
      nextSequence = lastSequence + 1;
    }
  }

  return generateDocumentNumber(config, nextSequence);
}

/**
 * Get the next receipt number, with recycled number info if applicable
 * Returns both the number and whether it's recycled
 */
export async function getNextReceiptNumberWithInfo(
  companyId: string
): Promise<{ receiptNumber: string; isRecycled: boolean; recycledId?: string }> {
  const recycledNumber = await getRecycledReceiptNumber(companyId);

  if (recycledNumber) {
    return {
      receiptNumber: recycledNumber.receipt_number,
      isRecycled: true,
      recycledId: recycledNumber.id,
    };
  }

  // Generate new sequential number
  const receiptNumber = await getNextDocumentNumber(companyId, 'receipt');
  return {
    receiptNumber,
    isRecycled: false,
  };
}

/**
 * Check if a document number already exists
 */
export async function documentNumberExists(
  companyId: string,
  docType: DocumentType,
  documentNumber: string
): Promise<boolean> {
  const supabase = createClient();
  const tableName = tableMap[docType];
  const numberColumn = numberColumnMap[docType];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from(tableName)
    .select('id')
    .eq('company_id', companyId)
    .eq(numberColumn, documentNumber)
    .limit(1);

  if (error) {
    console.error('Error checking document number:', error);
    return false;
  }

  return data !== null && data.length > 0;
}

export const documentNumbersApi = {
  getNextDocumentNumber,
  getNextReceiptNumberWithInfo,
  documentNumberExists,
  // Receipt number recycling functions
  getRecycledReceiptNumber,
  markRecycledNumberAsUsed,
  recycleReceiptNumber,
};
