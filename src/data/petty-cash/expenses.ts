import type { PettyCashExpense, PettyCashExpenseLineItem } from './types';

// Petty cash expenses (empty - data stored in Supabase)
export const mockExpenses: PettyCashExpense[] = [];

// Counter for generating expense numbers
let expenseCounter = 5;

// Get all expenses
export function getAllExpenses(): PettyCashExpense[] {
  return [...mockExpenses];
}

// Get expenses by wallet
export function getExpensesByWallet(walletId: string): PettyCashExpense[] {
  return mockExpenses.filter((e) => e.walletId === walletId);
}

// Get expenses by company
export function getExpensesByCompany(companyId: string): PettyCashExpense[] {
  return mockExpenses.filter((e) => e.companyId === companyId);
}

// Get expense by ID
export function getExpenseById(id: string): PettyCashExpense | undefined {
  return mockExpenses.find((e) => e.id === id);
}

// Get expenses by status
export function getExpensesByStatus(
  status: PettyCashExpense['status']
): PettyCashExpense[] {
  return mockExpenses.filter((e) => e.status === status);
}

// Get expenses by date range
export function getExpensesByDateRange(
  startDate: string,
  endDate: string
): PettyCashExpense[] {
  return mockExpenses.filter(
    (e) => e.expenseDate >= startDate && e.expenseDate <= endDate
  );
}

// Get pending receipt expenses
export function getExpensesPendingReceipt(): PettyCashExpense[] {
  return mockExpenses.filter((e) => e.receiptStatus === 'pending');
}

// Generate expense number
function generateExpenseNumber(): string {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  expenseCounter++;
  const seq = String(expenseCounter).padStart(4, '0');
  return `PC-EXP-${year}${month}-${seq}`;
}

// Input type for simplified expense (petty cash holder)
export interface SimplifiedExpenseInput {
  walletId: string;
  walletHolderName: string;
  companyId: string;
  companyName: string;
  expenseDate: string;
  description: string;
  amount: number;
  projectId: string;
  projectName: string;
  attachments: PettyCashExpense['attachments'];
  createdBy: string;
}

// Create simplified expense (for petty cash holder - minimal input)
export function createSimplifiedExpense(data: SimplifiedExpenseInput): PettyCashExpense {
  const now = new Date().toISOString();
  const id = `pc-exp-${Date.now()}`;
  const expenseNumber = generateExpenseNumber();

  // For simplified expenses, amount = netAmount (no VAT/WHT calculations)
  const expense: PettyCashExpense = {
    id,
    expenseNumber,
    walletId: data.walletId,
    walletHolderName: data.walletHolderName,
    companyId: data.companyId,
    companyName: data.companyName,
    expenseDate: data.expenseDate,
    description: data.description || '',
    amount: data.amount,
    projectId: data.projectId,
    projectName: data.projectName,
    receiptStatus: 'pending',
    attachments: data.attachments,
    lineItems: [], // Empty for simplified expenses
    // For simplified: all totals equal the input amount, no VAT/WHT
    subtotal: data.amount,
    vatAmount: 0,
    totalAmount: data.amount,
    whtAmount: 0,
    netAmount: data.amount,
    status: 'submitted',
    submittedAt: now,
    createdBy: data.createdBy,
    createdAt: now,
    updatedAt: now,
  };

  mockExpenses.push(expense);
  return expense;
}

// Create new expense (full version with line items - for backward compatibility)
export function createExpense(
  data: Omit<
    PettyCashExpense,
    | 'id'
    | 'expenseNumber'
    | 'createdAt'
    | 'updatedAt'
    | 'subtotal'
    | 'vatAmount'
    | 'totalAmount'
    | 'whtAmount'
    | 'netAmount'
  >
): PettyCashExpense {
  const now = new Date().toISOString();
  const id = `pc-exp-${Date.now()}`;
  const expenseNumber = generateExpenseNumber();

  // Calculate totals from line items if provided, otherwise use amount
  let subtotal: number;
  let vatAmount: number;
  let totalAmount: number;
  let whtAmount: number;
  let netAmount: number;

  if (data.lineItems && data.lineItems.length > 0) {
    subtotal = data.lineItems.reduce((sum, item) => sum + item.preVatAmount, 0);
    vatAmount = data.lineItems.reduce((sum, item) => sum + item.vatAmount, 0);
    totalAmount = subtotal + vatAmount;
    whtAmount = data.lineItems.reduce((sum, item) => sum + item.whtAmount, 0);
    netAmount = totalAmount - whtAmount;
  } else {
    // Simplified expense - use the amount directly
    subtotal = data.amount;
    vatAmount = 0;
    totalAmount = data.amount;
    whtAmount = 0;
    netAmount = data.amount;
  }

  const expense: PettyCashExpense = {
    ...data,
    id,
    expenseNumber,
    subtotal,
    vatAmount,
    totalAmount,
    whtAmount,
    netAmount,
    createdAt: now,
    updatedAt: now,
  };

  mockExpenses.push(expense);
  return expense;
}

// Update expense
export function updateExpense(
  id: string,
  data: Partial<PettyCashExpense>
): PettyCashExpense | null {
  const index = mockExpenses.findIndex((e) => e.id === id);
  if (index === -1) return null;

  // Recalculate totals if line items changed
  let updates = { ...data };
  if (data.lineItems) {
    const subtotal = data.lineItems.reduce((sum, item) => sum + item.preVatAmount, 0);
    const vatAmount = data.lineItems.reduce((sum, item) => sum + item.vatAmount, 0);
    const totalAmount = subtotal + vatAmount;
    const whtAmount = data.lineItems.reduce((sum, item) => sum + item.whtAmount, 0);
    const netAmount = totalAmount - whtAmount;
    updates = { ...updates, subtotal, vatAmount, totalAmount, whtAmount, netAmount };
  }

  mockExpenses[index] = {
    ...mockExpenses[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  return mockExpenses[index];
}

// Update receipt status
export function updateReceiptStatus(
  expenseId: string,
  status: PettyCashExpense['receiptStatus'],
  receivedDate?: string
): PettyCashExpense | null {
  const index = mockExpenses.findIndex((e) => e.id === expenseId);
  if (index === -1) return null;

  mockExpenses[index] = {
    ...mockExpenses[index],
    receiptStatus: status,
    receiptReceivedDate:
      status === 'original_received' ? receivedDate || new Date().toISOString().split('T')[0] : undefined,
    updatedAt: new Date().toISOString(),
  };

  return mockExpenses[index];
}

// Calculate monthly expenses for a wallet
export function getMonthlyExpensesForWallet(
  walletId: string,
  year: number,
  month: number
): number {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, '0')}-01`;

  return mockExpenses
    .filter(
      (e) =>
        e.walletId === walletId &&
        e.expenseDate >= startDate &&
        e.expenseDate < endDate &&
        e.status === 'submitted'
    )
    .reduce((sum, e) => sum + e.netAmount, 0);
}

// Calculate total expenses by company for a period
export function getExpensesByCompanyForPeriod(
  companyId: string,
  startDate: string,
  endDate: string
): number {
  return mockExpenses
    .filter(
      (e) =>
        e.companyId === companyId &&
        e.expenseDate >= startDate &&
        e.expenseDate <= endDate &&
        e.status === 'submitted'
    )
    .reduce((sum, e) => sum + e.netAmount, 0);
}
