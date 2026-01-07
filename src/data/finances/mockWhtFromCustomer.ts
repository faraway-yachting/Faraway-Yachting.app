import { WhtFromCustomer, WhtFromCustomerSummary } from './types';

export const mockWhtFromCustomer: WhtFromCustomer[] = [
  // Faraway Yachting - December 2025
  {
    id: 'wht-fc-001',
    date: '2025-12-26',
    documentNumber: 'RE-2512-001',
    documentType: 'receipt',
    customerId: 'contact-001',
    customerName: 'Mr. John Smith',
    customerTaxId: '1-2345-67890-12-3',
    companyId: 'company-001',
    companyName: 'Faraway Yachting',
    invoiceAmount: 500000,
    whtRate: 3,
    whtAmount: 15000,
    whtCertificateNumber: 'WHT-FC-2512-001',
    status: 'received',
    period: '2025-12',
    currency: 'THB',
  },
  {
    id: 'wht-fc-002',
    date: '2025-12-24',
    documentNumber: 'RE-2512-002',
    documentType: 'receipt',
    customerId: 'contact-002',
    customerName: 'Jones Maritime Ltd.',
    customerTaxId: '0-1055-43678-90-1',
    companyId: 'company-001',
    companyName: 'Faraway Yachting',
    invoiceAmount: 850000,
    whtRate: 3,
    whtAmount: 25500,
    whtCertificateNumber: 'WHT-FC-2512-002',
    status: 'received',
    period: '2025-12',
    currency: 'THB',
  },
  {
    id: 'wht-fc-003',
    date: '2025-12-20',
    documentNumber: 'RE-2512-003',
    documentType: 'receipt',
    customerId: 'contact-003',
    customerName: 'Pacific Cruises Co.',
    customerTaxId: '0-1234-56789-01-2',
    companyId: 'company-001',
    companyName: 'Faraway Yachting',
    invoiceAmount: 1200000,
    whtRate: 3,
    whtAmount: 36000,
    status: 'pending',
    period: '2025-12',
    currency: 'THB',
  },
  {
    id: 'wht-fc-004',
    date: '2025-12-18',
    documentNumber: 'RE-2512-004',
    documentType: 'receipt',
    customerId: 'contact-004',
    customerName: 'Siam Yacht Club',
    customerTaxId: '0-1077-89012-34-5',
    companyId: 'company-001',
    companyName: 'Faraway Yachting',
    invoiceAmount: 350000,
    whtRate: 3,
    whtAmount: 10500,
    whtCertificateNumber: 'WHT-FC-2512-004',
    status: 'received',
    period: '2025-12',
    currency: 'THB',
  },
  {
    id: 'wht-fc-005',
    date: '2025-12-15',
    documentNumber: 'RE-2512-005',
    documentType: 'receipt',
    customerId: 'contact-005',
    customerName: 'Royal Charter Services',
    customerTaxId: '0-1088-90123-45-6',
    companyId: 'company-001',
    companyName: 'Faraway Yachting',
    invoiceAmount: 2500000,
    whtRate: 3,
    whtAmount: 75000,
    status: 'pending',
    period: '2025-12',
    currency: 'THB',
  },

  // Blue Horizon Maritime - December 2025
  {
    id: 'wht-fc-006',
    date: '2025-12-22',
    documentNumber: 'RE-2512-101',
    documentType: 'receipt',
    customerId: 'contact-101',
    customerName: 'Marina Bay Holdings',
    customerTaxId: '0-1099-01234-56-7',
    companyId: 'company-002',
    companyName: 'Blue Horizon Maritime',
    invoiceAmount: 450000,
    whtRate: 3,
    whtAmount: 13500,
    whtCertificateNumber: 'WHT-FC-2512-101',
    status: 'received',
    period: '2025-12',
    currency: 'THB',
  },
  {
    id: 'wht-fc-007',
    date: '2025-12-19',
    documentNumber: 'RE-2512-102',
    documentType: 'receipt',
    customerId: 'contact-102',
    customerName: 'Ocean Star Charters',
    customerTaxId: '0-1100-12345-67-8',
    companyId: 'company-002',
    companyName: 'Blue Horizon Maritime',
    invoiceAmount: 680000,
    whtRate: 3,
    whtAmount: 20400,
    status: 'pending',
    period: '2025-12',
    currency: 'THB',
  },
  {
    id: 'wht-fc-008',
    date: '2025-12-12',
    documentNumber: 'RE-2512-103',
    documentType: 'receipt',
    customerId: 'contact-103',
    customerName: 'Southeast Marine Ltd.',
    customerTaxId: '0-1111-23456-78-9',
    companyId: 'company-002',
    companyName: 'Blue Horizon Maritime',
    invoiceAmount: 920000,
    whtRate: 3,
    whtAmount: 27600,
    whtCertificateNumber: 'WHT-FC-2512-103',
    status: 'received',
    period: '2025-12',
    currency: 'THB',
  },

  // November 2025 - Historical data
  {
    id: 'wht-fc-009',
    date: '2025-11-28',
    documentNumber: 'RE-2511-001',
    documentType: 'receipt',
    customerId: 'contact-001',
    customerName: 'Mr. John Smith',
    customerTaxId: '1-2345-67890-12-3',
    companyId: 'company-001',
    companyName: 'Faraway Yachting',
    invoiceAmount: 420000,
    whtRate: 3,
    whtAmount: 12600,
    whtCertificateNumber: 'WHT-FC-2511-001',
    status: 'reconciled',
    period: '2025-11',
    currency: 'THB',
  },
  {
    id: 'wht-fc-010',
    date: '2025-11-15',
    documentNumber: 'RE-2511-002',
    documentType: 'receipt',
    customerId: 'contact-002',
    customerName: 'Jones Maritime Ltd.',
    customerTaxId: '0-1055-43678-90-1',
    companyId: 'company-001',
    companyName: 'Faraway Yachting',
    invoiceAmount: 750000,
    whtRate: 3,
    whtAmount: 22500,
    whtCertificateNumber: 'WHT-FC-2511-002',
    status: 'reconciled',
    period: '2025-11',
    currency: 'THB',
  },
];

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
