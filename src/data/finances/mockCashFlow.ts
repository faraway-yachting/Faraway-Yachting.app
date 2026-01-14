import { DailyCashFlow, MonthlyCashFlowSummary, CashFlowTransaction } from './types';

// Empty mock data - use Supabase
export const mockDailyCashFlow: DailyCashFlow[] = [];

export const mockMonthlySummary: MonthlyCashFlowSummary = {
  month: '',
  totalIn: 0,
  totalOut: 0,
  netMovement: 0,
  openingBalance: 0,
  closingBalance: 0,
};

// Helper function to get cash flow for a specific month
export function getCashFlowForMonth(year: number, month: number): DailyCashFlow[] {
  return [];
}

// Helper function to filter by company
export function filterCashFlowByCompany(data: DailyCashFlow[], companyId: string): DailyCashFlow[] {
  if (!companyId || companyId === 'all-companies') {
    return data;
  }

  return data.map(day => {
    const filteredTransactions = day.transactions.filter(t => t.companyId === companyId);
    const cashIn = filteredTransactions.filter(t => t.type === 'in').reduce((sum, t) => sum + t.amount, 0);
    const cashOut = filteredTransactions.filter(t => t.type === 'out').reduce((sum, t) => sum + t.amount, 0);

    return {
      ...day,
      cashIn,
      cashOut,
      netMovement: cashIn - cashOut,
      transactions: filteredTransactions,
    };
  });
}
