import type { PettyCashTopUp, TopUpStatus } from './types';

// Petty cash top-ups (empty - data stored in Supabase)
export const mockTopUps: PettyCashTopUp[] = [];

// Counter for generating top-up numbers
let topUpCounter = 4;

// Get all top-ups
export function getAllTopUps(): PettyCashTopUp[] {
  return [...mockTopUps];
}

// Get top-up by ID
export function getTopUpById(id: string): PettyCashTopUp | undefined {
  return mockTopUps.find((t) => t.id === id);
}

// Get top-ups by wallet
export function getTopUpsByWallet(walletId: string): PettyCashTopUp[] {
  return mockTopUps.filter((t) => t.walletId === walletId);
}

// Get top-ups by company
export function getTopUpsByCompany(companyId: string): PettyCashTopUp[] {
  return mockTopUps.filter((t) => t.companyId === companyId);
}

// Get top-ups by status
export function getTopUpsByStatus(status: TopUpStatus): PettyCashTopUp[] {
  return mockTopUps.filter((t) => t.status === status);
}

// Get pending top-ups
export function getPendingTopUps(): PettyCashTopUp[] {
  return mockTopUps.filter((t) => t.status === 'pending');
}

// Get completed top-ups for a wallet in a date range
export function getCompletedTopUpsForWallet(
  walletId: string,
  startDate: string,
  endDate: string
): PettyCashTopUp[] {
  return mockTopUps.filter(
    (t) =>
      t.walletId === walletId &&
      t.status === 'completed' &&
      t.topUpDate >= startDate &&
      t.topUpDate <= endDate
  );
}

// Calculate total top-ups for a wallet in current month
export function getMonthlyTopUpsForWallet(
  walletId: string,
  year: number,
  month: number
): number {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, '0')}-01`;

  return mockTopUps
    .filter(
      (t) =>
        t.walletId === walletId &&
        t.status === 'completed' &&
        t.topUpDate >= startDate &&
        t.topUpDate < endDate
    )
    .reduce((sum, t) => sum + t.amount, 0);
}

// Generate top-up number
function generateTopUpNumber(): string {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  topUpCounter++;
  const seq = String(topUpCounter).padStart(4, '0');
  return `PC-TOP-${year}${month}-${seq}`;
}

// Create top-up request
export function createTopUp(data: {
  walletId: string;
  walletHolderName: string;
  amount: number;
  companyId: string;
  companyName: string;
  bankAccountId: string;
  bankAccountName: string;
  topUpDate: string;
  reference?: string;
  notes?: string;
  createdBy: string;
}): PettyCashTopUp {
  const now = new Date().toISOString();
  const id = `pc-top-${Date.now()}`;
  const topUpNumber = generateTopUpNumber();

  const topUp: PettyCashTopUp = {
    id,
    topUpNumber,
    walletId: data.walletId,
    walletHolderName: data.walletHolderName,
    amount: data.amount,
    companyId: data.companyId,
    companyName: data.companyName,
    bankAccountId: data.bankAccountId,
    bankAccountName: data.bankAccountName,
    topUpDate: data.topUpDate,
    reference: data.reference,
    notes: data.notes,
    status: 'pending',
    createdBy: data.createdBy,
    createdAt: now,
  };

  mockTopUps.push(topUp);
  return topUp;
}

// Approve top-up
export function approveTopUp(
  id: string,
  approvedBy: string
): PettyCashTopUp | null {
  const index = mockTopUps.findIndex((t) => t.id === id);
  if (index === -1) return null;

  const now = new Date().toISOString();

  mockTopUps[index] = {
    ...mockTopUps[index],
    status: 'approved',
    approvedBy,
    approvedAt: now,
  };

  return mockTopUps[index];
}

// Complete top-up (after actual bank transfer)
export function completeTopUp(
  id: string,
  completedBy: string,
  reference?: string
): PettyCashTopUp | null {
  const index = mockTopUps.findIndex((t) => t.id === id);
  if (index === -1) return null;

  const topUp = mockTopUps[index];
  if (topUp.status !== 'approved' && topUp.status !== 'pending') return null;

  const now = new Date().toISOString();

  mockTopUps[index] = {
    ...topUp,
    status: 'completed',
    completedBy,
    completedAt: now,
    reference: reference || topUp.reference,
    // Also set approved if it was pending
    approvedBy: topUp.approvedBy || completedBy,
    approvedAt: topUp.approvedAt || now,
  };

  return mockTopUps[index];
}

// Cancel top-up (only if pending)
export function cancelTopUp(id: string): boolean {
  const index = mockTopUps.findIndex((t) => t.id === id);
  if (index === -1) return false;

  if (mockTopUps[index].status !== 'pending') return false;

  mockTopUps.splice(index, 1);
  return true;
}
