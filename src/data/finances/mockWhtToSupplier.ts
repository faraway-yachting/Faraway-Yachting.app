import { WhtToSupplier, WhtToSupplierSummary } from './types';
import { getAllWhtCertificates } from '@/data/expenses/expenses';
import type { WhtCertificate } from '@/data/expenses/types';

// Convert WhtCertificate from expenses module to WhtToSupplier format
function convertWhtCertificateToWhtToSupplier(cert: WhtCertificate): WhtToSupplier {
  return {
    id: cert.id,
    date: cert.paymentDate,
    documentNumber: cert.certificateNumber,
    documentType: 'payment',
    supplierId: cert.payeeVendorId,
    supplierName: cert.payeeName,
    supplierTaxId: cert.payeeTaxId,
    companyId: cert.payerCompanyId,
    companyName: cert.payerName,
    paymentAmount: cert.amountPaid,
    whtType: cert.formType,
    whtRate: cert.whtRate,
    whtAmount: cert.whtAmount,
    whtCertificateNumber: cert.certificateNumber,
    status: cert.status === 'filed' ? 'filed' : cert.status === 'issued' ? 'submitted' : 'pending',
    submissionDate: cert.filedDate,
    period: cert.taxPeriod,
    currency: 'THB',
    expenseRecordIds: cert.expenseRecordIds,
  };
}

