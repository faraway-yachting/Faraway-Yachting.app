/**
 * Expense CRUD Operations
 *
 * Mock CRUD operations for expense records.
 * In production, this will be replaced with database queries.
 */

import {
  ExpenseRecord,
  ExpenseStatus,
  PaymentStatus,
  ReceiptStatus,
  ExpensePayment,
  ExpenseFilters,
  InventoryPurchase,
  InventoryPurchaseStatus,
  AssetPurchase,
  AssetPurchaseStatus,
  ReceivedCreditNote,
  ReceivedCreditNoteStatus,
  ReceivedDebitNote,
  ReceivedDebitNoteStatus,
  WhtCertificate,
  WhtCertificateStatus,
} from './types';
import {
  mockExpenseRecords,
  mockInventoryPurchases,
  mockAssetPurchases,
  mockReceivedCreditNotes,
  mockReceivedDebitNotes,
  mockWhtCertificates,
} from './mockData';

// Mutable copies for CRUD operations
let expenseRecords = [...mockExpenseRecords];
let inventoryPurchases = [...mockInventoryPurchases];
let assetPurchases = [...mockAssetPurchases];
let receivedCreditNotes = [...mockReceivedCreditNotes];
let receivedDebitNotes = [...mockReceivedDebitNotes];
let whtCertificates = [...mockWhtCertificates];

// ============================================================================
// ID Generators
// ============================================================================

