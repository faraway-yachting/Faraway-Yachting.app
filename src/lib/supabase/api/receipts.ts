import { createClient } from '../client';
import type { Database } from '../database.types';
import type { EventProcessResult, ReceiptReceivedEventData } from '@/lib/accounting/eventTypes';
import { bankAccountsApi } from './bankAccounts';
import { journalEntriesApi } from './journalEntries';

type Receipt = Database['public']['Tables']['receipts']['Row'];
type ReceiptInsert = Database['public']['Tables']['receipts']['Insert'];
type ReceiptUpdate = Database['public']['Tables']['receipts']['Update'];
type ReceiptLineItem = Database['public']['Tables']['receipt_line_items']['Row'];
type ReceiptLineItemInsert = Database['public']['Tables']['receipt_line_items']['Insert'];
type ReceiptPaymentRecord = Database['public']['Tables']['receipt_payment_records']['Row'];
type ReceiptPaymentRecordInsert = Database['public']['Tables']['receipt_payment_records']['Insert'];

export type ReceiptWithDetails = Receipt & {
  line_items: ReceiptLineItem[];
  payment_records: ReceiptPaymentRecord[];
};

export const receiptsApi = {
  async getAll(): Promise<Receipt[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .order('receipt_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<Receipt | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async getByIdWithDetails(id: string): Promise<ReceiptWithDetails | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('receipts')
      .select(`
        *,
        line_items:receipt_line_items(*),
        payment_records:receipt_payment_records(*)
      `)
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as ReceiptWithDetails;
  },

  // Alias for getByIdWithDetails (for forms that just need line items)
  async getByIdWithLineItems(id: string): Promise<ReceiptWithDetails | null> {
    return this.getByIdWithDetails(id);
  },

  async create(receipt: ReceiptInsert, lineItems?: ReceiptLineItemInsert[]): Promise<Receipt> {
    const supabase = createClient();

    const { data: receiptData, error: receiptError } = await supabase
      .from('receipts')
      .insert([receipt])
      .select()
      .single();
    if (receiptError) throw receiptError;

    if (lineItems && lineItems.length > 0) {
      const lineItemsWithReceiptId = lineItems.map((item, index) => ({
        ...item,
        receipt_id: receiptData.id,
        line_order: index + 1
      }));

      const { error: lineItemsError } = await supabase
        .from('receipt_line_items')
        .insert(lineItemsWithReceiptId);
      if (lineItemsError) throw lineItemsError;
    }

    return receiptData;
  },

  async update(id: string, updates: ReceiptUpdate): Promise<Receipt> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('receipts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();

    // Delete related journal entries first
    await journalEntriesApi.deleteBySourceDocument('receipt', id);

    // Then delete the receipt (line items and payment records cascade)
    const { error } = await supabase
      .from('receipts')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getByStatus(status: 'draft' | 'paid' | 'void'): Promise<Receipt[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('status', status)
      .order('receipt_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getByClient(clientId: string): Promise<Receipt[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('client_id', clientId)
      .order('receipt_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getByCompany(companyId: string): Promise<Receipt[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('company_id', companyId)
      .order('receipt_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getByDateRange(startDate: string, endDate: string): Promise<Receipt[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .gte('receipt_date', startDate)
      .lte('receipt_date', endDate)
      .order('receipt_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  // Line items operations
  async getLineItems(receiptId: string): Promise<ReceiptLineItem[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('receipt_line_items')
      .select('*')
      .eq('receipt_id', receiptId)
      .order('line_order');
    if (error) throw error;
    return data ?? [];
  },

  async updateLineItems(receiptId: string, lineItems: ReceiptLineItemInsert[]): Promise<void> {
    const supabase = createClient();

    const { error: deleteError } = await supabase
      .from('receipt_line_items')
      .delete()
      .eq('receipt_id', receiptId);
    if (deleteError) throw deleteError;

    if (lineItems.length > 0) {
      const lineItemsWithOrder = lineItems.map((item, index) => ({
        ...item,
        receipt_id: receiptId,
        line_order: index + 1
      }));

      const { error: insertError } = await supabase
        .from('receipt_line_items')
        .insert(lineItemsWithOrder);
      if (insertError) throw insertError;
    }
  },

  // Payment records operations
  async getPaymentRecords(receiptId: string): Promise<ReceiptPaymentRecord[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('receipt_payment_records')
      .select('*')
      .eq('receipt_id', receiptId)
      .order('payment_date');
    if (error) throw error;
    return data ?? [];
  },

  async addPaymentRecord(paymentRecord: ReceiptPaymentRecordInsert): Promise<ReceiptPaymentRecord> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('receipt_payment_records')
      .insert([paymentRecord])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deletePaymentRecord(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('receipt_payment_records')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // Get receipts with line items by date range (for reports)
  async getWithLineItemsByDateRange(startDate: string, endDate: string): Promise<ReceiptWithDetails[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('receipts')
      .select(`
        *,
        line_items:receipt_line_items(*),
        payment_records:receipt_payment_records(*)
      `)
      .gte('receipt_date', startDate)
      .lte('receipt_date', endDate)
      .eq('status', 'paid')
      .order('receipt_date', { ascending: false });
    if (error) throw error;
    return (data ?? []) as ReceiptWithDetails[];
  },

  // Create receipt with line items and payment records, AND create journal entry if status is 'paid'
  async createWithJournalEntry(
    receipt: ReceiptInsert,
    lineItems: ReceiptLineItemInsert[],
    paymentRecords: ReceiptPaymentRecordInsert[],
    createdBy: string
  ): Promise<{ receipt: Receipt; journalResult: import('@/lib/accounting/journalPostingService').JournalPostingResult | null }> {
    // Import dynamically to avoid circular dependencies
    const { createReceiptJournalEntry } = await import('@/lib/accounting/journalPostingService');

    // Create receipt
    const createdReceipt = await this.create(receipt);

    // Add line items
    if (lineItems.length > 0) {
      await this.updateLineItems(createdReceipt.id, lineItems);
    }

    // Add payment records
    for (const paymentRecord of paymentRecords) {
      await this.addPaymentRecord({
        ...paymentRecord,
        receipt_id: createdReceipt.id,
      });
    }

    // Only create journal entry if status is 'paid'
    let journalResult: import('@/lib/accounting/journalPostingService').JournalPostingResult | null = null;

    if (receipt.status === 'paid') {
      try {
        journalResult = await createReceiptJournalEntry(
          {
            receiptId: createdReceipt.id,
            companyId: receipt.company_id,
            receiptNumber: receipt.receipt_number,
            receiptDate: receipt.receipt_date,
            clientName: receipt.client_name,
            lineItems: lineItems.map(li => ({
              description: li.description || '',
              accountCode: null, // Receipts don't have account codes on line items currently
              amount: li.amount || 0,
            })),
            totalSubtotal: receipt.subtotal || 0,
            totalVatAmount: receipt.tax_amount || 0,
            totalAmount: receipt.total_amount || 0,
            payments: paymentRecords.map(p => ({
              amount: p.amount,
              bankAccountId: p.received_at !== 'cash' ? p.received_at : null,
              paymentMethod: p.received_at === 'cash' ? 'cash' : 'bank_transfer',
            })),
            currency: receipt.currency || 'THB',
          },
          createdBy
        );
      } catch (error) {
        console.error('Failed to create receipt journal entry:', error);
        journalResult = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    return { receipt: createdReceipt, journalResult };
  },

  // Update receipt status to 'paid' AND create journal entry
  async markAsPaidWithJournalEntry(
    receiptId: string,
    createdBy: string
  ): Promise<{ receipt: Receipt; journalResult: import('@/lib/accounting/journalPostingService').JournalPostingResult }> {
    // Import dynamically to avoid circular dependencies
    const { createReceiptJournalEntry } = await import('@/lib/accounting/journalPostingService');

    // Get receipt with details
    const receipt = await this.getByIdWithDetails(receiptId);
    if (!receipt) throw new Error('Receipt not found');

    // Update status
    const updatedReceipt = await this.update(receiptId, { status: 'paid' });

    // Create journal entry
    let journalResult: import('@/lib/accounting/journalPostingService').JournalPostingResult = {
      success: false,
      error: 'Not attempted',
    };

    try {
      journalResult = await createReceiptJournalEntry(
        {
          receiptId: receipt.id,
          companyId: receipt.company_id,
          receiptNumber: receipt.receipt_number,
          receiptDate: receipt.receipt_date,
          clientName: receipt.client_name,
          lineItems: (receipt.line_items || []).map(li => ({
            description: li.description || '',
            accountCode: null,
            amount: li.amount || 0,
          })),
          totalSubtotal: receipt.subtotal || 0,
          totalVatAmount: receipt.tax_amount || 0,
          totalAmount: receipt.total_amount || 0,
          payments: (receipt.payment_records || []).map(p => ({
            amount: p.amount,
            bankAccountId: p.received_at !== 'cash' ? p.received_at : null,
            paymentMethod: p.received_at === 'cash' ? 'cash' : 'bank_transfer',
          })),
          currency: receipt.currency || 'THB',
        },
        createdBy
      );
    } catch (error) {
      console.error('Failed to create receipt journal entry:', error);
      journalResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    return { receipt: updatedReceipt, journalResult };
  },

  // ============================================================================
  // EVENT-DRIVEN METHODS (New approach - gradual migration)
  // ============================================================================

  /**
   * Create receipt with event-driven journal generation
   * Creates RECEIPT_RECEIVED event which generates journal entry (if status is 'paid')
   */
  async createWithEvent(
    receipt: ReceiptInsert,
    lineItems: ReceiptLineItemInsert[],
    paymentRecords: ReceiptPaymentRecordInsert[],
    createdBy: string
  ): Promise<{ receipt: Receipt; eventResult: EventProcessResult | null }> {
    // Import dynamically to avoid circular dependencies
    const { accountingEventsApi } = await import('./accountingEvents');

    // Create receipt
    const createdReceipt = await this.create(receipt);

    // Add line items
    if (lineItems.length > 0) {
      await this.updateLineItems(createdReceipt.id, lineItems);
    }

    // Add payment records
    const createdPayments: ReceiptPaymentRecord[] = [];
    for (const paymentRecord of paymentRecords) {
      const payment = await this.addPaymentRecord({
        ...paymentRecord,
        receipt_id: createdReceipt.id,
      });
      createdPayments.push(payment);
    }

    // Only create event if status is 'paid'
    let eventResult: EventProcessResult | null = null;

    if (receipt.status === 'paid' && createdPayments.length > 0) {
      // Build payment data with GL codes
      const paymentsWithGlCodes = await Promise.all(
        createdPayments.map(async (p) => {
          let bankGlCode: string | null = null;
          const bankAccountId = p.received_at !== 'cash' ? p.received_at : null;
          if (bankAccountId) {
            try {
              const bankAccount = await bankAccountsApi.getById(bankAccountId);
              bankGlCode = bankAccount?.gl_account_code || null;
            } catch {
              console.warn('Could not fetch bank account GL code');
            }
          }
          return {
            amount: p.amount,
            bankAccountId,
            bankAccountGlCode: bankGlCode,
            paymentMethod: p.received_at === 'cash' ? 'cash' : 'bank_transfer',
          };
        })
      );

      // Build event data
      const eventData: ReceiptReceivedEventData = {
        receiptId: createdReceipt.id,
        receiptNumber: receipt.receipt_number,
        clientName: receipt.client_name,
        receiptDate: receipt.receipt_date,
        lineItems: lineItems.map((li) => ({
          description: li.description || '',
          accountCode: null,
          amount: li.amount || 0,
        })),
        payments: paymentsWithGlCodes,
        totalSubtotal: receipt.subtotal || 0,
        totalVatAmount: receipt.tax_amount || 0,
        totalAmount: receipt.total_amount || 0,
        currency: receipt.currency || 'THB',
      };

      // Create and process event
      eventResult = await accountingEventsApi.createAndProcess(
        'RECEIPT_RECEIVED',
        receipt.receipt_date,
        [receipt.company_id],
        eventData as unknown as Record<string, unknown>,
        'receipt',
        createdReceipt.id,
        createdBy
      );
    }

    return { receipt: createdReceipt, eventResult };
  },

  /**
   * Mark receipt as paid using event-driven journal generation
   * Creates RECEIPT_RECEIVED event which generates journal entry
   */
  async markAsPaidWithEvent(
    receiptId: string,
    createdBy: string
  ): Promise<{ receipt: Receipt; eventResult: EventProcessResult }> {
    // Import dynamically to avoid circular dependencies
    const { accountingEventsApi } = await import('./accountingEvents');

    // Get receipt with details
    const receipt = await this.getByIdWithDetails(receiptId);
    if (!receipt) throw new Error('Receipt not found');

    // Check for duplicate event
    const isDuplicate = await accountingEventsApi.checkDuplicate(
      'RECEIPT_RECEIVED',
      'receipt',
      receiptId
    );
    if (isDuplicate) {
      throw new Error('A receipt event already exists for this receipt');
    }

    // Update status
    const updatedReceipt = await this.update(receiptId, { status: 'paid' });

    // Build payment data with GL codes
    const paymentsWithGlCodes = await Promise.all(
      (receipt.payment_records || []).map(async (p) => {
        let bankGlCode: string | null = null;
        const bankAccountId = p.received_at !== 'cash' ? p.received_at : null;
        if (bankAccountId) {
          try {
            const bankAccount = await bankAccountsApi.getById(bankAccountId);
            bankGlCode = bankAccount?.gl_account_code || null;
          } catch {
            console.warn('Could not fetch bank account GL code');
          }
        }
        return {
          amount: p.amount,
          bankAccountId,
          bankAccountGlCode: bankGlCode,
          paymentMethod: p.received_at === 'cash' ? 'cash' : 'bank_transfer',
        };
      })
    );

    // Build event data
    const eventData: ReceiptReceivedEventData = {
      receiptId: receipt.id,
      receiptNumber: receipt.receipt_number,
      clientName: receipt.client_name,
      receiptDate: receipt.receipt_date,
      lineItems: (receipt.line_items || []).map((li) => ({
        description: li.description || '',
        accountCode: null,
        amount: li.amount || 0,
      })),
      payments: paymentsWithGlCodes,
      totalSubtotal: receipt.subtotal || 0,
      totalVatAmount: receipt.tax_amount || 0,
      totalAmount: receipt.total_amount || 0,
      currency: receipt.currency || 'THB',
    };

    // Create and process event
    const eventResult = await accountingEventsApi.createAndProcess(
      'RECEIPT_RECEIVED',
      receipt.receipt_date,
      [receipt.company_id],
      eventData as unknown as Record<string, unknown>,
      'receipt',
      receipt.id,
      createdBy
    );

    return { receipt: updatedReceipt, eventResult };
  },

  // ============================================================================
  // VOID RECEIPT WITH NUMBER RECYCLING (Thai accounting compliance)
  // ============================================================================

  /**
   * Void a receipt and recycle its number for reuse
   * Thai accounting requires continuous receipt numbers - voided numbers must be reused
   *
   * Process:
   * 1. Store original receipt number in original_receipt_number field (if column exists)
   * 2. Add the number to recycled_receipt_numbers pool (if table exists)
   * 3. Update receipt with VOID prefix and mark as voided
   *
   * Note: If migration 018 hasn't been run yet, the function will still void the receipt
   * but without recycling the number or storing the original number.
   */
  async voidReceipt(
    receiptId: string,
    voidReason: string
  ): Promise<{ receipt: Receipt; numberRecycled: boolean }> {
    const supabase = createClient();
    const { documentNumbersApi } = await import('./documentNumbers');

    // Get the current receipt
    const receipt = await this.getById(receiptId);
    if (!receipt) {
      throw new Error('Receipt not found');
    }

    if (receipt.status === 'void') {
      throw new Error('Receipt is already voided');
    }

    // Delete related journal entries
    await journalEntriesApi.deleteBySourceDocument('receipt', receiptId);

    const originalNumber = receipt.receipt_number;

    // Step 1: Try to add the number to the recycled pool (may fail if table doesn't exist)
    let numberRecycled = false;
    try {
      numberRecycled = await documentNumbersApi.recycleReceiptNumber(
        receipt.company_id,
        originalNumber,
        receiptId
      );
    } catch {
      // Silently ignore - recycling table might not exist yet (migration 018 not run)
      console.warn('Could not recycle receipt number - migration 018 may not be run yet');
    }

    // Step 2: Generate a new "VOID-" prefixed number for the voided receipt
    const voidNumber = `VOID-${originalNumber}`;

    // Step 3: Update the receipt - try with original_receipt_number first
    // If that column doesn't exist, fall back to basic update
    let updatedReceipt: Receipt;

    try {
      // Try update with original_receipt_number column (requires migration 018)
      const { data, error } = await supabase
        .from('receipts')
        .update({
          status: 'void',
          receipt_number: voidNumber,
          original_receipt_number: originalNumber,
          notes: receipt.notes
            ? `${receipt.notes}\n\n[VOIDED: ${voidReason}]`
            : `[VOIDED: ${voidReason}]`,
        } as Record<string, unknown>)
        .eq('id', receiptId)
        .select()
        .single();

      if (error) {
        // Check if error is due to missing column
        if (error.message?.includes('original_receipt_number') || error.code === '42703') {
          throw new Error('COLUMN_NOT_EXISTS');
        }
        throw error;
      }

      updatedReceipt = data;
    } catch (err) {
      // If column doesn't exist, do basic update without original_receipt_number
      if (err instanceof Error && err.message === 'COLUMN_NOT_EXISTS') {
        console.warn('original_receipt_number column not found - run migration 018');
      }

      // Fall back to basic update without original_receipt_number
      const { data, error } = await supabase
        .from('receipts')
        .update({
          status: 'void',
          receipt_number: voidNumber,
          notes: receipt.notes
            ? `${receipt.notes}\n\n[VOIDED: ${voidReason}]`
            : `[VOIDED: ${voidReason}]`,
        })
        .eq('id', receiptId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      updatedReceipt = data;
    }

    return {
      receipt: updatedReceipt,
      numberRecycled,
    };
  },

  /**
   * Create a new receipt using a recycled number if available
   * Returns the created receipt and info about whether a recycled number was used
   */
  async createWithRecycledNumber(
    receipt: ReceiptInsert,
    lineItems?: ReceiptLineItemInsert[]
  ): Promise<{ receipt: Receipt; usedRecycledNumber: boolean }> {
    const { documentNumbersApi } = await import('./documentNumbers');

    // Check if there's a recycled number available
    const recycledInfo = await documentNumbersApi.getNextReceiptNumberWithInfo(receipt.company_id);

    // If the receipt doesn't have a number yet, use the next available (recycled or new)
    const receiptToCreate = {
      ...receipt,
      receipt_number: receipt.receipt_number || recycledInfo.receiptNumber,
      is_using_recycled_number: recycledInfo.isRecycled,
    };

    // Create the receipt
    const createdReceipt = await this.create(receiptToCreate, lineItems);

    // If we used a recycled number, mark it as used
    if (recycledInfo.isRecycled && recycledInfo.recycledId) {
      await documentNumbersApi.markRecycledNumberAsUsed(
        recycledInfo.recycledId,
        createdReceipt.id
      );
    }

    return {
      receipt: createdReceipt,
      usedRecycledNumber: recycledInfo.isRecycled,
    };
  },
};
