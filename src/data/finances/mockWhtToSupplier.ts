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

// Empty mock data - use Supabase
export const mockWhtToSupplier: WhtToSupplier[] = [];

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