const generateId = (): string =>
  `exp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const generateExpenseNumber = (companyId: string): string => {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const count = expenseRecords.filter(
    (e) => e.companyId === companyId && e.expenseNumber.includes(`EXP-${yy}${mm}`)
  ).length;
  return `EXP-${yy}${mm}-${String(count + 1).padStart(4, '0')}`;
};

const generateInventoryPurchaseNumber = (companyId: string): string => {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const count = inventoryPurchases.filter(
    (p) => p.companyId === companyId && p.purchaseNumber.includes(`PO-INV-${yy}${mm}`)
  ).length;
  return `PO-INV-${yy}${mm}-${String(count + 1).padStart(4, '0')}`;
};

const generateAssetPurchaseNumber = (companyId: string): string => {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const count = assetPurchases.filter(
    (p) => p.companyId === companyId && p.purchaseNumber.includes(`PO-AST-${yy}${mm}`)
  ).length;
  return `PO-AST-${yy}${mm}-${String(count + 1).padStart(4, '0')}`;
};

const generateReceivedCreditNoteNumber = (companyId: string): string => {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const count = receivedCreditNotes.filter(
    (cn) => cn.companyId === companyId && cn.creditNoteNumber.includes(`RCN-${yy}${mm}`)
  ).length;
  return `RCN-${yy}${mm}-${String(count + 1).padStart(4, '0')}`;
};

const generateReceivedDebitNoteNumber = (companyId: string): string => {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const count = receivedDebitNotes.filter(
    (dn) => dn.companyId === companyId && dn.debitNoteNumber.includes(`RDN-${yy}${mm}`)
  ).length;
  return `RDN-${yy}${mm}-${String(count + 1).padStart(4, '0')}`;
};

const generateWhtCertificateNumber = (companyCode: string): string => {
  const now = new Date();
  const year = now.getFullYear();
  const count = whtCertificates.filter(
    (c) => c.certificateNumber.includes(`WHT-${companyCode}-${year}`)
  ).length;
  return `WHT-${companyCode}-${year}-${String(count + 1).padStart(4, '0')}`;
};

// ============================================================================
// Expense Record CRUD
// ============================================================================

/**
 * Get all expense records
 */
export function getAllExpenseRecords(): ExpenseRecord[] {
  return expenseRecords;
}

/**
 * Get expense records with filters
 */
export function getExpenseRecords(filters?: ExpenseFilters): ExpenseRecord[] {
  let result = [...expenseRecords];

  if (filters) {
    if (filters.dataScope && filters.dataScope !== 'all-companies') {
      const companyId = filters.dataScope.replace('company-', '');
      result = result.filter((e) => e.companyId === companyId || e.companyId === filters.dataScope);
    }

    if (filters.status) {
      result = result.filter((e) => e.status === filters.status);
    }

    if (filters.paymentStatus) {
      result = result.filter((e) => e.paymentStatus === filters.paymentStatus);
    }

    if (filters.receiptStatus) {
      result = result.filter((e) => e.receiptStatus === filters.receiptStatus);
    }

    if (filters.vendorId) {
      result = result.filter((e) => e.vendorId === filters.vendorId);
    }

    if (filters.projectId) {
      result = result.filter((e) =>
        e.lineItems.some((li) => li.projectId === filters.projectId)
      );
    }

    if (filters.dateFrom) {
      result = result.filter((e) => e.expenseDate >= filters.dateFrom!);
    }

    if (filters.dateTo) {
      result = result.filter((e) => e.expenseDate <= filters.dateTo!);
    }

    if (filters.currency) {
      result = result.filter((e) => e.currency === filters.currency);
    }
  }

  // Sort by date descending
  return result.sort((a, b) => b.expenseDate.localeCompare(a.expenseDate));
}

/**
 * Get expense record by ID
 */
export function getExpenseRecordById(id: string): ExpenseRecord | undefined {
  return expenseRecords.find((e) => e.id === id);
}

/**
 * Get expense records by company
 */
export function getExpenseRecordsByCompany(companyId: string): ExpenseRecord[] {
  return expenseRecords.filter((e) => e.companyId === companyId);
}

/**
 * Get expense records by status
 */
export function getExpenseRecordsByStatus(status: ExpenseStatus): ExpenseRecord[] {
  return expenseRecords.filter((e) => e.status === status);
}

/**
 * Get overdue expense records (past due date, not fully paid)
 */
export function getOverdueExpenseRecords(): ExpenseRecord[] {
  const today = new Date().toISOString().split('T')[0];
  return expenseRecords.filter(
    (e) =>
      e.status === 'approved' &&
      e.paymentStatus !== 'paid' &&
      e.dueDate &&
      e.dueDate < today
  );
}

/**
 * Get expense records pending receipt
 */
export function getExpensesPendingReceipt(): ExpenseRecord[] {
  return expenseRecords.filter(
    (e) => e.status === 'approved' && e.receiptStatus === 'pending'
  );
}

/**
 * Create new expense record
 */
export function createExpenseRecord(
  data: Omit<ExpenseRecord, 'id' | 'expenseNumber' | 'createdAt' | 'updatedAt'>
): ExpenseRecord {
  const now = new Date().toISOString();
  const newExpense: ExpenseRecord = {
    ...data,
    id: generateId(),
    expenseNumber: generateExpenseNumber(data.companyId),
    createdAt: now,
    updatedAt: now,
  };
  expenseRecords.push(newExpense);
  return newExpense;
}

/**
 * Update expense record
 */
export function updateExpenseRecord(
  id: string,
  updates: Partial<ExpenseRecord>
): ExpenseRecord | null {
  const index = expenseRecords.findIndex((e) => e.id === id);
  if (index === -1) return null;

  expenseRecords[index] = {
    ...expenseRecords[index],
    ...updates,
    id, // Ensure ID cannot be changed
    updatedAt: new Date().toISOString(),
  };

  return expenseRecords[index];
}

/**
 * Delete expense record
 */
export function deleteExpenseRecord(id: string): boolean {
  const index = expenseRecords.findIndex((e) => e.id === id);
  if (index === -1) return false;

  expenseRecords.splice(index, 1);
  return true;
}

/**
 * Approve expense record
 */
export function approveExpenseRecord(
  id: string,
  approvedBy: string
): ExpenseRecord | null {
  const expense = getExpenseRecordById(id);
  if (!expense || expense.status !== 'draft') return null;

  return updateExpenseRecord(id, {
    status: 'approved',
    approvedDate: new Date().toISOString().split('T')[0],
    approvedBy,
  });
}

/**
 * Void expense record
 */
export function voidExpenseRecord(
  id: string,
  reason: string
): ExpenseRecord | null {
  const expense = getExpenseRecordById(id);
  if (!expense || expense.status === 'void') return null;

  return updateExpenseRecord(id, {
    status: 'void',
    voidedDate: new Date().toISOString().split('T')[0],
    voidReason: reason,
  });
}

/**
 * Add payment to expense record
 */
export function addPaymentToExpense(
  id: string,
  payment: Omit<ExpensePayment, 'id'>
): ExpenseRecord | null {
  const expense = getExpenseRecordById(id);
  if (!expense || expense.status !== 'approved') return null;

  const newPayment: ExpensePayment = {
    ...payment,
    id: `pay-${Date.now()}`,
  };

  const payments = [...(expense.payments || []), newPayment];
  const amountPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const amountOutstanding = expense.netPayable - amountPaid;

  let paymentStatus: PaymentStatus = 'unpaid';
  if (amountPaid >= expense.netPayable) {
    paymentStatus = 'paid';
  } else if (amountPaid > 0) {
    paymentStatus = 'partially_paid';
  }

  return updateExpenseRecord(id, {
    payments,
    amountPaid,
    amountOutstanding,
    paymentStatus,
  });
}

/**
 * Update receipt status
 */
export function updateReceiptStatus(
  id: string,
  status: ReceiptStatus,
  receivedBy?: string
): ExpenseRecord | null {
  const expense = getExpenseRecordById(id);
  if (!expense) return null;

  const updates: Partial<ExpenseRecord> = {
    receiptStatus: status,
  };

  if (status === 'received') {
    updates.receiptReceivedDate = new Date().toISOString().split('T')[0];
    updates.receiptReceivedBy = receivedBy;
  }

  return updateExpenseRecord(id, updates);
}

// ============================================================================
// Inventory Purchase CRUD
// ============================================================================

export function getAllInventoryPurchases(): InventoryPurchase[] {
  return inventoryPurchases;
}

export function getInventoryPurchaseById(id: string): InventoryPurchase | undefined {
  return inventoryPurchases.find((p) => p.id === id);
}

export function createInventoryPurchase(
  data: Omit<InventoryPurchase, 'id' | 'purchaseNumber' | 'createdAt' | 'updatedAt'>
): InventoryPurchase {
  const now = new Date().toISOString();
  const newPurchase: InventoryPurchase = {
    ...data,
    id: `inv-pur-${Date.now()}`,
    purchaseNumber: generateInventoryPurchaseNumber(data.companyId),
    createdAt: now,
    updatedAt: now,
  };
  inventoryPurchases.push(newPurchase);
  return newPurchase;
}

export function updateInventoryPurchase(
  id: string,
  updates: Partial<InventoryPurchase>
): InventoryPurchase | null {
  const index = inventoryPurchases.findIndex((p) => p.id === id);
  if (index === -1) return null;

  inventoryPurchases[index] = {
    ...inventoryPurchases[index],
    ...updates,
    id,
    updatedAt: new Date().toISOString(),
  };

  return inventoryPurchases[index];
}

// ============================================================================
// Asset Purchase CRUD
// ============================================================================

export function getAllAssetPurchases(): AssetPurchase[] {
  return assetPurchases;
}

export function getAssetPurchaseById(id: string): AssetPurchase | undefined {
  return assetPurchases.find((p) => p.id === id);
}

export function createAssetPurchase(
  data: Omit<AssetPurchase, 'id' | 'purchaseNumber' | 'createdAt' | 'updatedAt'>
): AssetPurchase {
  const now = new Date().toISOString();
  const newPurchase: AssetPurchase = {
    ...data,
    id: `ast-pur-${Date.now()}`,
    purchaseNumber: generateAssetPurchaseNumber(data.companyId),
    createdAt: now,
    updatedAt: now,
  };
  assetPurchases.push(newPurchase);
  return newPurchase;
}

export function updateAssetPurchase(
  id: string,
  updates: Partial<AssetPurchase>
): AssetPurchase | null {
  const index = assetPurchases.findIndex((p) => p.id === id);
  if (index === -1) return null;

  assetPurchases[index] = {
    ...assetPurchases[index],
    ...updates,
    id,
    updatedAt: new Date().toISOString(),
  };

  return assetPurchases[index];
}

// ============================================================================
// Received Credit Note CRUD
// ============================================================================

export function getAllReceivedCreditNotes(): ReceivedCreditNote[] {
  return receivedCreditNotes;
}

export function getReceivedCreditNoteById(id: string): ReceivedCreditNote | undefined {
  return receivedCreditNotes.find((cn) => cn.id === id);
}

export function createReceivedCreditNote(
  data: Omit<ReceivedCreditNote, 'id' | 'creditNoteNumber' | 'createdAt' | 'updatedAt'>
): ReceivedCreditNote {
  const now = new Date().toISOString();
  const newCreditNote: ReceivedCreditNote = {
    ...data,
    id: `rcn-${Date.now()}`,
    creditNoteNumber: generateReceivedCreditNoteNumber(data.companyId),
    createdAt: now,
    updatedAt: now,
  };
  receivedCreditNotes.push(newCreditNote);
  return newCreditNote;
}

export function updateReceivedCreditNote(
  id: string,
  updates: Partial<ReceivedCreditNote>
): ReceivedCreditNote | null {
  const index = receivedCreditNotes.findIndex((cn) => cn.id === id);
  if (index === -1) return null;

  receivedCreditNotes[index] = {
    ...receivedCreditNotes[index],
    ...updates,
    id,
    updatedAt: new Date().toISOString(),
  };

  return receivedCreditNotes[index];
}

// ============================================================================
// Received Debit Note CRUD
// ============================================================================

export function getAllReceivedDebitNotes(): ReceivedDebitNote[] {
  return receivedDebitNotes;
}

export function getReceivedDebitNoteById(id: string): ReceivedDebitNote | undefined {
  return receivedDebitNotes.find((dn) => dn.id === id);
}

export function createReceivedDebitNote(
  data: Omit<ReceivedDebitNote, 'id' | 'debitNoteNumber' | 'createdAt' | 'updatedAt'>
): ReceivedDebitNote {
  const now = new Date().toISOString();
  const newDebitNote: ReceivedDebitNote = {
    ...data,
    id: `rdn-${Date.now()}`,
    debitNoteNumber: generateReceivedDebitNoteNumber(data.companyId),
    createdAt: now,
    updatedAt: now,
  };
  receivedDebitNotes.push(newDebitNote);
  return newDebitNote;
}

export function updateReceivedDebitNote(
  id: string,
  updates: Partial<ReceivedDebitNote>
): ReceivedDebitNote | null {
  const index = receivedDebitNotes.findIndex((dn) => dn.id === id);
  if (index === -1) return null;

  receivedDebitNotes[index] = {
    ...receivedDebitNotes[index],
    ...updates,
    id,
    updatedAt: new Date().toISOString(),
  };

  return receivedDebitNotes[index];
}

// ============================================================================
// WHT Certificate CRUD
// ============================================================================

export function getAllWhtCertificates(): WhtCertificate[] {
  return whtCertificates;
}

export function getWhtCertificateById(id: string): WhtCertificate | undefined {
  return whtCertificates.find((c) => c.id === id);
}

export function getWhtCertificatesByCompany(companyId: string): WhtCertificate[] {
  return whtCertificates.filter((c) => c.payerCompanyId === companyId);
}

export function getWhtCertificatesByPeriod(period: string): WhtCertificate[] {
  return whtCertificates.filter((c) => c.taxPeriod === period);
}

export function getWhtCertificatesByExpense(expenseId: string): WhtCertificate[] {
  return whtCertificates.filter((c) => c.expenseRecordIds.includes(expenseId));
}

export function createWhtCertificate(
  data: Omit<WhtCertificate, 'id' | 'certificateNumber' | 'createdAt' | 'updatedAt'>,
  companyCode: string = 'FYL'
): WhtCertificate {
  const now = new Date().toISOString();
  const newCertificate: WhtCertificate = {
    ...data,
    id: `wht-${Date.now()}`,
    certificateNumber: generateWhtCertificateNumber(companyCode),
    createdAt: now,
    updatedAt: now,
  };
  whtCertificates.push(newCertificate);
  return newCertificate;
}

export function updateWhtCertificate(
  id: string,
  updates: Partial<WhtCertificate>
): WhtCertificate | null {
  const index = whtCertificates.findIndex((c) => c.id === id);
  if (index === -1) return null;

  whtCertificates[index] = {
    ...whtCertificates[index],
    ...updates,
    id,
    updatedAt: new Date().toISOString(),
  };

  return whtCertificates[index];
}

export function issueWhtCertificate(id: string): WhtCertificate | null {
  const cert = getWhtCertificateById(id);
  if (!cert || cert.status !== 'draft') return null;

  return updateWhtCertificate(id, {
    status: 'issued',
    issuedDate: new Date().toISOString().split('T')[0],
  });
}

export function fileWhtCertificate(
  id: string,
  submissionReference: string
): WhtCertificate | null {
  const cert = getWhtCertificateById(id);
  if (!cert || cert.status !== 'issued') return null;

  return updateWhtCertificate(id, {
    status: 'filed',
    filedDate: new Date().toISOString().split('T')[0],
    submissionReference,
  });
}

// ============================================================================
// Summary Functions
// ============================================================================

/**
 * Get expense summary for dashboard
 */
export function getExpenseSummary(companyId?: string): {
  totalExpenses: number;
  totalVat: number;
  totalWht: number;
  pendingPayments: number;
  overduePayments: number;
  pendingReceipts: number;
  draftCount: number;
  approvedCount: number;
} {
  let records = expenseRecords;
  if (companyId) {
    records = records.filter((e) => e.companyId === companyId);
  }

  const approved = records.filter((e) => e.status === 'approved');
  const today = new Date().toISOString().split('T')[0];

  return {
    totalExpenses: approved.reduce((sum, e) => sum + e.totalAmount, 0),
    totalVat: approved.reduce((sum, e) => sum + e.vatAmount, 0),
    totalWht: approved.reduce((sum, e) => sum + e.whtAmount, 0),
    pendingPayments: approved
      .filter((e) => e.paymentStatus !== 'paid')
      .reduce((sum, e) => sum + e.amountOutstanding, 0),
    overduePayments: approved
      .filter((e) => e.paymentStatus !== 'paid' && e.dueDate && e.dueDate < today)
      .reduce((sum, e) => sum + e.amountOutstanding, 0),
    pendingReceipts: approved.filter((e) => e.receiptStatus === 'pending').length,
    draftCount: records.filter((e) => e.status === 'draft').length,
    approvedCount: approved.length,
  };
}

/**
 * Get recent expense records
 */
export function getRecentExpenseRecords(limit: number = 10): ExpenseRecord[] {
  return [...expenseRecords]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}
