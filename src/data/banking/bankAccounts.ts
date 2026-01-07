/**
 * Bank Account Mock Data
 *
 * Mock data for bank account management.
 * In production, this will be replaced with database queries.
 */

import { BankAccount } from './types';

// Initial mock data - 5 sample bank accounts across 3 companies
export let bankAccounts: BankAccount[] = [
  {
    id: 'bank-001',
    bankInformation: {
      bankName: 'Bangkok Bank',
      bankBranch: 'Phuket Branch',
      bankCountry: 'Thailand',
      swiftBic: 'BKKBTHBK',
    },
    accountName: 'Faraway Yachting - Operating Account',
    accountNumber: '123-4-56789-0',
    currency: 'THB',
    companyId: 'company-001',
    glAccountCode: '1010',
    openingBalance: 5000000,
    openingBalanceDate: '2020-01-15',
    isActive: true,
    createdAt: new Date('2020-01-15').toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'bank-002',
    bankInformation: {
      bankName: 'Kasikorn Bank',
      bankBranch: 'Phuket Marina Branch',
      bankCountry: 'Thailand',
      swiftBic: 'KASITHBK',
    },
    accountName: 'Faraway Yachting - USD Account',
    accountNumber: '987-6-54321-8',
    currency: 'USD',
    companyId: 'company-001',
    glAccountCode: '1012',
    openingBalance: 150000,
    openingBalanceDate: '2020-06-01',
    isActive: true,
    createdAt: new Date('2020-06-01').toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'bank-003',
    bankInformation: {
      bankName: 'Siam Commercial Bank',
      bankBranch: 'Koh Samui Branch',
      bankCountry: 'Thailand',
      swiftBic: 'SICOTHBK',
    },
    accountName: 'Blue Horizon - Main Account',
    accountNumber: '456-7-89012-3',
    currency: 'THB',
    companyId: 'company-002',
    glAccountCode: '1010',
    openingBalance: 2500000,
    openingBalanceDate: '2021-06-10',
    isActive: true,
    createdAt: new Date('2021-06-10').toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'bank-004',
    bankInformation: {
      bankName: 'DBS Bank',
      bankBranch: 'Sentosa Branch',
      bankCountry: 'Singapore',
      swiftBic: 'DBSSSGSG',
    },
    accountName: 'Coastal Marine - SGD Operating',
    accountNumber: '001-234567-8',
    iban: 'SG12001234567890',
    currency: 'SGD',
    companyId: 'company-003',
    glAccountCode: '1013',
    openingBalance: 800000,
    openingBalanceDate: '2022-03-20',
    isActive: true,
    createdAt: new Date('2022-03-20').toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'bank-005',
    bankInformation: {
      bankName: 'HSBC Singapore',
      bankBranch: 'Main Branch',
      bankCountry: 'Singapore',
      swiftBic: 'HSBCSGSG',
    },
    accountName: 'Coastal Marine - EUR Reserve',
    accountNumber: '002-876543-2',
    iban: 'SG45002876543210',
    currency: 'EUR',
    companyId: 'company-003',
    glAccountCode: '1011',
    openingBalance: 50000,
    openingBalanceDate: '2022-08-15',
    isActive: false, // Inactive account
    createdAt: new Date('2022-08-15').toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

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
