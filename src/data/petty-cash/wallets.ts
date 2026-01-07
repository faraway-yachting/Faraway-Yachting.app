import type { PettyCashWallet, WalletStatus } from './types';
import type { Currency } from '@/data/company/types';

// Mock petty cash wallets
export let mockWallets: PettyCashWallet[] = [
  {
    id: 'wallet-001',
    walletName: 'Ocean Star Petty Cash',
    userId: 'user-001',
    userName: 'Somchai Kaewsawang',
    userEmail: 'somchai.k@farawayyachting.com',
    userRole: 'Captain - Ocean Star',
    companyId: 'company-001',
    companyName: 'Faraway Yachting Co., Ltd.',
    balance: 15000,
    beginningBalance: 20000,
    currency: 'THB',
    status: 'active',
    balanceLimit: 50000,
    lowBalanceThreshold: 5000,
    reimbursementBankAccountId: 'bank-001',
    reimbursementBankAccountName: 'Kasikorn - 123-4-56789-0',
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2025-01-03T10:30:00Z',
  },
  {
    id: 'wallet-002',
    walletName: 'Sea Breeze Petty Cash',
    userId: 'user-002',
    userName: 'Niran Petchsri',
    userEmail: 'niran.p@farawayyachting.com',
    userRole: 'Captain - Sea Breeze',
    companyId: 'company-001',
    companyName: 'Faraway Yachting Co., Ltd.',
    balance: 8500,
    beginningBalance: 15000,
    currency: 'THB',
    status: 'active',
    balanceLimit: 50000,
    lowBalanceThreshold: 5000,
    reimbursementBankAccountId: 'bank-001',
    reimbursementBankAccountName: 'Kasikorn - 123-4-56789-0',
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2025-01-02T14:15:00Z',
  },
  {
    id: 'wallet-003',
    walletName: 'Wave Rider Petty Cash',
    userId: 'user-003',
    userName: 'Prasit Tongchai',
    userEmail: 'prasit.t@bluehorizon.com',
    userRole: 'Captain - Wave Rider',
    companyId: 'company-002',
    companyName: 'Blue Horizon Maritime Ltd.',
    balance: 22300,
    beginningBalance: 25000,
    currency: 'THB',
    status: 'active',
    balanceLimit: 50000,
    lowBalanceThreshold: 5000,
    reimbursementBankAccountId: 'bank-002',
    reimbursementBankAccountName: 'Bangkok Bank - 987-6-54321-0',
    createdAt: '2024-03-10T00:00:00Z',
    updatedAt: '2025-01-04T09:00:00Z',
  },
  {
    id: 'wallet-004',
    walletName: 'Office Management',
    userId: 'user-004',
    userName: 'Apinya Srisuk',
    userEmail: 'apinya.s@farawayyachting.com',
    userRole: 'Office Manager',
    companyId: 'company-001',
    companyName: 'Faraway Yachting Co., Ltd.',
    balance: 3200,
    beginningBalance: 10000,
    currency: 'THB',
    status: 'active',
    balanceLimit: 30000,
    lowBalanceThreshold: 5000,
    reimbursementBankAccountId: 'bank-001',
    reimbursementBankAccountName: 'Kasikorn - 123-4-56789-0',
    createdAt: '2024-04-15T00:00:00Z',
    updatedAt: '2025-01-05T08:45:00Z',
  },
  {
    id: 'wallet-005',
    walletName: 'Maintenance Fund',
    userId: 'user-005',
    userName: 'Wichai Ratanakul',
    userEmail: 'wichai.r@farawayyachting.com',
    userRole: 'Maintenance Supervisor',
    companyId: 'company-001',
    companyName: 'Faraway Yachting Co., Ltd.',
    balance: 12500,
    beginningBalance: 20000,
    currency: 'THB',
    status: 'active',
    balanceLimit: 40000,
    lowBalanceThreshold: 5000,
    reimbursementBankAccountId: 'bank-001',
    reimbursementBankAccountName: 'Kasikorn - 123-4-56789-0',
    createdAt: '2024-05-20T00:00:00Z',
    updatedAt: '2025-01-04T16:30:00Z',
  },
];

