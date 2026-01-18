import { createClient } from '../client';
import type { Database } from '../database.types';
import type { VatTransaction, VatPeriodSummary } from '@/data/finances/types';
import type { Currency } from '@/data/company/types';

type Expense = Database['public']['Tables']['expenses']['Row'];
type Receipt = Database['public']['Tables']['receipts']['Row'];
type Company = Database['public']['Tables']['companies']['Row'];

// VAT rate in Thailand (7%)
const DEFAULT_VAT_RATE = 7;

/**
 * API for fetching VAT transactions from expenses and receipts
 * - VAT Input = from expenses (purchases)
 * - VAT Output = from receipts (sales)
 */
export const vatTransactionsApi = {
  /**
   * Get all VAT transactions for a given period
   * Combines expenses (VAT Input) and receipts (VAT Output)
   */
  async getByPeriod(period: string): Promise<VatTransaction[]> {
    const [year, month] = period.split('-').map(Number);
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month

    const [expenses, receipts, companies] = await Promise.all([
      this.getExpensesWithVat(startDate, endDate),
      this.getReceiptsWithVat(startDate, endDate),
      this.getCompaniesMap(),
    ]);

    const vatTransactions: VatTransaction[] = [];

    // Transform expenses to VAT Input transactions
    for (const expense of expenses) {
      if (expense.vat_amount && expense.vat_amount > 0) {
        const company = companies.get(expense.company_id);
        vatTransactions.push({
          id: expense.id,
          date: expense.expense_date,
          documentNumber: expense.expense_number,
          documentType: 'expense',
          direction: 'input',
          companyId: expense.company_id,
          companyName: company?.name || 'Unknown Company',
          counterpartyId: expense.vendor_id || '',
          counterpartyName: expense.vendor_name || 'Unknown Vendor',
          counterpartyTaxId: '', // Would need vendor contact lookup
          baseAmount: expense.subtotal || 0,
          vatRate: DEFAULT_VAT_RATE,
          vatAmount: expense.vat_amount,
          totalAmount: expense.total_amount || 0,
          period,
          currency: (expense.currency || 'THB') as Currency,
          glAccountCode: '1170', // VAT Receivable
        });
      }
    }

    // Transform receipts to VAT Output transactions
    for (const receipt of receipts) {
      if (receipt.tax_amount && receipt.tax_amount > 0) {
        const company = companies.get(receipt.company_id);
        vatTransactions.push({
          id: receipt.id,
          date: receipt.receipt_date,
          documentNumber: receipt.receipt_number,
          documentType: 'receipt',
          direction: 'output',
          companyId: receipt.company_id,
          companyName: company?.name || 'Unknown Company',
          counterpartyId: receipt.client_id || '',
          counterpartyName: receipt.client_name || 'Unknown Client',
          counterpartyTaxId: '', // Would need client contact lookup
          baseAmount: receipt.subtotal || 0,
          vatRate: DEFAULT_VAT_RATE,
          vatAmount: receipt.tax_amount,
          totalAmount: receipt.total_amount || 0,
          period,
          currency: (receipt.currency || 'THB') as Currency,
          glAccountCode: '2200', // VAT Payable
        });
      }
    }

    // Sort by date descending
    return vatTransactions.sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  },

  /**
   * Get VAT transactions filtered by company
   */
  async getByCompanyAndPeriod(companyId: string, period: string): Promise<VatTransaction[]> {
    const allTransactions = await this.getByPeriod(period);
    return allTransactions.filter(t => t.companyId === companyId);
  },

  /**
   * Get all VAT transactions across all periods
   */
  async getAll(): Promise<VatTransaction[]> {
    const [expenses, receipts, companies] = await Promise.all([
      this.getAllExpensesWithVat(),
      this.getAllReceiptsWithVat(),
      this.getCompaniesMap(),
    ]);

    const vatTransactions: VatTransaction[] = [];

    // Transform expenses to VAT Input transactions
    for (const expense of expenses) {
      if (expense.vat_amount && expense.vat_amount > 0) {
        const company = companies.get(expense.company_id);
        const period = expense.expense_date.substring(0, 7); // YYYY-MM
        vatTransactions.push({
          id: expense.id,
          date: expense.expense_date,
          documentNumber: expense.expense_number,
          documentType: 'expense',
          direction: 'input',
          companyId: expense.company_id,
          companyName: company?.name || 'Unknown Company',
          counterpartyId: expense.vendor_id || '',
          counterpartyName: expense.vendor_name || 'Unknown Vendor',
          counterpartyTaxId: '',
          baseAmount: expense.subtotal || 0,
          vatRate: DEFAULT_VAT_RATE,
          vatAmount: expense.vat_amount,
          totalAmount: expense.total_amount || 0,
          period,
          currency: (expense.currency || 'THB') as Currency,
          glAccountCode: '1170',
        });
      }
    }

    // Transform receipts to VAT Output transactions
    for (const receipt of receipts) {
      if (receipt.tax_amount && receipt.tax_amount > 0) {
        const company = companies.get(receipt.company_id);
        const period = receipt.receipt_date.substring(0, 7); // YYYY-MM
        vatTransactions.push({
          id: receipt.id,
          date: receipt.receipt_date,
          documentNumber: receipt.receipt_number,
          documentType: 'receipt',
          direction: 'output',
          companyId: receipt.company_id,
          companyName: company?.name || 'Unknown Company',
          counterpartyId: receipt.client_id || '',
          counterpartyName: receipt.client_name || 'Unknown Client',
          counterpartyTaxId: '',
          baseAmount: receipt.subtotal || 0,
          vatRate: DEFAULT_VAT_RATE,
          vatAmount: receipt.tax_amount,
          totalAmount: receipt.total_amount || 0,
          period,
          currency: (receipt.currency || 'THB') as Currency,
          glAccountCode: '2200',
        });
      }
    }

    return vatTransactions.sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  },

  /**
   * Get VAT period summaries for a given period
   */
  async getPeriodSummaries(period: string): Promise<VatPeriodSummary[]> {
    const transactions = await this.getByPeriod(period);
    const companies = await this.getCompaniesMap();

    // Group by company
    const grouped = new Map<string, VatTransaction[]>();
    for (const t of transactions) {
      if (!grouped.has(t.companyId)) {
        grouped.set(t.companyId, []);
      }
      grouped.get(t.companyId)!.push(t);
    }

    // Calculate due date (15th of following month)
    const [year, month] = period.split('-').map(Number);
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const dueDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-15`;

    const summaries: VatPeriodSummary[] = [];
    grouped.forEach((items, companyId) => {
      const inputItems = items.filter(i => i.direction === 'input');
      const outputItems = items.filter(i => i.direction === 'output');
      const vatInput = inputItems.reduce((sum, i) => sum + i.vatAmount, 0);
      const vatOutput = outputItems.reduce((sum, i) => sum + i.vatAmount, 0);
      const netVat = vatOutput - vatInput;

      const company = companies.get(companyId);
      summaries.push({
        period,
        companyId,
        companyName: company?.name || items[0]?.companyName || 'Unknown Company',
        vatInput,
        vatOutput,
        netVat,
        status: netVat > 0 ? 'payable' : netVat < 0 ? 'refundable' : 'zero',
        dueDate,
        filingStatus: 'pending',
      });
    });

    return summaries;
  },

  // Helper: Get expenses with VAT in date range
  async getExpensesWithVat(startDate: string, endDate: string): Promise<Expense[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)
      .gt('vat_amount', 0)
      .eq('status', 'approved')
      .order('expense_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  // Helper: Get all expenses with VAT
  async getAllExpensesWithVat(): Promise<Expense[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .gt('vat_amount', 0)
      .eq('status', 'approved')
      .order('expense_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  // Helper: Get receipts with VAT in date range
  async getReceiptsWithVat(startDate: string, endDate: string): Promise<Receipt[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .gte('receipt_date', startDate)
      .lte('receipt_date', endDate)
      .gt('tax_amount', 0)
      .eq('status', 'paid')
      .order('receipt_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  // Helper: Get all receipts with VAT
  async getAllReceiptsWithVat(): Promise<Receipt[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .gt('tax_amount', 0)
      .eq('status', 'paid')
      .order('receipt_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  // Helper: Get companies as a map for quick lookup
  async getCompaniesMap(): Promise<Map<string, Company>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('companies')
      .select('*');
    if (error) throw error;

    const map = new Map<string, Company>();
    for (const company of data ?? []) {
      map.set(company.id, company);
    }
    return map;
  },

  // Helper: Get all companies as array (for dropdown)
  async getCompanies(): Promise<{ id: string; name: string }[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('companies')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return data ?? [];
  },
};
