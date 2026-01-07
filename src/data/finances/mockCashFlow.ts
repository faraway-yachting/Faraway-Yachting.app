import { DailyCashFlow, MonthlyCashFlowSummary, CashFlowTransaction } from './types';

// Generate December 2025 cash flow data
const generateDailyCashFlow = (): DailyCashFlow[] => {
  const days: DailyCashFlow[] = [];
  const year = 2025;
  const month = 12;
  const daysInMonth = 31;

  const categories = {
    in: ['Charter Revenue', 'Commission', 'Deposit', 'Management Fee', 'Other Income'],
    out: ['Operating Expenses', 'Crew Wages', 'Fuel', 'Provisions', 'Maintenance', 'Marina Fees', 'Insurance'],
  };

  const companies = [
    { id: 'company-001', name: 'Faraway Yachting' },
    { id: 'company-002', name: 'Blue Horizon Maritime' },
  ];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const transactions: CashFlowTransaction[] = [];
    let cashIn = 0;
    let cashOut = 0;

    // Skip weekends with lower probability of transactions
    const dayOfWeek = new Date(date).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Random number of transactions (0-4)
    const numTransactions = isWeekend ? Math.floor(Math.random() * 2) : Math.floor(Math.random() * 5);

    for (let i = 0; i < numTransactions; i++) {
      const isIncome = Math.random() > 0.4; // 60% chance of income
      const company = companies[Math.floor(Math.random() * companies.length)];
      const amount = Math.round((Math.random() * 500000 + 10000) / 100) * 100; // 10K to 510K, rounded

      if (isIncome) {
        const category = categories.in[Math.floor(Math.random() * categories.in.length)];
        transactions.push({
          id: `cf-${date}-${i}`,
          date,
          type: 'in',
          amount,
          description: `${category} - ${company.name}`,
          category,
          sourceDocument: `RE-${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}-${String(i + 1).padStart(3, '0')}`,
          companyId: company.id,
          companyName: company.name,
        });
        cashIn += amount;
      } else {
        const category = categories.out[Math.floor(Math.random() * categories.out.length)];
        transactions.push({
          id: `cf-${date}-${i}`,
          date,
          type: 'out',
          amount,
          description: `${category} - ${company.name}`,
          category,
          sourceDocument: `EXP-${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}-${String(i + 1).padStart(3, '0')}`,
          companyId: company.id,
          companyName: company.name,
        });
        cashOut += amount;
      }
    }

    days.push({
      date,
      cashIn,
      cashOut,
      netMovement: cashIn - cashOut,
      transactions,
    });
  }

  return days;
};

export const mockDailyCashFlow: DailyCashFlow[] = generateDailyCashFlow();

export const mockMonthlySummary: MonthlyCashFlowSummary = (() => {
  const totalIn = mockDailyCashFlow.reduce((sum, day) => sum + day.cashIn, 0);
  const totalOut = mockDailyCashFlow.reduce((sum, day) => sum + day.cashOut, 0);

  return {
    month: '2025-12',
    totalIn,
    totalOut,
    netMovement: totalIn - totalOut,
    openingBalance: 8500000, // 8.5M THB
    closingBalance: 8500000 + (totalIn - totalOut),
  };
})();

// Helper function to get cash flow for a specific month
export function getCashFlowForMonth(year: number, month: number): DailyCashFlow[] {
  // For now, return mock data adjusted for the requested month
  // In production, this would fetch from API
  return mockDailyCashFlow.map(day => ({
    ...day,
    date: day.date.replace('2025-12', `${year}-${String(month).padStart(2, '0')}`),
  }));
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