// Get all wallets
export function getAllWallets(): PettyCashWallet[] {
  return [...mockWallets];
}

// Get active wallets
export function getActiveWallets(): PettyCashWallet[] {
  return mockWallets.filter((w) => w.status === 'active');
}

// Get wallet by ID
export function getWalletById(id: string): PettyCashWallet | undefined {
  return mockWallets.find((w) => w.id === id);
}

// Get wallet by user ID
export function getWalletByUserId(userId: string): PettyCashWallet | undefined {
  return mockWallets.find((w) => w.userId === userId);
}

// Get low balance wallets
export function getLowBalanceWallets(): PettyCashWallet[] {
  return mockWallets.filter(
    (w) =>
      w.status === 'active' &&
      w.lowBalanceThreshold &&
      w.balance <= w.lowBalanceThreshold
  );
}

// Update wallet balance
export function updateWalletBalance(
  walletId: string,
  newBalance: number
): PettyCashWallet | null {
  const index = mockWallets.findIndex((w) => w.id === walletId);
  if (index === -1) return null;

  mockWallets[index] = {
    ...mockWallets[index],
    balance: newBalance,
    updatedAt: new Date().toISOString(),
  };

  return mockWallets[index];
}

// Deduct from wallet (for expenses)
export function deductFromWallet(
  walletId: string,
  amount: number
): PettyCashWallet | null {
  const wallet = getWalletById(walletId);
  if (!wallet) return null;

  const newBalance = wallet.balance - amount;
  if (newBalance < 0) return null; // Insufficient funds

  return updateWalletBalance(walletId, newBalance);
}

// Add to wallet (for top-ups and reimbursements)
export function addToWallet(
  walletId: string,
  amount: number
): PettyCashWallet | null {
  const wallet = getWalletById(walletId);
  if (!wallet) return null;

  const newBalance = wallet.balance + amount;

  // Check balance limit
  if (wallet.balanceLimit && newBalance > wallet.balanceLimit) {
    return null; // Exceeds limit
  }

  return updateWalletBalance(walletId, newBalance);
}

// Toggle wallet status (active/closed)
export function toggleWalletStatus(walletId: string): PettyCashWallet | null {
  const index = mockWallets.findIndex((w) => w.id === walletId);
  if (index === -1) return null;

  mockWallets[index] = {
    ...mockWallets[index],
    status: mockWallets[index].status === 'active' ? 'closed' : 'active',
    updatedAt: new Date().toISOString(),
  };

  return mockWallets[index];
}

