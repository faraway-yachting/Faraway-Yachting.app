import { createClient } from '../client';
import type { Database } from '../database.types';
import type { DailyCashFlow, CashFlowTransaction } from '@/data/finances/types';
import type { Currency } from '@/data/company/types';

type Receipt = Database['public']['Tables']['receipts']['Row'];
type Expense = Database['public']['Tables']['expenses']['Row'];
type Company = Database['public']['Tables']['companies']['Row'];

// Currency summary for cash flow
export interface CurrencyCashFlowSummary {
  currency: Currency;
  totalIn: number;
  totalOut: number;
  netMovement: number;
}

// Default FX rates to THB (approximate rates for display purposes)
const FX_RATES_TO_THB: Record<string, number> = {
  THB: 1,
  USD: 34.5,
  EUR: 37.5,
  GBP: 43.5,
  SGD: 25.5,
  AED: 9.4,
};

/**
 * API for fetching cash flow data from receipts (cash in) and expenses (cash out)
 * Used for the Overview / Cash Flow Calendar page
 */
export const cashFlowApi = {
  /**
   * Get daily cash flow for a specific month
   * Cash In = paid receipts
   * Cash Out = paid expenses
   */
  async getDailyCashFlow(year: number, month: number, companyId?: string): Promise<DailyCashFlow[]> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month

    const [receipts, expenses, companies] = await Promise.all([
      this.getReceiptsForPeriod(startDate, endDate, companyId),
      this.getExpensesForPeriod(startDate, endDate, companyId),
      this.getCompaniesMap(),
    ]);

    // Build daily transactions map
    const dailyMap = new Map<string, CashFlowTransaction[]>();

    // Initialize all days of the month
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      dailyMap.set(dateStr, []);
    }

    // Add receipts as cash in
    for (const receipt of receipts) {
      const date = receipt.receipt_date;
      const company = companies.get(receipt.company_id);

      const transaction: CashFlowTransaction = {
        id: receipt.id,
        date,
        type: 'in',
        amount: receipt.total_amount || 0,
        currency: (receipt.currency as Currency) || 'THB',
        description: receipt.client_name || 'Unknown Client',
        category: 'Receipt',
        sourceDocument: receipt.receipt_number,
        companyId: receipt.company_id,
        companyName: company?.name || 'Unknown Company',
      };

      const existing = dailyMap.get(date) || [];
      existing.push(transaction);
      dailyMap.set(date, existing);
    }

    // Add expenses as cash out (only paid ones)
    for (const expense of expenses) {
      const date = expense.expense_date;
      const company = companies.get(expense.company_id);

      const transaction: CashFlowTransaction = {
        id: expense.id,
        date,
        type: 'out',
        amount: expense.total_amount || 0,
        currency: (expense.currency as Currency) || 'THB',
        description: expense.vendor_name || 'Unknown Vendor',
        category: 'Expense',
        sourceDocument: expense.expense_number,
        companyId: expense.company_id,
        companyName: company?.name || 'Unknown Company',
      };

      const existing = dailyMap.get(date) || [];
      existing.push(transaction);
      dailyMap.set(date, existing);
    }

    // Convert to DailyCashFlow array
    const result: DailyCashFlow[] = [];
    dailyMap.forEach((transactions, date) => {
      const cashIn = transactions
        .filter(t => t.type === 'in')
        .reduce((sum, t) => sum + t.amount, 0);
      const cashOut = transactions
        .filter(t => t.type === 'out')
        .reduce((sum, t) => sum + t.amount, 0);

      result.push({
        date,
        cashIn,
        cashOut,
        netMovement: cashIn - cashOut,
        transactions,
      });
    });

    // Sort by date
    return result.sort((a, b) => a.date.localeCompare(b.date));
  },

  /**
   * Get cash flow filtered by company
   */
  async getDailyCashFlowByCompany(
    year: number,
    month: number,
    companyId: string
  ): Promise<DailyCashFlow[]> {
    return this.getDailyCashFlow(year, month, companyId);
  },

  // Helper: Get paid receipts for date range
  async getReceiptsForPeriod(
    startDate: string,
    endDate: string,
    companyId?: string
  ): Promise<Receipt[]> {
    const supabase = createClient();
    let query = supabase
      .from('receipts')
      .select('*')
      .gte('receipt_date', startDate)
      .lte('receipt_date', endDate)
      .eq('status', 'paid')
      .order('receipt_date', { ascending: true });

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  // Helper: Get paid expenses for date range
  async getExpensesForPeriod(
    startDate: string,
    endDate: string,
    companyId?: string
  ): Promise<Expense[]> {
    const supabase = createClient();
    let query = supabase
      .from('expenses')
      .select('*')
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)
      .eq('status', 'approved')
      .eq('payment_status', 'paid')
      .order('expense_date', { ascending: true });

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  // Helper: Get companies map
  async getCompaniesMap(): Promise<Map<string, Company>> {
    const supabase = createClient();
    const { data, error } = await supabase.from('companies').select('*');
    if (error) throw error;

    const map = new Map<string, Company>();
    for (const company of data ?? []) {
      map.set(company.id, company);
    }
    return map;
  },

  // Helper: Get companies list for dropdown
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

  /**
   * Get cash flow summary grouped by currency with THB equivalent
   */
  async getCashFlowSummaryByCurrency(
    year: number,
    month: number,
    companyId?: string
  ): Promise<{
    byCurrency: CurrencyCashFlowSummary[];
    totalInTHB: number;
    totalOutTHB: number;
    netMovementTHB: number;
  }> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const [receipts, expenses] = await Promise.all([
      this.getReceiptsForPeriod(startDate, endDate, companyId),
      this.getExpensesForPeriod(startDate, endDate, companyId),
    ]);

    // Group by currency
    const currencyMap = new Map<string, { totalIn: number; totalOut: number }>();

    // Add receipts (cash in)
    for (const receipt of receipts) {
      const currency = receipt.currency || 'THB';
      const existing = currencyMap.get(currency) || { totalIn: 0, totalOut: 0 };
      existing.totalIn += receipt.total_amount || 0;
      currencyMap.set(currency, existing);
    }

    // Add expenses (cash out)
    for (const expense of expenses) {
      const currency = expense.currency || 'THB';
      const existing = currencyMap.get(currency) || { totalIn: 0, totalOut: 0 };
      existing.totalOut += expense.total_amount || 0;
      currencyMap.set(currency, existing);
    }

    // Convert to array and calculate THB equivalents
    const byCurrency: CurrencyCashFlowSummary[] = [];
    let totalInTHB = 0;
    let totalOutTHB = 0;

    // Sort currencies - THB first, then alphabetically
    const sortedCurrencies = Array.from(currencyMap.keys()).sort((a, b) => {
      if (a === 'THB') return -1;
      if (b === 'THB') return 1;
      return a.localeCompare(b);
    });

    for (const currency of sortedCurrencies) {
      const data = currencyMap.get(currency)!;
      const fxRate = FX_RATES_TO_THB[currency] || 1;

      byCurrency.push({
        currency: currency as Currency,
        totalIn: data.totalIn,
        totalOut: data.totalOut,
        netMovement: data.totalIn - data.totalOut,
      });

      totalInTHB += data.totalIn * fxRate;
      totalOutTHB += data.totalOut * fxRate;
    }

    return {
      byCurrency,
      totalInTHB,
      totalOutTHB,
      netMovementTHB: totalInTHB - totalOutTHB,
    };
  },
};
