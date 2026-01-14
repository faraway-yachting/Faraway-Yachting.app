/**
 * Bank Account Mock Data
 *
 * Mock data for bank account management.
 * In production, this will be replaced with database queries.
 */

import { BankAccount } from './types';

// Bank accounts storage (empty - no mock data)
export let bankAccounts: BankAccount[] = [];

// Utility functions

/**
 * Get bank account by ID
 */
export function getBankAccountById(id: string): BankAccount | undefined {
  return bankAccounts.find(ba => ba.id === id);
}

/**
 * Get all bank accounts for a specific company
 */
export function getBankAccountsByCompany(companyId: string): BankAccount[] {
  return bankAccounts.filter(ba => ba.companyId === companyId);
}

/**
 * Get only active bank accounts for a specific company
 */
export function getActiveBankAccountsByCompany(companyId: string): BankAccount[] {
  return bankAccounts.filter(ba => ba.companyId === companyId && ba.isActive);
}

/**
 * Get all bank accounts (including inactive)
 */
export function getAllBankAccounts(): BankAccount[] {
  return bankAccounts;
}

/**
 * Add a new bank account (mock implementation)
 */
export function addBankAccount(
  account: Omit<BankAccount, 'id' | 'createdAt' | 'updatedAt'>
): BankAccount {
  const newAccount: BankAccount = {
    ...account,
    id: `bank-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  bankAccounts.push(newAccount);
  return newAccount;
}

/**
 * Update an existing bank account (mock implementation)
 */
export function updateBankAccount(
  id: string,
  updates: Partial<BankAccount>
): BankAccount | null {
  const index = bankAccounts.findIndex(ba => ba.id === id);
  if (index === -1) return null;

  bankAccounts[index] = {
    ...bankAccounts[index],
    ...updates,
    id, // Ensure ID cannot be changed
    updatedAt: new Date().toISOString(),
  };

  return bankAccounts[index];
}

/**
 * Delete a bank account (mock implementation)
 */
export function deleteBankAccount(id: string): boolean {
  const index = bankAccounts.findIndex(ba => ba.id === id);
  if (index === -1) return false;

  bankAccounts.splice(index, 1);
  return true;
}

/**
 * Toggle bank account active status
 */
export function toggleBankAccountStatus(id: string): BankAccount | null {
  const account = getBankAccountById(id);
  if (!account) return null;

  return updateBankAccount(id, { isActive: !account.isActive });
}
