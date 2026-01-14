import { VatTransaction, VatPeriodSummary } from './types';

// Empty mock data - use Supabase
export const mockVatTransactions: VatTransaction[] = [];

// Helper functions
export function getVatTransactionsByPeriod(period: string): VatTransaction[] {
  return mockVatTransactions.filter(vat => vat.period === period);
}

export function getVatTransactionsByDirection(direction: 'input' | 'output'): VatTransaction[] {
  return mockVatTransactions.filter(vat => vat.direction === direction);
}

export function getVatTransactionsByCompany(companyId: string): VatTransaction[] {
  if (!companyId || companyId === 'all-companies') {
    return mockVatTransactions;
  }
  const actualId = companyId.replace('company-', '');
  return mockVatTransactions.filter(
    vat => vat.companyId === companyId || vat.companyId === actualId
  );
}

export function getVatPeriodSummaries(period: string): VatPeriodSummary[] {
  const data = getVatTransactionsByPeriod(period);
  const grouped = new Map<string, VatTransaction[]>();

  data.forEach(vat => {
    if (!grouped.has(vat.companyId)) {
      grouped.set(vat.companyId, []);
    }
    grouped.get(vat.companyId)!.push(vat);
  });

  // Due date is 15th of the following month
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

    summaries.push({
      period,
      companyId,
      companyName: items[0].companyName,
      vatInput,
      vatOutput,
      netVat,
      status: netVat > 0 ? 'payable' : netVat < 0 ? 'refundable' : 'zero',
      dueDate,
      filingStatus: 'pending',
    });
  });

  return summaries;
}

export function getAllVatTransactions(): VatTransaction[] {
  return mockVatTransactions;
}
