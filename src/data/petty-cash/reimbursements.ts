import type { PettyCashReimbursement, ReimbursementStatus } from './types';

// Petty cash reimbursements (empty - data stored in Supabase)
export const mockReimbursements: PettyCashReimbursement[] = [];

// Counter for generating reimbursement numbers
let reimbursementCounter = 5;

// Get all reimbursements
export function getAllReimbursements(): PettyCashReimbursement[] {
  return [...mockReimbursements];
}

// Get reimbursement by ID
export function getReimbursementById(
  id: string
): PettyCashReimbursement | undefined {
  return mockReimbursements.find((r) => r.id === id);
}

// Get reimbursement by expense ID
export function getReimbursementByExpenseId(
  expenseId: string
): PettyCashReimbursement | undefined {
  return mockReimbursements.find((r) => r.expenseId === expenseId);
}

// Get reimbursements by wallet
export function getReimbursementsByWallet(
  walletId: string
): PettyCashReimbursement[] {
  return mockReimbursements.filter((r) => r.walletId === walletId);
}

// Get reimbursements by company
export function getReimbursementsByCompany(
  companyId: string
): PettyCashReimbursement[] {
  return mockReimbursements.filter((r) => r.companyId === companyId);
}

// Get reimbursements by status
export function getReimbursementsByStatus(
  status: ReimbursementStatus
): PettyCashReimbursement[] {
  return mockReimbursements.filter((r) => r.status === status);
}

// Get pending reimbursements
export function getPendingReimbursements(): PettyCashReimbursement[] {
  return mockReimbursements.filter((r) => r.status === 'pending');
}

// Get pending reimbursements grouped by company
export function getPendingReimbursementsByCompany(): Map<
  string,
  PettyCashReimbursement[]
> {
  const pending = getPendingReimbursements();
  const grouped = new Map<string, PettyCashReimbursement[]>();

  pending.forEach((r) => {
    const existing = grouped.get(r.companyId) || [];
    grouped.set(r.companyId, [...existing, r]);
  });

  return grouped;
}

// Calculate pending amount for a wallet
export function getPendingAmountForWallet(walletId: string): number {
  return mockReimbursements
    .filter((r) => r.walletId === walletId && r.status === 'pending')
    .reduce((sum, r) => sum + r.finalAmount, 0);
}

// Calculate total pending reimbursements
export function getTotalPendingReimbursements(): {
  count: number;
  amount: number;
} {
  const pending = getPendingReimbursements();
  return {
    count: pending.length,
    amount: pending.reduce((sum, r) => sum + r.finalAmount, 0),
  };
}

// Generate reimbursement number
function generateReimbursementNumber(): string {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  reimbursementCounter++;
  const seq = String(reimbursementCounter).padStart(4, '0');
  return `PC-RMB-${year}${month}-${seq}`;
}

// Create reimbursement (auto-created when expense is submitted)
export function createReimbursement(
  expenseId: string,
  expenseNumber: string,
  walletId: string,
  walletHolderName: string,
  companyId: string,
  companyName: string,
  amount: number
): PettyCashReimbursement {
  const now = new Date().toISOString();
  const id = `pc-rmb-${Date.now()}`;
  const reimbursementNumber = generateReimbursementNumber();

  const reimbursement: PettyCashReimbursement = {
    id,
    reimbursementNumber,
    expenseId,
    expenseNumber,
    walletId,
    walletHolderName,
    companyId,
    companyName,
    amount,
    finalAmount: amount,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  mockReimbursements.push(reimbursement);
  return reimbursement;
}

// Approve reimbursement
export function approveReimbursement(
  id: string,
  approvedBy: string,
  bankAccountId: string,
  bankAccountName: string,
  adjustmentAmount?: number,
  adjustmentReason?: string
): PettyCashReimbursement | null {
  const index = mockReimbursements.findIndex((r) => r.id === id);
  if (index === -1) return null;

  const now = new Date().toISOString();
  const reimbursement = mockReimbursements[index];

  const finalAmount =
    adjustmentAmount !== undefined
      ? reimbursement.amount + adjustmentAmount
      : reimbursement.amount;

  mockReimbursements[index] = {
    ...reimbursement,
    status: 'approved',
    bankAccountId,
    bankAccountName,
    adjustmentAmount,
    adjustmentReason,
    finalAmount,
    approvedBy,
    approvedAt: now,
    updatedAt: now,
  };

  return mockReimbursements[index];
}

// Process payment for approved reimbursement
export function processReimbursementPayment(
  id: string,
  paymentDate: string,
  paymentReference?: string
): PettyCashReimbursement | null {
  const index = mockReimbursements.findIndex((r) => r.id === id);
  if (index === -1) return null;

  const reimbursement = mockReimbursements[index];
  if (reimbursement.status !== 'approved') return null;

  mockReimbursements[index] = {
    ...reimbursement,
    status: 'paid',
    paymentDate,
    paymentReference,
    updatedAt: new Date().toISOString(),
  };

  return mockReimbursements[index];
}

// Reject reimbursement
export function rejectReimbursement(
  id: string,
  rejectedBy: string,
  rejectionReason: string
): PettyCashReimbursement | null {
  const index = mockReimbursements.findIndex((r) => r.id === id);
  if (index === -1) return null;

  const now = new Date().toISOString();

  mockReimbursements[index] = {
    ...mockReimbursements[index],
    status: 'rejected',
    rejectedBy,
    rejectedAt: now,
    rejectionReason,
    updatedAt: now,
  };

  return mockReimbursements[index];
}

// Update reimbursement amount (when expense amount is edited)
export function updateReimbursementAmount(
  id: string,
  newAmount: number
): PettyCashReimbursement | null {
  const index = mockReimbursements.findIndex((r) => r.id === id);
  if (index === -1) return null;

  const reimbursement = mockReimbursements[index];

  // Only allow updating if not yet paid or rejected
  if (reimbursement.status === 'paid' || reimbursement.status === 'rejected') {
    return null;
  }

  mockReimbursements[index] = {
    ...reimbursement,
    amount: newAmount,
    finalAmount: newAmount + (reimbursement.adjustmentAmount || 0),
    updatedAt: new Date().toISOString(),
  };

  return mockReimbursements[index];
}
