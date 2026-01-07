import { VatTransaction, VatPeriodSummary } from './types';

export const mockVatTransactions: VatTransaction[] = [
  // VAT Output (Sales) - Faraway Yachting - December 2025
  {
    id: 'vat-001',
    date: '2025-12-26',
    documentNumber: 'INV-2512-001',
    documentType: 'invoice',
    direction: 'output',
    companyId: 'company-001',
    companyName: 'Faraway Yachting',
    counterpartyId: 'contact-001',
    counterpartyName: 'Mr. John Smith',
    counterpartyTaxId: '1-2345-67890-12-3',
    baseAmount: 500000,
    vatRate: 7,
    vatAmount: 35000,
    totalAmount: 535000,
    period: '2025-12',
    currency: 'THB',
    glAccountCode: '2200',
  },
  {
    id: 'vat-002',
    date: '2025-12-24',
    documentNumber: 'INV-2512-002',
    documentType: 'invoice',
    direction: 'output',
    companyId: 'company-001',
    companyName: 'Faraway Yachting',
    counterpartyId: 'contact-002',
    counterpartyName: 'Jones Maritime Ltd.',
    counterpartyTaxId: '0-1055-43678-90-1',
    baseAmount: 850000,
    vatRate: 7,
    vatAmount: 59500,
    totalAmount: 909500,
    period: '2025-12',
    currency: 'THB',
    glAccountCode: '2200',
  },
  {
    id: 'vat-003',
    date: '2025-12-20',
    documentNumber: 'INV-2512-003',
    documentType: 'invoice',
    direction: 'output',
    companyId: 'company-001',
    companyName: 'Faraway Yachting',
    counterpartyId: 'contact-003',
    counterpartyName: 'Pacific Cruises Co.',
    counterpartyTaxId: '0-1234-56789-01-2',
    baseAmount: 1200000,
    vatRate: 7,
    vatAmount: 84000,
    totalAmount: 1284000,
    period: '2025-12',
    currency: 'THB',
    glAccountCode: '2200',
  },
  {
    id: 'vat-004',
    date: '2025-12-15',
    documentNumber: 'INV-2512-004',
    documentType: 'invoice',
    direction: 'output',
    companyId: 'company-001',
    companyName: 'Faraway Yachting',
    counterpartyId: 'contact-004',
    counterpartyName: 'Siam Yacht Club',
    counterpartyTaxId: '0-1077-89012-34-5',
    baseAmount: 350000,
    vatRate: 7,
    vatAmount: 24500,
    totalAmount: 374500,
    period: '2025-12',
    currency: 'THB',
    glAccountCode: '2200',
  },

  // VAT Input (Purchases) - Faraway Yachting - December 2025
  {
    id: 'vat-005',
    date: '2025-12-27',
    documentNumber: 'EXP-2512-001',
    documentType: 'expense',
    direction: 'input',
    companyId: 'company-001',
    companyName: 'Faraway Yachting',
    counterpartyId: 'supplier-001',
    counterpartyName: 'ABC Fuel Supply Co., Ltd.',
    counterpartyTaxId: '0-1234-56789-01-2',
    baseAmount: 350000,
    vatRate: 7,
    vatAmount: 24500,
    totalAmount: 374500,
    period: '2025-12',
    currency: 'THB',
    glAccountCode: '1170',
  },
  {
    id: 'vat-006',
    date: '2025-12-25',
    documentNumber: 'EXP-2512-002',
    documentType: 'expense',
    direction: 'input',
    companyId: 'company-001',
    companyName: 'Faraway Yachting',
    counterpartyId: 'supplier-002',
    counterpartyName: 'Marine Services Group Ltd.',
    counterpartyTaxId: '0-1055-43678-90-1',
    baseAmount: 180000,
    vatRate: 7,
    vatAmount: 12600,
    totalAmount: 192600,
    period: '2025-12',
    currency: 'THB',
    glAccountCode: '1170',
  },
  {
    id: 'vat-007',
    date: '2025-12-20',
    documentNumber: 'EXP-2512-003',
    documentType: 'expense',
    direction: 'input',
    companyId: 'company-001',
    companyName: 'Faraway Yachting',
    counterpartyId: 'supplier-004',
    counterpartyName: 'Premium Yacht Parts Co., Ltd.',
    counterpartyTaxId: '0-1077-89012-34-5',
    baseAmount: 520000,
    vatRate: 7,
    vatAmount: 36400,
    totalAmount: 556400,
    period: '2025-12',
    currency: 'THB',
    glAccountCode: '1170',
  },
  {
    id: 'vat-008',
    date: '2025-12-15',
    documentNumber: 'EXP-2512-004',
    documentType: 'expense',
    direction: 'input',
    companyId: 'company-001',
    companyName: 'Faraway Yachting',
    counterpartyId: 'supplier-006',
    counterpartyName: 'Phuket Marina Services Ltd.',
    counterpartyTaxId: '0-1088-90123-45-6',
    baseAmount: 280000,
    vatRate: 7,
    vatAmount: 19600,
    totalAmount: 299600,
    period: '2025-12',
    currency: 'THB',
    glAccountCode: '1170',
  },

  // Blue Horizon Maritime - December 2025 - VAT Output
  {
    id: 'vat-009',
    date: '2025-12-22',
    documentNumber: 'INV-2512-101',
    documentType: 'invoice',
    direction: 'output',
    companyId: 'company-002',
    companyName: 'Blue Horizon Maritime',
    counterpartyId: 'contact-101',
    counterpartyName: 'Marina Bay Holdings',
    counterpartyTaxId: '0-1099-01234-56-7',
    baseAmount: 450000,
    vatRate: 7,
    vatAmount: 31500,
    totalAmount: 481500,
    period: '2025-12',
    currency: 'THB',
    glAccountCode: '2200',
  },
  {
    id: 'vat-010',
    date: '2025-12-19',
    documentNumber: 'INV-2512-102',
    documentType: 'invoice',
    direction: 'output',
    companyId: 'company-002',
    companyName: 'Blue Horizon Maritime',
    counterpartyId: 'contact-102',
    counterpartyName: 'Ocean Star Charters',
    counterpartyTaxId: '0-1100-12345-67-8',
    baseAmount: 680000,
    vatRate: 7,
    vatAmount: 47600,
    totalAmount: 727600,
    period: '2025-12',
    currency: 'THB',
    glAccountCode: '2200',
  },

  // Blue Horizon Maritime - December 2025 - VAT Input
  {
    id: 'vat-011',
    date: '2025-12-23',
    documentNumber: 'EXP-2512-101',
    documentType: 'expense',
    direction: 'input',
    companyId: 'company-002',
    companyName: 'Blue Horizon Maritime',
    counterpartyId: 'supplier-101',
    counterpartyName: 'Siam Provisions Co., Ltd.',
    counterpartyTaxId: '0-1099-01234-56-7',
    baseAmount: 120000,
    vatRate: 7,
    vatAmount: 8400,
    totalAmount: 128400,
    period: '2025-12',
    currency: 'THB',
    glAccountCode: '1170',
  },
  {
    id: 'vat-012',
    date: '2025-12-14',
    documentNumber: 'EXP-2512-102',
    documentType: 'expense',
    direction: 'input',
    companyId: 'company-002',
    companyName: 'Blue Horizon Maritime',
    counterpartyId: 'supplier-103',
    counterpartyName: 'Gulf Marine Equipment Ltd.',
    counterpartyTaxId: '0-1111-23456-78-9',
    baseAmount: 420000,
    vatRate: 7,
    vatAmount: 29400,
    totalAmount: 449400,
    period: '2025-12',
    currency: 'THB',
    glAccountCode: '1170',
  },

  // November 2025 - Historical data
  {
    id: 'vat-013',
    date: '2025-11-28',
    documentNumber: 'INV-2511-001',
    documentType: 'invoice',
    direction: 'output',
    companyId: 'company-001',
    companyName: 'Faraway Yachting',
    counterpartyId: 'contact-001',
    counterpartyName: 'Mr. John Smith',
    counterpartyTaxId: '1-2345-67890-12-3',
    baseAmount: 420000,
    vatRate: 7,
    vatAmount: 29400,
    totalAmount: 449400,
    period: '2025-11',
    currency: 'THB',
    glAccountCode: '2200',
  },
  {
    id: 'vat-014',
    date: '2025-11-20',
    documentNumber: 'EXP-2511-001',
    documentType: 'expense',
    direction: 'input',
    companyId: 'company-001',
    companyName: 'Faraway Yachting',
    counterpartyId: 'supplier-001',
    counterpartyName: 'ABC Fuel Supply Co., Ltd.',
    counterpartyTaxId: '0-1234-56789-01-2',
    baseAmount: 380000,
    vatRate: 7,
    vatAmount: 26600,
    totalAmount: 406600,
    period: '2025-11',
    currency: 'THB',
    glAccountCode: '1170',
  },
];

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
