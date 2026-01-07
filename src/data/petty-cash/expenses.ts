import type { PettyCashExpense, PettyCashExpenseLineItem } from './types';

// Mock petty cash expenses
export const mockExpenses: PettyCashExpense[] = [
  {
    id: 'pc-exp-001',
    expenseNumber: 'PC-EXP-2501-0001',
    walletId: 'wallet-001',
    walletHolderName: 'Somchai Kaewsawang',
    companyId: 'company-001',
    companyName: 'Faraway Yachting',
    expenseDate: '2025-01-03',
    description: 'Fuel for tender boat and provisions',
    amount: 4300,
    projectId: 'project-001',
    projectName: 'Ocean Star',
    receiptStatus: 'original_received',
    receiptReceivedDate: '2025-01-03',
    attachments: [],
    lineItems: [
      {
        id: 'line-001-1',
        projectId: 'project-001',
        projectName: 'Ocean Star',
        categoryId: 'cat-005',
        categoryName: 'Fuel & Gas',
        description: 'Diesel for tender boat',
        amount: 2500,
        vatType: 'include',
        vatRate: 7,
        vatAmount: 163.55,
        preVatAmount: 2336.45,
        whtApplicable: false,
        whtRate: 0,
        whtAmount: 0,
      },
      {
        id: 'line-001-2',
        projectId: 'project-001',
        projectName: 'Ocean Star',
        categoryId: 'cat-003',
        categoryName: 'Meals & Entertainment',
        description: 'Fresh provisions from market',
        amount: 1800,
        vatType: 'no_vat',
        vatRate: 0,
        vatAmount: 0,
        preVatAmount: 1800,
        whtApplicable: false,
        whtRate: 0,
        whtAmount: 0,
      },
    ],
    subtotal: 4136.45,
    vatAmount: 163.55,
    totalAmount: 4300,
    whtAmount: 0,
    netAmount: 4300,
    status: 'submitted',
    submittedAt: '2025-01-03T11:30:00Z',
    createdBy: 'user-001',
    createdAt: '2025-01-03T10:00:00Z',
    updatedAt: '2025-01-03T11:30:00Z',
  },
  {
    id: 'pc-exp-002',
    expenseNumber: 'PC-EXP-2501-0002',
    walletId: 'wallet-002',
    walletHolderName: 'Niran Petchsri',
    companyId: 'company-001',
    companyName: 'Faraway Yachting',
    expenseDate: '2025-01-02',
    description: 'Office supplies and communication',
    amount: 1350,
    projectId: 'project-002',
    projectName: 'Sea Breeze',
    receiptStatus: 'pending',
    attachments: [],
    lineItems: [
      {
        id: 'line-002-1',
        projectId: 'project-002',
        projectName: 'Sea Breeze',
        categoryId: 'cat-002',
        categoryName: 'Office Supplies',
        description: 'Printer paper and stationery',
        amount: 850,
        vatType: 'include',
        vatRate: 7,
        vatAmount: 55.61,
        preVatAmount: 794.39,
        whtApplicable: false,
        whtRate: 0,
        whtAmount: 0,
      },
      {
        id: 'line-002-2',
        projectId: 'project-002',
        projectName: 'Sea Breeze',
        categoryId: 'cat-006',
        categoryName: 'Communication',
        description: 'Mobile top-up for crew',
        amount: 500,
        vatType: 'include',
        vatRate: 7,
        vatAmount: 32.71,
        preVatAmount: 467.29,
        whtApplicable: false,
        whtRate: 0,
        whtAmount: 0,
      },
    ],
    subtotal: 1261.68,
    vatAmount: 88.32,
    totalAmount: 1350,
    whtAmount: 0,
    netAmount: 1350,
    status: 'submitted',
    submittedAt: '2025-01-02T15:00:00Z',
    createdBy: 'user-002',
    createdAt: '2025-01-02T14:00:00Z',
    updatedAt: '2025-01-02T15:00:00Z',
  },
  {
    id: 'pc-exp-003',
    expenseNumber: 'PC-EXP-2501-0003',
    walletId: 'wallet-003',
    walletHolderName: 'Prasit Tongchai',
    companyId: 'company-002',
    companyName: 'Blue Horizon Maritime',
    expenseDate: '2025-01-04',
    description: 'Maintenance supplies',
    amount: 3500,
    projectId: 'project-003',
    projectName: 'Wave Rider',
    receiptStatus: 'original_received',
    receiptReceivedDate: '2025-01-04',
    attachments: [],
    lineItems: [
      {
        id: 'line-003-1',
        projectId: 'project-003',
        projectName: 'Wave Rider',
        categoryId: 'cat-004',
        categoryName: 'Maintenance & Repairs',
        description: 'Engine oil and filters',
        amount: 3500,
        vatType: 'include',
        vatRate: 7,
        vatAmount: 228.97,
        preVatAmount: 3271.03,
        whtApplicable: false,
        whtRate: 0,
        whtAmount: 0,
      },
    ],
    subtotal: 3271.03,
    vatAmount: 228.97,
    totalAmount: 3500,
    whtAmount: 0,
    netAmount: 3500,
    status: 'submitted',
    submittedAt: '2025-01-04T10:00:00Z',
    createdBy: 'user-003',
    createdAt: '2025-01-04T09:00:00Z',
    updatedAt: '2025-01-04T10:00:00Z',
  },
  {
    id: 'pc-exp-004',
    expenseNumber: 'PC-EXP-2501-0004',
    walletId: 'wallet-004',
    walletHolderName: 'Apinya Srisuk',
    companyId: 'company-001',
    companyName: 'Faraway Yachting',
    expenseDate: '2025-01-05',
    description: 'Cleaning supplies for office',
    amount: 680,
    projectId: 'project-general',
    projectName: 'General Operations',
    receiptStatus: 'pending',
    attachments: [],
    lineItems: [
      {
        id: 'line-004-1',
        projectId: 'project-general',
        projectName: 'General Operations',
        categoryId: 'cat-007',
        categoryName: 'Cleaning Supplies',
        description: 'Office cleaning materials',
        amount: 680,
        vatType: 'include',
        vatRate: 7,
        vatAmount: 44.49,
        preVatAmount: 635.51,
        whtApplicable: false,
        whtRate: 0,
        whtAmount: 0,
      },
    ],
    subtotal: 635.51,
    vatAmount: 44.49,
    totalAmount: 680,
    whtAmount: 0,
    netAmount: 680,
    status: 'submitted',
    submittedAt: '2025-01-05T09:30:00Z',
    createdBy: 'user-004',
    createdAt: '2025-01-05T08:45:00Z',
    updatedAt: '2025-01-05T09:30:00Z',
  },
  {
    id: 'pc-exp-005',
    expenseNumber: 'PC-EXP-2412-0015',
    walletId: 'wallet-001',
    walletHolderName: 'Somchai Kaewsawang',
    companyId: 'company-001',
    companyName: 'Faraway Yachting',
    expenseDate: '2024-12-28',
    description: 'Safety equipment purchase',
    amount: 5200,
    projectId: 'project-001',
    projectName: 'Ocean Star',
    receiptStatus: 'original_received',
    receiptReceivedDate: '2024-12-28',
    attachments: [],
    lineItems: [
      {
        id: 'line-005-1',
        projectId: 'project-001',
        projectName: 'Ocean Star',
        categoryId: 'cat-009',
        categoryName: 'Safety Equipment',
        description: 'Life jackets and first aid supplies',
        amount: 5200,
        vatType: 'include',
        vatRate: 7,
        vatAmount: 340.19,
        preVatAmount: 4859.81,
        whtApplicable: false,
        whtRate: 0,
        whtAmount: 0,
      },
    ],
    subtotal: 4859.81,
    vatAmount: 340.19,
    totalAmount: 5200,
    whtAmount: 0,
    netAmount: 5200,
    status: 'submitted',
    submittedAt: '2024-12-28T14:00:00Z',
    createdBy: 'user-001',
    createdAt: '2024-12-28T12:00:00Z',
    updatedAt: '2024-12-28T14:00:00Z',
  },
];

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