export const mockWhtToSupplier: WhtToSupplier[] = [
  // Faraway Yachting - December 2025
  {
    id: 'wht-ts-001',
    date: '2025-12-27',
    documentNumber: 'PV-2512-001',
    documentType: 'payment',
    supplierId: 'supplier-001',
    supplierName: 'ABC Fuel Supply Co., Ltd.',
    supplierTaxId: '0-1234-56789-01-2',
    companyId: 'company-001',
    companyName: 'Faraway Yachting',
    paymentAmount: 350000,
    whtType: 'pnd53',
    whtRate: 3,
    whtAmount: 10500,
    whtCertificateNumber: 'WHT-TS-2512-001',
    status: 'pending',
    period: '2025-12',
    currency: 'THB',
  },
  {
    id: 'wht-ts-002',
    date: '2025-12-25',
    documentNumber: 'PV-2512-002',
    documentType: 'payment',
    supplierId: 'supplier-002',
    supplierName: 'Marine Services Group Ltd.',
    supplierTaxId: '0-1055-43678-90-1',
    companyId: 'company-001',
    companyName: 'Faraway Yachting',
    paymentAmount: 180000,
    whtType: 'pnd53',
    whtRate: 3,
    whtAmount: 5400,
    status: 'pending',
    period: '2025-12',
    currency: 'THB',
  },
  {
    id: 'wht-ts-003',
    date: '2025-12-22',
    documentNumber: 'PV-2512-003',
    documentType: 'payment',
    supplierId: 'supplier-003',
    supplierName: 'Mr. Somchai Maintenance',
    supplierTaxId: '3-1234-56789-01-2',
    companyId: 'company-001',
    companyName: 'Faraway Yachting',
    paymentAmount: 45000,
    whtType: 'pnd3',
    whtRate: 3,
    whtAmount: 1350,
    whtCertificateNumber: 'WHT-TS-2512-003',
    status: 'pending',
    period: '2025-12',
    currency: 'THB',
  },
  {
    id: 'wht-ts-004',
    date: '2025-12-20',
    documentNumber: 'PV-2512-004',
    documentType: 'payment',
    supplierId: 'supplier-004',
    supplierName: 'Premium Yacht Parts Co., Ltd.',
    supplierTaxId: '0-1077-89012-34-5',
    companyId: 'company-001',
    companyName: 'Faraway Yachting',
    paymentAmount: 520000,
    whtType: 'pnd53',
    whtRate: 3,
    whtAmount: 15600,
    status: 'pending',
    period: '2025-12',
    currency: 'THB',
  },
  {
    id: 'wht-ts-005',
    date: '2025-12-18',
    documentNumber: 'PV-2512-005',
    documentType: 'payment',
    supplierId: 'supplier-005',
    supplierName: 'Ms. Niran Cleaning Services',
    supplierTaxId: '3-5678-90123-45-6',
    companyId: 'company-001',
    companyName: 'Faraway Yachting',
    paymentAmount: 25000,
    whtType: 'pnd3',
    whtRate: 3,
    whtAmount: 750,
    status: 'pending',
    period: '2025-12',
    currency: 'THB',
  },
  {
    id: 'wht-ts-006',
    date: '2025-12-15',
    documentNumber: 'PV-2512-006',
    documentType: 'payment',
    supplierId: 'supplier-006',
    supplierName: 'Phuket Marina Services Ltd.',
    supplierTaxId: '0-1088-90123-45-6',
    companyId: 'company-001',
    companyName: 'Faraway Yachting',
    paymentAmount: 280000,
    whtType: 'pnd53',
    whtRate: 3,
    whtAmount: 8400,
    status: 'pending',
    period: '2025-12',
    currency: 'THB',
  },

  // Blue Horizon Maritime - December 2025
  {
    id: 'wht-ts-007',
    date: '2025-12-23',
    documentNumber: 'PV-2512-101',
    documentType: 'payment',
    supplierId: 'supplier-101',
    supplierName: 'Siam Provisions Co., Ltd.',
    supplierTaxId: '0-1099-01234-56-7',
    companyId: 'company-002',
    companyName: 'Blue Horizon Maritime',
    paymentAmount: 120000,
    whtType: 'pnd53',
    whtRate: 3,
    whtAmount: 3600,
    status: 'pending',
    period: '2025-12',
    currency: 'THB',
  },
  {
    id: 'wht-ts-008',
    date: '2025-12-19',
    documentNumber: 'PV-2512-102',
    documentType: 'payment',
    supplierId: 'supplier-102',
    supplierName: 'Mr. Wichai Engineering',
    supplierTaxId: '3-9012-34567-89-0',
    companyId: 'company-002',
    companyName: 'Blue Horizon Maritime',
    paymentAmount: 85000,
    whtType: 'pnd3',
    whtRate: 3,
    whtAmount: 2550,
    status: 'pending',
    period: '2025-12',
    currency: 'THB',
  },
  {
    id: 'wht-ts-009',
    date: '2025-12-14',
    documentNumber: 'PV-2512-103',
    documentType: 'payment',
    supplierId: 'supplier-103',
    supplierName: 'Gulf Marine Equipment Ltd.',
    supplierTaxId: '0-1111-23456-78-9',
    companyId: 'company-002',
    companyName: 'Blue Horizon Maritime',
    paymentAmount: 420000,
    whtType: 'pnd53',
    whtRate: 3,
    whtAmount: 12600,
    status: 'pending',
    period: '2025-12',
    currency: 'THB',
  },

  // November 2025 - Historical (submitted/filed)
  {
    id: 'wht-ts-010',
    date: '2025-11-28',
    documentNumber: 'PV-2511-001',
    documentType: 'payment',
    supplierId: 'supplier-001',
    supplierName: 'ABC Fuel Supply Co., Ltd.',
    supplierTaxId: '0-1234-56789-01-2',
    companyId: 'company-001',
    companyName: 'Faraway Yachting',
    paymentAmount: 380000,
    whtType: 'pnd53',
    whtRate: 3,
    whtAmount: 11400,
    whtCertificateNumber: 'WHT-TS-2511-001',
    status: 'filed',
    submissionDate: '2025-12-07',
    period: '2025-11',
    currency: 'THB',
  },
  {
    id: 'wht-ts-011',
    date: '2025-11-20',
    documentNumber: 'PV-2511-002',
    documentType: 'payment',
    supplierId: 'supplier-003',
    supplierName: 'Mr. Somchai Maintenance',
    supplierTaxId: '3-1234-56789-01-2',
    companyId: 'company-001',
    companyName: 'Faraway Yachting',
    paymentAmount: 55000,
    whtType: 'pnd3',
    whtRate: 3,
    whtAmount: 1650,
    whtCertificateNumber: 'WHT-TS-2511-002',
    status: 'filed',
    submissionDate: '2025-12-07',
    period: '2025-11',
    currency: 'THB',
  },
  {
    id: 'wht-ts-012',
    date: '2025-11-15',
    documentNumber: 'PV-2511-003',
    documentType: 'payment',
    supplierId: 'supplier-004',
    supplierName: 'Premium Yacht Parts Co., Ltd.',
    supplierTaxId: '0-1077-89012-34-5',
    companyId: 'company-001',
    companyName: 'Faraway Yachting',
    paymentAmount: 650000,
    whtType: 'pnd53',
    whtRate: 3,
    whtAmount: 19500,
    whtCertificateNumber: 'WHT-TS-2511-003',
    status: 'filed',
    submissionDate: '2025-12-07',
    period: '2025-11',
    currency: 'THB',
  },
];