// Generate unique wallet ID
function generateWalletId(): string {
  return `wallet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Input type for creating a wallet
export interface CreateWalletInput {
  walletName: string;
  userName: string;
  userEmail?: string;
  userRole?: string;
  companyId: string;
  companyName: string;
  beginningBalance?: number;
  currency: Currency;
  balanceLimit?: number;
  lowBalanceThreshold?: number;
  reimbursementBankAccountId?: string;
  reimbursementBankAccountName?: string;
}

// Create a new wallet
export function createWallet(input: CreateWalletInput): PettyCashWallet {
  const now = new Date().toISOString();
  const userId = `user-${Date.now()}`;

  const newWallet: PettyCashWallet = {
    id: generateWalletId(),
    walletName: input.walletName,
    userId,
    userName: input.userName,
    userEmail: input.userEmail,
    userRole: input.userRole,
    companyId: input.companyId,
    companyName: input.companyName,
    balance: input.beginningBalance || 0,
    beginningBalance: input.beginningBalance || 0,
    currency: input.currency,
    status: 'active',
    balanceLimit: input.balanceLimit,
    lowBalanceThreshold: input.lowBalanceThreshold,
    reimbursementBankAccountId: input.reimbursementBankAccountId,
    reimbursementBankAccountName: input.reimbursementBankAccountName,
    createdAt: now,
    updatedAt: now,
  };

  mockWallets.push(newWallet);
  return newWallet;
}

// Update wallet settings
export function updateWallet(
  id: string,
  updates: Partial<Omit<PettyCashWallet, 'id' | 'createdAt' | 'updatedAt'>>
): PettyCashWallet | null {
  const index = mockWallets.findIndex((w) => w.id === id);
  if (index === -1) return null;

  mockWallets[index] = {
    ...mockWallets[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  return mockWallets[index];
}

// Delete wallet (only if balance is 0)
export function deleteWallet(id: string): { success: boolean; error?: string } {
  const index = mockWallets.findIndex((w) => w.id === id);
  if (index === -1) {
    return { success: false, error: 'Wallet not found' };
  }

  const wallet = mockWallets[index];
  if (wallet.balance !== 0) {
    return { success: false, error: 'Cannot delete wallet with non-zero balance' };
  }

  mockWallets.splice(index, 1);
  return { success: true };
}

// Get closed wallets
export function getClosedWallets(): PettyCashWallet[] {
  return mockWallets.filter((w) => w.status === 'closed');
}

// Calculate total balance across all active wallets
export function getTotalWalletBalance(): number {
  return mockWallets
    .filter((w) => w.status === 'active')
    .reduce((sum, w) => sum + w.balance, 0);
}

// Import for transaction building
import { getAllExpenses } from './expenses';
import { getAllTopUps } from './topups';
import { getAllReimbursements } from './reimbursements';
import type { PettyCashTransaction, TransactionType } from './types';

// Get all transactions across all wallets (unified view)
export function getAllTransactions(): PettyCashTransaction[] {
  const expenses = getAllExpenses();
  const topUps = getAllTopUps();
  const reimbursements = getAllReimbursements();

  const transactions: PettyCashTransaction[] = [];

  // Add expenses (negative amounts - money out of wallet)
  expenses
    .filter((e) => e.status === 'submitted')
    .forEach((expense) => {
      transactions.push({
        id: expense.id,
        type: 'expense' as TransactionType,
        date: expense.expenseDate,
        description: expense.description || `Expense - ${expense.projectName}`,
        amount: -expense.netAmount, // Negative for expenses
        category: expense.expenseAccountName || expense.lineItems[0]?.categoryName,
        companyName: expense.companyName,
        walletId: expense.walletId,
        walletHolderName: expense.walletHolderName,
        projectName: expense.projectName,
        status: expense.receiptStatus === 'original_received' ? 'Receipt Received' : 'Receipt Pending',
        referenceNumber: expense.expenseNumber,
        receiptStatus: expense.receiptStatus,
      });
    });

  // Add completed top-ups (positive amounts - money into wallet)
  topUps
    .filter((t) => t.status === 'completed')
    .forEach((topUp) => {
      transactions.push({
        id: topUp.id,
        type: 'topup' as TransactionType,
        date: topUp.topUpDate,
        description: topUp.notes || 'Wallet Top-up',
        amount: topUp.amount, // Positive for top-ups
        companyName: topUp.companyName,
        walletId: topUp.walletId,
        walletHolderName: topUp.walletHolderName,
        status: 'Completed',
        referenceNumber: topUp.topUpNumber,
      });
    });

  // Add paid reimbursements (positive amounts - money back into wallet)
  reimbursements
    .filter((r) => r.status === 'paid')
    .forEach((reimbursement) => {
      transactions.push({
        id: reimbursement.id,
        type: 'reimbursement_paid' as TransactionType,
        date: reimbursement.paymentDate || reimbursement.updatedAt.split('T')[0],
        description: `Reimbursement for ${reimbursement.expenseNumber}`,
        amount: reimbursement.finalAmount, // Positive for reimbursements
        companyName: reimbursement.companyName,
        walletId: reimbursement.walletId,
        walletHolderName: reimbursement.walletHolderName,
        status: 'Paid',
        referenceNumber: reimbursement.reimbursementNumber,
      });
    });

  // Sort by date descending (newest first)
  transactions.sort((a, b) => b.date.localeCompare(a.date));

  return transactions;
}
