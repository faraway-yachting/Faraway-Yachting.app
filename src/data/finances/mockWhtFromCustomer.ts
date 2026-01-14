import { WhtFromCustomer, WhtFromCustomerSummary } from './types';

// Empty mock data - use Supabase
export const mockWhtFromCustomer: WhtFromCustomer[] = [];

// Helper functions
export function getWhtFromCustomerByPeriod(period: string): WhtFromCustomer[] {
  return mockWhtFromCustomer.filter(wht => wht.period === period);
}

export function getWhtFromCustomerByCompany(companyId: string): WhtFromCustomer[] {
  if (!companyId || companyId === 'all-companies') {
    return mockWhtFromCustomer;
  }
  const actualId = companyId.replace('company-', '');
  return mockWhtFromCustomer.filter(
    wht => wht.companyId === companyId || wht.companyId === actualId
  );
}

export function getWhtFromCustomerSummaries(period: string): WhtFromCustomerSummary[] {
  const data = getWhtFromCustomerByPeriod(period);
  const grouped = new Map<string, WhtFromCustomer[]>();

  data.forEach(wht => {
    if (!grouped.has(wht.companyId)) {
      grouped.set(wht.companyId, []);
    }
    grouped.get(wht.companyId)!.push(wht);
  });

  const summaries: WhtFromCustomerSummary[] = [];
  grouped.forEach((items, companyId) => {
    const pending = items.filter(i => i.status === 'pending').length;
    const total = items.length;

    summaries.push({
      period,
      companyId,
      companyName: items[0].companyName,
      totalWhtAmount: items.reduce((sum, i) => sum + i.whtAmount, 0),
      transactionCount: items.length,
      status: pending === 0 ? 'complete' : pending === total ? 'pending' : 'partial',
    });
  });

  return summaries;
}

export function getAllWhtFromCustomer(): WhtFromCustomer[] {
  return mockWhtFromCustomer;
}