// Helper functions
export function getWhtToSupplierByPeriod(period: string): WhtToSupplier[] {
  const allData = getAllWhtToSupplier();
  return allData.filter(wht => wht.period === period);
}

export function getWhtToSupplierByCompany(companyId: string): WhtToSupplier[] {
  const allData = getAllWhtToSupplier();
  if (!companyId || companyId === 'all-companies') {
    return allData;
  }
  const actualId = companyId.replace('company-', '');
  return allData.filter(
    wht => wht.companyId === companyId || wht.companyId === actualId
  );
}

export function getWhtToSupplierSummaries(period: string): WhtToSupplierSummary[] {
  const data = getWhtToSupplierByPeriod(period);
  const grouped = new Map<string, WhtToSupplier[]>();

  data.forEach(wht => {
    if (!grouped.has(wht.companyId)) {
      grouped.set(wht.companyId, []);
    }
    grouped.get(wht.companyId)!.push(wht);
  });

  const summaries: WhtToSupplierSummary[] = [];
  grouped.forEach((items, companyId) => {
    const pnd3Items = items.filter(i => i.whtType === 'pnd3');
    const pnd53Items = items.filter(i => i.whtType === 'pnd53');
    const filedCount = items.filter(i => i.status === 'filed').length;
    const totalCount = items.length;

    // Due date is 7th of the following month
    const [year, month] = period.split('-').map(Number);
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const dueDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-07`;

    summaries.push({
      period,
      companyId,
      companyName: items[0].companyName,
      pnd3Amount: pnd3Items.reduce((sum, i) => sum + i.whtAmount, 0),
      pnd53Amount: pnd53Items.reduce((sum, i) => sum + i.whtAmount, 0),
      totalWhtAmount: items.reduce((sum, i) => sum + i.whtAmount, 0),
      transactionCount: items.length,
      dueDate,
      status: filedCount === totalCount ? 'filed' : filedCount > 0 ? 'submitted' : 'pending',
    });
  });

  return summaries;
}

export function getAllWhtToSupplier(): WhtToSupplier[] {
  // Get certificates from expenses module and convert
  const expenseCertificates = getAllWhtCertificates();
  const convertedCertificates = expenseCertificates.map(convertWhtCertificateToWhtToSupplier);

  // Combine with existing mock data, avoiding duplicates by ID
  const existingIds = new Set(mockWhtToSupplier.map(t => t.id));
  const newCertificates = convertedCertificates.filter(c => !existingIds.has(c.id));

  return [...mockWhtToSupplier, ...newCertificates];
}

export function getWhtToSupplierByExpenseId(expenseId: string): WhtToSupplier[] {
  const allData = getAllWhtToSupplier();
  return allData.filter(wht => wht.expenseRecordIds?.includes(expenseId));
}
