/**
 * Inventory Purchases API
 *
 * CRUD operations for inventory purchases, including payment recording,
 * petty cash integration, and consumption tracking.
 *
 * Accounting model:
 *   Purchase:  Debit 1200 (Inventory), Credit Bank/Cash/Petty Cash
 *   Consume:   Debit 5xxx (Expense),   Credit 1200 (Inventory)
 */

import { createClient } from '../client';
import type { Database } from '../database.types';
import type {
  EventProcessResult,
  InventoryPurchaseRecordedEventData,
  InventoryConsumedEventData,
} from '@/lib/accounting/eventTypes';

// ============================================================================
// Type Aliases (manual until database types are regenerated)
// ============================================================================

export type InventoryPurchaseRow = {
  id: string;
  purchase_number: string;
  company_id: string;
  vendor_id: string | null;
  vendor_name: string | null;
  supplier_invoice_number: string | null;
  supplier_invoice_date: string | null;
  purchase_date: string;
  category: string | null;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  pricing_type: string;
  currency: string;
  fx_rate: number | null;
  fx_rate_source: string | null;
  fx_rate_date: string | null;
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  net_payable: number;
  thb_subtotal: number | null;
  thb_vat_amount: number | null;
  thb_total_amount: number | null;
  thb_net_payable: number | null;
  payment_status: string;
  amount_paid: number;
  amount_outstanding: number;
  status: string;
  received_date: string | null;
  received_by: string | null;
  voided_date: string | null;
  void_reason: string | null;
  receipt_status: string;
  receipt_received_date: string | null;
  receipt_received_by: string | null;
  notes: string | null;
  attachments: unknown;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type InventoryPurchaseLineItemRow = {
  id: string;
  purchase_id: string;
  project_id: string;
  description: string;
  sku: string | null;
  unit: string | null;
  quantity: number;
  quantity_consumed: number;
  unit_price: number;
  tax_rate: number;
  amount: number;
  pre_vat_amount: number;
  account_code: string;
  expense_account_code: string | null;
  attachments: unknown;
  line_order: number;
};

export type InventoryConsumptionRecordRow = {
  id: string;
  line_item_id: string;
  quantity: number;
  project_id: string;
  expense_account_code: string;
  consumed_date: string;
  consumed_by: string | null;
  notes: string | null;
  created_at: string;
};

export type InventoryPurchasePaymentRow = {
  id: string;
  purchase_id: string;
  payment_date: string;
  amount: number;
  payment_type: string;
  bank_account_id: string | null;
  bank_account_gl_code: string | null;
  petty_cash_wallet_id: string | null;
  petty_cash_expense_id: string | null;
  reference: string | null;
  remark: string | null;
  fx_rate: number | null;
  thb_amount: number | null;
};

export type InventoryPurchaseWithDetails = InventoryPurchaseRow & {
  line_items: (InventoryPurchaseLineItemRow & {
    consumption_records?: InventoryConsumptionRecordRow[];
  })[];
  payments: InventoryPurchasePaymentRow[];
};

// Insert types (omit auto-generated fields)
export type InventoryPurchaseInsert = Omit<InventoryPurchaseRow,
  'id' | 'created_at' | 'updated_at' | 'purchase_number'
> & {
  id?: string;
  purchase_number?: string;
};

export type InventoryPurchaseLineItemInsert = Omit<InventoryPurchaseLineItemRow,
  'id' | 'quantity_consumed'
> & {
  id?: string;
  quantity_consumed?: number;
};

export type InventoryPurchasePaymentInsert = Omit<InventoryPurchasePaymentRow, 'id'> & {
  id?: string;
};

// ============================================================================
// API
// ============================================================================

export const inventoryPurchasesApi = {

  // --------------------------------------------------------------------------
  // Query Operations
  // --------------------------------------------------------------------------

  async getAll(): Promise<InventoryPurchaseRow[]> {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('inventory_purchases')
      .select('*')
      .order('purchase_date', { ascending: false })
      .limit(500);
    if (error) throw error;
    return (data ?? []) as InventoryPurchaseRow[];
  },

  async getByCompany(companyId: string): Promise<InventoryPurchaseRow[]> {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('inventory_purchases')
      .select('*')
      .eq('company_id', companyId)
      .order('purchase_date', { ascending: false });
    if (error) throw error;
    return (data ?? []) as InventoryPurchaseRow[];
  },

  async getByCreator(userId: string): Promise<InventoryPurchaseRow[]> {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('inventory_purchases')
      .select('*')
      .eq('created_by', userId)
      .order('purchase_date', { ascending: false });
    if (error) throw error;
    return (data ?? []) as InventoryPurchaseRow[];
  },

  async getById(id: string): Promise<InventoryPurchaseRow | null> {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('inventory_purchases')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as InventoryPurchaseRow;
  },

  async getByIdWithDetails(id: string): Promise<InventoryPurchaseWithDetails | null> {
    const supabase = createClient();

    // Get purchase
    const { data: purchase, error: purchaseError } = await (supabase as any)
      .from('inventory_purchases')
      .select('*')
      .eq('id', id)
      .single();
    if (purchaseError) {
      if (purchaseError.code === 'PGRST116') return null;
      throw purchaseError;
    }

    // Get line items
    const { data: lineItems, error: liError } = await (supabase as any)
      .from('inventory_purchase_line_items')
      .select('*')
      .eq('purchase_id', id)
      .order('line_order', { ascending: true });
    if (liError) throw liError;

    // Get consumption records for all line items
    const lineItemIds = (lineItems || []).map((li: InventoryPurchaseLineItemRow) => li.id);
    let consumptionRecords: InventoryConsumptionRecordRow[] = [];
    if (lineItemIds.length > 0) {
      const { data: records, error: crError } = await (supabase as any)
        .from('inventory_consumption_records')
        .select('*')
        .in('line_item_id', lineItemIds)
        .order('consumed_date', { ascending: true });
      if (crError) throw crError;
      consumptionRecords = (records ?? []) as InventoryConsumptionRecordRow[];
    }

    // Get payments
    const { data: payments, error: payError } = await (supabase as any)
      .from('inventory_purchase_payments')
      .select('*')
      .eq('purchase_id', id)
      .order('payment_date', { ascending: true });
    if (payError) throw payError;

    // Attach consumption records to their line items
    const lineItemsWithConsumption = (lineItems || []).map((li: InventoryPurchaseLineItemRow) => ({
      ...li,
      consumption_records: consumptionRecords.filter((cr) => cr.line_item_id === li.id),
    }));

    return {
      ...(purchase as InventoryPurchaseRow),
      line_items: lineItemsWithConsumption,
      payments: (payments ?? []) as InventoryPurchasePaymentRow[],
    };
  },

  // --------------------------------------------------------------------------
  // Purchase Number Generation
  // --------------------------------------------------------------------------

  async generatePurchaseNumber(companyId: string): Promise<string> {
    const supabase = createClient();
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `PO-INV-${yy}${mm}`;

    const { count, error } = await (supabase as any)
      .from('inventory_purchases')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .like('purchase_number', `${prefix}%`);

    if (error) throw error;
    const seq = (count || 0) + 1;
    return `${prefix}-${String(seq).padStart(4, '0')}`;
  },

  // --------------------------------------------------------------------------
  // Create (Draft — no payment)
  // --------------------------------------------------------------------------

  async create(
    purchase: InventoryPurchaseInsert,
    lineItems: Omit<InventoryPurchaseLineItemInsert, 'purchase_id'>[]
  ): Promise<InventoryPurchaseRow> {
    const supabase = createClient();

    // Generate purchase number
    const purchaseNumber = await this.generatePurchaseNumber(purchase.company_id);

    // Insert purchase
    const { data, error } = await (supabase as any)
      .from('inventory_purchases')
      .insert({
        ...purchase,
        purchase_number: purchaseNumber,
        amount_outstanding: purchase.net_payable,
      })
      .select()
      .single();
    if (error) throw error;

    // Insert line items
    if (lineItems.length > 0) {
      const itemsToInsert = lineItems.map((li, idx) => ({
        ...li,
        purchase_id: data.id,
        line_order: li.line_order ?? idx + 1,
        account_code: '1200', // Always inventory asset
      }));

      const { error: liError } = await (supabase as any)
        .from('inventory_purchase_line_items')
        .insert(itemsToInsert);
      if (liError) throw liError;
    }

    return data as InventoryPurchaseRow;
  },

  // --------------------------------------------------------------------------
  // Record With Payment (main method)
  // Creates purchase + line items + payment + journal entry
  // --------------------------------------------------------------------------

  async recordWithPayment(
    purchase: InventoryPurchaseInsert,
    lineItems: Omit<InventoryPurchaseLineItemInsert, 'purchase_id'>[],
    payment: {
      paymentDate: string;
      amount: number;
      paymentType: 'bank' | 'cash' | 'petty_cash';
      bankAccountId?: string;
      pettyWalletId?: string;
      reference?: string;
      remark?: string;
      fxRate?: number;
      thbAmount?: number;
    },
    createdBy: string
  ): Promise<{
    purchase: InventoryPurchaseRow;
    payment: InventoryPurchasePaymentRow;
    eventResult: EventProcessResult;
    pettyCashExpenseId?: string;
  }> {
    // Import dynamically to avoid circular dependencies
    const { accountingEventsApi } = await import('./accountingEvents');
    const { bankAccountsApi } = await import('./bankAccounts');

    // 1. Create purchase record with status 'received' and paid
    const purchaseRecord = await this.create(
      {
        ...purchase,
        status: 'received',
        received_date: purchase.purchase_date,
        payment_status: 'paid',
        amount_paid: payment.amount,
        amount_outstanding: 0,
      },
      lineItems
    );

    // 2. Resolve payment GL code
    let bankAccountGlCode: string | undefined;
    let pettyCashGlCode: string | undefined;
    let pettyCashWalletName: string | undefined;
    let pettyCashExpenseId: string | undefined;

    if (payment.paymentType === 'bank' && payment.bankAccountId) {
      const bankAccount = await bankAccountsApi.getById(payment.bankAccountId);
      bankAccountGlCode = bankAccount?.gl_account_code || '1010';
    }

    if (payment.paymentType === 'petty_cash' && payment.pettyWalletId) {
      const { pettyCashApi } = await import('./pettyCash');

      // Get wallet to determine GL code from currency
      const supabase = createClient();
      const { data: wallet } = await (supabase as any)
        .from('petty_cash_wallets')
        .select('*')
        .eq('id', payment.pettyWalletId)
        .single();

      if (wallet) {
        pettyCashWalletName = wallet.wallet_name;
        // Map currency to petty cash GL code
        switch (wallet.currency) {
          case 'EUR': pettyCashGlCode = '1001'; break;
          case 'USD': pettyCashGlCode = '1002'; break;
          default: pettyCashGlCode = '1000'; break; // THB
        }

        // Create petty cash expense record for wallet balance tracking
        // Do NOT fire PETTYCASH_EXPENSE_CREATED event (we fire INVENTORY_PURCHASE_RECORDED instead)
        const { data: pcExpense, error: pcError } = await (supabase as any)
          .from('petty_cash_expenses')
          .insert({
            expense_number: `PC-INV-${purchaseRecord.purchase_number}`,
            wallet_id: payment.pettyWalletId,
            company_id: purchase.company_id,
            expense_date: payment.paymentDate,
            description: `Inventory purchase: ${purchaseRecord.purchase_number}`,
            project_id: lineItems[0]?.project_id,
            amount: payment.amount,
            status: 'submitted',
            created_by: createdBy,
            expense_account_code: '1200', // Inventory asset
          })
          .select()
          .single();

        if (pcError) throw pcError;
        pettyCashExpenseId = pcExpense?.id;
      }
    }

    // 3. Insert payment record
    const supabase = createClient();
    const { data: paymentRecord, error: payError } = await (supabase as any)
      .from('inventory_purchase_payments')
      .insert({
        purchase_id: purchaseRecord.id,
        payment_date: payment.paymentDate,
        amount: payment.amount,
        payment_type: payment.paymentType,
        bank_account_id: payment.bankAccountId || null,
        bank_account_gl_code: bankAccountGlCode || null,
        petty_cash_wallet_id: payment.pettyWalletId || null,
        petty_cash_expense_id: pettyCashExpenseId || null,
        reference: payment.reference || null,
        remark: payment.remark || null,
        fx_rate: payment.fxRate || null,
        thb_amount: payment.thbAmount || null,
      })
      .select()
      .single();
    if (payError) throw payError;

    // 4. Fire INVENTORY_PURCHASE_RECORDED event → journal: Debit 1200, Credit payment GL
    const eventData: InventoryPurchaseRecordedEventData = {
      purchaseId: purchaseRecord.id,
      purchaseNumber: purchaseRecord.purchase_number,
      vendorName: purchase.vendor_name || 'Unknown Vendor',
      purchaseDate: purchase.purchase_date,
      lineItems: lineItems.map((li) => ({
        description: li.description,
        amount: li.pre_vat_amount || li.amount,
      })),
      totalSubtotal: purchase.subtotal,
      totalVatAmount: purchase.vat_amount,
      totalAmount: purchase.total_amount,
      totalNetPayable: purchase.net_payable,
      currency: purchase.currency,
      paymentType: payment.paymentType,
      bankAccountGlCode,
      pettyCashGlCode,
      pettyCashWalletName,
    };

    const eventResult = await accountingEventsApi.createAndProcess(
      'INVENTORY_PURCHASE_RECORDED',
      purchase.purchase_date,
      [purchase.company_id],
      eventData as unknown as Record<string, unknown>,
      'inventory_purchase',
      purchaseRecord.id,
      createdBy
    );

    return {
      purchase: purchaseRecord,
      payment: paymentRecord as InventoryPurchasePaymentRow,
      eventResult,
      pettyCashExpenseId,
    };
  },

  // --------------------------------------------------------------------------
  // Consume Items (partial consumption with project transfer support)
  // --------------------------------------------------------------------------

  async consumeItems(
    purchaseId: string,
    consumptions: {
      lineItemId: string;
      quantity: number;
      projectId: string;
      expenseAccountCode: string;
      notes?: string;
    }[],
    consumedDate: string,
    consumedBy: string
  ): Promise<EventProcessResult> {
    const { accountingEventsApi } = await import('./accountingEvents');
    const { projectsApi } = await import('./projects');
    const supabase = createClient();

    // Get purchase for context
    const purchase = await this.getByIdWithDetails(purchaseId);
    if (!purchase) throw new Error('Purchase not found');

    const consumptionEventItems = [];

    for (const consumption of consumptions) {
      // Find the line item
      const lineItem = purchase.line_items.find((li) => li.id === consumption.lineItemId);
      if (!lineItem) throw new Error(`Line item not found: ${consumption.lineItemId}`);

      // Validate remaining quantity
      const remaining = lineItem.quantity - lineItem.quantity_consumed;
      if (consumption.quantity > remaining) {
        throw new Error(
          `Cannot consume ${consumption.quantity} of "${lineItem.description}" — only ${remaining} remaining`
        );
      }

      // Insert consumption record
      const { error: crError } = await (supabase as any)
        .from('inventory_consumption_records')
        .insert({
          line_item_id: consumption.lineItemId,
          quantity: consumption.quantity,
          project_id: consumption.projectId,
          expense_account_code: consumption.expenseAccountCode,
          consumed_date: consumedDate,
          consumed_by: consumedBy,
          notes: consumption.notes || null,
        });
      if (crError) throw crError;

      // Update quantity_consumed on line item
      const newQuantityConsumed = lineItem.quantity_consumed + consumption.quantity;
      const { error: updateError } = await (supabase as any)
        .from('inventory_purchase_line_items')
        .update({ quantity_consumed: newQuantityConsumed })
        .eq('id', consumption.lineItemId);
      if (updateError) throw updateError;

      // Calculate cost of consumed items
      const costPerUnit = lineItem.pre_vat_amount / lineItem.quantity;
      const consumedAmount = costPerUnit * consumption.quantity;

      // Get project name for description
      let projectName: string | undefined;
      try {
        const project = await projectsApi.getById(consumption.projectId);
        projectName = project?.name || undefined;
      } catch {
        // Non-critical
      }

      consumptionEventItems.push({
        lineItemId: consumption.lineItemId,
        description: lineItem.description,
        quantity: consumption.quantity,
        amount: Math.round(consumedAmount * 100) / 100,
        projectId: consumption.projectId,
        projectName,
        expenseAccountCode: consumption.expenseAccountCode,
      });
    }

    // Fire INVENTORY_CONSUMED event → journal: Debit 5xxx, Credit 1200
    const totalConsumedAmount = consumptionEventItems.reduce((sum, item) => sum + item.amount, 0);

    const eventData: InventoryConsumedEventData = {
      purchaseId: purchase.id,
      purchaseNumber: purchase.purchase_number,
      consumptions: consumptionEventItems,
      totalAmount: totalConsumedAmount,
      consumedDate,
      currency: purchase.currency,
    };

    const eventResult = await accountingEventsApi.createAndProcess(
      'INVENTORY_CONSUMED',
      consumedDate,
      [purchase.company_id],
      eventData as unknown as Record<string, unknown>,
      'inventory_purchase',
      purchase.id,
      consumedBy
    );

    return eventResult;
  },

  // --------------------------------------------------------------------------
  // Update Full (edit existing purchase: replace line items, payments, journals)
  // --------------------------------------------------------------------------

  async updateFull(
    id: string,
    purchase: Partial<InventoryPurchaseRow>,
    lineItems: Omit<InventoryPurchaseLineItemInsert, 'purchase_id'>[],
    action: 'draft' | 'record',
    payment?: {
      paymentDate: string;
      amount: number;
      paymentType: 'bank' | 'cash' | 'petty_cash';
      bankAccountId?: string;
      pettyWalletId?: string;
      reference?: string;
      remark?: string;
      fxRate?: number;
      thbAmount?: number;
    },
    userId?: string
  ): Promise<{ purchase: InventoryPurchaseRow }> {
    const { journalEntriesApi } = await import('./journalEntries');
    const supabase = createClient();

    // 1. Delete old journal entries (if any)
    await journalEntriesApi.deleteBySourceDocument('inventory_purchase', id);

    // 2. Delete old payments (+ linked petty cash expenses)
    const { data: oldPayments } = await (supabase as any)
      .from('inventory_purchase_payments')
      .select('petty_cash_expense_id')
      .eq('purchase_id', id);

    if (oldPayments) {
      for (const pmt of oldPayments) {
        if (pmt.petty_cash_expense_id) {
          await (supabase as any)
            .from('petty_cash_expenses')
            .delete()
            .eq('id', pmt.petty_cash_expense_id);
        }
      }
    }
    await (supabase as any)
      .from('inventory_purchase_payments')
      .delete()
      .eq('purchase_id', id);

    // 3. Delete old line items
    await (supabase as any)
      .from('inventory_purchase_line_items')
      .delete()
      .eq('purchase_id', id);

    // 4. Update purchase row
    const { data: updatedPurchase, error: updateError } = await (supabase as any)
      .from('inventory_purchases')
      .update(purchase)
      .eq('id', id)
      .select()
      .single();
    if (updateError) throw updateError;

    // 5. Insert new line items
    if (lineItems.length > 0) {
      const itemsToInsert = lineItems.map((li, idx) => ({
        ...li,
        purchase_id: id,
        line_order: li.line_order ?? idx + 1,
        account_code: '1200',
      }));

      const { error: liError } = await (supabase as any)
        .from('inventory_purchase_line_items')
        .insert(itemsToInsert);
      if (liError) throw liError;
    }

    // 6. If recording with payment: insert payment + fire accounting event
    if (action === 'record' && payment) {
      const { accountingEventsApi } = await import('./accountingEvents');
      const { bankAccountsApi } = await import('./bankAccounts');

      let bankAccountGlCode: string | undefined;
      let pettyCashGlCode: string | undefined;
      let pettyCashWalletName: string | undefined;
      let pettyCashExpenseId: string | undefined;

      if (payment.paymentType === 'bank' && payment.bankAccountId) {
        const bankAccount = await bankAccountsApi.getById(payment.bankAccountId);
        bankAccountGlCode = bankAccount?.gl_account_code || '1010';
      }

      if (payment.paymentType === 'petty_cash' && payment.pettyWalletId) {
        const { data: wallet } = await (supabase as any)
          .from('petty_cash_wallets')
          .select('*')
          .eq('id', payment.pettyWalletId)
          .single();

        if (wallet) {
          pettyCashWalletName = wallet.wallet_name;
          switch (wallet.currency) {
            case 'EUR': pettyCashGlCode = '1001'; break;
            case 'USD': pettyCashGlCode = '1002'; break;
            default: pettyCashGlCode = '1000'; break;
          }

          const { data: pcExpense, error: pcError } = await (supabase as any)
            .from('petty_cash_expenses')
            .insert({
              expense_number: `PC-INV-${updatedPurchase.purchase_number}`,
              wallet_id: payment.pettyWalletId,
              company_id: purchase.company_id || updatedPurchase.company_id,
              expense_date: payment.paymentDate,
              description: `Inventory purchase: ${updatedPurchase.purchase_number}`,
              project_id: lineItems[0]?.project_id,
              amount: payment.amount,
              status: 'submitted',
              created_by: userId,
              expense_account_code: '1200',
            })
            .select()
            .single();
          if (pcError) throw pcError;
          pettyCashExpenseId = pcExpense?.id;
        }
      }

      // Insert payment record
      const { error: payError } = await (supabase as any)
        .from('inventory_purchase_payments')
        .insert({
          purchase_id: id,
          payment_date: payment.paymentDate,
          amount: payment.amount,
          payment_type: payment.paymentType,
          bank_account_id: payment.bankAccountId || null,
          bank_account_gl_code: bankAccountGlCode || null,
          petty_cash_wallet_id: payment.pettyWalletId || null,
          petty_cash_expense_id: pettyCashExpenseId || null,
          reference: payment.reference || null,
          remark: payment.remark || null,
          fx_rate: payment.fxRate || null,
          thb_amount: payment.thbAmount || null,
        });
      if (payError) throw payError;

      // Fire accounting event
      const eventData: InventoryPurchaseRecordedEventData = {
        purchaseId: id,
        purchaseNumber: updatedPurchase.purchase_number,
        vendorName: purchase.vendor_name || updatedPurchase.vendor_name || 'Unknown Vendor',
        purchaseDate: purchase.purchase_date || updatedPurchase.purchase_date,
        lineItems: lineItems.map((li) => ({
          description: li.description,
          amount: li.pre_vat_amount || li.amount,
        })),
        totalSubtotal: purchase.subtotal || updatedPurchase.subtotal,
        totalVatAmount: purchase.vat_amount || updatedPurchase.vat_amount,
        totalAmount: purchase.total_amount || updatedPurchase.total_amount,
        totalNetPayable: purchase.net_payable || updatedPurchase.net_payable,
        currency: purchase.currency || updatedPurchase.currency,
        paymentType: payment.paymentType,
        bankAccountGlCode,
        pettyCashGlCode,
        pettyCashWalletName,
      };

      await accountingEventsApi.createAndProcess(
        'INVENTORY_PURCHASE_RECORDED',
        purchase.purchase_date || updatedPurchase.purchase_date,
        [purchase.company_id || updatedPurchase.company_id],
        eventData as unknown as Record<string, unknown>,
        'inventory_purchase',
        id,
        userId || ''
      );
    }

    return { purchase: updatedPurchase as InventoryPurchaseRow };
  },

  // --------------------------------------------------------------------------
  // Update (partial)
  // --------------------------------------------------------------------------

  async update(
    id: string,
    updates: Partial<InventoryPurchaseRow>
  ): Promise<InventoryPurchaseRow> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('inventory_purchases')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as InventoryPurchaseRow;
  },

  // --------------------------------------------------------------------------
  // Void
  // --------------------------------------------------------------------------

  async void(id: string, reason: string): Promise<InventoryPurchaseRow> {
    const { journalEntriesApi } = await import('./journalEntries');
    const supabase = createClient();

    // Delete linked journal entries
    await journalEntriesApi.deleteBySourceDocument('inventory_purchase', id);

    // If there's a linked petty cash expense, delete it
    const { data: payments } = await (supabase as any)
      .from('inventory_purchase_payments')
      .select('petty_cash_expense_id')
      .eq('purchase_id', id)
      .not('petty_cash_expense_id', 'is', null);

    if (payments) {
      for (const payment of payments) {
        if (payment.petty_cash_expense_id) {
          await (supabase as any)
            .from('petty_cash_expenses')
            .delete()
            .eq('id', payment.petty_cash_expense_id);
        }
      }
    }

    // Update purchase status
    const updated = await this.update(id, {
      status: 'void',
      voided_date: new Date().toISOString().split('T')[0],
      void_reason: reason,
    } as Partial<InventoryPurchaseRow>);

    return updated;
  },
};
