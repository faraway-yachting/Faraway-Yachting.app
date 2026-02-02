import { createClient } from '../client';
import type { Database } from '../database.types';
import type { EventProcessResult, ExpenseApprovedEventData, ExpensePaidEventData, ExpensePaidIntercompanyEventData } from '@/lib/accounting/eventTypes';
import { bankAccountsApi } from './bankAccounts';
import { journalEntriesApi } from './journalEntries';

type Expense = Database['public']['Tables']['expenses']['Row'];
type ExpenseInsert = Database['public']['Tables']['expenses']['Insert'];
type ExpenseUpdate = Database['public']['Tables']['expenses']['Update'];
type ExpenseLineItem = Database['public']['Tables']['expense_line_items']['Row'];
type ExpenseLineItemInsert = Database['public']['Tables']['expense_line_items']['Insert'];
type ExpensePayment = Database['public']['Tables']['expense_payments']['Row'];
type ExpensePaymentInsert = Database['public']['Tables']['expense_payments']['Insert'];

export type ExpenseWithDetails = Expense & {
  line_items: ExpenseLineItem[];
  payments: ExpensePayment[];
};

export const expensesApi = {
  async getAll(): Promise<Expense[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('expense_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<Expense | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async getByIdWithDetails(id: string): Promise<ExpenseWithDetails | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        line_items:expense_line_items(*),
        payments:expense_payments(*)
      `)
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as ExpenseWithDetails;
  },

  async create(expense: ExpenseInsert, lineItems?: ExpenseLineItemInsert[]): Promise<Expense> {
    const supabase = createClient();

    const { data: expenseData, error: expenseError } = await supabase
      .from('expenses')
      .insert([expense])
      .select()
      .single();
    if (expenseError) throw expenseError;

    if (lineItems && lineItems.length > 0) {
      const lineItemsWithExpenseId = lineItems.map((item, index) => ({
        ...item,
        expense_id: expenseData.id,
        line_order: index + 1
      }));

      const { error: lineItemsError } = await supabase
        .from('expense_line_items')
        .insert(lineItemsWithExpenseId);
      if (lineItemsError) throw lineItemsError;
    }

    return expenseData;
  },

  async update(id: string, updates: ExpenseUpdate): Promise<Expense> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('expenses')
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
    await journalEntriesApi.deleteBySourceDocument('expense', id);
    await journalEntriesApi.deleteBySourceDocument('expense_payment', id);

    // Then delete the expense (line items and payments cascade)
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  /**
   * Void an expense and delete related journal entries
   */
  async void(id: string, reason?: string): Promise<Expense> {
    const supabase = createClient();

    // Delete related journal entries
    await journalEntriesApi.deleteBySourceDocument('expense', id);
    await journalEntriesApi.deleteBySourceDocument('expense_payment', id);

    // Update expense status to void
    const { data, error } = await supabase
      .from('expenses')
      .update({
        status: 'void',
        notes: reason || null,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getByStatus(status: 'draft' | 'approved' | 'void'): Promise<Expense[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('status', status)
      .order('expense_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getByPaymentStatus(paymentStatus: 'unpaid' | 'partially_paid' | 'paid'): Promise<Expense[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('payment_status', paymentStatus)
      .order('expense_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getByVendor(vendorId: string): Promise<Expense[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('expense_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getByCompany(companyId: string): Promise<Expense[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('company_id', companyId)
      .order('expense_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getByDateRange(startDate: string, endDate: string): Promise<Expense[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)
      .order('expense_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  // Line items operations
  async getLineItems(expenseId: string): Promise<ExpenseLineItem[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('expense_line_items')
      .select('*')
      .eq('expense_id', expenseId)
      .order('line_order');
    if (error) throw error;
    return data ?? [];
  },

  async updateLineItems(expenseId: string, lineItems: ExpenseLineItemInsert[]): Promise<void> {
    const supabase = createClient();

    const { error: deleteError } = await supabase
      .from('expense_line_items')
      .delete()
      .eq('expense_id', expenseId);
    if (deleteError) throw deleteError;

    if (lineItems.length > 0) {
      const lineItemsWithOrder = lineItems.map((item, index) => ({
        ...item,
        expense_id: expenseId,
        line_order: index + 1
      }));

      const { error: insertError } = await supabase
        .from('expense_line_items')
        .insert(lineItemsWithOrder);
      if (insertError) throw insertError;
    }
  },

  // Payment operations
  async getPayments(expenseId: string): Promise<ExpensePayment[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('expense_payments')
      .select('*')
      .eq('expense_id', expenseId)
      .order('payment_date');
    if (error) throw error;
    return data ?? [];
  },

  async addPayment(payment: ExpensePaymentInsert): Promise<ExpensePayment> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('expense_payments')
      .insert([payment])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deletePayment(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('expense_payments')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // Update account code for a single line item
  async updateLineItemAccountCode(lineItemId: string, accountCode: string | null): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('expense_line_items')
      .update({ account_code: accountCode })
      .eq('id', lineItemId);
    if (error) throw error;
  },

  // Bulk update account codes for multiple line items
  async bulkUpdateLineItemAccountCodes(updates: { lineItemId: string; accountCode: string | null }[]): Promise<void> {
    const supabase = createClient();

    // Process updates in parallel for better performance
    const updatePromises = updates.map(({ lineItemId, accountCode }) =>
      supabase
        .from('expense_line_items')
        .update({ account_code: accountCode })
        .eq('id', lineItemId)
    );

    const results = await Promise.all(updatePromises);
    const errors = results.filter(r => r.error).map(r => r.error);
    if (errors.length > 0) {
      throw new Error(`Failed to update ${errors.length} line item(s): ${errors[0]?.message}`);
    }
  },

  // Get expenses with line items by date range (for reports - approved only)
  async getWithLineItemsByDateRange(startDate: string, endDate: string): Promise<ExpenseWithDetails[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        line_items:expense_line_items(*),
        payments:expense_payments(*)
      `)
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)
      .eq('status', 'approved')
      .order('expense_date', { ascending: false });
    if (error) throw error;
    return (data ?? []) as ExpenseWithDetails[];
  },

  // Get all expenses with line items by date range (for categorization - all statuses)
  async getAllWithLineItemsByDateRange(startDate: string, endDate: string): Promise<ExpenseWithDetails[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        line_items:expense_line_items(*),
        payments:expense_payments(*)
      `)
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)
      .neq('status', 'void')  // Exclude void expenses
      .order('expense_date', { ascending: false });
    if (error) throw error;
    return (data ?? []) as ExpenseWithDetails[];
  },

  // Approve expense AND create journal entry
  async approveWithJournalEntry(
    expenseId: string,
    createdBy: string
  ): Promise<{ expense: Expense; journalResult: import('@/lib/accounting/journalPostingService').JournalPostingResult }> {
    // Import dynamically to avoid circular dependencies
    const { createExpenseApprovalJournalEntry } = await import('@/lib/accounting/journalPostingService');

    // Get expense with line items
    const expense = await this.getByIdWithDetails(expenseId);
    if (!expense) throw new Error('Expense not found');

    // Validate expense can be approved
    if (expense.status !== 'draft') {
      throw new Error('Only draft expenses can be approved');
    }

    // Update expense status
    const updatedExpense = await this.update(expenseId, { status: 'approved' });

    // Create journal entry (non-blocking - log errors but don't fail)
    let journalResult: import('@/lib/accounting/journalPostingService').JournalPostingResult = {
      success: false,
      error: 'Not attempted',
    };

    try {
      journalResult = await createExpenseApprovalJournalEntry(
        {
          expenseId: expense.id,
          companyId: expense.company_id,
          expenseNumber: expense.expense_number,
          expenseDate: expense.expense_date,
          vendorName: expense.vendor_name || 'Unknown Vendor',
          lineItems: (expense.line_items || []).map(li => ({
            description: li.description || '',
            accountCode: li.account_code,
            amount: li.amount || 0,
          })),
          totalSubtotal: expense.subtotal || 0,
          totalVatAmount: expense.vat_amount || 0,
          totalAmount: expense.total_amount || 0,
          currency: expense.currency,
        },
        createdBy
      );
    } catch (error) {
      console.error('Failed to create expense approval journal entry:', error);
      journalResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    return { expense: updatedExpense, journalResult };
  },

  // Add payment AND create journal entry AND create WHT certificate if applicable
  async addPaymentWithJournalEntry(
    payment: ExpensePaymentInsert,
    createdBy: string
  ): Promise<{
    payment: ExpensePayment;
    journalResult: import('@/lib/accounting/journalPostingService').JournalPostingResult;
    whtCertificateId?: string;
  }> {
    // Import dynamically to avoid circular dependencies
    const { createExpensePaymentJournalEntry } = await import('@/lib/accounting/journalPostingService');
    const { whtCertificatesApi } = await import('./whtCertificates');
    const { companiesApi } = await import('./companies');
    const { contactsApi } = await import('./contacts');

    // Add payment record
    const paymentRecord = await this.addPayment(payment);

    // Get expense with details
    const expense = await this.getByIdWithDetails(payment.expense_id);
    if (!expense) throw new Error('Expense not found');

    // Create journal entry (non-blocking)
    let journalResult: import('@/lib/accounting/journalPostingService').JournalPostingResult = {
      success: false,
      error: 'Not attempted',
    };

    try {
      journalResult = await createExpensePaymentJournalEntry(
        {
          expenseId: expense.id,
          paymentId: paymentRecord.id,
          companyId: expense.company_id,
          expenseNumber: expense.expense_number,
          paymentDate: payment.payment_date,
          vendorName: expense.vendor_name || 'Unknown Vendor',
          paymentAmount: payment.amount,
          bankAccountId: payment.paid_from,
          currency: expense.currency,
        },
        createdBy
      );
    } catch (error) {
      console.error('Failed to create expense payment journal entry:', error);
      journalResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    // Create WHT certificate if expense has WHT amount
    let whtCertificateId: string | undefined;
    if (expense.wht_amount && expense.wht_amount > 0) {
      try {
        // Get company details for WHT certificate
        const company = await companiesApi.getById(expense.company_id);
        if (!company) throw new Error('Company not found');

        // Get vendor details
        let vendor = null;
        if (expense.vendor_id) {
          vendor = await contactsApi.getById(expense.vendor_id);
        }

        // Determine form type: PND3 for individuals, PND53 for companies
        // For now, assume based on tax ID format (starts with 0 = company)
        const vendorTaxId = vendor?.tax_id || '';
        const isCompany = vendorTaxId.startsWith('0') || vendorTaxId.length === 13;
        const formType = isCompany ? 'pnd53' : 'pnd3';

        // Get billing address from company
        const companyBillingAddr = company.billing_address as { full_address?: string } | null;
        const vendorBillingAddr = vendor?.billing_address as { full_address?: string } | null;

        // Calculate WHT rate from line items (use first found)
        let whtRate = 3; // default
        for (const li of expense.line_items || []) {
          if (li.wht_rate) {
            const parsedRate = parseFloat(li.wht_rate);
            if (!isNaN(parsedRate)) {
              whtRate = parsedRate;
              break;
            }
          }
        }

        // Get income type from first line item or default
        const firstLineItem = (expense.line_items || [])[0];
        const incomeType = firstLineItem?.description || 'Service Fee';

        // Generate certificate number
        const companyCode = company.name.substring(0, 3).toUpperCase();
        const certificateNumber = await whtCertificatesApi.generateCertificateNumber(
          expense.company_id,
          companyCode
        );

        // Get tax period from payment date
        const paymentDate = new Date(payment.payment_date);
        const taxPeriod = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;

        // Create WHT certificate
        const whtCertificate = await whtCertificatesApi.create({
          company_id: expense.company_id,
          certificate_number: certificateNumber,
          form_type: formType,
          payer_name: company.name,
          payer_address: companyBillingAddr?.full_address || null,
          payer_tax_id: company.tax_id,
          payee_vendor_id: expense.vendor_id,
          payee_name: expense.vendor_name || 'Unknown Vendor',
          payee_address: vendorBillingAddr?.full_address || null,
          payee_tax_id: vendorTaxId || null,
          payee_is_company: isCompany,
          payment_date: payment.payment_date,
          income_type: '6', // Service fee code
          income_type_description: incomeType,
          amount_paid: expense.subtotal || expense.total_amount || 0,
          wht_rate: whtRate,
          wht_amount: expense.wht_amount,
          tax_period: taxPeriod,
          status: 'draft',
          created_by: createdBy,
        });

        // Link certificate to expense
        await whtCertificatesApi.linkToExpense(whtCertificate.id, expense.id);
        whtCertificateId = whtCertificate.id;

        console.log(`Created WHT certificate ${certificateNumber} for expense ${expense.expense_number}`);
      } catch (error) {
        console.error('Failed to create WHT certificate:', error);
        // Non-blocking - payment still succeeds even if WHT certificate fails
      }
    }

    return { payment: paymentRecord, journalResult, whtCertificateId };
  },

  // ============================================================================
  // EVENT-DRIVEN METHODS (New approach - gradual migration)
  // ============================================================================

  /**
   * Approve expense using event-driven journal generation
   * Creates EXPENSE_APPROVED event which generates journal entry
   */
  async approveWithEvent(
    expenseId: string,
    createdBy: string
  ): Promise<{ expense: Expense; eventResult: EventProcessResult }> {
    // Import dynamically to avoid circular dependencies
    const { accountingEventsApi } = await import('./accountingEvents');

    // Get expense with line items
    const expense = await this.getByIdWithDetails(expenseId);
    if (!expense) throw new Error('Expense not found');

    // Validate expense can be approved
    if (expense.status !== 'draft') {
      throw new Error('Only draft expenses can be approved');
    }

    // Check for duplicate event
    const isDuplicate = await accountingEventsApi.checkDuplicate(
      'EXPENSE_APPROVED',
      'expense',
      expenseId
    );
    if (isDuplicate) {
      throw new Error('An approval event already exists for this expense');
    }

    // Update expense status
    const updatedExpense = await this.update(expenseId, { status: 'approved' });

    // Build event data
    const eventData: ExpenseApprovedEventData = {
      expenseId: expense.id,
      expenseNumber: expense.expense_number,
      vendorName: expense.vendor_name || 'Unknown Vendor',
      expenseDate: expense.expense_date,
      lineItems: (expense.line_items || []).map((li) => ({
        description: li.description || '',
        accountCode: li.account_code,
        amount: li.amount || 0,
      })),
      totalSubtotal: expense.subtotal || 0,
      totalVatAmount: expense.vat_amount || 0,
      totalAmount: expense.total_amount || 0,
      currency: expense.currency,
    };

    // Create and process event
    const eventResult = await accountingEventsApi.createAndProcess(
      'EXPENSE_APPROVED',
      expense.expense_date,
      [expense.company_id],
      eventData as unknown as Record<string, unknown>,
      'expense',
      expense.id,
      createdBy
    );

    return { expense: updatedExpense, eventResult };
  },

  /**
   * Add payment using event-driven journal generation
   * Creates EXPENSE_PAID or EXPENSE_PAID_INTERCOMPANY event which generates journal entry
   * Also creates WHT certificate if expense has WHT amount
   */
  async addPaymentWithEvent(
    payment: ExpensePaymentInsert,
    createdBy: string
  ): Promise<{ payment: ExpensePayment; eventResult: EventProcessResult; whtCertificateId?: string }> {
    // Import dynamically to avoid circular dependencies
    const { accountingEventsApi } = await import('./accountingEvents');
    const { whtCertificatesApi } = await import('./whtCertificates');
    const { companiesApi } = await import('./companies');
    const { contactsApi } = await import('./contacts');
    const { projectsApi } = await import('./projects');

    // Get expense with details
    const expense = await this.getByIdWithDetails(payment.expense_id);
    if (!expense) throw new Error('Expense not found');

    // Add payment record
    const paymentRecord = await this.addPayment(payment);

    // Get bank account info including company
    let bankAccountGlCode = '1010'; // default
    let bankCompanyId: string | null = null;
    let bankCompanyName = '';

    if (payment.paid_from !== 'cash') {
      try {
        const bankAccount = await bankAccountsApi.getById(payment.paid_from);
        bankAccountGlCode = bankAccount?.gl_account_code || '1010';
        bankCompanyId = bankAccount?.company_id || null;

        // Get bank company name if different from expense company
        if (bankCompanyId && bankCompanyId !== expense.company_id) {
          const bankCompany = await companiesApi.getById(bankCompanyId);
          bankCompanyName = bankCompany?.name || 'Unknown Company';
        }
      } catch {
        console.warn('Could not fetch bank account info, using default');
      }
    } else {
      bankAccountGlCode = '1000'; // cash account
    }

    // Check if this is a cross-company payment
    const isCrossCompanyPayment = bankCompanyId && bankCompanyId !== expense.company_id;

    let eventResult: EventProcessResult;

    if (isCrossCompanyPayment) {
      // Get expense company name
      const expenseCompany = await companiesApi.getById(expense.company_id);
      const expenseCompanyName = expenseCompany?.name || 'Unknown Company';

      // Get project from line items (project_id is on line items, not expense directly)
      let projectId: string | undefined;
      let projectName: string | undefined;
      const firstLineItem = expense.line_items?.[0];
      if (firstLineItem?.project_id) {
        projectId = firstLineItem.project_id;
        try {
          const project = await projectsApi.getById(projectId);
          projectName = project?.name || undefined;
        } catch {
          // Project lookup failed, continue without it
        }
      }

      // Build intercompany event data
      const intercompanyEventData: ExpensePaidIntercompanyEventData = {
        expenseId: expense.id,
        paymentId: paymentRecord.id,
        expenseNumber: expense.expense_number,
        vendorName: expense.vendor_name || 'Unknown Vendor',
        paymentDate: payment.payment_date,
        paymentAmount: payment.amount,
        // Paying company (bank owner)
        payingCompanyId: bankCompanyId!,
        payingCompanyName: bankCompanyName,
        bankAccountId: payment.paid_from,
        bankAccountGlCode,
        // Receiving company (expense owner)
        receivingCompanyId: expense.company_id,
        receivingCompanyName: expenseCompanyName,
        projectId,
        projectName,
        currency: expense.currency,
      };

      // Create intercompany event (affects BOTH companies)
      eventResult = await accountingEventsApi.createAndProcess(
        'EXPENSE_PAID_INTERCOMPANY',
        payment.payment_date,
        [expense.company_id, bankCompanyId!], // Both companies affected
        intercompanyEventData as unknown as Record<string, unknown>,
        'expense_payment',
        paymentRecord.id,
        createdBy
      );

      console.log(`Created intercompany expense payment: ${expense.expense_number} - paid by ${bankCompanyName} for ${expenseCompanyName}`);
    } else {
      // Standard single-company payment
      const eventData: ExpensePaidEventData = {
        expenseId: expense.id,
        paymentId: paymentRecord.id,
        expenseNumber: expense.expense_number,
        vendorName: expense.vendor_name || 'Unknown Vendor',
        paymentDate: payment.payment_date,
        paymentAmount: payment.amount,
        bankAccountId: payment.paid_from,
        bankAccountGlCode,
        currency: expense.currency,
      };

      // Create standard event
      eventResult = await accountingEventsApi.createAndProcess(
        'EXPENSE_PAID',
        payment.payment_date,
        [expense.company_id],
        eventData as unknown as Record<string, unknown>,
        'expense_payment',
        paymentRecord.id,
        createdBy
      );
    }

    // Create WHT certificate if expense has WHT amount
    let whtCertificateId: string | undefined;
    if (expense.wht_amount && expense.wht_amount > 0) {
      try {
        // Get company details for WHT certificate
        const company = await companiesApi.getById(expense.company_id);
        if (!company) throw new Error('Company not found');

        // Get vendor details
        let vendor = null;
        if (expense.vendor_id) {
          vendor = await contactsApi.getById(expense.vendor_id);
        }

        // Determine form type: PND3 for individuals, PND53 for companies
        const vendorTaxId = vendor?.tax_id || '';
        const isCompany = vendorTaxId.startsWith('0') || vendorTaxId.length === 13;
        const formType = isCompany ? 'pnd53' : 'pnd3';

        // Get billing address from company
        const companyBillingAddr = company.billing_address as { full_address?: string } | null;
        const vendorBillingAddr = vendor?.billing_address as { full_address?: string } | null;

        // Calculate WHT rate from line items (use first found)
        let whtRate = 3; // default
        for (const li of expense.line_items || []) {
          if (li.wht_rate) {
            const parsedRate = parseFloat(li.wht_rate);
            if (!isNaN(parsedRate)) {
              whtRate = parsedRate;
              break;
            }
          }
        }

        // Get income type from first line item or default
        const firstLineItem = (expense.line_items || [])[0];
        const incomeType = firstLineItem?.description || 'Service Fee';

        // Generate certificate number
        const companyCode = company.name.substring(0, 3).toUpperCase();
        const certificateNumber = await whtCertificatesApi.generateCertificateNumber(
          expense.company_id,
          companyCode
        );

        // Get tax period from payment date
        const paymentDate = new Date(payment.payment_date);
        const taxPeriod = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;

        // Create WHT certificate
        const whtCertificate = await whtCertificatesApi.create({
          company_id: expense.company_id,
          certificate_number: certificateNumber,
          form_type: formType,
          payer_name: company.name,
          payer_address: companyBillingAddr?.full_address || null,
          payer_tax_id: company.tax_id,
          payee_vendor_id: expense.vendor_id,
          payee_name: expense.vendor_name || 'Unknown Vendor',
          payee_address: vendorBillingAddr?.full_address || null,
          payee_tax_id: vendorTaxId || null,
          payee_is_company: isCompany,
          payment_date: payment.payment_date,
          income_type: '6', // Service fee code
          income_type_description: incomeType,
          amount_paid: expense.subtotal || expense.total_amount || 0,
          wht_rate: whtRate,
          wht_amount: expense.wht_amount,
          tax_period: taxPeriod,
          status: 'draft',
          created_by: createdBy,
        });

        // Link certificate to expense
        await whtCertificatesApi.linkToExpense(whtCertificate.id, expense.id);
        whtCertificateId = whtCertificate.id;

        console.log(`Created WHT certificate ${certificateNumber} for expense ${expense.expense_number}`);
      } catch (error) {
        console.error('Failed to create WHT certificate:', error);
        // Non-blocking - payment still succeeds even if WHT certificate fails
      }
    }

    return { payment: paymentRecord, eventResult, whtCertificateId };
  },
};
